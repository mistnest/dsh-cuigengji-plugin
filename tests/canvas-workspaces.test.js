import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/core/store.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {bookPath} from '../src/infrastructure/persistence/project-layout.ts';
import {scopePlanningFolders} from '../src/domain/planning/workspaces.ts';
import {folderObjects} from '../src/domain/canvas/folders.ts';
import {arrangeFolders} from '../src/domain/canvas/folder-layout.ts';
import {foldProjection,objectBox,inside} from '../src/domain/canvas/model.ts';
import {directorySnapshot} from '../src/domain/directory/order.ts';

async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'cg-canvas-workspaces-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const store=new Store(root),actor={kind:'human',sessionId:'canvas-workspaces'};
 const novel=await store.dispatch('novel.create',{title:'画布隔离合成作品'},actor);
 const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,requestId:crypto.randomUUID(),...args},actor);
 const apply=operations=>run('planning.apply',{operations});
 const indexes=async()=>{const library=JSON.parse(await readFile(join(root,'library.json'),'utf8'));const base=join(root,bookPath(novel.id,library.directories));return {base,planning:JSON.parse(await readFile(join(base,'planning/index.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return 'null';throw e;})),memory:JSON.parse(await readFile(join(base,'settings/index.json'),'utf8'))};};
 return {root,store,novel,actor,run,apply,indexes};
}

test('old shared planning folders split by page deterministically, and a metadata-only save preserves every body',async t=>{
 const s=await fixture(t),tx=await s.apply([
  {op:'page.create',ref:'page',value:{name:'决战推演'}},
  {op:'group.create',ref:'root',value:{name:'调查'}},{op:'group.create',ref:'child',value:{name:'账本',parentId:'root'}},
  {op:'node.create',ref:'a',value:{title:'主线调查',groupId:'child',content:'主线全文不可丢失',position:{x:80,y:90}}},
  {op:'node.create',ref:'b',value:{title:'局部行动',pageId:'page',content:'局部全文不可丢失',position:{x:-200,y:450}}},
  {op:'decoration.create',ref:'note',value:{kind:'note',pageId:'page',content:'原始疑问不可丢失'}},
 ]);
 const {base,planning}=await s.indexes();
 // Recreate a real v5 index from the earlier, shared-folder schema.
 for(const g of Object.values(planning.board.groups))delete g.pageId;
 for(const [collection,id,file] of [['nodes',tx.mapping.b,planning.nodeFiles[tx.mapping.b]],['decorations',tx.mapping.note,planning.decorationFiles[tx.mapping.note]]]){
  planning[collection][id].groupId=tx.mapping.child;
  const path=join(base,'planning',file),body=JSON.parse(await readFile(path,'utf8'));body.groupId=tx.mapping.child;await writeFile(path,JSON.stringify(body));
 }
 await writeFile(join(base,'planning/index.json'),JSON.stringify(planning));
 const raw=structuredClone(planning.board);raw.nodes=structuredClone(planning.nodes);raw.decorations=structuredClone(planning.decorations);
 scopePlanningFolders(raw);const once=structuredClone(raw);scopePlanningFolders(raw);assert.deepEqual(raw,once);
 const groups=await s.run('planning.groups'),target=groups.find(g=>g.name==='账本'&&g.pageId===tx.mapping.page);
 assert.equal(groups.length,4);assert.ok(target);assert.notEqual(target.id,tx.mapping.child);
 await s.run('planning.group.update',{groupId:target.id,expectedRevision:target.revision,name:'新账本组'});
 const restarted=new Store(s.root),read=(action,args)=>restarted.dispatch(action,{novelId:s.novel.id,...args},s.actor);
 const a=(await read('planning.get',{nodeId:tx.mapping.a})).node,b=(await read('planning.get',{nodeId:tx.mapping.b})).node;
 assert.equal(a.content,'主线全文不可丢失');assert.deepEqual(a.position,{x:80,y:90});
 assert.equal(b.content,'局部全文不可丢失');assert.equal(b.groupId,target.id);assert.deepEqual(b.position,{x:-200,y:450});
 assert.equal((await read('planning.decorations',{pageId:tx.mapping.page})).items[0].content,'原始疑问不可丢失');
 assert.ok((await s.indexes()).planning.nodeFiles[b.id].includes('新账本组'));
});

test('invalid legacy folder data fails explicitly without leaking TypeError or rewriting the backup',()=>{
 for(const patch of [{groups:{bad:null}},{nodes:{bad:null}},{decorations:[]},{groups:{bad:{id:'bad',parentId:'missing'}}}]){
  const board={groups:{},nodes:{},decorations:{},...patch},before=structuredClone(board);
  assert.throws(()=>scopePlanningFolders(board),{code:'INVALID_PLANNING'});assert.deepEqual(board,before);
 }
});

test('settings have one home; moving to another canvas keeps identity, relations, history and readable files',async t=>{
 const s=await fixture(t),page=await s.run('graph.page.create',{name:'皇城'}),group=await s.run('graph.group.create',{name:'守方',pageId:page.id});
 const a=await s.run('graph.create',{type:'character_card',name:'守卫',content:'完整人物设定',groupId:group.id,position:{x:20,y:90}}),b=await s.run('graph.create',{type:'world_entry',name:'城门',content:'完整地点设定'});
 const edge=await s.run('edge.create',{from:a.id,to:b.id,name:'守卫于'});
 assert.equal(a.pageId,page.id);assert.equal((await s.run('graph.list',{pageId:null})).length,1);
 assert.equal((await s.run('graph.list',{pageId:page.id})).length,1);assert.equal((await s.run('graph.list')).length,2);
 assert.equal((await s.run('edge.list',{pageId:page.id})).length,0);assert.equal((await s.run('edge.list',{nodeId:a.id}))[0].id,edge.id);
 await assert.rejects(s.run('graph.create',{type:'world_entry',name:'错图归类',groupId:group.id,pageId:null}),{code:'INVALID_INPUT'});
 await assert.rejects(s.run('graph.page.delete',{pageId:page.id,expectedRevision:page.revision,confirm:true}),{code:'PAGE_NOT_EMPTY'});
 await s.run('graph.move',{pageId:null,groupId:null,members:[{id:a.id,expectedRevision:1}]});
 const moved=await s.run('graph.get',{nodeId:a.id});assert.equal(moved.id,a.id);assert.equal(moved.content,a.content);assert.deepEqual(moved.position,a.position);
 assert.equal(moved.pageId,null);assert.equal(moved.groupId,null);assert.equal((await s.run('edge.list',{pageId:null})).length,1);
 assert.equal((await s.run('graph.history',{nodeId:a.id})).at(-1).kind,'organization');
 assert.equal((await s.run('graph.history',{nodeId:a.id,revision:1,includeContent:true}))[0].pageId,page.id);
 const restored=await s.run('graph.restore',{nodeId:a.id,expectedRevision:2,targetRevision:1});assert.equal(restored.pageId,page.id);assert.equal(restored.groupId,group.id);
 const full=(await s.store.load()).novels[s.novel.id];assert.deepEqual((await new Store(s.root).load()).novels[s.novel.id],full);
 const files=await s.indexes();assert.ok(files.memory[a.id].file.includes('皇城'));assert.ok(files.memory[a.id].file.includes('守方'));assert.ok(!files.memory[a.id].file.includes('人物/'));
});

test('folder creation and mixed card/folder layout validate every revision before committing',async t=>{
 const {run,store}=await fixture(t),a=await run('graph.create',{type:'world_entry',name:'甲',content:'甲原文'}),b=await run('graph.create',{type:'world_entry',name:'乙',content:'乙原文'});
 const before=await store.load();
 await assert.rejects(run('graph.group.create',{name:'不应留下',members:[{id:a.id,expectedRevision:1},{id:b.id,expectedRevision:9}]}),{code:'CONFLICT'});
 assert.deepEqual(await store.load(),before);
 const g=await run('graph.group.create',{name:'收纳',members:[{id:a.id,expectedRevision:1},{id:b.id,expectedRevision:1}]}),grouped=await store.load();
 await assert.rejects(run('graph.layout',{positions:[{nodeId:a.id,expectedRevision:2,position:{x:700,y:500}}],folders:[{groupId:g.id,expectedRevision:9,position:{x:0,y:0}}]}),{code:'CONFLICT'});
 assert.deepEqual(await store.load(),grouped);
 await run('graph.layout',{positions:[{nodeId:a.id,expectedRevision:2,position:{x:700,y:500}}],folders:[{groupId:g.id,expectedRevision:1,position:{x:0,y:0}}]});
 assert.equal((await run('graph.get',{nodeId:a.id})).content,'甲原文');assert.equal((await run('graph.history',{nodeId:b.id,revision:2,includeContent:true}))[0].content,'乙原文');
 const empty=await run('graph.group.create',{name:'空文件夹'});await run('graph.group.update',{groupId:empty.id,expectedRevision:1,position:{x:-700,y:90}});
 assert.deepEqual((await run('graph.groups')).find(g=>g.id===empty.id).position,{x:-700,y:90});
});

test('outer folder folding hides descendants and aggregates only true external edges; nested layout does not overlap siblings',async()=>{
 const groups=[{id:'outer',name:'阵营',revision:1},{id:'inner',name:'行动',parentId:'outer',revision:1},{id:'peer',name:'其他阵营',revision:1}];
 const nodes=[{id:'a',groupId:'inner',position:{x:100,y:100}},{id:'b',groupId:'inner',position:{x:500,y:100}},{id:'c',groupId:'outer',position:{x:100,y:500}},{id:'d',groupId:'peer',position:{x:1000,y:100}}];
 const edges=[{id:'ab',from:'a',to:'b'},{id:'ad',from:'a',to:'d'},{id:'bd',from:'b',to:'d'}];
 const folders=folderObjects(groups,nodes),view=foldProjection([...nodes,...folders],edges,['inner','outer']);
 assert.deepEqual(new Set(view.objects.map(n=>n.id)),new Set(['outer','peer','d']));
 assert.equal(view.owner.get('a'),'outer');assert.equal(view.owner.get('inner'),'outer');
 assert.equal(view.edges.length,1);assert.deepEqual(view.edges[0].originalIds,['ad','bd']);assert.equal(view.edges[0].from,'outer');
 const positions=await arrangeFolders(nodes,edges,groups),arranged=folderObjects(groups,nodes,positions),outer=objectBox(arranged.find(g=>g.id==='outer')),peer=objectBox(arranged.find(g=>g.id==='peer'));
 assert.ok(outer.x+outer.width<=peer.x||peer.x+peer.width<=outer.x||outer.y+outer.height<=peer.y||peer.y+peer.height<=outer.y);
 for(const n of nodes.filter(n=>n.groupId!=='peer'))assert.ok(inside(outer,objectBox(n,positions)));
 const folded=await arrangeFolders(nodes,edges,groups,['inner']);assert.equal(folded.b.x-folded.a.x,400);assert.equal(folded.b.y-folded.a.y,0);
});

test('directory reorder and local layout remain page scoped without moving unrelated cards',async t=>{
 const s=await fixture(t),page=await s.run('graph.page.create',{name:'港口'}),g=await s.run('graph.group.create',{name:'港口人物',pageId:page.id});
 const a=await s.run('graph.create',{type:'character_card',name:'甲',groupId:g.id,position:{x:60,y:60}}),b=await s.run('graph.create',{type:'world_entry',name:'乙',groupId:g.id,position:{x:400,y:60}}),fixed=await s.run('graph.create',{type:'world_entry',name:'另一图',position:{x:60,y:60}});
 const items=await s.run('graph.list',{pageId:page.id}),groups=await s.run('graph.groups',{pageId:page.id});
 await s.run('graph.directory.move',{pageId:page.id,nodeId:b.id,groupId:g.id,beforeId:a.id,expectedDirectory:directorySnapshot(items,groups)});
 assert.deepEqual((await s.run('graph.list',{pageId:page.id})).map(n=>n.id),[b.id,a.id]);assert.deepEqual((await s.run('graph.get',{nodeId:b.id})).position,b.position);
 await s.run('graph.arrange',{pageId:page.id,mode:'all',members:[{id:a.id,expectedRevision:1},{id:b.id,expectedRevision:1}]});
 assert.deepEqual((await s.run('graph.get',{nodeId:fixed.id})),fixed);
 const tx=await s.apply([{op:'group.create',ref:'group',value:{name:'局部'}},{op:'node.create',ref:'a',value:{title:'甲',groupId:'group',position:{x:50,y:50}}},{op:'node.create',ref:'b',value:{title:'外部保留',position:{x:50,y:50}}}]);
 const sequence=(await s.run('planning.list')).sequence;await s.run('planning.layout',{expectedSequence:sequence,nodeIds:[tx.mapping.group],mode:'all'});
 assert.deepEqual((await s.run('planning.get',{nodeId:tx.mapping.b})).node.position,{x:50,y:50});
 const moved=(await s.run('planning.get',{nodeId:tx.mapping.a})).node.position;assert.ok(moved.x>=322||moved.y>=242);
});

test('page export/copy remaps folders, nodes, history and directory order including empty canvases',async t=>{
 const s=await fixture(t),page=await s.run('graph.page.create',{name:'设定专页'}),group=await s.run('graph.group.create',{name:'阵营',pageId:page.id}),child=await s.run('graph.group.create',{name:'守方',parentId:group.id});
 const node=await s.run('graph.create',{type:'character_card',name:'守卫',content:'人物详细正文',groupId:child.id});
 await s.run('graph.update',{nodeId:node.id,expectedRevision:1,content:'人物详细正文第二版'});
 const transfer=new TransferService(s.store),exported=await transfer.export({selection:{kind:'memory',novelId:s.novel.id,pageIds:[page.id]}}),file={name:exported.filename,text:exported.content};
 const target=await s.run('novel.create',{title:'接收作品'}),options={mode:'copy',targetId:target.id},preview=await transfer.preview({file,options});
 await transfer.import({file,options,proof:preview.proof,requestId:crypto.randomUUID()},s.actor);
 const copied=(await new Store(s.root).load()).novels[target.id],card=Object.values(copied.nodes)[0],g=copied.memoryGroups[card.groupId];
 assert.notEqual(card.id,node.id);assert.notEqual(card.pageId,page.id);assert.equal(copied.memoryPages[card.pageId].name,'设定专页');assert.equal(g.name,'守方');assert.equal(copied.memoryGroups[g.parentId].name,'阵营');assert.equal(g.pageId,card.pageId);
 assert.deepEqual(card.versions.map(v=>v.content),['人物详细正文','人物详细正文第二版']);assert.ok(card.versions.every(v=>v.pageId===card.pageId));
 const empty=await s.run('graph.page.create',{name:'空沙盘'}),emptyFile=await transfer.export({selection:{kind:'memory',novelId:s.novel.id,pageIds:[empty.id]}});
 assert.equal(Object.values(JSON.parse(emptyFile.content).payload.projects[0].memoryPages)[0].name,'空沙盘');
});
