// Uses the production UI with synthetic data; never touches a desktop profile.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','novel-recycle');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs','--welcome'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser;
try {
  const {url}=await new Promise((resolve,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(new Error('Preview timeout: '+errors)),25000);
    preview.once('exit',code=>{clearTimeout(timer);reject(new Error('Preview exit '+code+': '+errors));});
    preview.stderr.on('data',chunk=>{errors+=chunk;});
    preview.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{
    const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});
    const value=await response.json();if(!response.ok)throw new Error(value.error);return value;
  };
  const book=(await call('novel.list'))[0];
  const other=await call('novel.create',{title:'很长的作品名称也应完整显示，不挤走右侧的回收按钮'});
  const extra=await call('novel.create',{title:'仍在写的故事'});
  const original=(await call('novel.export',{novelId:book.id})).novel;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  const page=await context.newPage(),errors=[],actions=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().endsWith('/dispatch')&&request.method()==='POST')actions.push(request.postDataJSON().action);});
  await page.goto(url);
  const card=()=>page.getByRole('article',{name:`作品 ${book.title}`,exact:true});
  const recycle=()=>card().getByRole('button',{name:`将《${book.title}》移入回收站`,exact:true});
  const fits=async()=>expect(await page.locator('.cuigengji').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  const capture=async name=>{await fits();await page.screenshot({path:join(shots,name+'.png'),animations:'disabled'});};
  const home=()=>page.getByRole('button',{name:'作品首页',exact:true}).click();
  const openTrash=async()=>{await page.getByRole('button',{name:/^作品回收站/}).click();await expect(page.getByRole('heading',{name:'作品回收站',exact:true})).toBeVisible();};
  await expect(page.locator('.welcome-book')).toHaveCount(3);
  for(const width of [360,560,1200]) {
    await page.setViewportSize({width,height:900});
    await recycle().scrollIntoViewIfNeeded();
    const button=await recycle().boundingBox(),box=await card().boundingBox();
    expect(button.width).toBeGreaterThanOrEqual(36);expect(button.height).toBeGreaterThanOrEqual(36);
    expect(button.x-box.x).toBeGreaterThan(box.width*.7);
    expect(box.x+box.width-button.x-button.width).toBeLessThanOrEqual(14);
    await expect(recycle()).toBeVisible();await capture('home-'+width);
  }
  // Keyboard and pointer activation share the same confirmation. Cancel must
  // neither bind the novel nor recycle it, including when clicking icon edges.
  await recycle().focus();await recycle().press('Space');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'取消',exact:true}).click();
  expect(await call('binding.get')).toBeNull();
  expect(actions.filter(a=>a==='binding.set'||a==='novel.archive')).toHaveLength(0);
  await recycle().click({position:{x:2,y:2}});
  await page.getByRole('button',{name:'取消',exact:true}).click();
  expect((await call('novel.list')).length).toBe(3);
  await card().getByRole('button',{name:`打开作品 ${book.title}`,exact:true}).click();
  await expect(page.getByRole('button',{name:'正文',exact:true})).toBeVisible();
  expect(await call('binding.get')).toBeNull();
  expect(actions.filter(a=>a==='binding.set')).toHaveLength(0);
  const second=await context.newPage();second.on('pageerror',error=>errors.push(error.message));
  await second.goto(url);await expect(second.getByRole('button',{name:'正文',exact:true})).toBeVisible();
  await home();const binds=actions.filter(a=>a==='binding.set').length;
  await recycle().click();await expect(page.getByRole('dialog')).toContainText(book.title);
  await page.getByRole('button',{name:'确定',exact:true}).click();
  await expect(card()).toHaveCount(0);expect(await call('binding.get')).toBeNull();
  expect(actions.filter(a=>a==='binding.set').length).toBe(binds);
  await expect(second.getByRole('heading',{name:'故事，等你继续。'})).toBeVisible();
  await openTrash();
  const row=()=>page.locator('.management-trash-row').filter({hasText:book.title});
  await expect(row()).toBeVisible();
  await row().getByRole('button',{name:`恢复《${book.title}》`,exact:true}).click();
  await expect(page.getByText('回收站是空的',{exact:true})).toBeVisible();
  const restored=(await call('novel.export',{novelId:book.id})).novel;
  const omit=n=>{const copy={...n};for(const key of ['revision','updatedAt','archived','archivedAt'])delete copy[key];return copy;};
  expect(omit(restored)).toEqual(omit(original));expect(await call('binding.get')).toBeNull();
  await home();await expect(card()).toBeVisible();
  await recycle().click();await page.getByRole('button',{name:'确定',exact:true}).click();
  const otherLatest=(await call('novel.list')).find(n=>n.id===other.id);
  await call('novel.archive',{novelId:other.id,expectedRevision:otherLatest.revision,confirm:true});
  await page.getByRole('button',{name:'刷新当前页面',exact:true}).click();
  await expect(page.locator('.welcome-book')).toHaveCount(1);
  await openTrash();
  for(const width of [360,560,1200]) {
    await page.setViewportSize({width,height:900});
    await expect(row().getByRole('button',{name:`恢复《${book.title}》`,exact:true})).toBeInViewport();
    await expect(row().getByRole('button',{name:`永久删除《${book.title}》`,exact:true})).toBeInViewport();
    await capture('recycle-'+width);
  }
  await page.evaluate(()=>{document.documentElement.style.cssText='--dsw-alias-bg-base:#17191f;--dsw-alias-label-primary:#e8eaf0;--dsw-alias-label-secondary:#a1a6b3;--dsw-alias-border-l1:#343946;--dsw-alias-state-business-primary:#6c8aff;';});
  await capture('recycle-dark');
  await row().getByRole('button',{name:`永久删除《${book.title}》`,exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('无法从回收站恢复');
  await page.getByRole('button',{name:'取消',exact:true}).click();await expect(row()).toBeVisible();
  await row().getByRole('button',{name:`永久删除《${book.title}》`,exact:true}).click();
  await page.getByRole('button',{name:'确定',exact:true}).click();await expect(row()).toHaveCount(0);
  expect((await call('novel.list',{includeArchived:true})).map(n=>n.id)).toEqual(expect.arrayContaining([other.id,extra.id]));
  expect((await call('novel.list',{includeArchived:true})).some(n=>n.id===book.id)).toBe(false);
  // The last live work can be recycled and the empty home still exposes its bin.
  await home();await page.getByRole('button',{name:`将《${extra.title}》移入回收站`,exact:true}).click();
  await page.getByRole('button',{name:'确定',exact:true}).click();
  await expect(page.getByRole('heading',{name:'你的故事，从这里开始。'})).toBeVisible();
  await openTrash();await expect(page.locator('.management-trash-row')).toHaveCount(2);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,covered:['independent card hit areas','pointer and keyboard cancellation','cross-panel refresh','complete restore','confirmed permanent deletion','empty library','360/560/1200px and dark theme'],screenshots:shots}));
} finally {await browser?.close();preview.kill();}
