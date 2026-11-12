import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localDay,emptyActivity,normalizeActivity,mergeActivity} from '../src/application/activity.ts';
import {Store} from '../src/core/store.js';
import {WorkData} from '../src/application/backup/workspace.js';

const human={kind:'human',sessionId:'net-author'},agent={kind:'agent',sessionId:'net-agent'};
const day1='2024-12-31',day2='2025-01-01',day3='2025-01-02';
function clock(t,day=day1){t.mock.timers.enable({apis:['Date'],now:new Date(day+'T12:00:00')});return day=>t.mock.timers.setTime(new Date(day+'T12:00:00').getTime());}
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'cuigengji-net-'));t.after(()=>rm(root,{recursive:true,force:true}));const store=new Store(root),novel=await store.dispatch('novel.create',{title:'正文净增测试'},human);return {root,store,novel};}
const today=(store,novel)=>store.dispatch('activity.today',novel?{novelId:novel.id}:{},human);
const range=(store,from=day1,to=day3)=>store.dispatch('activity.stats',{from,to},human);

test('deleting old prose charges today; completed days never change',async t=>{
 const setDay=clock(t),{store,novel,root}=await fixture(t);
 let c=await store.dispatch('chapter.create',{novelId:novel.id,title:'正文',content:'文'.repeat(3000)},human);
 const closed=await readFile(join(root,'activity/2024.json'),'utf8');
 setDay(day2);
 c=await store.dispatch('chapter.update',{novelId:novel.id,chapterId:c.id,expectedRevision:c.revision,content:'文'.repeat(2500)},human);
 assert.equal((await today(store)).stats.proseAdded,-500);
 let result=await range(store);assert.equal(result.daily.find(day=>day.date===day1).stats.proseAdded,3000);assert.equal(result.manuscript.words,2500);
 c=await store.dispatch('chapter.update',{novelId:novel.id,chapterId:c.id,expectedRevision:c.revision,append:'新'.repeat(800)},agent);
 result=await today(store);assert.equal(result.stats.proseAdded,300);assert.equal(result.stats.byActor.human.proseAdded,-500);assert.equal(result.stats.byActor.agent.proseAdded,800);assert.equal(result.manuscript.words,3300);
 assert.equal(await readFile(join(root,'activity/2024.json'),'utf8'),closed,'new-year edits do not rewrite the settled year');
 setDay(day3);const restarted=new Store(root);c=await restarted.dispatch('chapter.update',{novelId:novel.id,chapterId:c.id,expectedRevision:c.revision,content:''},human);
 result=await range(restarted);assert.deepEqual(result.daily.map(day=>day.stats.proseAdded),[3000,300,-3300]);assert.equal(result.manuscript.words,0);
});

test('chapter recycle, restore and receipt replay change only the operation day',async t=>{
 const setDay=clock(t),{store,novel}=await fixture(t);
 const c=await store.dispatch('chapter.create',{novelId:novel.id,title:'正文',content:'保留。'},human);
 setDay(day2);
 const args={novelId:novel.id,chapterId:c.id,expectedRevision:c.revision,confirm:true,requestId:'net-delete'};
 const removed=await store.dispatch('chapter.delete',args,human);await store.dispatch('chapter.delete',args,human);
 assert.equal((await today(store)).stats.proseAdded,-3);assert.equal((await today(store)).manuscript.words,0);
 await store.dispatch('chapter.restore',{novelId:novel.id,chapterId:c.id,expectedRevision:removed.revision,targetRevision:c.revision},human);
 assert.equal((await today(store)).stats.proseAdded,0);assert.equal((await today(store)).manuscript.words,3);
 const result=await range(store);assert.equal(result.daily.find(day=>day.date===day1).stats.proseAdded,3);
});

test('work recycle charges its active prose once and a later purge preserves settled history',async t=>{
 const setDay=clock(t),{store,novel,root}=await fixture(t);
 await store.dispatch('chapter.create',{novelId:novel.id,title:'正文',content:'保留。'},human);
 setDay(day2);let book=await store.dispatch('novel.get',{novelId:novel.id},human);
 book=await store.dispatch('novel.archive',{novelId:novel.id,expectedRevision:book.revision,confirm:true},human);
 assert.equal((await today(store)).stats.proseAdded,-3);assert.equal((await today(store)).manuscript.words,0);
 setDay(day3);await store.dispatch('novel.purge',{novelId:novel.id,expectedRevision:book.revision,confirm:true},human);
 const result=await range(new Store(root));assert.deepEqual(result.daily.map(day=>day.stats.proseAdded),[3,-3]);assert.equal((await today(store)).stats.proseAdded,0);assert.equal(result.novels[0].title,novel.title);
});

test('unchanged-length rewrites and formatting are zero net; Unicode is counted by character',async t=>{
 const {store,novel}=await fixture(t);
 let c=await store.dispatch('chapter.create',{novelId:novel.id,title:'正文',content:'甲😀，乙。'},human);
 c=await store.dispatch('chapter.update',{novelId:novel.id,chapterId:c.id,expectedRevision:c.revision,content:'丙😀，丁。'},agent);
 c=await store.dispatch('chapter.update',{novelId:novel.id,chapterId:c.id,expectedRevision:c.revision,content:'\n　丙😀，\n丁。　'},human);
 assert.equal((await today(store)).stats.proseAdded,5);
 c=await store.dispatch('chapter.update',{novelId:novel.id,chapterId:c.id,expectedRevision:c.revision,content:'😀。'},human);
 assert.equal((await today(store)).stats.proseAdded,2);
});

test('volume deletion uses lightweight counts for all siblings and respects book scope',async t=>{
 const setDay=clock(t),{store,novel}=await fixture(t),other=await store.dispatch('novel.create',{title:'另一本'},human);
 const volume=await store.dispatch('volume.create',{novelId:novel.id,title:'卷'},human);
 for(const text of ['一。','二😀。'])await store.dispatch('chapter.create',{novelId:novel.id,volumeId:volume.id,title:text,content:text},human);
 await store.dispatch('chapter.create',{novelId:other.id,title:'三',content:'三。'},agent);
 setDay(day2);await store.dispatch('volume.delete',{novelId:novel.id,volumeId:volume.id,expectedRevision:volume.revision,chapterPolicy:'delete',confirm:true},human);
 const result=await today(store);assert.equal(result.stats.proseAdded,-5);assert.equal(result.manuscript.words,2);assert.equal(result.manuscript.chapters,1);
 assert.equal((await today(store,other)).stats.proseAdded,0);assert.equal((await range(store)).daily[0].stats.proseAdded,7);
});

test('negative daily totals and actor effects survive restart and repeated full backup restore',async t=>{
 const setDay=clock(t),{store,novel,root}=await fixture(t);
 const c=await store.dispatch('chapter.create',{novelId:novel.id,title:'正文',content:'保留。'},agent);setDay(day2);
 await store.dispatch('chapter.update',{novelId:novel.id,chapterId:c.id,expectedRevision:c.revision,content:''},human);
 const backup=await new WorkData(store).export(),destination=new Store(join(root,'restored'));
 await new WorkData(destination).import(backup);await new WorkData(destination).import(backup);
 const result=await today(new Store(destination.root));assert.equal(result.stats.proseAdded,-3);assert.equal(result.stats.byActor.human.proseAdded,-3);assert.equal(result.manuscript.words,0);
 assert.equal((await range(destination)).daily[0].stats.proseAdded,3);
});

test('backup merging accepts newer negative progress, rejects divergent equal histories and never resurrects stale totals',()=>{
 const activity=(net,changes)=>normalizeActivity({format:'cuigengji-activity',version:1,daily:{[day1]:{date:day1,novels:{book:{proseAdded:net,chaptersTouched:changes,byActor:{human:{proseAdded:net,chaptersTouched:changes}}}}}}});
 const old=activity(100,1),latest=activity(-50,2);
 let merged=mergeActivity(old,latest);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.activity.daily[day1].novels.book.proseAdded,-50);
 merged=mergeActivity(latest,old);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.activity.daily[day1].novels.book.proseAdded,-50);
 assert.equal(mergeActivity(latest,activity(30,2)).conflicts.length,1);assert.equal(mergeActivity(latest,latest).conflicts.length,0);
});

test('statistics read no chapter bodies/history and rejected saves cannot affect daily totals',async t=>{
 const {store,novel,root}=await fixture(t),c=await store.dispatch('chapter.create',{novelId:novel.id,title:'正文',content:'需要保留。'},human);
 const path=join(root,'activity',localDay().slice(0,4)+'.json'),before=await readFile(path,'utf8'),reads=[],read=store.readText.bind(store);
 store.readText=async path=>{reads.push(path);return read(path);};await today(store);await store.dispatch('activity.stats',{},human);
 assert.ok(!reads.some(path=>path.includes('/history/')||path.includes('/chapters/')&&!path.endsWith('/index.json')));
 assert.equal(await readFile(path,'utf8'),before);
 await assert.rejects(store.dispatch('chapter.update',{novelId:novel.id,chapterId:c.id,expectedRevision:0,content:''},human),{code:'CONFLICT'});
 assert.equal((await today(store)).stats.proseAdded,5);
});
