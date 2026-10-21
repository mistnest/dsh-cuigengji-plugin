import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/application/store.js';
import {registerPrompt} from '../src/adapters/dsh/prompt.js';
import {bookPath,fileId} from '../src/infrastructure/persistence/project-layout.ts';
import {WorkData} from '../src/application/backup/workspace.js';
import {TransferService} from '../src/application/transfer/service.ts';

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'cg-memory-timeline-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),human={kind:'human',sessionId:'history'},agent={kind:'agent',sessionId:'history'};
  const novel=await store.dispatch('novel.create',{title:'独立历史测试'},human);
  await store.dispatch('binding.set',{novelId:novel.id},human);
  const run=(action,args={},actor=human)=>store.dispatch(action,{novelId:novel.id,...args},actor);
  const node=await run('graph.create',{name:'测试人物',type:'character_card',summary:'初始摘要',content:'最初的正文。'});
  return {root,store,human,agent,novel,node,run};
}

test('history returns one requested body, classifies semantic changes and preserves every saved revision',async t=>{
  const {run,node,agent}=await fixture(t);
  await run('graph.update',{nodeId:node.id,expectedRevision:1,content:'第二版正文。',reason:'作者调整动机'});
  await run('graph.layout',{positions:[{nodeId:node.id,expectedRevision:2,position:{x:-240,y:180}}]});
  const group=await run('graph.group.create',{name:'调查组'});
  await run('graph.move',{groupId:group.id,members:[{id:node.id,expectedRevision:3}]});
  await run('graph.update',{nodeId:node.id,expectedRevision:4,summary:'AI 补充摘要',content:'第三版正文。'},agent);
  const summaries=await run('graph.history',{nodeId:node.id});
  assert.deepEqual(summaries.map(v=>[v.revision,v.kind]),[[1,'baseline'],[2,'content'],[3,'layout'],[4,'organization'],[5,'content']]);
  assert.deepEqual(summaries[4].changedFields,['summary','content']);assert.equal(summaries[4].actor.kind,'agent');
  assert.ok(summaries.every(v=>!('content' in v)));assert.equal(summaries[4].previousRevision,4);
  for(const [revision,content] of [[1,'最初的正文。'],[2,'第二版正文。'],[3,'第二版正文。'],[4,'第二版正文。'],[5,'第三版正文。']]){
    const selected=await run('graph.history',{nodeId:node.id,revision,includeContent:true});
    assert.equal(selected.length,1);assert.equal(selected[0].revision,revision);assert.equal(selected[0].content,content);
  }
  assert.equal((await run('graph.history',{nodeId:node.id,revision:2})).length,1);
  await assert.rejects(run('graph.history',{nodeId:node.id,includeContent:true}),{code:'INVALID_INPUT'});
  for(const revision of [0,-1,1.2,'2',null])await assert.rejects(run('graph.history',{nodeId:node.id,revision,includeContent:true}),{code:'INVALID_INPUT'});
  await assert.rejects(run('graph.history',{nodeId:node.id,revision:99,includeContent:true}),{code:'NOT_FOUND'});
  await assert.rejects(run('graph.restore',{nodeId:node.id,expectedRevision:4,targetRevision:1}),{code:'CONFLICT'});
  const requestId=randomUUID(),restored=await run('graph.restore',{nodeId:node.id,expectedRevision:5,targetRevision:1,requestId});
  assert.equal(restored.content,'最初的正文。');assert.equal(restored.revision,6);
  assert.deepEqual(await run('graph.restore',{nodeId:node.id,expectedRevision:5,targetRevision:1,requestId}),restored);
  assert.deepEqual((await run('graph.history',{nodeId:node.id})).map(v=>v.revision),[1,2,3,4,5,6]);
  assert.equal((await run('graph.history',{nodeId:node.id,revision:5,includeContent:true}))[0].content,'第三版正文。');
});

test('human history browsing is read-only and never adds old or current story bodies to AI prompt',async t=>{
  const {run,node,store,human}=await fixture(t);
  await run('graph.update',{nodeId:node.id,expectedRevision:1,content:'更新后的正文。'});
  let assemble;registerPrompt({on:(_,fn)=>assemble=fn},{store});
  const prompt=()=>assemble({}, {agent:{id:human.sessionId}},async()=>({sections:[],contexts:[],tools:[]}));
  const before=await prompt(),current=await run('graph.get',{nodeId:node.id});
  const commit=store.transaction.commit.bind(store.transaction),writes=[];
  store.transaction.commit=async changes=>{writes.push(...changes.keys());return commit(changes);};
  await run('graph.history',{nodeId:node.id});
  await run('graph.history',{nodeId:node.id,revision:1,includeContent:true});
  assert.deepEqual(await run('graph.get',{nodeId:node.id}),current);
  assert.deepEqual(writes,[]);
  assert.deepEqual(await prompt(),before);assert.doesNotMatch(JSON.stringify(before),/最初的正文|更新后的正文/);
});

test('the first edit of a pre-history setting captures its original body before changing it',async t=>{
  const {run,root,node,novel,human}=await fixture(t);
  const directories=JSON.parse(await readFile(join(root,'library.json'),'utf8')).directories,base=bookPath(novel.id,directories);
  const indexPath=join(root,base,'settings','index.json'),index=JSON.parse(await readFile(indexPath,'utf8'));
  delete index[node.id].versions;await writeFile(indexPath,JSON.stringify(index));
  await rm(join(root,base,'history','settings',fileId(node.id)+'.json'),{force:true});
  const legacy=new Store(root);
  await legacy.dispatch('graph.update',{novelId:novel.id,nodeId:node.id,expectedRevision:1,content:'启用后编辑的正文。'},human);
  const history=await legacy.dispatch('graph.history',{novelId:novel.id,nodeId:node.id},human);
  assert.deepEqual(history.map(v=>v.revision),[1,2]);assert.equal(history[0].reason,'启用设定历史');
  const first=await legacy.dispatch('graph.history',{novelId:novel.id,nodeId:node.id,revision:1,includeContent:true},human);
  assert.equal(first[0].content,'最初的正文。');
});

test('workspace and selected-work backups preserve setting histories and validate their saved files',async t=>{
  const {store,root,novel,node,run,human}=await fixture(t);
  await run('graph.update',{nodeId:node.id,expectedRevision:1,content:'第二版正文。'});
  const backup=await new WorkData(store).export();
  assert.equal(backup.payload.state.novels[novel.id].nodes[node.id].versions.length,2);
  const targetRoot=await mkdtemp(join(tmpdir(),'cg-history-restore-'));t.after(()=>rm(targetRoot,{recursive:true,force:true}));
  const target=new Store(targetRoot);
  await new WorkData(target).import(JSON.parse(JSON.stringify(backup)));
  assert.equal((await target.dispatch('graph.history',{novelId:novel.id,nodeId:node.id,revision:1,includeContent:true},human))[0].content,'最初的正文。');
  const exported=await new TransferService(store).export({selection:{kind:'works',novelIds:[novel.id]}});
  assert.equal(JSON.parse(exported.content).payload.projects[0].nodes[node.id].versions.length,2);
  const library=JSON.parse(await readFile(join(root,'library.json'),'utf8'));
  const historyPath=join(root,bookPath(novel.id,library.directories),'history/settings',fileId(node.id)+'.json');
  const versions=JSON.parse(await readFile(historyPath,'utf8'));versions[0].content='损坏的历史正文';
  await writeFile(historyPath,JSON.stringify(versions));
  await assert.rejects(store.load(),/历史.*哈希|哈希.*历史/);
});

test('unrelated saves keep history indexes and chapter invalidation records the affected setting state',async t=>{
  const {store,root,novel,node,run}=await fixture(t);
  const chapter=await run('chapter.create',{title:'来源章节',content:'原始正文。'});
  const dependent=await run('graph.create',{name:'来源设定',type:'world_entry',content:'这里有个码头。',status:'active',sources:[{chapterId:chapter.id,revision:1}]});
  await run('graph.update',{nodeId:node.id,expectedRevision:1,content:'另一版人物正文。'});
  const library=JSON.parse(await readFile(join(root,'library.json'),'utf8'));
  const indexPath=join(root,bookPath(novel.id,library.directories),'settings/index.json');
  assert.equal(JSON.parse(await readFile(indexPath,'utf8'))[dependent.id].versions.length,1);
  await run('chapter.update',{chapterId:chapter.id,expectedRevision:1,content:'已改变的正文。'});
  const current=await run('graph.get',{nodeId:dependent.id});assert.equal(current.status,'stale');
  const history=await run('graph.history',{nodeId:dependent.id});
  assert.equal(history.at(-1).revision,current.revision);assert.equal(history.at(-1).status,'stale');
  assert.equal((await store.load()).novels[novel.id].nodes[node.id].versions.length,2);
});

test('copied setting histories remap evidence and can be restored after their original group is removed',async t=>{
  const {store,novel,run,human}=await fixture(t);
  const chapter=await run('chapter.create',{title:'证据章节',content:'旧码头有灯。'});
  const group=await run('graph.group.create',{name:'旧分组'});
  const person=await run('graph.create',{type:'character_card',name:'同行者',content:'他知道码头的位置。'});
  const setting=await run('graph.create',{type:'world_entry',name:'码头',groupId:group.id,content:'码头在城东。',sources:[{chapterId:chapter.id,revision:1}],dependsOn:[person.id],knownBy:[person.id]});
  await run('graph.update',{nodeId:setting.id,expectedRevision:1,content:'码头在城北。'});
  const transfer=new TransferService(store),packet=await transfer.export({selection:{kind:'memory',novelId:novel.id,nodeIds:[setting.id],includeDependencies:true}});
  const destination=await store.dispatch('novel.create',{title:'独立导入作品'},human);
  const options={mode:'copy',targetId:destination.id},file={name:packet.filename,text:packet.content};
  const preview=await transfer.preview({file,options});assert.equal(preview.valid,true,JSON.stringify(preview.conflicts));
  await transfer.import({file,options,proof:preview.proof,requestId:randomUUID()},human);
  const target=(await store.load()).novels[destination.id],copied=Object.values(target.nodes).find(n=>n.name==='码头');
  const old=await store.dispatch('graph.history',{novelId:destination.id,nodeId:copied.id,revision:1,includeContent:true},human);
  assert.equal(old[0].sources[0].chapterId,Object.keys(target.chapters)[0]);
  assert.ok(target.nodes[old[0].dependsOn[0]]);assert.ok(target.nodes[old[0].knownBy[0]]);
  assert.equal(old[0].groupId,copied.groupId);assert.equal(old[0].actor.sessionId,null);
  const copiedGroup=target.memoryGroups[copied.groupId];
  await store.dispatch('graph.group.delete',{novelId:destination.id,groupId:copiedGroup.id,expectedRevision:copiedGroup.revision,confirm:true},human);
  const current=await store.dispatch('graph.get',{novelId:destination.id,nodeId:copied.id},human);
  const restored=await store.dispatch('graph.restore',{novelId:destination.id,nodeId:copied.id,expectedRevision:current.revision,targetRevision:1},human);
  assert.equal(restored.groupId,null);assert.equal(restored.content,'码头在城东。');
  await store.load();
});

test('partial setting export removes unselected evidence from every snapshot',async t=>{
  const {store,novel,run}=await fixture(t);
  const chapter=await run('chapter.create',{title:'不导出的来源',content:'不导出的正文。'});
  const dependency=await run('graph.create',{type:'character_card',name:'不导出的人物',content:'隐藏的人物正文。'});
  const setting=await run('graph.create',{type:'world_entry',name:'单独分享',content:'可以分享的设定。',sources:[{chapterId:chapter.id,revision:1}],dependsOn:[dependency.id],knownBy:[dependency.id]});
  await run('graph.update',{nodeId:setting.id,expectedRevision:1,content:'可以分享的第二版。'});
  const packet=await new TransferService(store).export({selection:{kind:'memory',novelId:novel.id,nodeIds:[setting.id]}});
  const exported=JSON.parse(packet.content).payload.projects[0].nodes[setting.id];
  for(const v of [exported,...exported.versions]){
    assert.deepEqual(v.sources,[]);assert.deepEqual(v.dependsOn,[]);assert.deepEqual(v.knownBy,[]);assert.equal(v.status,'unconfirmed');
  }
  assert.ok(!packet.content.includes(chapter.id));assert.ok(!packet.content.includes(dependency.id));
});

test('restoring an old setting keeps outdated evidence marked for review',async t=>{
  const {run}=await fixture(t);
  const chapter=await run('chapter.create',{title:'证据',content:'原文。'});
  const setting=await run('graph.create',{type:'world_entry',name:'曾经有效的设定',content:'旧结论。',status:'active',sources:[{chapterId:chapter.id,revision:1}]});
  await run('chapter.update',{chapterId:chapter.id,expectedRevision:1,content:'已改变的正文。'});
  const current=await run('graph.get',{nodeId:setting.id});
  const restored=await run('graph.restore',{nodeId:setting.id,expectedRevision:current.revision,targetRevision:1});
  assert.equal(restored.status,'stale');assert.equal(restored.sources[0].revision,1);assert.equal(restored.content,'旧结论。');
});
