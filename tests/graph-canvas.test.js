import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/core/store.js';
import {toScreen,toWorld,zoomAt,fitCamera,contains,intersects} from '../src/client/shared/graph-geometry.ts';
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'cuigengji-canvas-'));
 t.after(()=>{if(!resolve(root).startsWith(resolve(tmpdir())+sep))throw new Error('Unexpected fixture path');return rm(root,{recursive:true,force:true});});
 const store=new Store(root),novel=await store.dispatch('novel.create',{title:'画布验收'}),actor={kind:'human',sessionId:randomUUID()};
 await store.dispatch('binding.set',{novelId:novel.id},actor);
 return {root,store,run:(action,args={})=>store.dispatch(action,args,actor)};
}
test('world coordinates remain stable around the pointer through pan and zoom',()=>{
 const camera={x:18000,y:-9000,zoom:1},anchor={x:670,y:345},world=toWorld(anchor,camera);
 for(const zoom of [.35,.8,1.8]){const next=zoomAt(camera,zoom,anchor);assert.deepEqual(toScreen(world,next),anchor);const restored=toWorld(toScreen({x:-80000,y:120000},next),next);assert.ok(Math.abs(restored.x+80000)<1e-8&&Math.abs(restored.y-120000)<1e-8);}
 const fitted=fitCamera([{x:-1000,y:-200,width:224,height:144},{x:-500,y:80,width:224,height:144}],1024,700);
 assert.ok(fitted&&fitted.zoom<=1&&fitted.zoom>=.35);assert.equal(fitCamera([],1024,700),null);
 assert.ok(contains({x:-100,y:-100,width:600,height:500},{x:0,y:0,width:224,height:144}));
 assert.ok(intersects({x:0,y:0,width:100,height:100},{x:80,y:80,width:224,height:144}));
});
test('setting layout is atomic, revision checked, idempotent and preserves full text',async t=>{
 const {run}=await fixture(t);
 const a=await run('graph.create',{type:'character_card',name:'林照',content:'人物全文'}),b=await run('graph.create',{type:'world_entry',name:'雨城',content:'世界全文'});
 const args={requestId:randomUUID(),positions:[{nodeId:a.id,expectedRevision:1,position:{x:-500,y:-240}},{nodeId:b.id,expectedRevision:1,position:{x:-100,y:120}}]};
 const moved=await run('graph.layout',args);assert.deepEqual(await run('graph.layout',args),moved);
 await assert.rejects(run('graph.layout',{positions:[{nodeId:a.id,expectedRevision:2,position:{x:20,y:20}},{nodeId:b.id,expectedRevision:1,position:{x:50,y:50}}]}),{code:'CONFLICT'});
 assert.deepEqual((await run('graph.get',{nodeId:a.id})).position,{x:-500,y:-240});assert.equal((await run('graph.get',{nodeId:a.id})).content,'人物全文');
 const backup=await run('novel.export'),target=new Store(join((await fixture(t)).root,'restored'));await target.dispatch('novel.import',{backup});
 assert.deepEqual((await target.dispatch('graph.get',{novelId:backup.novel.id,nodeId:a.id})).position,{x:-500,y:-240});
});
test('setting create-and-connect and batch copy/delete fail without partial data',async t=>{
 const {run}=await fixture(t),a=await run('graph.create',{type:'character_card',name:'林照',content:'完整人设'});
 await assert.rejects(run('graph.continue',{nodeId:a.id,expectedRevision:1,value:{type:'invalid',name:'无效'}}),{code:'INVALID_INPUT'});
 assert.equal((await run('graph.list')).length,1);
 const result=await run('graph.continue',{nodeId:a.id,expectedRevision:1,side:'in',value:{type:'world_entry',name:'书铺',content:'完整设定',position:{x:-350,y:50}}});
 assert.equal(result.edge.from,result.node.id);assert.equal(result.edge.to,a.id);
 await assert.rejects(run('graph.duplicate',{members:[{id:a.id,expectedRevision:1},{id:result.node.id,expectedRevision:0}]}),{code:'CONFLICT'});
 assert.equal((await run('graph.list')).length,2);
 const copies=await run('graph.duplicate',{members:[{id:a.id,expectedRevision:1},{id:result.node.id,expectedRevision:1}]});assert.equal(copies.nodes.length,2);assert.equal(copies.edges.length,1);
 await assert.rejects(run('graph.remove',{confirm:true,members:[{id:a.id,expectedRevision:1},{id:result.node.id,expectedRevision:0}]}),{code:'CONFLICT'});
 assert.equal((await run('graph.list')).length,4);
 const edge2=await run('edge.create',{from:a.id,to:result.node.id});
 await assert.rejects(run('edge.disconnect',{confirm:true,edges:[{id:result.edge.id,expectedRevision:1},{id:edge2.id,expectedRevision:0}]}),{code:'CONFLICT'});
 assert.equal((await run('edge.get',{edgeId:result.edge.id})).deleted,false);
});
test('planning negative layouts, frame membership preference and reverse continuation survive backup',async t=>{
 const {run}=await fixture(t),apply=operations=>run('planning.apply',{requestId:randomUUID(),operations});
 const tx=await apply([{op:'node.create',ref:'scene',value:{title:'进入钟楼',content:'完整情节',position:{x:-300,y:-80}}},{op:'decoration.create',ref:'frame',value:{kind:'frame',position:{x:-340,y:-170},width:560,height:360,moveContents:true}}]);
 const branch=await run('planning.continue',{nodeId:tx.mapping.scene,expectedRevision:1,side:'in',requestId:randomUUID(),value:{title:'收到信',position:{x:-640,y:-80}}});
 const source=await run('planning.get',{nodeId:tx.mapping.scene});assert.equal(source.flow.previous[0].id,branch.node.id);
 await assert.rejects(apply([{op:'node.update',id:tx.mapping.scene,expectedRevision:1,value:{position:{x:-900,y:200}}},{op:'decoration.update',id:tx.mapping.frame,expectedRevision:0,value:{position:{x:-940,y:100}}}]),{code:'CONFLICT'});
 assert.deepEqual((await run('planning.get',{nodeId:tx.mapping.scene})).node.position,{x:-300,y:-80});
 const backup=await run('novel.export'),target=new Store(join((await fixture(t)).root,'restored'));await target.dispatch('novel.import',{backup});
 assert.equal((await target.dispatch('planning.decorations',{novelId:backup.novel.id})).items[0].moveContents,true);
 const legacy=structuredClone(backup);delete legacy.novel.planning.decorations[tx.mapping.frame].moveContents;
 const older=new Store(join((await fixture(t)).root,'older'));await older.dispatch('novel.import',{backup:legacy});
 assert.equal((await older.dispatch('planning.decorations',{novelId:backup.novel.id})).items[0].moveContents,undefined);
});
