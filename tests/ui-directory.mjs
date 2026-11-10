import {selectSettingsCategory} from './helpers/navigation.mjs';
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
  // Closing an unselected directory must survive navigation and a cold reload.
  await close.click();await page.getByRole('button',{name:'规划',exact:true}).click();await page.getByRole('button',{name:'正文',exact:true}).click();await expect(page.locator('.chapter-workspace')).toBeVisible();await expect(drawer).toHaveCount(0);
  await page.reload();await expect(page.getByRole('button',{name:'打开目录',exact:true})).toBeVisible();await expect(drawer).toHaveCount(0);await reopen();
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
    await expect(close).toBeFocused();await page.keyboard.press('Enter');await expect(drawer).toHaveCount(0);await reopen();
    const box=await drawer.boundingBox(),outsideX=box.x+box.width+12;
    await page.mouse.click(box.x+12,box.y+26);await expect(drawer).toBeVisible();
    // A gesture that starts inside the drawer must not dismiss it on release outside.
    await page.mouse.move(box.x+12,box.y+26);await page.mouse.down();await page.mouse.move(outsideX,300);await page.mouse.up();await expect(drawer).toBeVisible();
    await page.mouse.click(outsideX,300);await expect(drawer).toHaveCount(0);
    await expect(page.getByRole('button',{name:/^(打开目录|‹ 目录)$/})).toBeFocused();await reopen();
  }
  // A DSH tab clips/transforms its subtree and sits below the title bar.
  // Its directory stays inside that pane and leaves the chat interactive.
  await page.setViewportSize({width:1280,height:820});
  await page.evaluate(()=>{document.getElementById('root').style.cssText='position:absolute;inset:64px 0 0 auto;width:560px;overflow:hidden;transform:translateZ(0)';});
  await expect(drawer).toBeVisible();
  const panel=await page.locator('#root').boundingBox(),localDrawer=await drawer.boundingBox();
  expect(localDrawer.x).toBeGreaterThanOrEqual(panel.x);expect(localDrawer.y).toBeGreaterThanOrEqual(panel.y);
  expect(localDrawer.x+localDrawer.width).toBeLessThanOrEqual(panel.x+panel.width);
  await page.evaluate(()=>{const input=document.createElement('textarea');input.id='fixture-chat';input.setAttribute('aria-label','DSH 示例聊天');input.style.cssText='position:absolute;left:20px;top:100px;width:400px;height:100px;';document.body.appendChild(input);});
  for(const y of [8,26,44]) {await page.mouse.click(300,y);await expect(drawer).toBeVisible();}
  await page.getByRole('textbox',{name:'DSH 示例聊天'}).fill('目录展开时仍可继续讨论。');
  await expect(page.getByRole('textbox',{name:'DSH 示例聊天'})).toHaveValue('目录展开时仍可继续讨论。');
  await expect(drawer).toBeVisible();
  await drawer.locator('.chapter-directory').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await expect(close).toBeInViewport();await close.click();await expect(drawer).toHaveCount(0);await reopen();
  const embedded=await drawer.boundingBox();await page.mouse.click(embedded.x+embedded.width+12,embedded.y+120);await expect(drawer).toHaveCount(0);await reopen();
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{document.getElementById('root').style.cssText='';document.getElementById('fixture-chat').remove();});
  await page.setViewportSize({width:390,height:780});
  await reopen();
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
  const directory=page.locator('.chapter-directory'),heading=directory.locator('.directory-header');
  await directory.evaluate(el=>{el.scrollTop=0;});
  const headingTop=(await heading.boundingBox()).y;
  await directory.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  expect(await directory.evaluate(el=>el.scrollTop)).toBeGreaterThan(200);
  expect(Math.abs((await heading.boundingBox()).y-headingTop)).toBeLessThan(1);
  const collapseBox=await page.getByRole('button',{name:'收起章节目录',exact:true}).boundingBox();
  expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.getAttribute('aria-label'),{x:collapseBox.x+collapseBox.width/2,y:collapseBox.y+collapseBox.height/2})).toBe('收起章节目录');
  await page.screenshot({path:join(shots,'directory-fixed-header.png')});
  await page.getByRole('button',{name:'收起章节目录',exact:true}).click();
  const workspace=page.locator('.chapter-workspace');
  const expectCollapsed=async()=>{await expect(workspace).toHaveClass(/directory-collapsed/);await expect(page.getByRole('button',{name:'展开章节目录',exact:true})).toBeVisible();};
  await page.getByRole('button',{name:'规划',exact:true}).click();await page.getByRole('button',{name:'正文',exact:true}).click();await expectCollapsed();
  await page.getByRole('button',{name:'设定',exact:true}).click();await page.getByRole('button',{name:'正文',exact:true}).click();await expectCollapsed();
  await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'AI与写作');await page.getByRole('button',{name:'写作预设',exact:true}).click();await page.getByRole('button',{name:'‹ 返回设置',exact:true}).click();await page.getByRole('button',{name:'关闭设置',exact:true}).click();await expectCollapsed();
  await page.getByRole('button',{name:'刷新当前页面',exact:true}).click();await expectCollapsed();
  await page.reload();await expectCollapsed();
  await page.getByRole('button',{name:'作品首页',exact:true}).click();await page.locator('.welcome-book').filter({hasText:'催更姬 · 试用作品'}).click();await expectCollapsed();
  await page.setViewportSize({width:390,height:780});await expect(drawer).toHaveCount(0);await reopen();await close.click();
  await page.getByRole('button',{name:'设置',exact:true}).click();await expect(page.getByRole('dialog',{name:'设置',exact:true}).getByRole('button',{name:'多agent协作',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'关闭设置',exact:true}).click();await expect(drawer).toHaveCount(0);
  await page.getByRole('button',{name:'规划',exact:true}).click();await page.getByRole('button',{name:'正文',exact:true}).click();await expect(drawer).toHaveCount(0);
  await page.setViewportSize({width:1100,height:820});await expectCollapsed();
  await page.getByRole('button',{name:'展开章节目录',exact:true}).click();
  await page.getByRole('button',{name:'规划',exact:true}).click();await page.getByRole('button',{name:'正文',exact:true}).click();await expect(workspace).not.toHaveClass(/directory-collapsed/);
  // The reload above also clears this fixture's injected host theme.
  await page.evaluate(()=>{document.documentElement.style.cssText='--dsw-alias-bg-base:#17191f;--dsw-alias-label-primary:#e8eaf0;--dsw-alias-label-secondary:#a1a6b3;--dsw-alias-border-l1:#343946;--dsw-alias-state-business-primary:#6c8aff;';});
  await page.getByRole('button',{name:'规划',exact:true}).click();
  await expect(page.getByLabel('规划画布',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'＋ 情节',exact:true})).toHaveCSS('background-color','rgb(108, 138, 255)');
  await page.screenshot({path:join(shots,'planning-dark.png')});
  await page.evaluate(()=>{document.documentElement.style.cssText='';});
  await expect(page.getByRole('button',{name:'＋ 情节',exact:true})).toHaveCSS('background-color','rgb(77, 107, 254)');
  await page.screenshot({path:join(shots,'planning-light.png')});
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,checks:['drawer corners/center hit at 360/590/750px','close remains fixed while directory scrolls','Enter, Escape, local backdrop and focus return','inside-to-outside drag does not dismiss','directory stays in embedded DSH pane; chat remains interactive','closed drawer and desktop collapse survive navigation/preset/home/refresh/reload; explicit expansion stays open','desktop collapse, blue fallback and host dark accent']}));
} finally {await browser?.close();preview.kill();}
