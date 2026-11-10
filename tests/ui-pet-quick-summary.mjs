// Test the production overlay: visible hit targets, stable anchoring and
// animated disclosure at desktop/mobile sizes. Only synthetic data is used.
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','pet-quick');
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:root,loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';
import{PetCompanion}from'./src/client/features/pet/index.tsx';
import{invalidatePetActivity}from'./src/client/features/pet/activity.ts';
let sample='normal';window.openedRecords=0;
const activity=()=>({date:'2026-11-02',novelId:null,title:sample==='long'?'雨城来信 · 旧城区与失踪信件的调查笔记 · 演示作品':'雨城来信',stats:{proseAdded:1234,settingAdded:120,planningChanges:3,conversationInput:420,chaptersTouched:2,settingsTouched:1}});
const presentation=()=>({lines:[],customContent:false,appearance:{scale:1},summary:{date:'2026-11-02',tokens:sample==='long'?1234567890:286420,calls:12,input:48210,cacheRead:192810,cacheWrite:0,output:45400,currency:'CNY',cost:'0.801873',costs:sample==='long'?{CNY:'12345.789',USD:'12.98'}:{CNY:'0.801873'},unpriced:1,balanceTotals:sample==='long'?{CNY:'123456.789',USD:'23.45'}:{CNY:'86.244999'},balances:[{id:'demo',name:sample==='long'?'一个很长的演示账户名称，用来检查明细排版':'演示账户',currency:'CNY',balance:'86.244999',at:1793635200000}]}});
const rpc=async(action,args)=>action==='usage.presentation'?presentation():action==='binding.get'?{novelId:null}:action==='activity.today'?activity():{};
window.fixture={sample(value){sample=value;invalidatePetActivity(rpc)},refresh(){invalidatePetActivity(rpc)},theme(dark){document.documentElement.style.colorScheme=dark?'dark':'light'}};
createRoot(document.getElementById('root')).render(<PetCompanion rpc={rpc} sessionId="synthetic-preview" openDetails={()=>window.openedRecords++}/>);
`},bundle:true,write:false,format:'iife',loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'}});
const server=createServer((req,res)=>{
  res.setHeader('cache-control','no-store');
  if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><meta charset="utf-8"><title>紧凑速览 · 调整预览</title><style>html,body{margin:0;height:100%;font:14px system-ui;background:#f2f1f5;color:#756f80;color-scheme:light}body>p{position:absolute;top:28px;left:32px;line-height:1.8}html[style*="dark"] body{background:#1c1b20}</style><p>桌宠紧凑速览<br>点击桌宠展开，点击箭头查看明细。</p><div id="root"></div><script src="/bundle.js"></script></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
if(process.argv.includes('--serve')){console.log(url);}
else{
  let browser;
  try{
    await mkdir(shots,{recursive:true});
    browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
    const page=await browser.newPage({viewport:{width:1060,height:800},deviceScaleFactor:1.25}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
    const avatar=page.locator('.pet-avatar'),dialog=page.getByRole('dialog');
    await avatar.click();await expect(dialog.locator('.pet-quick-token-line strong')).toHaveText('286,420');
    const token=dialog.getByRole('button',{name:'今日 Token 构成',exact:true}),balance=dialog.getByRole('button',{name:'账户余额来源',exact:true}),writing=dialog.getByRole('button',{name:/今日写作/}),close=dialog.getByRole('button',{name:'收起桌宠对话'}),records=dialog.getByRole('button',{name:'查看记录'});
    const hit=async locator=>{const result=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),targets=[r.x+r.width/2,r.right-8].map(x=>document.elementFromPoint(x,r.y+r.height/2));return {ok:targets.every(target=>target?.closest('button')===el),name:el.getAttribute('aria-label')||el.textContent,rect:{x:r.x,y:r.y,width:r.width,height:r.height},hits:targets.map(target=>target?.outerHTML.slice(0,250))};});expect(result.ok,JSON.stringify(result)).toBe(true);};
    for(const button of [token,balance,writing,close,records])await hit(button);
    await page.screenshot({path:join(shots,'overview.png'),animations:'disabled'});
    const before=await close.boundingBox(),tokenBefore=await token.boundingBox();
    await token.locator('svg').click();await expect(token).toHaveAttribute('aria-expanded','true');await expect(dialog.locator('.pet-quick-breakdown')).toBeVisible();
    await page.waitForTimeout(220);
    const after=await close.boundingBox(),tokenAfter=await token.boundingBox();
    expect(Math.abs(after.y-before.y)).toBeLessThan(1);expect(Math.abs(tokenAfter.y-tokenBefore.y)).toBeLessThan(1);
    await hit(token);await token.locator('svg').click();await expect(dialog.locator('.pet-quick-breakdown')).toBeHidden();
    await balance.click();await expect(dialog.locator('.pet-quick-accounts')).toContainText('演示账户');
    expect((await dialog.locator('.pet-quick-accounts').boundingBox()).width).toBeGreaterThan(260);
    await balance.click();await expect(dialog.locator('.pet-quick-accounts')).toBeHidden();
    await writing.click();await expect(dialog.locator('.pet-quick-writing-extra')).toBeVisible();await page.evaluate(()=>fixture.refresh());await expect(writing).toHaveAttribute('aria-expanded','true');
    // Repeated clicks interrupt the previous animation without a stale end state.
    await writing.click();await writing.click();await writing.click();await expect(dialog.locator('.pet-quick-writing-extra')).toBeHidden();
    await token.focus();await page.keyboard.press('Enter');await expect(token).toHaveAttribute('aria-expanded','true');
    await balance.click();await writing.click();
    const scroll=dialog.locator('.pet-quick-scroll');await scroll.evaluate(el=>el.scrollTop=el.scrollHeight);
    await hit(close);await hit(records);await records.click();expect(await page.evaluate(()=>openedRecords)).toBe(1);await expect(dialog).toHaveCount(0);
    await page.evaluate(()=>fixture.sample('long'));await avatar.click();await expect(dialog.locator('.pet-quick-token-line strong')).toHaveText('1,234,567,890');
    await expect(dialog.locator('.pet-companion-scope')).toContainText('旧城区');
    await expect(dialog.locator('.pet-quick-amounts').first()).toContainText('12,345.79');
    expect(await dialog.locator('.pet-quick-amounts strong').evaluateAll(elements=>elements.every(el=>el.getBoundingClientRect().height<31))).toBe(true);
    await page.screenshot({path:join(shots,'long-values.png'),animations:'disabled'});
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});expect(await token.evaluate(el=>getComputedStyle(el.querySelector('svg')).transitionDuration)).toBe('0s');
    await page.evaluate(()=>fixture.theme(true));await page.screenshot({path:join(shots,'dark.png'),animations:'disabled'});
    await page.setViewportSize({width:640,height:480});
    // Resize events reach React after the browser viewport changes.
    await expect.poll(async()=>{const r=await dialog.boundingBox();return r&&r.x>=7&&r.x+r.width<=633&&r.y>=7&&r.y+r.height<=473;}).toBe(true);
    await hit(close);await hit(records);
    await close.click();await page.evaluate(()=>fixture.sample('normal'));await page.setViewportSize({width:320,height:420});await avatar.click();
    await expect(dialog).toBeVisible();await token.click();await balance.click();await writing.click();await scroll.evaluate(el=>el.scrollTop=el.scrollHeight);
    for(const button of [close,records])await hit(button);
    const small=await dialog.boundingBox();expect(small.x).toBeGreaterThanOrEqual(7);expect(small.x+small.width).toBeLessThanOrEqual(313);expect(small.y+small.height).toBeLessThanOrEqual(413);
    await page.screenshot({path:join(shots,'small-screen.png'),animations:'disabled'});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);console.log(JSON.stringify({ok:true,checks:['visible button hit targets at 125% device scale','stable close and Token headers during unfolding','full-width balance details','interruptible disclosure and keyboard access','pinned actions with a scrolled body','long names and multi-currency values','reduced motion and dark mode','320×420 viewport'],screenshots:shots}));
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
