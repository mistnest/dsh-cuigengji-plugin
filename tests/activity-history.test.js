import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/core/store.js';
import {UpgradeCoordinator} from '../src/application/maintenance/upgrade.ts';
import {WorkData} from '../src/application/backup/workspace.js';
import {emptyActivity,normalizeActivity,localDay,recordActivity} from '../src/application/activity.ts';
const human={kind:'human',sessionId:'history-author'};
const hash=value=>createHash('sha256').update(value).digest('hex');
const bucket=(prose=0,setting=0)=>({proseAdded:prose,settingAdded:setting,planningChanges:1,chaptersTouched:prose?1:0,settingsTouched:setting?1:0,byActor:{human:{proseAdded:prose,settingAdded:0,planningChanges:1,chaptersTouched:prose?1:0,settingsTouched:0},agent:{proseAdded:0,settingAdded:setting,planningChanges:0,chaptersTouched:0,settingsTouched:setting?1:0}}});
async function fixture(t){
 const parent=await mkdtemp(join(tmpdir(),'cuigengji-history-')),root=join(parent,'data');t.after(()=>rm(parent,{recursive:true,force:true}));
 const store=new Store(root),novel=await store.dispatch('novel.create',{title:'长期记录测试'},human);
 return {root,store,novel};
}
function oldActivity(novelId){
 const activity=emptyActivity();
 for(let index=0;index<420;index++){
  const date=new Date(Date.UTC(2022,10,1+index)).toISOString().slice(0,10);
  activity.daily[date]={date,updatedAt:date+'T12:00:00Z',novels:{[novelId]:bucket(index+1,2)}};
 }
 return activity;
}
async function seedOld(root,activity){
 await rm(join(root,'activity'),{recursive:true,force:true});
 await writeFile(join(root,'activity.json'),JSON.stringify(activity));
}

test('legacy daily counters migrate automatically across years without pruning or fabricating history',async t=>{
 const {root,store,novel}=await fixture(t),activity=oldActivity(novel.id);
 await new UpgradeCoordinator(store).start(); // same-version completed report
 await seedOld(root,activity);
 const migrated=new Store(root),report=await new UpgradeCoordinator(migrated).start();
 assert.equal(report.status,'ready',JSON.stringify(report.error));
 const index=JSON.parse(await readFile(join(root,'activity/index.json'),'utf8'));
 assert.deepEqual(index.years,['2022','2023']);
 assert.equal((await readdir(root)).includes('activity.json'),false);
 const result=await migrated.dispatch('activity.stats',{from:'2022-01-01',to:'2024-12-31'},human);
 assert.equal(result.activeDays,420);assert.equal(result.stats.proseAdded,420*421/2);assert.equal(result.stats.settingAdded,840);
 assert.equal(result.novels[0].title,novel.title);
 const state=await migrated.load();
 recordActivity(state,'chapter.create',{novelId:novel.id,content:'新'},human,null,{});
 assert.equal(Object.keys(state.activity.daily).length,421,'a new save never drops old days');
 await migrated.save(state);
 const historical=await migrated.dispatch('activity.stats',{from:'2022-01-01',to:'2024-12-31'},human);
 assert.deepEqual(historical.stats,result.stats);
 const backupDir='before-writing-records-'+hash(JSON.stringify(activity)).slice(0,16);
 assert.equal(await readFile(join(root,'backups',backupDir,'activity.json'),'utf8'),JSON.stringify(activity));
});

test('ordinary writing reads and rewrites only the current year; range queries read no novel bodies',async t=>{
 const {root,store,novel}=await fixture(t);await seedOld(root,oldActivity(novel.id));await new UpgradeCoordinator(store).start();
 class TrackedStore extends Store{reads=[];async readText(path){this.reads.push(path);return super.readText(path);}}
 const tracked=new TrackedStore(root),before=await stat(join(root,'activity/2022.json'));
 await tracked.dispatch('chapter.create',{novelId:novel.id,title:'今天',content:'今天的内容。'},human);
 assert.ok(!tracked.reads.includes('activity/2022.json'));
 assert.equal((await stat(join(root,'activity/2022.json'))).mtimeMs,before.mtimeMs);
 tracked.reads=[];
 const result=await tracked.dispatch('activity.stats',{from:'2022-01-01',to:'2022-12-31'},human);
 assert.ok(result.activeDays>0);assert.ok(tracked.reads.includes('activity/2022.json'));assert.ok(!tracked.reads.includes('activity/2023.json'));
 assert.ok(!tracked.reads.some(path=>path.startsWith('novels/')));
 const current=JSON.parse(await readFile(join(root,'activity',localDay().slice(0,4)+'.json'),'utf8'));
 assert.equal(current.daily[localDay()].novels[novel.id].proseAdded,6);
});

test('chapter deletion and work purge preserve dated totals and the last known title',async t=>{
 const {store,novel}=await fixture(t);
 const chapter=await store.dispatch('chapter.create',{novelId:novel.id,title:'一',content:'保留写作记录。'},human);
 const before=await store.dispatch('activity.today',{},human);
 await store.dispatch('chapter.delete',{novelId:novel.id,chapterId:chapter.id,expectedRevision:chapter.revision,confirm:true},human);
 const book=await store.dispatch('novel.get',{novelId:novel.id},human);
 const recycled=await store.dispatch('novel.archive',{novelId:novel.id,expectedRevision:book.revision,confirm:true},human);
 await store.dispatch('novel.purge',{novelId:novel.id,expectedRevision:recycled.revision,confirm:true},human);
 const result=await store.dispatch('activity.stats',{from:before.date,to:before.date,novelId:novel.id},human);
 assert.deepEqual(result.stats,before.stats);assert.equal(result.novels[0].title,novel.title);assert.equal(result.novels[0].removed,true);
 assert.deepEqual((await store.dispatch('activity.today',{},human)).stats,before.stats);
});

test('whole-workspace backup roundtrips all years and old canonical archives without duplicate counters',async t=>{
 const {root,store,novel}=await fixture(t);await seedOld(root,oldActivity(novel.id));await new UpgradeCoordinator(store).start();
 const backup=await new WorkData(store).export();
 assert.equal(Object.keys(JSON.parse(backup.payload.files.find(file=>file.path==='activity.json').content).daily).length,420);
 const destination=new Store(join(root,'restored')),data=new WorkData(destination);
 await data.import(backup);
 const before=await destination.dispatch('activity.stats',{from:'2022-01-01',to:'2024-12-31'},human);
 await data.import(backup);
 assert.deepEqual((await destination.dispatch('activity.stats',{from:'2022-01-01',to:'2024-12-31'},human)).stats,before.stats);
 const state=await destination.load();state.activity.daily['2021-01-01']={date:'2021-01-01',updatedAt:'2021-01-01T00:00:00Z',novels:{[novel.id]:bucket(5)}};await destination.save(state);
 await data.import(backup);
 assert.equal((await destination.dispatch('activity.stats',{from:'2021-01-01',to:'2024-12-31'},human)).stats.proseAdded,before.stats.proseAdded+5);
});

test('an interrupted annual/session migration recovers against its exact permitted metadata result',async t=>{
 const {root,store,novel}=await fixture(t);await seedOld(root,oldActivity(novel.id));
 const bindings={[hash('old-child')]:{sessionId:'old-child',scope:'novel',novelId:novel.id,parentSessionId:'parent',taskId:'old',stage:'write',chapterId:null,updatedAt:'2023-01-01T00:00:00Z'}};
 await writeFile(join(root,'runtime/bindings.json'),JSON.stringify(bindings));
 const write=store.transaction.applyEntry.bind(store.transaction);let interrupted=false;
 store.transaction.applyEntry=async(entry,content)=>{await write(entry,content);if(!interrupted&&entry.path==='activity/2022.json'){interrupted=true;throw Error('模拟年度迁移中断');}};
 const failed=await new UpgradeCoordinator(store).start();assert.equal(failed.status,'failed');assert.equal(failed.failedStage,'auxiliary');
 const fresh=new Store(root),recovered=await new UpgradeCoordinator(fresh).start();
 assert.equal(recovered.status,'ready',JSON.stringify(recovered.error));assert.equal(recovered.backupPath,failed.backupPath);
 const result=await fresh.dispatch('activity.stats',{from:'2022-01-01',to:'2024-12-31'},human);assert.equal(result.activeDays,420);
 const binding=await fresh.dispatch('binding.get',{}, {kind:'agent',sessionId:'old-child'});assert.equal(binding.novelId,novel.id);assert.equal(binding.parentSessionId,undefined);
 assert.equal((await readdir(root)).includes('transaction.pending.json'),false);
});

test('invalid periods fail without mutation and statistics are human-only without requiring a session',async t=>{
 const {root,store}=await fixture(t),before=await readFile(join(root,'activity/index.json'),'utf8');
 for(const args of [{from:'2026-02-30',to:'2026-03-01'},{from:'2026-01-02',to:'2026-01-01'},{from:4,to:'2026-01-01'}])await assert.rejects(store.dispatch('activity.stats',args,human),{code:'INVALID_INPUT'});
 assert.equal(await readFile(join(root,'activity/index.json'),'utf8'),before);
 await assert.rejects(store.dispatch('activity.stats',{}, {kind:'agent',sessionId:'agent'}),{code:'HUMAN_REQUIRED'});
 assert.equal((await store.dispatch('activity.stats',{}, {kind:'human'})).activeDays,0);
});
