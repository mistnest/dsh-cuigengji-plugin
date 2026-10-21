import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/core/store.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {planningStructure} from '../src/domain/planning/hierarchy.ts';
import {folderObjects} from '../src/domain/canvas/folders.ts';
import {foldProjection,objectBox,inside} from '../src/domain/canvas/model.ts';
import {directorySnapshot} from '../src/domain/directory/order.ts';

async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'cg-director-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const store=new Store(root),actor={kind:'human',sessionId:'director-test'};
 const novel=await store.dispatch('novel.create',{title:'导演工作台合成作品'},actor);
 const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,requestId:crypto.randomUUID(),...args},actor);
 return {root,store,actor,novel,run};
}

test('explicit resource upgrade turns legacy pages into real folders, retaining text, identities, order and immutable history',async t=>{
 const s=await fixture(t),{run}=s;
 const page=await run('graph.page.create',{name:'乌坦城',summary:'旧版资源工作台'}),group=await run('graph.group.create',{name:'萧家',pageId:page.id});
 const a=await run('graph.create',{type:'character_card',name:'萧炎',summary:'少年',content:'原始人物全文',groupId:group.id,position:{x:100,y:200}});
 const b=await run('graph.create',{type:'world_entry',name:'药坊',content:'原始地点全文',pageId:page.id});
 const empty=await run('graph.page.create',{name:'空资源页'}),edge=await run('edge.create',{from:a.id,to:b.id,name:'生活于'});
 await run('graph.update',{nodeId:a.id,expectedRevision:1,content:'第二版人物全文'});
 const history=(await s.store.load()).novels[s.novel.id].nodes[a.id].versions;
 // The compatibility query itself must not rewrite user data.
 const before=await readFile(join(s.root,'library.json'),'utf8');await run('graph.pages');assert.equal(await readFile(join(s.root,'library.json'),'utf8'),before);
 const upgrade=await run('graph.workspace.ensure');assert.equal(upgrade.changed,true);
 const all=await run('graph.list'),groups=await run('graph.groups');assert.equal(all.length,2);assert.equal(groups.length,3);
 assert.equal(groups.find(g=>g.id===group.id).parentId,upgrade.folders[page.id]);assert.ok(groups.some(g=>g.id===upgrade.folders[empty.id]));
 const migrated=await run('graph.get',{nodeId:a.id});assert.equal(migrated.content,'第二版人物全文');assert.equal(migrated.pageId,null);assert.equal(migrated.groupId,group.id);assert.deepEqual(migrated.position,a.position);
 const loaded=(await s.store.load()).novels[s.novel.id];assert.deepEqual(loaded.nodes[a.id].versions.slice(0,-1),history);assert.equal(loaded.nodes[a.id].versions.at(-1).content,'第二版人物全文');assert.equal((await run('edge.list'))[0].id,edge.id);
 const once=await new Store(s.root).load();assert.equal((await run('graph.workspace.ensure')).changed,false);assert.deepEqual((await new Store(s.root).load()).novels,once.novels);
 const restored=await run('graph.restore',{nodeId:b.id,expectedRevision:2,targetRevision:1});assert.equal(restored.groupId,upgrade.folders[page.id]);assert.equal(restored.pageId,null);assert.equal(restored.content,'原始地点全文');
});

test('resource folder export preserves empty descendants and copied historical home references',async t=>{
 const s=await fixture(t),{run}=s;
 const page=await run('graph.page.create',{name:'旧资源页'}),node=await run('graph.create',{type:'world_entry',name:'地点',content:'两版都要保留',pageId:page.id});
 const unrelatedPage=await run('graph.page.create',{name:'不应携带的旧页'});
 const upgrade=await run('graph.workspace.ensure'),folderId=upgrade.folders[page.id];
 await run('graph.group.create',{name:'空子文件夹',parentId:folderId});
 await run('graph.create',{type:'world_entry',name:'无关设定',content:'不应导出'});
 const transfer=new TransferService(s.store),exported=await transfer.export({selection:{kind:'memory',novelId:s.novel.id,groupIds:[folderId]}}),file={name:exported.filename,text:exported.content};
 const packed=JSON.parse(exported.content).payload.projects[0];assert.equal(Object.keys(packed.nodes).length,1);assert.equal(Object.keys(packed.memoryGroups).length,2);
 assert.equal(packed.memoryPageFolders[unrelatedPage.id],undefined);assert.deepEqual(Object.keys(packed.memoryPageFolders),[page.id]);
 const target=await run('novel.create',{title:'复制目标'}),options={mode:'copy',targetId:target.id},preview=await transfer.preview({file,options});
 await transfer.import({file,options,proof:preview.proof,requestId:crypto.randomUUID()},s.actor);
 const copied=(await s.store.load()).novels[target.id],card=Object.values(copied.nodes)[0];assert.notEqual(card.id,node.id);assert.equal(card.versions.length,2);assert.ok(card.versions.every(v=>v.groupId===card.groupId));assert.equal(card.content,'两版都要保留');assert.equal(Object.keys(copied.memoryGroups).length,2);
 // Full resource exports also retain empty roots, even when no card references them.
 await run('graph.group.create',{name:'空根目录'});
 const full=JSON.parse((await transfer.export({selection:{kind:'memory',novelId:s.novel.id}})).content).payload.projects[0];assert.ok(Object.values(full.memoryGroups).some(g=>g.name==='空根目录'));
});

test('planning stage uses one original node for expanded region and folded summary, including nested layout and true external edges',async t=>{
 const {run}=await fixture(t),tx=await run('planning.apply',{operations:[
  {op:'node.create',ref:'opening',value:{title:'开篇',summary:'处境转变'}},
  {op:'node.create',ref:'incident',value:{title:'退婚风波',summary:'登门后双方产生冲突',parentId:'opening'}},
  {op:'node.create',ref:'a',value:{title:'登门退婚',parentId:'incident'}},
  {op:'node.create',ref:'b',value:{title:'双方冲突',parentId:'incident'}},
  {op:'node.create',ref:'after',value:{title:'后续转折',parentId:'opening'}},
  {op:'node.create',ref:'outside',value:{title:'外界反应',position:{x:1600,y:300}}},
  {op:'edge.create',value:{from:'a',to:'b'}},{op:'edge.create',value:{from:'b',to:'after'}},{op:'edge.create',value:{from:'after',to:'outside'}},
 ]});
 const layout=await run('planning.layout',{mode:'all',expectedSequence:tx.sequence}),list=await run('planning.list'),structure=planningStructure(list.items,[],[]),folders=folderObjects(structure.folders,structure.objects,layout.positions);
 assert.equal(structure.stageIds.size,2);assert.equal(structure.objects.length,4);assert.equal(list.total,6);
 const incident=folders.find(f=>f.id===tx.mapping.incident),opening=folders.find(f=>f.id===tx.mapping.opening);assert.equal(incident.title,'退婚风波');assert.equal(incident.content,'登门后双方产生冲突');assert.ok(inside(objectBox(opening),objectBox(incident)));
 for(const ref of ['a','b'])assert.ok(inside(objectBox(incident),objectBox(list.items.find(n=>n.id===tx.mapping[ref]))));
 const folded=foldProjection([...structure.objects,...folders],list.edges,[tx.mapping.incident]);assert.ok(!folded.objects.some(n=>[tx.mapping.a,tx.mapping.b].includes(n.id)));assert.equal(folded.edges.find(e=>e.to===tx.mapping.after).from,incident.id);assert.equal(folded.objects.filter(n=>n.id===incident.id).length,1);
 const get=await run('planning.get',{nodeId:incident.id});assert.equal(get.node.summary,incident.content);assert.deepEqual(new Set(get.children.map(n=>n.id)),new Set([tx.mapping.a,tx.mapping.b]));assert.equal(get.node.status,'idea');
 const partial=await run('planning.layout.get',{mode:'all',nodeIds:[tx.mapping.a,tx.mapping.b],expectedSequence:list.sequence});assert.deepEqual(Object.keys(partial.positions).sort(),[tx.mapping.a,tx.mapping.b].sort());
 assert.deepEqual((await run('planning.get',{nodeId:tx.mapping.outside})).node.position,list.items.find(n=>n.id===tx.mapping.outside).position);
 const next=await run('planning.continue',{nodeId:tx.mapping.a,expectedRevision:get.children.find(n=>n.id===tx.mapping.a).revision,value:{title:'接着交涉'}});assert.equal(next.node.parentId,incident.id);
});

test('directory hierarchy moves and sibling order preserve canvas positions and reject stale ancestry or cycles atomically',async t=>{
 const {run}=await fixture(t),tx=await run('planning.apply',{operations:[{op:'node.create',ref:'stage',value:{title:'阶段',position:{x:70,y:20}}},{op:'node.create',ref:'a',value:{title:'甲',position:{x:40,y:200}}},{op:'node.create',ref:'b',value:{title:'乙',position:{x:380,y:200}}}]});
 let items=(await run('planning.list',{pageId:null})).items;
 await run('planning.directory.move',{nodeId:tx.mapping.a,groupId:null,parentId:tx.mapping.stage,beforeId:null,expectedDirectory:directorySnapshot(items,[])});
 items=(await run('planning.list',{pageId:null})).items;
 await run('planning.directory.move',{nodeId:tx.mapping.b,groupId:null,parentId:tx.mapping.stage,beforeId:tx.mapping.a,expectedDirectory:directorySnapshot(items,[])});
 const a=(await run('planning.get',{nodeId:tx.mapping.a})).node,b=(await run('planning.get',{nodeId:tx.mapping.b})).node;assert.deepEqual(a.position,{x:40,y:200});assert.deepEqual(b.position,{x:380,y:200});assert.equal(a.parentId,tx.mapping.stage);
 await assert.rejects(run('planning.directory.move',{nodeId:tx.mapping.stage,groupId:null,parentId:tx.mapping.a,beforeId:null,expectedDirectory:directorySnapshot((await run('planning.list',{pageId:null})).items,[])}),{code:'INVALID_INPUT'});
 await assert.rejects(run('planning.directory.move',{nodeId:tx.mapping.a,groupId:null,parentId:null,beforeId:null,expectedDirectory:directorySnapshot(items,[])}),{code:'CONFLICT'});
 assert.equal((await run('planning.get',{nodeId:tx.mapping.stage})).node.parentId,null);
});

test('planning resource summaries use current bounded index data; no full bodies, history or mandatory read barrier',async t=>{
 const s=await fixture(t),{run}=s,refs=[];
 for(let i=0;i<14;i++)refs.push((await run('graph.create',{type:'world_entry',name:'资源'+i,summary:'摘要'+i,content:'不应自动返回的正文'+i})).id);
 const tx=await run('planning.apply',{operations:[{op:'node.create',ref:'scene',value:{title:'资源推演',memoryRefs:refs}},{op:'node.create',ref:'free',value:{title:'纯灵感，无引用也可保存'}}]});
 const paths=[],original=s.store.readText.bind(s.store);s.store.readText=async path=>{paths.push(path);return original(path);};
 let result=await run('planning.get',{nodeId:tx.mapping.scene});assert.equal(result.resources.items.length,12);assert.equal(result.resources.total,14);assert.equal(result.resources.nextOffset,12);assert.equal(result.resources.items[0].read.nodeId,refs[0]);
 assert.equal(result.resources.items[0].read.novelId,s.novel.id);await assert.rejects(run('planning.get',{nodeId:tx.mapping.scene,resourceOffset:-1}),{code:'INVALID_INPUT'});
 assert.ok(!paths.some(path=>path.includes('settings/entries/')||path.includes('history/settings/')));assert.ok(!JSON.stringify(result.resources).includes('不应自动返回'));assert.ok(!('versions' in result.resources.items[0]));
 await run('graph.update',{nodeId:refs[0],expectedRevision:1,summary:'作者最新设定',status:'unconfirmed'});
 result=await run('planning.get',{nodeId:tx.mapping.scene});assert.equal(result.resources.items[0].summary,'作者最新设定');assert.equal(result.resources.items[0].revision,2);assert.equal(result.resources.items[0].status,'unconfirmed');
 assert.equal((await run('planning.get',{nodeId:tx.mapping.scene,resourceOffset:12})).resources.items.length,2);
 await run('graph.delete',{nodeId:refs[0],expectedRevision:2,confirm:true});assert.equal((await run('planning.get',{nodeId:tx.mapping.scene})).resources.items[0].availability,'deleted');
 const free=await run('planning.get',{nodeId:tx.mapping.free});assert.deepEqual(free.resources,{items:[],total:0,nextOffset:null});
});
