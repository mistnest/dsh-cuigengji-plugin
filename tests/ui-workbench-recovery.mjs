// Real registered tab and chapter editor in an isolated library. The outer
// boundary represents the host retiring a failed slot; it must never run.
import {createServer} from 'node:http';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename,join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {Store} from '../src/core/store.js';

const root=resolve(import.meta.dirname,'..'),directory=await mkdtemp(join(tmpdir(),'cuigengji-recovery-'));
const shots=join(root,'test-results','workbench-recovery');await mkdir(shots,{recursive:true});
const store=new Store(directory),actor={kind:'human',sessionId:'recovery-main'};
const novel=await store.dispatch('novel.create',{title:'界面恢复测试作品'},actor);
const saved='　　这是一段已经保存的正文。';
const chapter=await store.dispatch('chapter.create',{novelId:novel.id,title:'第一章 回到工作台',content:saved},actor);
await store.dispatch('binding.set',{novelId:novel.id},actor);
const bundle=await build({stdin:{resolveDir:root,loader:'tsx',contents:`
  import React,{useSyncExternalStore} from 'react';import{createRoot}from'react-dom/client';import{applyWithRPC}from'./src/client/index.tsx';
  function source(value){const listeners=new Set();return{getSnapshot:()=>value,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},set(next){value=next;listeners.forEach(fn=>fn())}}}
  const tab=source({sessionId:'recovery-main',hookFault:false}),chat=source(0),registrations=[],retired=[],actions=[];
  let mode='normal';
  const ctx={effect:fn=>fn(),slots:{inject:(_,fn)=>fn(),register:(options,Component)=>registrations.push({options,Component})},sidebarRightTabs:{register:()=>()=>{}},sidebarRight:{mounted:source('recovery-main')},workspaces:{list:source({phase:'ready',items:[]})}};
  applyWithRPC(ctx,async(action,args,sessionId)=>{actions.push(action);if(action==='novel.list'&&mode==='render')return null;if(action==='novel.list'&&mode==='rpc')throw new Error('测试：工作库暂时无法读取');if(action==='chapter.update'&&mode==='save')throw new Error('测试：本次保存暂时中断');const response=await fetch('/dispatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args,sessionId})});const result=await response.json();if(!response.ok)throw new Error(result.error);return result;});
  const registration=registrations.find(item=>item.options.name==='sidebar.right.pane.tab');if(!registration)throw new Error('Workbench tab not registered');
  const useSource=s=>useSyncExternalStore(s.subscribe,s.getSnapshot);
  function useTabInfo(){const value=useSource(tab);if(value.hookFault)throw new Error('测试：标签信息暂时不可用');return{tab:{navigation:{address:'dsh-resource://cuigengji/'+value.sessionId}}}}
  class HostBoundary extends React.Component{state={failed:false};static getDerivedStateFromError(){return{failed:true}}componentDidCatch(error){retired.push(error.message)}render(){return this.state.failed?<div data-slot-error/>:this.props.children}}
  function App(){const value=useSource(tab),count=useSource(chat);return <><aside><button onClick={()=>chat.set(count+1)}>聊天继续 {count}</button></aside><main><HostBoundary><registration.Component sessionId={value.sessionId} useTabInfo={useTabInfo}/></HostBoundary></main></>}
  localStorage.setItem(${JSON.stringify(`cuigengji:ui:recovery-main:${novel.id}:chapter`)},${JSON.stringify(JSON.stringify(chapter.id))});
  window.fixture={mode(value){mode=value},hookFault(value){tab.set({...tab.getSnapshot(),hookFault:value})},session(sessionId){tab.set({sessionId,hookFault:false})},stats:()=>({retired,actions})};
  createRoot(document.getElementById('root')).render(<App/>);
`},bundle:true,write:false,format:'iife',loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'}});
const server=createServer(async(req,res)=>{
  try{
    res.setHeader('cache-control','no-store');
    if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
    if(req.url==='/dispatch'){
      let body='';for await(const chunk of req)body+=chunk;const request=JSON.parse(body);
      const value=request.action==='settings.get'?{dataRoot:directory}:await store.dispatch(request.action,request.args||{},{kind:'human',sessionId:request.sessionId});
      res.setHeader('content-type','application/json');res.end(JSON.stringify(value));return;
    }
    res.setHeader('content-type','text/html');res.end('<!doctype html><html><meta charset="utf-8"><style>html,body,#root{margin:0;height:100%;font:14px system-ui}#root{display:flex}aside{width:120px;padding:12px;box-sizing:border-box}main{flex:1;min-width:0;height:100%}</style><div id="root"></div><script src="/bundle.js"></script></html>');
  }catch(error){res.statusCode=500;res.setHeader('content-type','application/json');res.end(JSON.stringify({error:error.message}));}
});
let browser;
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page=await browser.newPage({viewport:{width:1060,height:850}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const failure=page.getByRole('alert',{name:'催更姬界面异常'}),retry=page.getByRole('button',{name:'重新打开工作台',exact:true});
  const prose=page.getByRole('textbox',{name:'正文',exact:true});await expect(prose).toHaveValue(saved);
  await page.evaluate(()=>fixture.hookFault(true));await expect(failure).toBeVisible();
  await retry.click();await expect(failure).toBeVisible(); // Persistent errors stay recoverable inside the plugin.
  await failure.locator('summary').click();await expect(failure.locator('pre')).toHaveText('测试：标签信息暂时不可用');
  await page.getByRole('button',{name:'聊天继续 0',exact:true}).click();await expect(page.getByRole('button',{name:'聊天继续 1',exact:true})).toBeVisible();
  await page.screenshot({path:join(shots,'recovery-page.png')});
  await page.evaluate(()=>fixture.hookFault(false));await retry.click();await expect(prose).toHaveValue(saved);

  // A child render failure must also remain inside the registered tab.
  await page.evaluate(()=>fixture.mode('render'));await page.getByRole('button',{name:'刷新当前页面',exact:true}).click();await expect(failure).toBeVisible();
  await page.evaluate(()=>fixture.mode('normal'));await retry.click();await expect(prose).toHaveValue(saved);

  // Ordinary rejected RPCs keep the existing resource-error/retry behavior.
  await page.evaluate(()=>fixture.mode('rpc'));await page.getByRole('button',{name:'刷新当前页面',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('测试：工作库暂时无法读取');await expect(failure).toHaveCount(0);
  await page.evaluate(()=>fixture.mode('normal'));await page.getByRole('button',{name:'重试',exact:true}).first().click();await expect(prose).toHaveValue(saved);

  // An error in one session is cleared when its scoped registration is replaced.
  await page.evaluate(()=>fixture.hookFault(true));await expect(failure).toBeVisible();
  await page.evaluate(()=>fixture.session('recovery-other'));await expect(failure).toHaveCount(0);await expect(page.locator('.welcome-book')).toHaveCount(1);
  await page.evaluate(()=>fixture.session('recovery-main'));await expect(prose).toHaveValue(saved);
  expect((await page.evaluate(()=>fixture.stats())).actions.filter(action=>!/^(settings\.get|novel\.list|binding\.get|guidance\.get|chapter\.(list|get)|volume\.list)$/.test(action))).toEqual([]);

  // Even when the editor's unmount save cannot reach the server, remounting
  // must recover the cached draft rather than replace it with server text.
  await page.evaluate(()=>fixture.mode('save'));
  const draft='　　这段正文刚输入，还没有自动保存。';await prose.fill(draft);await page.evaluate(()=>fixture.hookFault(true));await expect(failure).toBeVisible();
  const cached=await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('cuigengji:draft:v2:library::')&&key.includes('::recovery-main:')).map(key=>JSON.parse(localStorage.getItem(key))));
  expect(cached.some(item=>item.value.content===draft)).toBe(true);
  expect((await store.dispatch('chapter.get',{novelId:novel.id,chapterId:chapter.id},actor)).content).toBe(saved);
  await page.evaluate(()=>{fixture.hookFault(false);fixture.mode('normal')});await retry.click();await expect(prose).toHaveValue(draft);
  expect((await page.evaluate(()=>fixture.stats())).retired).toEqual([]);expect(errors).toEqual([]);await expect(page.locator('[data-slot-error]')).toHaveCount(0);
  console.log(JSON.stringify({ok:true,checks:['registered tab: hook and child failures stay inside the plugin','retry after persistent faults, chat remains usable','RPC rejection uses resource retry','session switch clears error state','unsaved chapter draft survives recovery','host slot never retires']}));
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
  assert.equal(resolve(directory),directory);assert.ok(basename(directory).startsWith('cuigengji-recovery-'));
  await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
