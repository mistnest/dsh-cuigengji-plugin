import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {resolve} from 'node:path';

// Use the real native-client registration, rather than applyWithRPC, so the
// bootstrap retry policy is exercised through the same entry as a DSH install.
const root=resolve(import.meta.dirname,'..');
const bundle=await build({stdin:{resolveDir:root,loader:'tsx',contents:`
  import React from 'react';import{createRoot}from'react-dom/client';import{apply}from'./src/client/index.tsx';
  const registrations=[],effects=[],calls=[];
  const source=value=>({getSnapshot:()=>value,subscribe:()=>()=>{}});
  const ctx={effect:fn=>effects.push(fn()),connection:{rpc:{async call(channel,method,payload,signal){
    calls.push(payload.action);const response=await fetch(channel+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal});
    if(!response.ok)throw new Error('transport failure for '+channel+'/'+method+': HTTP '+response.status);return response.json();
  }}},slots:{inject:(_,fn)=>fn(),register:(options,Component)=>registrations.push({options,Component})},
    sidebarRightTabs:{register:()=>()=>{}},sidebarRight:{mounted:source('startup-author')},workspaces:{list:source({phase:'ready',items:[]})}};
  apply(ctx);const registration=registrations.find(item=>item.options.name==='sidebar.right.pane.tab');
  const useTabInfo=()=>({tab:{navigation:{address:'dsh-resource://cuigengji/startup-author'}}});
  window.fixture={calls:()=>calls};
  createRoot(document.getElementById('root')).render(<registration.Component sessionId="startup-author" useTabInfo={useTabInfo}/>);
`},bundle:true,write:false,format:'iife',loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'}});
let ready=false,mode='normal';
const requests=[],pending=[];
const server=createServer(async(req,res)=>{
  res.setHeader('cache-control','no-store');
  if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
  if(req.url==='/api/cuigengji/dispatch'){
    let body='';for await(const chunk of req)body+=chunk;const {action,args}=JSON.parse(body);requests.push({action,args});
    if(!ready){res.statusCode=404;res.end('not found');return;}
    res.setHeader('content-type','application/json');
    if(action==='settings.get'&&mode==='hang'){pending.push(res);return;}
    if(action==='settings.get'&&mode==='error'){res.end(JSON.stringify({ok:false,error:{code:'UNAVAILABLE',message:'模拟：作品库配置暂不可用'}}));return;}
    res.end(JSON.stringify({ok:true,value:action==='settings.get'?{dataRoot:'isolated-writing-library'}:action==='novel.list'?[{id:'saved-book',title:'重试后自动出现的作品',revision:1,archived:false}]:action==='guidance.get'?{enabled:false}:null}));return;
  }
  res.setHeader('content-type','text/html');res.end('<!doctype html><html><meta charset="utf-8"><style>html,body,#root{height:100%;margin:0}</style><div id="root"></div><script src="/bundle.js"></script></html>');
});
let browser;
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page=await browser.newPage({viewport:{width:1060,height:850}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await expect.poll(()=>requests.length).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole('status')).toHaveText('正在读取作品库…');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'重试',exact:true})).toHaveCount(0);
  ready=true;
  await expect(page.locator('.welcome-book')).toContainText('重试后自动出现的作品');
  await expect(page.getByRole('alert')).toHaveCount(0);
  assert.ok(requests.length>2,'bootstrap reads were retried without a user click');
  assert.ok(requests.every(({action})=>['settings.get','novel.list','binding.get','guidance.get'].includes(action)),'startup recovery must never send writes');
  mode='error';await page.reload();await expect(page.getByRole('alert')).toContainText('模拟：作品库配置暂不可用');await expect(page.locator('.welcome-book')).toHaveCount(0);
  mode='normal';await page.getByRole('button',{name:'重试',exact:true}).click();await expect(page.locator('.welcome-book')).toContainText('重试后自动出现的作品');
  mode='hang';await page.clock.install();await page.reload();await expect.poll(()=>pending.length).toBe(1);await page.clock.fastForward(20_001);
  await expect(page.getByRole('alert')).toContainText('读取作品库超时');await expect(page.locator('.welcome-book')).toHaveCount(0);
  mode='normal';await page.getByRole('button',{name:'重试',exact:true}).click();await expect(page.locator('.welcome-book')).toContainText('重试后自动出现的作品');
  for(const response of pending.splice(0))response.end(JSON.stringify({ok:true,value:{dataRoot:'stale-library'}}));
  assert.ok(requests.filter(({action})=>action==='novel.list'||action==='binding.get').every(({args})=>args.__libraryRoot==='isolated-writing-library'),'stale bootstrap responses must not switch the current library');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:['native registration recovers from initial 404','saved library opens automatically when server becomes ready','bootstrap errors expose a working retry','hanging bootstrap times out and stale responses cannot switch libraries','only read requests are retried']}));
}finally{for(const response of pending)response.destroy();await browser?.close();await new Promise(resolve=>server.close(resolve));}
