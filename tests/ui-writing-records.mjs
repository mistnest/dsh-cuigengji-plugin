// Real records dialog and persistence, synthetic novels only; no desktop profile.
import {createServer} from 'node:http';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {Store} from '../src/core/store.js';
import {localDay,emptyActivity} from '../src/application/activity.ts';

const root=resolve(import.meta.dirname,'..'),directory=await mkdtemp(join(tmpdir(),'cuigengji-records-ui-'));
const shots=join(root,'test-results','writing-records');await mkdir(shots,{recursive:true});
const store=new Store(directory),actor={kind:'human',sessionId:'records-ui'},books=[];
for(const title of ['雾港来信','群星与远航'])books.push(await store.dispatch('novel.create',{title},actor));
for(const book of books)await store.dispatch('chapter.create',{novelId:book.id,title:'写作记录正文',content:''},actor);
const today=localDay(),state=await store.load();state.activity=emptyActivity();
const hash=text=>createHash('sha256').update(text).digest('hex'),entries=[[],[]];
function bucket(prose,setting){return {proseAdded:prose,settingAdded:setting,planningChanges:2,chaptersTouched:1,settingsTouched:1,byActor:{human:{proseAdded:prose,settingAdded:0,planningChanges:1,chaptersTouched:1,settingsTouched:0},agent:{proseAdded:0,settingAdded:setting,planningChanges:1,chaptersTouched:0,settingsTouched:1}}};}
for(let i=0;i<35;i++){
 const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-i);const key=date.toISOString().slice(0,10);
 state.activity.daily[key]={date:key,updatedAt:key+'T12:00:00Z',novels:{[books[0].id]:bucket(150+(i*199)%1800,40+(i*11)%150),[books[1].id]:bucket(70+(i*113)%900,30+(i*5)%90)},titles:{[books[0].id]:books[0].title,[books[1].id]:books[1].title}};
 entries[0].unshift({date:key,words:150+(i*199)%1800});entries[1].unshift({date:key,words:70+(i*113)%900});
}
 // Manuscript totals come from saved chapters; dated net activity is independent.
for(const [i,book] of books.entries()){
 const c=Object.values(state.novels[book.id].chapters)[0],template=c.versions[0];let content='';
 c.versions=entries[i].map((entry,index)=>{content+='文'.repeat(entry.words);return {...template,revision:index+1,content,contentHash:hash(content),timestamp:entry.date+'T12:00:00'};});
 Object.assign(c,{content,contentHash:hash(content),revision:c.versions.length,createdAt:c.versions[0].timestamp,updatedAt:c.versions.at(-1).timestamp});
}
const old=structuredClone(Object.values(state.novels[books[0].id].chapters)[0]);
Object.assign(old,{id:randomUUID(),title:'旧日正文',content:'旧'.repeat(420),revision:1,order:1,createdAt:'2024-03-12T12:00:00',updatedAt:'2024-03-12T12:00:00'});
old.contentHash=hash(old.content);old.versions=[{...old.versions[0],revision:1,title:old.title,order:1,content:old.content,contentHash:old.contentHash,timestamp:old.createdAt}];state.novels[books[0].id].chapters[old.id]=old;
state.activity.daily[today].novels['removed-book']=bucket(80,20);state.activity.daily[today].titles['removed-book']='旧日手稿';
state.activity.daily['2024-03-12']={date:'2024-03-12',updatedAt:'2024-03-12T12:00:00Z',novels:{[books[0].id]:bucket(420,50)}};
await store.save(state);
const output=await build({stdin:{resolveDir:root,loader:'tsx',contents:`
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{WritingRecords}from'./src/client/features/pet/Records.tsx';import{PreferencesProvider}from'./src/client/shared/preferences.tsx';import{styles}from'./src/client/style.ts';
const requests=[],pending=[];let holdToday=false,failure=false;
const rpc=async(action,args,sessionId)=>{requests.push({action,args,sessionId});if(failure)throw Error('测试：记录暂时不可用');const response=await fetch('/dispatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args,sessionId})});const value=await response.json();if(!response.ok)throw Error(value.error);if(holdToday&&args.from===args.to)await new Promise(resolve=>pending.push(resolve));return value;};
window.fixture={requests,hold:()=>holdToday=true,release:()=>{holdToday=false;pending.splice(0).forEach(resolve=>resolve());},pending:()=>pending.length,fail:value=>failure=value};
function App(){const[open,setOpen]=useState(true);return <PreferencesProvider><section className="cuigengji"><style>{styles}</style><button onClick={()=>setOpen(true)}>打开记录</button>{open&&<WritingRecords rpc={rpc} sessionId="" novels={${JSON.stringify(books)}} onClose={()=>setOpen(false)}/>}</section></PreferencesProvider>;}
createRoot(document.getElementById('root')).render(<App/>);
`},bundle:true,write:false,format:'iife',loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'}});
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(output.outputFiles[0].contents);return;}
  if(req.url==='/dispatch'){
   let body='';for await(const chunk of req)body+=chunk;
   const {action,args}=JSON.parse(body);const value=await store.dispatch(action,args,{kind:'human'});
   res.setHeader('content-type','application/json');res.end(JSON.stringify(value));return;
  }
  res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{height:100%;margin:0;background:#f3f5fa}</style><div id="root"></div><script src="/bundle.js"></script></html>');
 }catch(error){res.statusCode=400;res.setHeader('content-type','application/json');res.end(JSON.stringify({error:error.message}));}
});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1100,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);
 const modal=page.getByRole('dialog',{name:'写作记录',exact:true}),metric=modal.locator('.records-metric').first();
 await expect(modal).toBeVisible();await expect(modal.locator('.records-chart-day')).toHaveCount(30);
 const query=await page.evaluate(()=>fixture.requests[0].args),recent=await store.dispatch('activity.stats',query,{kind:'human'});
 await expect(metric).toContainText(recent.stats.proseAdded.toLocaleString('zh-CN'));
 await expect(modal.getByRole('table',{name:'作品写作明细'}).getByRole('row')).toHaveCount(4);
 await expect(modal.getByLabel('统计范围').locator('option')).toContainText(['全部作品',books[0].title,books[1].title,'旧日手稿（已移除）']);
 assert.equal(await modal.locator('.records-explanation').count(),0);
 await page.screenshot({path:join(shots,'records-1100.png'),animations:'disabled'});
 await modal.getByRole('button',{name:'今天',exact:true}).click();await expect(modal.locator('.records-chart-day')).toHaveCount(1);
 await modal.locator('.records-chart-day').click();await expect(modal.getByLabel('查看日期')).toHaveValue(today);
 await expect(modal.locator('.records-books h4')).toContainText(today);
 await modal.locator('.records-contributions summary').click();await expect(modal.getByRole('table',{name:'作者与 AI 的贡献'})).toContainText('AI');
 await modal.getByLabel('统计范围').selectOption('removed-book');await expect(metric.locator('strong')).toHaveText('80字');await expect(modal.locator('.records-books')).toContainText('旧日手稿');
 await modal.getByLabel('统计范围').selectOption('');
 await modal.getByRole('button',{name:'自选日期',exact:true}).click();await modal.getByLabel('开始日期').fill('2024-01-01');await modal.getByLabel('结束日期').fill('2024-12-31');await modal.getByRole('button',{name:'应用',exact:true}).click();
 await expect(metric).toContainText('420');await expect(modal.locator('.records-chart-day')).toHaveCount(12);await modal.getByLabel('查看日期').selectOption('2024-03-12');await expect(modal.locator('.records-books h4')).toContainText('2024-03-12');
 await modal.getByLabel('开始日期').fill('2025-01-01');const count=await page.evaluate(()=>fixture.requests.length);await modal.getByRole('button',{name:'应用',exact:true}).click();await expect(modal.getByRole('alert')).toContainText('开始日期不能晚于');expect(await page.evaluate(()=>fixture.requests.length)).toBe(count);
 // A late response from the previous period cannot overwrite the current one.
 await page.evaluate(()=>fixture.hold());await modal.getByRole('button',{name:'今天',exact:true}).click();await expect.poll(()=>page.evaluate(()=>fixture.pending())).toBe(1);
 await modal.getByRole('button',{name:'近30天',exact:true}).click();await expect(metric).toContainText(recent.stats.proseAdded.toLocaleString('zh-CN'));
 await page.evaluate(()=>fixture.release());await expect(modal.locator('.records-eyebrow')).toContainText(query.from.replaceAll('-','.'));await expect(metric).toContainText(recent.stats.proseAdded.toLocaleString('zh-CN'));
 await page.evaluate(()=>fixture.fail(true));await modal.getByRole('button',{name:'刷新写作记录'}).click();await expect(modal.getByRole('alert')).toContainText('记录暂时不可用');await expect(metric).toContainText(recent.stats.proseAdded.toLocaleString('zh-CN'));
 await modal.getByLabel('统计范围').selectOption(books[0].id);await expect(metric).toContainText('—');
 await page.evaluate(()=>fixture.fail(false));await modal.getByRole('button',{name:'重试',exact:true}).click();await expect(metric).not.toContainText('—');
 // Removing old prose is charged to today. The signed value must appear in the
 // metric, book/actor detail and below the chart's zero line, without altering
 // earlier days. Restore adds back only to the operation day.
 await modal.getByRole('button',{name:'今天',exact:true}).click();
 const manuscript=modal.getByLabel('当前已采用正文'),current=await store.dispatch('activity.today',{novelId:books[0].id},actor);
 await expect(manuscript).toContainText(current.manuscript.words.toLocaleString('zh-CN'));
 const active=(await store.dispatch('chapter.list',{novelId:books[0].id},actor)).find(c=>c.title==='写作记录正文');
 const frozen=await store.dispatch('activity.stats',{from:'2024-01-01',to:'2024-12-31',novelId:books[0].id},actor);
 const removed=await store.dispatch('chapter.delete',{novelId:books[0].id,chapterId:active.id,expectedRevision:active.revision,confirm:true},actor);
 const negative=current.stats.proseAdded-active.textCount;
 await modal.getByRole('button',{name:'刷新写作记录'}).click();await expect(metric.locator('strong')).toHaveText(negative.toLocaleString('zh-CN')+'字');await expect(manuscript).toContainText('420 字 · 1 章');
 await expect(modal.getByRole('table',{name:'作品写作明细'})).toContainText(negative.toLocaleString('zh-CN'));
 await expect(modal.getByRole('table',{name:'作者与 AI 的贡献'})).toContainText(negative.toLocaleString('zh-CN'));
 await expect(modal.locator('.records-bar-prose').first()).toHaveCSS('top','74px');
 assert.deepEqual((await store.dispatch('activity.stats',{from:'2024-01-01',to:'2024-12-31',novelId:books[0].id},actor)).stats,frozen.stats);
 await page.screenshot({path:join(shots,'records-net-negative.png'),animations:'disabled'});
 await store.dispatch('chapter.restore',{novelId:books[0].id,chapterId:active.id,expectedRevision:removed.revision,targetRevision:active.revision},actor);
 await modal.getByRole('button',{name:'刷新写作记录'}).click();await expect(metric.locator('strong')).toHaveText(current.stats.proseAdded.toLocaleString('zh-CN')+'字');await expect(manuscript).toContainText(current.manuscript.words.toLocaleString('zh-CN'));
 await page.setViewportSize({width:320,height:700});await page.screenshot({path:join(shots,'records-320.png'),animations:'disabled'});
 expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.getBoundingClientRect().width<=innerWidth-16)).toBe(true);
 await page.keyboard.press('Tab');expect(await page.evaluate(()=>Boolean(document.activeElement.closest('.writing-records-modal')))).toBe(true);
 await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
 expect(errors).toEqual([]);await writeFile(join(shots,'report.json'),JSON.stringify({ok:true,checks:['real range and book filters, archived/removed titles','dated chart and per-day detail','cross-year records and month aggregation','late response isolation and refresh failures','unbound human query, no model requests','responsive dialog, keyboard containment and close']},null,2));
 console.log('Writing records date, migration, race and responsive UI checks passed.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
