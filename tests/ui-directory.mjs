import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','directory');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser;
try {
  const {url}=await new Promise((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>reject(new Error('Preview timeout')),20000);
    preview.once('exit',code=>{clearTimeout(timer);reject(new Error(`Preview exit ${code}`));});
    preview.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});if(!response.ok)throw new Error(await response.text());return response.json();};
  const novelId=(await call('novel.list'))[0].id;
  for(let i=0;i<25;i++)await call('chapter.create',{novelId,title:`测试章节 ${i+2}`,content:'用于检查长目录的滚动与关闭按钮。'});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:780}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  const drawer=page.getByRole('dialog',{name:'章节目录抽屉'}),close=page.getByRole('button',{name:'关闭章节目录',exact:true});
  await expect(drawer).toBeVisible();
  const reopen=async()=>{await page.getByRole('button',{name:/^(打开目录|‹ 目录)$/}).click();await expect(drawer).toBeVisible();};
  for(const width of [360,590,750]) {
    await page.setViewportSize({width,height:780});
    for(const [fx,fy] of [[.1,.1],[.9,.1],[.1,.9],[.9,.9],[.5,.5]]) {
      const box=await close.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
      await page.mouse.click(box.x+box.width*fx,box.y+box.height*fy);
      await expect(drawer).toHaveCount(0);await reopen();
    }
    await drawer.locator('.chapter-directory').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await expect(close).toBeInViewport();await close.click();await reopen();
    await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);await reopen();
  }
  await page.setViewportSize({width:390,height:780});
  await page.screenshot({path:join(shots,'drawer-light.png')});
  const verifyAccent=async expected=>expect(await page.locator('.cuigengji').first().evaluate(el=>getComputedStyle(el).getPropertyValue('--cg-accent').trim())).toBe(expected);
  await verifyAccent('#4d6bfe');
  await page.evaluate(()=>{document.documentElement.style.cssText='--dsw-alias-bg-base:#17191f;--dsw-alias-label-primary:#e8eaf0;--dsw-alias-label-secondary:#a1a6b3;--dsw-alias-border-l1:#343946;--dsw-alias-state-business-primary:#6c8aff;';});
  await verifyAccent('#6c8aff');
  await expect(close).toHaveCSS('color','rgb(232, 234, 240)');
  await page.screenshot({path:join(shots,'drawer-dark.png')});
  await close.click();
  await page.setViewportSize({width:1100,height:820});
  await page.locator('.chapter-item').first().click();
  await page.getByRole('button',{name:'收起章节目录',exact:true}).click();
  await page.getByRole('button',{name:'展开章节目录',exact:true}).click();
  await page.getByRole('button',{name:'规划',exact:true}).click();
  await expect(page.getByRole('button',{name:'主线规划',exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'＋ 规划',exact:true})).toHaveCSS('background-color','rgb(108, 138, 255)');
  await page.screenshot({path:join(shots,'planning-dark.png')});
  await page.evaluate(()=>{document.documentElement.style.cssText='';});
  await expect(page.getByRole('button',{name:'＋ 规划',exact:true})).toHaveCSS('background-color','rgb(77, 107, 254)');
  await page.screenshot({path:join(shots,'planning-light.png')});
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,checks:['drawer corners/center hit at 360/590/750px','close remains fixed while directory scrolls','Escape and desktop collapse','blue fallback and host dark accent']}));
} finally {await browser?.close();preview.kill();}
