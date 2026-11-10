import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/core/store.js';
import {storageSnapshot} from './helpers/storage-snapshot.js';

const actor={kind:'agent',sessionId:'setting-editor'};
async function fixture(t,value={}) {
  const root=await mkdtemp(join(tmpdir(),'cuigengji-memory-edit-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),novel=await store.dispatch('novel.create',{title:'设定编辑测试'},actor);
  const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
  const folder=await run('graph.group.create',{name:'书铺'});
  const chapter=await run('chapter.create',{title:'初见',content:'她在书铺中翻阅旧账册。'});
  const card=await run('graph.create',{type:'character_card',name:'林舟',summary:'十八岁的书铺店主。',
    content:'她十八岁。她继承了母亲留下的书铺。她会炼丹。',aliases:['夜间店主'],groupId:folder.id,
    sources:[{chapterId:chapter.id,revision:chapter.revision}],position:{x:50,y:-80},...value});
  return {root,store,novel,run,folder,card};
}

test('a setting passage and its summary change together on the original card, with history and receipt replay',async t=>{
  const {root,novel,run,card}=await fixture(t);
  const args={nodeId:card.id,expectedRevision:card.revision,patch:{oldText:'她十八岁。',newText:'她十九岁。'},summary:'十九岁的书铺店主。',reason:'作者调整年龄',requestId:'setting-age'};
  const result=await run('graph.update',args);
  assert.equal(result.changed,true);assert.equal(result.previousRevision,1);assert.equal(result.revision,2);
  assert.deepEqual(result.changedFields,['summary','content']);assert.equal(result.id,card.id);
  assert.equal(result.content,'她十九岁。她继承了母亲留下的书铺。她会炼丹。');
  for(const field of ['name','type','groupId','position','aliases','knownBy','sources','dependsOn'])assert.deepEqual(result[field],card[field]);
  assert.deepEqual(await run('graph.update',args),result,'identical retry returns its original receipt');
  assert.deepEqual((await run('graph.list',{query:'十九岁'})).map(n=>n.id),[card.id]);
  assert.deepEqual(await run('graph.list',{query:'十八岁'}),[],'current search must not return the old summary or history');
  const restarted=new Store(root),current=await restarted.dispatch('graph.get',{novelId:novel.id,nodeId:card.id},actor);
  assert.equal(current.content,result.content);assert.equal(current.revision,2);
  assert.equal(Object.hasOwn(current,'changed'),false,'mutation receipt fields must not become stored setting fields');
  const history=await run('graph.history',{nodeId:card.id});assert.deepEqual(history.map(v=>v.revision),[1,2]);
  assert.equal(history[1].reason,'作者调整年龄');assert.deepEqual(history[1].changedFields,['summary','content']);
  assert.equal((await run('graph.history',{nodeId:card.id,revision:1,includeContent:true}))[0].content,card.content);
});

test('empty replacement removes only the selected description and keeps the card and its relationships',async t=>{
  const {run,card}=await fixture(t);
  const place=await run('graph.create',{type:'world_entry',name:'夜间书铺',content:'位于长街尽头。'});
  const edge=await run('edge.create',{from:card.id,to:place.id,name:'经营'});
  const result=await run('graph.update',{nodeId:card.id,expectedRevision:1,patch:{oldText:'她会炼丹。',newText:''}});
  assert.equal(result.changed,true);assert.deepEqual(result.changedFields,['content']);assert.equal(result.deleted,false);
  assert.equal(result.content,'她十八岁。她继承了母亲留下的书铺。');
  assert.equal(result.summary,card.summary);assert.equal((await run('graph.list')).length,2);
  assert.deepEqual(await run('edge.get',{edgeId:edge.id}),edge);
});

test('changing the card type saves the original resource, survives restart and retains its earlier type in history',async t=>{
  const {root,novel,run,card}=await fixture(t);
  const before=await storageSnapshot(root);
  await assert.rejects(run('graph.update',{nodeId:card.id,expectedRevision:1,type:'unsupported',summary:'不得部分保存'}),{code:'INVALID_INPUT'});
  assert.equal(await storageSnapshot(root),before);
  const result=await run('graph.update',{nodeId:card.id,expectedRevision:1,type:'world_entry'});
  assert.equal(result.id,card.id);assert.equal(result.changed,true);assert.deepEqual(result.changedFields,['type']);
  assert.equal(result.type,'world_entry');assert.equal(result.content,card.content);assert.equal(result.groupId,card.groupId);
  assert.deepEqual(await run('graph.list',{type:'character_card'}),[]);
  assert.equal((await run('graph.list',{type:'world_entry'}))[0].id,card.id);
  const fresh=new Store(root),current=await fresh.dispatch('graph.get',{novelId:novel.id,nodeId:card.id},actor);
  assert.equal(current.type,'world_entry');assert.equal(current.revision,2);
  const history=await run('graph.history',{nodeId:card.id});assert.deepEqual(history.map(v=>v.type),['character_card','world_entry']);
});

test('patches match raw text literally, preserving macros, Unicode and line endings',async t=>{
  const raw='等级：{{getvar::等级}}\r\n备注：a.*[$&]😀\r\n结尾。';
  const {run,card}=await fixture(t,{content:raw,summary:''});
  const replacement='$& $1 \\路径 😀';
  const result=await run('graph.update',{nodeId:card.id,expectedRevision:1,patch:{oldText:'a.*[$&]😀',newText:replacement}});
  assert.equal(result.content,'等级：{{getvar::等级}}\r\n备注：'+replacement+'\r\n结尾。');
  const rewritten=await run('graph.update',{nodeId:card.id,expectedRevision:2,content:'按作者要求重写的整张资料。',summary:'重写后的摘要'});
  assert.equal(rewritten.content,'按作者要求重写的整张资料。');assert.equal(rewritten.id,card.id);
});

test('empty and identical edits report unchanged without new revisions, writing activity or file changes',async t=>{
  const {root,run,card}=await fixture(t);
  const before=await storageSnapshot(root),activity=await run('activity.today');
  for(const edit of [{},{content:card.content,summary:card.summary,aliases:[...card.aliases],position:{...card.position}},{patch:{oldText:'她十八岁。',newText:'她十八岁。'}}]){
    const result=await run('graph.update',{nodeId:card.id,expectedRevision:1,...edit});
    assert.equal(result.changed,false);assert.deepEqual(result.changedFields,[]);
    assert.equal(result.previousRevision,1);assert.equal(result.revision,1);assert.equal(result.updatedAt,card.updatedAt);
  }
  assert.equal(await storageSnapshot(root),before);assert.deepEqual(await run('activity.today'),activity);
  assert.equal((await run('graph.history',{nodeId:card.id})).length,1);
});

test('wrong edit arguments and unmatched or ambiguous passages fail without partially saving any fields',async t=>{
  const {root,run,card}=await fixture(t,{content:'相同描述。相同描述。尾声。'});
  const before=await storageSnapshot(root);
  const invalid=[
    {summery:'拼错的摘要'},{append:'不支持追加'},{value:{content:'放错层级'}},{deleted:true},
    {content:'整篇覆盖',patch:{oldText:'尾声。',newText:'新尾声。'}},
    {patch:null},{patch:[]},{patch:'错误'},{patch:{}},{patch:{oldText:'',newText:'新'}},
    {patch:{oldText:'尾声。'}},{patch:{oldText:'尾声。',newText:null}},{patch:{oldText:'尾声。',newText:'新',all:true}},
  ];
  for(const [i,edit] of invalid.entries()){
    await assert.rejects(run('graph.update',{nodeId:card.id,expectedRevision:1,summary:'不得部分保存',requestId:'invalid-'+i,...edit}),{code:'INVALID_INPUT'});
    assert.equal(await storageSnapshot(root),before);
  }
  for(const oldText of ['不存在的原文','相同描述。']){
    await assert.rejects(run('graph.update',{nodeId:card.id,expectedRevision:1,summary:'不得部分保存',patch:{oldText,newText:'新'},requestId:'bad-match-'+oldText}),{code:'PATCH_CONFLICT'});
    assert.equal(await storageSnapshot(root),before);
  }
  await assert.rejects(run('graph.delete',{nodeId:card.id,expectedRevision:1,confirm:true,content:'只想删一句'}),{code:'INVALID_INPUT'});
  assert.equal(await storageSnapshot(root),before);
  const result=await run('graph.update',{nodeId:card.id,expectedRevision:1,patch:{oldText:'相同描述。尾声。',newText:'修订后的尾声。'}});
  assert.equal(result.content,'相同描述。修订后的尾声。');
});

test('a stale patch never replaces a newer human edit, and recomputing the patch preserves the human contribution',async t=>{
  const {run,store,novel,card}=await fixture(t);
  const human=await store.dispatch('graph.update',{novelId:novel.id,nodeId:card.id,expectedRevision:1,content:card.content+'作者补充：她养了一只猫。'},{kind:'human',sessionId:'author'});
  await assert.rejects(run('graph.update',{nodeId:card.id,expectedRevision:1,patch:{oldText:'她十八岁。',newText:'她十九岁。'}}),{code:'CONFLICT'});
  await assert.rejects(run('graph.update',{nodeId:card.id,expectedRevision:1}),{code:'CONFLICT'},'even an empty edit must check the read revision');
  const current=await run('graph.get',{nodeId:card.id});assert.equal(current.revision,human.revision);
  const result=await run('graph.update',{nodeId:card.id,expectedRevision:current.revision,patch:{oldText:'她十八岁。',newText:'她十九岁。'},summary:'十九岁的书铺店主。'});
  assert.ok(result.content.endsWith('作者补充：她养了一只猫。'));assert.equal(result.revision,3);
});

test('whole-card deletion reports affected edges, hides current search results and preserves references and recoverable history',async t=>{
  const {run,card}=await fixture(t);
  const place=await run('graph.create',{type:'world_entry',name:'书铺',content:'独立资料。'});
  const related=await run('edge.create',{from:card.id,to:place.id,name:'经营'});
  const unrelated=await run('edge.create',{from:place.id,to:place.id,name:'沿用旧址'});
  const plan=await run('planning.apply',{requestId:'setting-delete-ref',operations:[{op:'node.create',ref:'scene',value:{title:'探访书铺',memoryRefs:[card.id,place.id]}}]});
  await assert.rejects(run('graph.delete',{nodeId:card.id,expectedRevision:1}),{code:'CONFIRM_REQUIRED'});
  const args={nodeId:card.id,expectedRevision:1,confirm:true,requestId:'delete-setting',reason:'作者撤去这张人物卡'};
  const result=await run('graph.delete',args);
  assert.equal(result.deleted,true);assert.equal(result.changed,true);assert.deepEqual(result.changedFields,['deleted']);assert.deepEqual(result.deletedEdgeIds,[related.id]);
  assert.deepEqual(await run('graph.delete',args),result);
  assert.deepEqual((await run('graph.list')).map(n=>n.id),[place.id]);
  assert.equal((await run('graph.list',{includeDeleted:true})).length,2);
  assert.deepEqual((await run('edge.list')).map(e=>e.id),[unrelated.id]);
  const detail=await run('planning.get',{nodeId:plan.mapping.scene});
  assert.deepEqual(detail.node.memoryRefs,[card.id,place.id]);assert.equal(detail.resources.items.find(item=>item.id===card.id).availability,'deleted');
  const deleted=await run('graph.get',{nodeId:card.id});assert.equal(deleted.deleted,true);assert.equal(deleted.content,card.content);
  const history=await run('graph.history',{nodeId:card.id});assert.equal(history.at(-1).reason,args.reason);
  const repeated=await run('graph.delete',{nodeId:card.id,expectedRevision:result.revision,confirm:true});
  assert.equal(repeated.changed,false);assert.equal(repeated.revision,result.revision);assert.deepEqual(repeated.deletedEdgeIds,[]);
  const restored=await run('graph.restore',{nodeId:card.id,expectedRevision:result.revision,targetRevision:1});
  assert.equal(restored.deleted,false);assert.equal(restored.content,card.content);assert.equal(restored.id,card.id);
  assert.equal((await run('edge.get',{edgeId:related.id})).deleted,true,'restoring a card does not silently recreate its old relationships');
});

test('batch deletion preserves every earlier revision and the deletion reason after restart, and rejects stale members atomically',async t=>{
  const {root,novel,run,card}=await fixture(t);
  const other=await run('graph.create',{type:'world_entry',name:'旧规则',content:'原始规则。'});
  const current=await run('graph.update',{nodeId:card.id,expectedRevision:1,patch:{oldText:'她会炼丹。',newText:''}});
  const before=await storageSnapshot(root);
  await assert.rejects(run('graph.remove',{members:[{id:other.id,expectedRevision:1},{id:card.id,expectedRevision:1}],confirm:true,requestId:'stale-batch'}),{code:'CONFLICT'});
  assert.equal(await storageSnapshot(root),before);
  const args={members:[{id:card.id,expectedRevision:current.revision},{id:other.id,expectedRevision:1}],confirm:true,reason:'作者清理不再采用的资料',requestId:'delete-batch'};
  const deleted=await run('graph.remove',args);assert.ok(deleted.every(item=>item.deleted&&item.changed));
  assert.deepEqual(await run('graph.remove',args),deleted);
  const fresh=new Store(root),history=await fresh.dispatch('graph.history',{novelId:novel.id,nodeId:card.id},actor);
  assert.deepEqual(history.map(v=>v.revision),[1,2,3]);assert.equal(history.at(-1).reason,args.reason);assert.equal(history.at(-1).deleted,true);
  assert.equal((await fresh.dispatch('graph.history',{novelId:novel.id,nodeId:card.id,revision:1,includeContent:true},actor))[0].content,card.content);
  assert.equal((await fresh.dispatch('graph.history',{novelId:novel.id,nodeId:other.id},actor)).at(-1).reason,args.reason);
});
