import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';

const root=resolve(import.meta.dirname,'..'), shots=join(root,'test-results','controls');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser, server;
try {
  const {url}=await new Promise((resolve,reject)=>{
    let output=''; const timeout=setTimeout(()=>reject(new Error('Preview timed out')),20000);
    preview.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Preview exited ${code}`));});
    preview.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timeout);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});if(!r.ok)throw new Error(await r.text());return r.json();};
  const novelId=(await call('novel.list'))[0].id;
  for(let i=0;i<22;i++)await call('graph.group.create',{novelId,name:i===1?'雨城 · 主要人物与势力':i===2?'旧都与南境之间尚未揭示的秘密与人物关系分组':'设定分组 '+String(i+1).padStart(2,'0')});
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page=await browser.newPage({viewport:{width:900,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  expect(await page.evaluate(()=>CSS.supports('appearance','base-select'))).toBe(true);
  const picker=page.getByLabel('绑定小说',{exact:true});
  await picker.click(); await expect(picker).toHaveJSProperty('value',novelId);
  expect(await picker.evaluate(el=>el.matches(':open'))).toBe(true);
  await page.screenshot({path:join(shots,'books-900.png')});await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'设定',exact:true}).click();
  const groups=page.getByLabel('设定分组',{exact:true});
  await groups.click();
  const longOption=groups.getByRole('option',{name:'旧都与南境之间尚未揭示的秘密与人物关系分组'});
  await expect(longOption).toBeVisible();
  await page.screenshot({path:join(shots,'groups-900.png')});
  await longOption.click();await expect(groups).toHaveValue((await call('graph.groups',{novelId})).find(g=>g.name.startsWith('旧都')).id);
  const selected=await groups.inputValue();
  await groups.click();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
  await expect(groups).toHaveValue(selected);
  await groups.click();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(groups).toHaveValue('__ungrouped');
  await page.setViewportSize({width:360,height:780});await groups.click();
  const bounds=await longOption.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(360);
  await page.screenshot({path:join(shots,'groups-360.png')});await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'设置',exact:true}).click();
  const font=page.getByLabel('默认正文字号',{exact:true});await font.click();
  await page.screenshot({path:join(shots,'settings-360.png')});
  await font.getByRole('option',{name:'20',exact:true}).click();await expect(font).toHaveValue('20');
  await expect(page.getByRole('dialog',{name:'设置',exact:true})).toBeVisible();
  await page.getByLabel('关闭设置',{exact:true}).click();
  await page.evaluate(()=>{document.documentElement.style.cssText='--dsw-alias-bg-base:#20251f;--dsw-alias-label-primary:#e4e8de;--dsw-alias-label-secondary:#a8b0a0;--dsw-alias-border-l1:#404a3b;--dsw-alias-state-success-primary:#a4c195';});
  await groups.click();await page.screenshot({path:join(shots,'groups-dark-360.png')});
  expect(await groups.evaluate(el=>getComputedStyle(el,'::picker(select)').backgroundColor)).toBe('rgb(32, 37, 31)');
  await page.keyboard.press('Escape');

  // Exercise the real registration/component with the documented DSH observables.
  // No model calls, messages, or durable DSH sessions are created by this fixture.
  const bundle=await build({stdin:{resolveDir:root,loader:'tsx',contents:`
    import React,{useSyncExternalStore} from 'react';import{createRoot}from'react-dom/client';import{applyWithRPC}from'./src/client/index.tsx';
    function source(value){const listeners=new Set();return{getSnapshot:()=>value,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},set(next){value=next;listeners.forEach(fn=>fn())}}}
    const mounted=source('blank'), sessions=source({byId:{blank:{id:'blank',blank:true,retainedBy:{mainView:1}}}}), workspaces=source({phase:'ready',items:[{workspaceId:'work',title:'小说工作区'}]});
    let fail=false;const registrations=[];const opened=[];let connects=0,selected=0;
    const ctx={effect:fn=>fn(),slots:{inject:(_,fn)=>fn(),register:(options,Component)=>{registrations.push({options,Component})}},
      sidebarRightTabs:{register:()=>()=>{}},sidebarRight:{mounted,openResource:address=>{opened.push(address);document.querySelector('output').textContent=address}},
      workspaces:{list:workspaces},layout:{selectPanel:()=>{selected++;mounted.set('blank')}},uiWorkspace:{openWorkspace:async(id,before)=>{connects++;if(fail)throw new Error('工作区暂时无法打开');before('new-blank');sessions.set({byId:{'new-blank':{id:'new-blank',blank:true,retainedBy:{mainView:1}}}});mounted.set('new-blank')}}};
    applyWithRPC(ctx,()=>{throw new Error('Opening entry must not write novel data')});
    const entry=registrations.find(r=>r.options.name==='sidebar.footer.action');if(!entry||registrations.some(r=>r.options.name==='conversation.session.header.actions'))throw new Error('Entry must be resident');
    const props=entry.options.inject();const useSource=s=>useSyncExternalStore(s.subscribe,s.getSnapshot);
    function App(){const wide=useSource(width);return <><aside style={{width:wide?220:56,padding:12,background:'#f2f2ee',height:'100vh',boxSizing:'border-box',display:'flex',flexDirection:'column'}}><div>DSH</div><div style={{flex:1}}>新会话</div><entry.Component {...props} wide={wide} useNovelSession={select=>select(useSource(mounted))} useNovelWorkspaces={select=>select(useSource(workspaces))} useSessions={select=>select(useSource(sessions))}/><div>设置</div></aside><output/></>}
    const width=source(true);window.fixture={mode(value){mounted.set(value==='blank'?'blank':undefined);sessions.set({byId:value==='none'?{}:{blank:{id:'blank',blank:true,retainedBy:{mainView:1}}}})},compact:()=>width.set(false),fail:()=>{fail=true},recover:()=>{fail=false},stats:()=>({opened,connects,selected}),empty:()=>workspaces.set({phase:'ready',items:[]})};
    createRoot(document.getElementById('root')).render(<App/>);
  `},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"development"'}});
  server=createServer((req,res)=>{res.setHeader('content-type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].contents:'<!doctype html><html><meta charset="utf-8"><style>body{margin:0;font:14px system-ui}#root{display:flex}output{padding:24px}</style><div id="root"></div><script src="/bundle.js"></script></html>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));await page.setViewportSize({width:900,height:650});await page.goto('http://127.0.0.1:'+server.address().port);
  const entry=page.getByRole('button',{name:'打开催更姬',exact:true});
  await expect(entry).toBeVisible();await entry.click();await expect(page.locator('output')).toHaveText('dsh-resource://cuigengji/blank');
  expect((await page.evaluate(()=>fixture.stats())).connects).toBe(0);
  await page.screenshot({path:join(shots,'entry-blank.png')});
  await page.evaluate(()=>fixture.mode('panel'));await entry.click();expect((await page.evaluate(()=>fixture.stats())).selected).toBe(1);
  await page.evaluate(()=>fixture.mode('none'));await entry.click();await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('工作区',{exact:true})).toHaveValue('work');await page.screenshot({path:join(shots,'entry-workspace.png')});
  await page.evaluate(()=>fixture.fail());await page.getByRole('button',{name:'进入工作台'}).click();await expect(page.getByRole('alert')).toHaveText('工作区暂时无法打开');
  await page.evaluate(()=>fixture.recover());await page.getByRole('button',{name:'进入工作台'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('output')).toHaveText('dsh-resource://cuigengji/new-blank');
  await page.evaluate(()=>fixture.compact());await expect(entry).toBeVisible();await expect(entry).toHaveAccessibleName('打开催更姬');
  await page.evaluate(()=>{fixture.mode('none');fixture.empty()});await entry.click();await expect(page.getByText('请先在 DSH 左侧添加一个工作区，然后从这里进入。')).toBeVisible();await expect(page.getByRole('button',{name:'进入工作台'})).toBeDisabled();await page.keyboard.press('Escape');await expect(entry).toBeFocused();
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,checks:['styled native dropdowns: mouse, keyboard, Escape, long labels, scrolling, narrow, dark, modal','resident entry: blank session, global panel, sessionless workspace, failure retry, compact and empty state']}));
}catch(error){if(browser){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:join(shots,'failure.png')});}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));preview.kill();}
