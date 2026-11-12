import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/core/store.js';
import {applyVariablePatch} from '../src/domain/variables/patch.ts';
import {parseVariableUpdates,renderVariables,importVariableSource} from '../src/domain/variables/tavern.ts';
import {importPreset} from '../src/domain/preset/index.js';
import {TransferService} from '../src/application/transfer/service.ts';

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'cg-variables-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),actor={kind:'human',sessionId:'author'},novel=await store.dispatch('novel.create',{title:'变量合成作品'},actor);
  const run=(action,args={},who=actor)=>store.dispatch(action,{novelId:novel.id,...args},who);
  const config=await run('variables.configure',{baseRevision:0,enabled:true});
  const patch=async(operations,options={},who=actor)=>run('variables.patch',{baseRevision:(await run('variables.config')).revision,anchor:{kind:'initial'},operations,requestId:crypto.randomUUID(),...options},who);
  return {root,store,actor,novel,run,patch,config};
}
test('optional variables persist, retry increments once and travel with a full novel backup',async t=>{
  const {root,run,patch,novel,actor}=await fixture(t);
  await patch([{op:'set',path:'/主角',value:{等级:1,背包:['药']}}]);
  const args={anchor:{kind:'initial'},baseRevision:2,operations:[{op:'inc',path:'/主角/等级',value:2}],requestId:'once'};
  const first=await run('variables.patch',args);assert.deepEqual(await run('variables.patch',args),first);
  const restarted=new Store(root);assert.equal((await restarted.dispatch('variables.read',{novelId:novel.id,path:'/主角/等级'},actor)).value,3);
  const backup=await run('novel.export');assert.equal(backup.novel.variables.commits.length,2);
  const targetRoot=await mkdtemp(join(tmpdir(),'cg-variables-copy-'));t.after(()=>rm(targetRoot,{recursive:true,force:true}));
  const copy=new Store(targetRoot);await copy.dispatch('novel.import',{backup},actor);
  assert.deepEqual((await copy.dispatch('variables.read',{novelId:novel.id},actor)).data,(await run('variables.read')).data);
  const library=JSON.parse(await readFile(join(root,'library.json'),'utf8'));assert.ok(library);
});
test('concurrent disjoint edits merge; overlapping paths and array index shifts conflict',async t=>{
  const {run,patch}=await fixture(t);await patch([{op:'set',path:'',value:{hp:10,gold:0,bag:['a','b']}}]);
  const baseRevision=(await run('variables.read')).revision;
  await patch([{op:'inc',path:'/hp',value:1}]);
  await patch([{op:'inc',path:'/gold',value:1}],{baseRevision});
  await assert.rejects(patch([{op:'set',path:'/hp',value:20}],{baseRevision}),{code:'CONFLICT'});
  const old=(await run('variables.read')).revision;await patch([{op:'add',path:'/bag/0',value:'x'}]);
  await assert.rejects(patch([{op:'set',path:'/bag/1',value:'z'}],{baseRevision:old}),{code:'CONFLICT'});
  assert.deepEqual((await run('variables.read')).data,{hp:11,gold:1,bag:['x','a','b']});
});
test('chapter positions use fractional ordering; earlier changes invalidate future without erasing history',async t=>{
  const {run,patch}=await fixture(t),a=await run('chapter.create',{title:'前文',content:'正文',order:1}),b=await run('chapter.create',{title:'后文',content:'正文',order:1.1});
  const at=(ch,position='end')=>({kind:'chapter',chapterId:ch.id,chapterRevision:ch.revision,position});
  await patch([{op:'set',path:'/等级',value:1}]);
  await patch([{op:'set',path:'/等级',value:2}],{anchor:at(a)});
  const future=await patch([{op:'set',path:'/等级',value:99}],{anchor:at(b,'start')});
  assert.equal((await run('variables.read',{chapterId:a.id,position:'end'})).data.等级,2);
  await patch([{op:'set',path:'/等级',value:3}],{anchor:at(a)});
  const current=await run('variables.read');assert.equal(current.data.等级,3);assert.ok(current.stale.some(s=>s.id===future.snapshotId));
  assert.equal((await run('variables.read',{snapshotId:future.snapshotId})).data.等级,99);
  await run('chapter.update',{chapterId:a.id,expectedRevision:a.revision,content:'修订的正文'});
  assert.equal((await run('variables.read')).data.等级,1);
  assert.ok((await run('variables.history')).items.some(c=>c.stale));
  await assert.rejects(patch([{op:'set',path:'/等级',value:4}],{anchor:at(a)}),{code:'CONFLICT'});
  const page=await run('variables.history',{limit:1});assert.equal(page.items.length,1);assert.equal(page.nextOffset,1);assert.equal((await run('variables.history',{limit:1,offset:1})).items[0].revision,page.items[0].revision-1);
});
test('session drafts are isolated and renders never leak a future session value into earlier chapters',async t=>{
  const {run,patch}=await fixture(t),a=await run('chapter.create',{title:'开篇',content:'a',order:0}),b=await run('chapter.create',{title:'结尾',content:'b',order:1});
  await patch([{op:'set',path:'/name',value:'甲'}],{scope:'session'});
  await patch([{op:'set',path:'/name',value:'后来的甲'}],{scope:'session',anchor:{kind:'chapter',chapterId:b.id,chapterRevision:1,position:'end'}});
  assert.deepEqual((await run('variables.read',{scope:'session'},{kind:'agent',sessionId:'other'})).data,{});
  assert.equal((await run('variables.render',{chapterId:a.id,text:'{{getvar::name}}'})).content,'甲');
  await patch([{op:'set',path:'/shared',value:4}]);assert.equal((await run('variables.read',{}, {kind:'agent',sessionId:'other'})).data.shared,4);
  await assert.rejects(run('variables.read',{scope:'session'},{kind:'agent'}),/会话身份/);
});
test('pure render, preview, safe MVU parsing, schema checking and initialization import keep source data intact',async t=>{
  const {run,patch}=await fixture(t);await patch([{op:'set',path:'',value:{stat_data:{等级:1},保留:'原值'}}]);
  const before=await run('novel.export');await run('variables.preview',{baseRevision:2,anchor:{kind:'initial'},operations:[{op:'inc',path:'/stat_data/等级',value:1}]});
  const rendered=await run('variables.render',{text:'等级{{var::stat_data.等级}} {{setvar::x::2}} <% throw 1 %>'});assert.match(rendered.content,/等级1/);assert.ok(rendered.warnings.length);
  assert.deepEqual((await run('novel.export')).novel.variables,before.novel.variables);
  const operations=parseVariableUpdates("_.set('stat_data.等级', 1, 2); _.insert('stat_data.背包', '药');").operations;
  assert.equal(operations[0].op,'test');assert.deepEqual(applyVariablePatch({stat_data:{等级:1,背包:[]}},operations),{stat_data:{等级:2,背包:['药']}});
  assert.throws(()=>parseVariableUpdates("_.set('x', process.exit())"),/字面量/);
  assert.throws(()=>applyVariablePatch({},[{op:'set',path:'/__proto__/polluted',value:true}]),/保留/);
  assert.deepEqual(applyVariablePatch({a:[1,2]},[{op:'copy',from:'/a/0',path:'/a/1'}]),{a:[1,1,2]});
  assert.throws(()=>applyVariablePatch({hp:1},[{op:'set',path:'/hp',value:11}],[{path:'/hp',name:'体力',type:'number',schema:{maximum:10}}]),/范围/);
  const input={entries:[{name:'[InitVar]',content:'等级: 5\n背包:\n  - 丹药'},{name:'macro',content:'{{setglobalvar::天气::晴}} {{setvar::name::作者}}'}]};
  const preview=await run('variables.importPreview',{input});assert.equal(preview.story.stat_data.等级,5);
  await assert.rejects(run('variables.import',{baseRevision:2,input,digest:preview.digest}),/确认/);
  await run('variables.import',{baseRevision:2,input,digest:preview.digest,globalScope:'story'});
  const after=await run('variables.read');assert.equal(after.data.保留,'原值');assert.equal(after.data.stat_data.等级,5);
  const repeated=await run('variables.import',{baseRevision:after.revision,input,digest:preview.digest,globalScope:'story'});assert.equal(repeated.duplicate,true);
  assert.equal((await run('variables.render',{text:'{{getglobalvar::天气}} {{getvar::name}}'})).content,'晴 作者');
  assert.equal(importVariableSource(input).digest,preview.digest);
});
test('a session keeps the preset template while rendering current story variables',async t=>{
  const {run,patch,actor}=await fixture(t);await patch([{op:'set',path:'/天气',value:'晴'}]);
  const writer={kind:'agent',sessionId:actor.sessionId}, read=args=>run('preset.read',args,writer);
  const saved=await run('preset.set',{expectedRevision:0,preset:{...importPreset({content:'天气：{{var::天气}}'}),enabled:true}});
  assert.equal((await read()).content,'天气：晴');
  assert.equal((await run('preset.get')).blocks[0].content,'天气：{{var::天气}}');
  const chapter=await run('chapter.create',{title:'测试章'});
  await assert.rejects(read({chapterId:chapter.id,chapterRevision:chapter.revision+1}),/版本无效/);
  await run('preset.set',{expectedRevision:saved.revision,preset:{...saved,blocks:[{...saved.blocks[0],content:'天气已经变了。'}]}});
  await patch([{op:'set',path:'/天气',value:'雨'}]);
  await run('guidance.set',{enabled:false});assert.equal((await run('guidance.get')).enabled,false);
  assert.equal((await read()).content,'天气：雨');
  const cfg=await run('variables.config');await run('variables.configure',{baseRevision:cfg.revision,enabled:false});
  assert.equal((await read()).content,'天气：{{var::天气}}');
  await assert.rejects(run('variables.configure',{baseRevision:cfg.revision+1,enabled:true},{kind:'agent',sessionId:actor.sessionId}),{code:'HUMAN_REQUIRED'});
});

test('whole-work copies remap variable chapters and resources, while partial packages contain no book state',async t=>{
  const {root,store,run,novel,patch,actor}=await fixture(t);
  const card=await run('graph.create',{name:'甲',type:'character_card',content:'等级 {{var::等级}}'}),chapter=await run('chapter.create',{title:'相遇',content:'正文'});
  await run('variables.configure',{baseRevision:1,definitions:[{name:'等级',path:'/等级',type:'number',resourceId:card.id}]});
  await patch([{op:'set',path:'/等级',value:1}]);
  await patch([{op:'inc',path:'/等级',value:1}],{anchor:{kind:'chapter',chapterId:chapter.id,chapterRevision:chapter.revision,position:'end'}});
  assert.equal((await run('graph.get',{nodeId:card.id})).renderedContent,undefined);
  assert.equal((await run('graph.get',{nodeId:card.id},{kind:'agent',sessionId:'writer'})).renderedContent,'等级 2');
  assert.equal((await run('graph.get',{nodeId:card.id,chapterId:chapter.id,position:'start'},{kind:'agent',sessionId:'writer'})).renderedContent,'等级 1');
  assert.equal((await run('graph.get',{nodeId:card.id})).content,'等级 {{var::等级}}');
  const from=new TransferService(store),target=new Store(join(root,'target')),to=new TransferService(target);
  const partial=await from.export({selection:{kind:'memory',novelId:novel.id,nodeIds:[card.id]}});
  assert.equal(partial.content.includes('"variables"'),false);
  const full=await from.export({selection:{kind:'works',novelIds:[novel.id]}}),file={name:full.filename,text:full.content},options={mode:'copy'};
  const preview=await to.preview({file,options});assert.equal(preview.valid,true,JSON.stringify(preview.conflicts));
  const result=await to.import({file,options,proof:preview.proof,requestId:crypto.randomUUID()},actor);
  const book=(await target.dispatch('novel.export',{novelId:result.novelIds[0]},actor)).novel;
  assert.equal(book.variables.enabled,false);assert.equal(book.variables.commits.length,2);
  assert.notEqual(book.variables.definitions[0].resourceId,card.id);assert.ok(book.nodes[book.variables.definitions[0].resourceId]);
  const snap=book.variables.commits[1];assert.ok(book.chapters[snap.anchor.chapterId]);assert.notEqual(snap.anchor.chapterId,chapter.id);assert.equal(snap.parentId,book.variables.commits[0].id);
  assert.deepEqual(snap.data,{等级:2});assert.equal(snap.actor.sessionId,undefined);
});

test('chapter-scoped reads respect volume order before local chapter order',async t=>{
  const {run,patch}=await fixture(t),v1=await run('volume.create',{title:'前卷',order:0}),v2=await run('volume.create',{title:'后卷',order:1});
  const a=await run('chapter.create',{title:'前卷末章',volumeId:v1.id,order:10}),b=await run('chapter.create',{title:'后卷首章',volumeId:v2.id,order:0});
  await patch([{op:'set',path:'/等级',value:1}]);
  await patch([{op:'set',path:'/等级',value:2}],{anchor:{kind:'chapter',chapterId:a.id,chapterRevision:a.revision,position:'end'}});
  await patch([{op:'set',path:'/等级',value:9}],{anchor:{kind:'chapter',chapterId:b.id,chapterRevision:b.revision,position:'end'}});
  assert.equal((await run('variables.read',{chapterId:a.id,position:'end'})).data.等级,2);
});
