import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/application/store.js';
import {arrangeCanvas} from '../src/domain/canvas/layout.ts';
import {objectBox,foldProjection,frameMembers,portPoint} from '../src/domain/canvas/model.ts';
import {routeEdges,routeJunctions,segmentClear} from '../src/domain/canvas/routing.ts';
import {TransferService} from '../src/application/transfer/service.ts';

async function fixture(t){const root=await mkdtemp(join(tmpdir(),'cuigengji-readable-'));t.after(()=>rm(root,{recursive:true,force:true}));const store=new Store(root),actor={kind:'agent',sessionId:'canvas-writer'},novel=await store.dispatch('novel.create',{title:'隔离画布'},actor);await store.dispatch('novel.focus',{novelId:novel.id},actor);const run=(action,args={})=>store.dispatch(action,args,actor);return {store,run,actor,novel,apply:operations=>run('planning.apply',{operations,requestId:randomUUID()})};}

test('shared endpoints bundle at visible junctions while unrelated crossings, relation types and parallel edges retain their identities',()=>{
  const boxes=[objectBox({id:'source',position:{x:0,y:200}}),objectBox({id:'upper',position:{x:650,y:0}}),objectBox({id:'lower',position:{x:650,y:400}})];
  const outgoing=[{id:'a',from:'source',to:'upper',type:'next'},{id:'b',from:'source',to:'lower',type:'next'}];
  for(const edges of [outgoing,outgoing.map(edge=>({...edge,from:edge.to,to:edge.from}))]){
    const routes=routeEdges(boxes,edges,'relation'),junctions=routeJunctions(routes);
    assert.equal(junctions.length,1);assert.deepEqual(junctions[0].edgeIds.sort(),['a','b']);
    assert.deepEqual(routeEdges([...boxes].reverse(),[...edges].reverse(),'relation'),routes);
    for(const route of routes){assert.equal(route.blocked,false);assert.equal(route.id,edges.find(edge=>edge.id===route.id).id);assert.ok(route.hitPath);assert.ok(route.labelPoints);for(let i=1;i<route.points.length;i++)assert.ok(segmentClear(route.points[i-1],route.points[i],boxes));}
  }
  const mixed=outgoing.map((edge,i)=>({...edge,type:i?'alternative':'next'})),original=structuredClone(mixed);
  assert.equal(routeJunctions(routeEdges(boxes,mixed)).length,1);assert.deepEqual(mixed,original);
  assert.deepEqual(routeEdges(boxes,mixed).map(route=>route.id).sort(),mixed.map(edge=>edge.id).sort());
  assert.deepEqual(routeJunctions(routeEdges(boxes,[outgoing[0],{...outgoing[0],id:'parallel'}])),[]);
  const crossingBoxes=[objectBox({id:'a',position:{x:0,y:0}}),objectBox({id:'b',position:{x:650,y:400}}),objectBox({id:'c',position:{x:0,y:400}}),objectBox({id:'d',position:{x:650,y:0}})];
  assert.deepEqual(routeJunctions(routeEdges(crossingBoxes,[{id:'ab',from:'a',to:'b'},{id:'cd',from:'c',to:'d'}])),[]);
});

test('compact story branches show a split even when one child is aligned with the source',()=>{
  const boxes=[objectBox({id:'source',position:{x:0,y:200}}),objectBox({id:'aligned',position:{x:320,y:200}}),objectBox({id:'branch',position:{x:320,y:500}})];
  const edges=[{id:'main',from:'source',to:'aligned',type:'next'},{id:'branch',from:'source',to:'branch',type:'next'}];
  const routes=routeEdges(boxes,edges),hubs=routeJunctions(routes);
  assert.equal(hubs.length,1);assert.equal(hubs[0].kind,'split');assert.deepEqual(hubs[0].edgeIds.sort(),['branch','main']);
  assert.ok(hubs[0].point.x>248&&hubs[0].point.x<298);
  assert.deepEqual(routeEdges([...boxes].reverse(),[...edges].reverse()),routes);
  for(const route of routes){assert.equal(route.blocked,false);assert.ok(route.hitPath);for(let i=1;i<route.points.length;i++)assert.ok(segmentClear(route.points[i-1],route.points[i],boxes));}
});

test('compact many-to-many links keep distinct split and merge hubs without backtracking or changing edges',()=>{
  const boxes=[objectBox({id:'a',position:{x:0,y:0}}),objectBox({id:'b',position:{x:0,y:350}}),objectBox({id:'c',position:{x:320,y:0}}),objectBox({id:'d',position:{x:320,y:350}})];
  const edges=[['a','c'],['a','d'],['b','c'],['b','d']].map(([from,to],i)=>({id:`edge-${i}`,from,to,type:i%2?'alternative':'next'})),original=structuredClone({boxes,edges});
  const routes=routeEdges(boxes,edges),hubs=routeJunctions(routes);
  assert.equal(hubs.filter(hub=>hub.kind==='split').length,2);assert.equal(hubs.filter(hub=>hub.kind==='merge').length,2);
  assert.deepEqual(routeEdges([...boxes].reverse(),[...edges].reverse()),routes);
  for(const route of routes){assert.equal(route.blocked,false);assert.equal(route.junctions.length,2);for(let i=1;i<route.points.length;i++){assert.ok(segmentClear(route.points[i-1],route.points[i],boxes));assert.ok(route.points[i].x>=route.points[i-1].x,'shared trunks must not double back');}}
  assert.deepEqual({boxes,edges},original);
});

test('layered layout handles parallel convergence and fixed-position routes avoid all card interiors',async()=>{
  const objects=Array.from({length:9},(_,i)=>({id:`n${i}`})),edges=[[0,3],[1,4],[2,5],[3,6],[4,6],[5,6],[6,7],[2,8],[8,7],[0,5]].map(([from,to],i)=>({id:`edge${i}`,from:`n${from}`,to:`n${to}`}));
  const positions=await arrangeCanvas(objects,edges),boxes=objects.map(n=>objectBox(n,positions));
  assert.equal(new Set([0,1,2].map(i=>positions[`n${i}`].y)).size,3);
  for(const [i,a] of boxes.entries())for(const b of boxes.slice(i+1))assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
  for(const route of routeEdges(boxes,edges)){assert.equal(route.blocked,false);for(let i=1;i<route.points.length;i++)assert.ok(segmentClear(route.points[i-1],route.points[i],boxes),`route ${route.id} crosses a card`);}
  const dragged=boxes.map(b=>b.id==='n4'?{...b,x:b.x+120,y:b.y+240}:b);
  for(const route of routeEdges(dragged,edges))if(!route.blocked)for(let i=1;i<route.points.length;i++)assert.ok(segmentClear(route.points[i-1],route.points[i],dragged));
});

test('frame membership and folded external links are exact, with original IDs retained',()=>{
  const objects=[{id:'a',position:{x:20,y:100}},{id:'b',position:{x:400,y:100}},{id:'c',position:{x:800,y:100}},{id:'frame',kind:'frame',position:{x:0,y:0},width:700,height:300,members:['a','b']}];
  const edges=[{id:'ab',from:'a',to:'b'},{id:'ac',from:'a',to:'c'},{id:'bc',from:'b',to:'c'}],original=structuredClone({objects,edges});
  const folded=foldProjection(objects,edges,['frame']);assert.equal(folded.objects.length,2);assert.equal(folded.edges.length,1);assert.deepEqual(folded.edges[0].originalIds,['ac','bc']);assert.equal(folded.edges[0].count,2);
  assert.deepEqual(frameMembers(objects[3],objects,{a:{x:-1000,y:-1000}}),['a','b']);
  assert.equal(foldProjection(objects,edges,[]).edges.length,3);assert.deepEqual({objects,edges},original);
  const legacy={...objects[3]};delete legacy.members;assert.deepEqual(frameMembers(legacy,objects),['a','b']);
});

test('relation links use facing ports in every direction; reverse flow and obstacles keep clean deterministic paths',()=>{
  const a=objectBox({id:'a',position:{x:0,y:0}});
  for(const [position,from,to] of [[{x:460,y:0},'right','left'],[{x:-460,y:0},'left','right'],[{x:0,y:360},'bottom','top'],[{x:0,y:-360},'top','bottom']]){
    const b=objectBox({id:'b',position}),boxes=[a,b],edges=[{id:'ab',from:'a',to:'b'}];
    const [route]=routeEdges(boxes,edges,'relation');
    assert.equal(route.blocked,false);assert.equal(route.startSide,from);assert.equal(route.endSide,to);
    assert.deepEqual(route.points[0],portPoint(a,from));assert.deepEqual(route.points.at(-1),portPoint(b,to));
    assert.equal(route.points.length,2); // Aligned relationships don't need decorative detours.
    assert.deepEqual(routeEdges(boxes,edges,'relation'),[route]);
  }
  const boxes=[a,objectBox({id:'b',position:{x:800,y:0}}),objectBox({id:'obstacle',position:{x:400,y:0}}),objectBox({id:'c',position:{x:0,y:400}})];
  const parallel=routeEdges([a,objectBox({id:'b',position:{x:460,y:0}})],[{id:'one',from:'a',to:'b'},{id:'two',from:'a',to:'b'},{id:'three',from:'a',to:'b'}],'relation');
  assert.equal(new Set(parallel.map(r=>r.path)).size,3);assert.ok(parallel.every(r=>!r.blocked));
  const edges=[{id:'crossing',from:'a',to:'b'},{id:'reverse',from:'b',to:'a'},{id:'up',from:'c',to:'b'}];
  for(const mode of ['flow','relation']){
    const routes=routeEdges(boxes,edges,mode);
    assert.deepEqual(routes,routeEdges([...boxes].reverse(),[...edges].reverse(),mode));
    for(const route of routes){assert.equal(route.blocked,false);assert.ok(route.points.length<=8);for(let i=1;i<route.points.length;i++)assert.ok(segmentClear(route.points[i-1],route.points[i],boxes));}
    if(mode==='flow')assert.ok(routes.every(r=>r.startSide==='right'&&r.endSide==='left'));
  }
});

test('AI layout only places new work by default; CAS, retry, full text and transactional undo are preserved',async t=>{
  const {run,apply}=await fixture(t),tx=await apply([
    {op:'node.create',ref:'existing',value:{title:'作者已经摆好的节点',content:'不能丢失的全文',position:{x:-700,y:190}}},
    {op:'node.create',ref:'a',value:{title:'主角潜入'}},{op:'node.create',ref:'b',value:{title:'守方设伏'}},{op:'node.create',ref:'end',value:{title:'码头冲突'}},
    {op:'decoration.create',ref:'frame',value:{kind:'frame',title:'主角行动',members:['a'],moveContents:true}},
    {op:'edge.create',value:{from:'a',to:'end'}},{op:'edge.create',value:{from:'b',to:'end'}},
  ]);
  const before=(await run('planning.get',{nodeId:tx.mapping.existing})).node;
  const args={pageId:null,expectedSequence:tx.sequence,requestId:randomUUID()},layout=await run('planning.layout',args);
  assert.deepEqual(await run('planning.layout',args),layout);
  assert.deepEqual((await run('planning.get',{nodeId:before.id})).node,before);
  for(const ref of ['a','b','end'])assert.ok((await run('planning.get',{nodeId:tx.mapping[ref]})).node.position);
  const frame=(await run('planning.decorations')).items[0];assert.deepEqual(frame.members,[tx.mapping.a]);assert.equal(frame.layoutPending,false);
  const snapshot=await run('planning.list');await assert.rejects(run('planning.layout',{...args,requestId:randomUUID(),mode:'all'}),{code:'CONFLICT'});assert.equal((await run('planning.list')).sequence,snapshot.sequence);
  await run('planning.revert',{transactionId:layout.transactionId,requestId:randomUUID()});assert.equal((await run('planning.get',{nodeId:tx.mapping.a})).node.position,undefined);assert.equal((await run('planning.decorations')).items[0].layoutPending,true);
});

test('a new frame can wrap already placed members without moving them, and invalid IDs are rejected atomically',async t=>{
  const {run,apply}=await fixture(t),tx=await apply([{op:'node.create',ref:'a',value:{title:'原有场景',position:{x:-500,y:-200}}},{op:'decoration.create',ref:'frame',value:{kind:'frame',members:['a']}}]);
  await run('planning.layout',{expectedSequence:tx.sequence,requestId:randomUUID()});const node=(await run('planning.get',{nodeId:tx.mapping.a})).node,frame=(await run('planning.decorations')).items[0];
  assert.deepEqual(node.position,{x:-500,y:-200});assert.deepEqual(frameMembers(frame,[node,frame]),[node.id]);assert.ok(frame.position.x<node.position.x&&frame.position.y<node.position.y);
  const before=await run('planning.list');await assert.rejects(apply([{op:'decoration.create',value:{kind:'frame',members:['unknown']}}]),{code:'INVALID_PLANNING'});assert.equal((await run('planning.list')).sequence,before.sequence);
  const page=await run('planning.page.create',{name:'另一讨论页',requestId:randomUUID()});await apply([{op:'node.update',id:node.id,expectedRevision:node.revision,value:{pageId:page.id}}]);assert.deepEqual((await run('planning.decorations',{pageId:null})).items[0].members,[]);
});

test('setting arrangement checks every revision, keeps bodies and leaves positioned cards untouched in missing mode',async t=>{
  const {run}=await fixture(t),a=await run('graph.create',{name:'作者的位置',type:'character_card',content:'既有全文',position:{x:80,y:100}}),b=await run('graph.create',{name:'新组织',type:'world_entry',content:'组织全文'});
  await run('edge.create',{from:a.id,to:b.id,name:'调查'});
  const args={requestId:randomUUID(),members:[{id:a.id,expectedRevision:1},{id:b.id,expectedRevision:1}]};const result=await run('graph.arrange',args);assert.equal(result.length,1);assert.deepEqual(await run('graph.arrange',args),result);
  assert.deepEqual(await run('graph.get',{nodeId:a.id}),a);assert.equal((await run('graph.get',{nodeId:b.id})).content,'组织全文');
  await assert.rejects(run('graph.arrange',{...args,mode:'all',requestId:randomUUID()}),{code:'CONFLICT'});assert.deepEqual((await run('graph.get',{nodeId:a.id})).position,a.position);
});

test('copy and partial-page transfer remap frame member IDs, and deletion/revert maintain the membership',async t=>{
  const {run,apply,store,novel}=await fixture(t),tx=await apply([{op:'node.create',ref:'a',value:{title:'事件'}},{op:'decoration.create',ref:'note',value:{kind:'note',title:'问题'}},{op:'decoration.create',ref:'frame',value:{kind:'frame',members:['a','note']}}]);
  const service=new TransferService(store),file=await service.export({selection:{kind:'planning',novelId:novel.id,pageIds:[null]}}),input={name:file.filename,text:file.content},options={mode:'copy',title:'复制页'};
  const preview=await service.preview({file:input,options});assert.equal(preview.valid,true);await service.import({file:input,options,proof:preview.proof,requestId:randomUUID()},{kind:'human',sessionId:'transfer'});
  const books=await run('novel.list'),copy=books.find(n=>n.id!==novel.id),copied=await run('planning.decorations',{novelId:copy.id}),frame=copied.items.find(d=>d.kind==='frame'),node=(await run('planning.list',{novelId:copy.id})).items[0],note=copied.items.find(d=>d.kind==='note');assert.deepEqual(new Set(frame.members),new Set([node.id,note.id]));assert.ok(!frame.members.some(id=>Object.values(tx.mapping).includes(id)));
  const removed=await apply([{op:'node.delete',id:tx.mapping.a,expectedRevision:1,confirm:true}]);assert.deepEqual((await run('planning.decorations')).items.find(d=>d.id===tx.mapping.frame).members,[tx.mapping.note]);
  await run('planning.revert',{transactionId:removed.transactionId,requestId:randomUUID()});assert.deepEqual((await run('planning.decorations')).items.find(d=>d.id===tx.mapping.frame).members,[tx.mapping.a,tx.mapping.note]);
  assert.equal((await run('planning.get',{nodeId:tx.mapping.a})).node.deleted,false);
});

test('a folded frame cannot bypass the transaction limit by hiding more than 200 layout objects',async t=>{
  const {run,apply}=await fixture(t),refs=Array.from({length:199},(_,i)=>`event-${i}`);
  const first=await apply([...refs.map(ref=>({op:'node.create',ref,value:{title:ref,content:'原讨论正文'}})),{op:'decoration.create',ref:'frame',value:{kind:'frame',members:refs}}]);
  const next=await apply([{op:'node.create',ref:'extra',value:{title:'新增事件'}},{op:'decoration.update',id:first.mapping.frame,expectedRevision:1,value:{members:[...refs.map(ref=>first.mapping[ref]),'extra']}}]);
  const before=await run('planning.list');
  await assert.rejects(run('planning.layout.get',{mode:'all',expectedSequence:next.sequence,nodeIds:[first.mapping.frame],foldedIds:[first.mapping.frame]}),error=>error.code==='INVALID_INPUT'&&error.message.includes('200'));
  await assert.rejects(run('planning.layout',{mode:'all',expectedSequence:next.sequence,nodeIds:[first.mapping.frame],requestId:randomUUID()}),{code:'INVALID_INPUT'});
  assert.deepEqual(await run('planning.list'),before);assert.equal((await run('planning.get',{nodeId:first.mapping[refs[0]]})).node.content,'原讨论正文');
});
