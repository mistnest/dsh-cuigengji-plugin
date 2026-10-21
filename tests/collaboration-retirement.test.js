import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/core/store.js';
import {createSessionPolicy} from '../src/application/bindings/session.js';
import {UpgradeCoordinator} from '../src/application/maintenance/upgrade.ts';
import {WorkData} from '../src/application/backup/workspace.js';
import {TransferService} from '../src/application/transfer/service.ts';
import {TOOL_ACTIONS,HUMAN_ACTIONS} from '../src/contracts/actions.js';
import {skillSpecs,persona} from '../src/adapters/dsh/skills.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const human={kind:'human',sessionId:'retirement-author'};
async function fixture(t){
  const parent=await mkdtemp(join(tmpdir(),'cuigengji-retirement-')),root=join(parent,'data');
  t.after(()=>rm(parent,{recursive:true,force:true}));
  const store=new Store(root),policy=createSessionPolicy({store,audit:async()=>{}});
  const a=await store.dispatch('novel.create',{title:'甲作品'},human),b=await store.dispatch('novel.create',{title:'乙作品'},human);
  return {root,store,policy,a,b};
}
async function seedLegacy(store,a,b){
  const tx=await store.dispatch('planning.apply',{novelId:a.id,requestId:'legacy-fixture',operations:[{op:'node.create',ref:'beat',value:{title:'旧规划',content:'保留旧策划资料'}}]},human);
  await store.dispatch('chapter.create',{novelId:b.id,title:'正文',content:'不可丢失的正文。'},human);
  const state=await store.load(),source=state.novels[a.id],target=state.novels[b.id];
  const payload={novelId:a.id,novelTitle:a.title,pageId:null,pageTitle:'主线',sequence:tx.sequence,nodes:source.planning.nodes,edges:{},decorations:{},groups:{},settings:{},relations:{},settingGroups:{}};
  const snapshot={id:hash(JSON.stringify(payload)),createdAt:new Date().toISOString(),...structuredClone(payload)};
  const ref={sourceNovelId:a.id,sourceNovelTitle:a.title,sourcePageId:null,sourcePageTitle:'主线',snapshotId:snapshot.id,sequence:tx.sequence,createdAt:snapshot.createdAt};
  source.collaboration={formatVersion:2,snapshots:{[snapshot.id]:snapshot},tasks:{}};
  const task={id:'legacy-task',novelId:b.id,parentSessionId:'old-parent',childSessionId:'old-child',dispatchState:'accepted',revision:1,goal:'旧任务',snapshotId:snapshot.id,sharedPlan:ref};
  target.collaboration={formatVersion:2,sharedPlan:ref,snapshots:{},tasks:{[task.id]:task}};
  state.bindings[hash('old-child')]={sessionId:'old-child',scope:'novel',novelId:b.id,chapterId:null,stage:'write',goal:'旧任务',parentSessionId:'old-parent',taskId:task.id,updatedAt:snapshot.createdAt};
  await store.save(state);return {snapshot,ref};
}

test('retired collaboration has no UI/tool/Skill registration or operational endpoint',async t=>{
  const {store,policy,a}=await fixture(t);
  assert.ok(![...Object.values(TOOL_ACTIONS).flat(),...HUMAN_ACTIONS].some(action=>action.startsWith('collaboration.')));
  assert.ok(!skillSpecs.some(([name])=>name==='cuigengji-collaborate'));
  assert.doesNotMatch(persona,/写手固定|collaboration\.|主编/);
  for(const action of ['collaboration.assign','collaboration.prepare','collaboration.overview','collaboration.report','binding.inherit'])await assert.rejects(store.dispatch(action,{novelId:a.id},human),{code:'FEATURE_RETIRED'});
  const events=new Map();policy.register({on:(key,fn)=>events.set(key,fn)},{disconnect:async()=>{}});
  assert.equal(events.has('agent/created'),false);
});

test('main, unbound child and formerly locked child select and create novels identically',async t=>{
  const {store,policy,a,b}=await fixture(t);await seedLegacy(store,a,b);
  for(const actor of [{kind:'agent',sessionId:'main'},{kind:'agent',sessionId:'fresh-child',parentSessionId:'main'},{kind:'agent',sessionId:'old-child',parentSessionId:'old-parent'}]){
    assert.equal((await policy.dispatch('novel.list',{},actor)).length>=2,true);
    await policy.dispatch('novel.focus',{novelId:a.id},actor);
    const chapter=await policy.dispatch('chapter.create',{novelId:b.id,title:actor.sessionId+'写作',content:'明确指定目标。'},actor);
    assert.equal((await policy.dispatch('chapter.get',{novelId:b.id,chapterId:chapter.id},actor)).content,'明确指定目标。');
    assert.equal((await policy.resolveBinding(actor.sessionId)).novelId,a.id);
    assert.ok((await policy.dispatch('novel.create',{title:actor.sessionId+'新书'},actor)).id);
    await policy.dispatch('novel.focus',{novelId:b.id},actor);
    const binding=await policy.resolveBinding(actor.sessionId);assert.equal(binding.scope,'library');assert.equal(binding.parentSessionId,undefined);assert.equal(binding.taskId,undefined);
  }
});

test('independent session focus and missing-target checks do not restrict ordinary host actions',async t=>{
  const {policy,a,b}=await fixture(t),main={kind:'agent',sessionId:'main'},child={kind:'agent',sessionId:'child',parentSessionId:'main'};
  assert.equal(await policy.resolveBinding(child.sessionId),null);
  await assert.rejects(policy.dispatch('chapter.list',{},child),/需要目标作品/);
  await policy.dispatch('novel.focus',{novelId:a.id},main);
  await policy.dispatch('novel.focus',{novelId:b.id},child);
  await policy.dispatch('novel.focus',{novelId:a.id},child);
  await policy.dispatch('novel.focus',{novelId:b.id},main);
  assert.equal((await policy.resolveBinding(child.sessionId)).novelId,a.id);
  await policy.dispatch('binding.set',{novelId:b.id},{...human,sessionId:'child'});
  assert.equal((await policy.resolveBinding('main')).novelId,b.id);
});

test('automatic retirement preserves novels and legacy snapshots, converting only session metadata',async t=>{
  const {root,store,a,b}=await fixture(t);await seedLegacy(store,a,b);
  const before=await store.load(),result=await new UpgradeCoordinator(new Store(root)).start();
  assert.equal(result.status,'ready',JSON.stringify(result.error));
  const after=await new Store(root).load();assert.deepEqual(after.novels,before.novels);
  const binding=after.bindings[hash('old-child')];assert.equal(binding.novelId,b.id);assert.equal(binding.activeNovelId,b.id);assert.equal(binding.parentSessionId,undefined);assert.equal(binding.taskId,undefined);
  const original=await readFile(join(root,'runtime/bindings.json'),'utf8');
  assert.equal((await new UpgradeCoordinator(new Store(root)).start()).status,'ready');assert.equal(await readFile(join(root,'runtime/bindings.json'),'utf8'),original);
});

test('legacy whole-book and library backups stay portable without resurrecting task locks',async t=>{
  const {root,store,a,b}=await fixture(t);const {snapshot}=await seedLegacy(store,a,b);
  const backup=await new WorkData(store).export(),single=await store.dispatch('novel.export',{novelId:b.id},human);
  assert.equal(single.novel.collaboration.snapshots[snapshot.id].nodes[Object.keys(snapshot.nodes)[0]].content,'保留旧策划资料');
  const destination=new Store(join(root,'restored'));await new WorkData(destination).import(backup);
  assert.equal((await destination.dispatch('binding.get',{}, {kind:'agent',sessionId:'old-child'})).parentSessionId,undefined);
  await destination.dispatch('novel.focus',{novelId:a.id},{kind:'agent',sessionId:'old-child'});
  const standalone=new Store(join(root,'single'));await standalone.dispatch('novel.import',{backup:single},human);
  assert.equal((await standalone.dispatch('novel.export',{novelId:b.id},human)).novel.collaboration.tasks['legacy-task'].goal,'旧任务');
  const transfer=new TransferService(standalone,new WorkData(standalone));
  const file={name:'backup.json',text:JSON.stringify(single)};
  const preview=await transfer.preview({file,options:{mode:'copy'}},human);
  const copied=await transfer.import({file,options:{mode:'copy'},proof:preview.proof,requestId:'copy-legacy'},human);
  const copiedId=copied.novelId||copied.novelIds?.[0];
  assert.equal((await standalone.dispatch('novel.export',{novelId:copiedId},human)).novel.collaboration,undefined);
  const n=await destination.dispatch('novel.get',{novelId:a.id},human);
  const archived=await destination.dispatch('novel.archive',{novelId:a.id,expectedRevision:n.revision,confirm:true},human);
  await destination.dispatch('novel.purge',{novelId:a.id,expectedRevision:archived.revision,confirm:true},human);
  assert.ok((await destination.dispatch('novel.export',{novelId:b.id},human)).novel.collaboration.snapshots[snapshot.id]);
});
