import {selectSettingsCategory} from './helpers/navigation.mjs';
import {selectPlanningPage,selectedPlanningPage,showOrganization} from './helpers/navigation.mjs';
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {chromium, expect} from '@playwright/test';
import {openAuthorPage} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'), shots=join(root,'test-results','navigation');
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page,releaseSave;
try {
  const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(new Error(errors||'Preview timeout')),25000);host.stderr.on('data',chunk=>errors+=chunk);host.once('exit',code=>{clearTimeout(timer);reject(new Error('Preview exit '+code+errors));});host.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const result=await response.json();if(!response.ok)throw new Error(result.error);return result;};
  const book=(await call('novel.list'))[0],novelId=book.id,chapter=(await call('chapter.list',{novelId}))[0];
  await call('novel.update',{novelId,expectedRevision:book.revision,title:'雾港来信'});
  const second=await call('novel.create',{title:'月亮落在屋顶上'});
  const prose=Array.from({length:60},(_,i)=>`第${i+1}段。${'她将信纸折好，收进抽屉，窗外的雨声渐渐远去。'.repeat(4)}`).join('\n\n');
  await call('chapter.update',{novelId,chapterId:chapter.id,expectedRevision:chapter.revision,content:prose});
  const group=await call('graph.group.create',{novelId,name:'雾港 · 人物'});
  const person=await call('graph.create',{novelId,type:'character_card',name:'林序',summary:'追查旧案的调查员',content:'她在港口等待一位旧友。',position:{x:60,y:100}});
  const place=await call('graph.create',{novelId,type:'world_entry',name:'雾港',summary:'故事发生的地方',content:'海风和潮汐掩盖了旧案的痕迹。',position:{x:440,y:280}});
  const plan=await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[
    {op:'node.create',ref:'a',value:{title:'潜入仓库',summary:'主角从码头后方接近，寻找被藏起的账本。',content:'先确定目标，再讨论潜入路线。',threads:['主角行动'],position:{x:60,y:100}}},
    {op:'node.create',ref:'b',value:{title:'守卫设伏',summary:'另一侧的守卫已经收到风声。',threads:['守卫行动'],position:{x:60,y:340}}},
    {op:'node.create',ref:'c',value:{title:'码头交锋',summary:'两条行动线在撤离时交汇。',position:{x:440,y:210}}},
    {op:'edge.create',value:{from:'a',to:'c'}},{op:'edge.create',value:{from:'b',to:'c'}}
  ]});
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1200,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fits=async()=>expect(await page.locator('.cuigengji').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  const shot=async name=>{await fits();await page.screenshot({path:join(shots,name+'.png'),animations:'disabled'});};
  const refresh=async()=>{await expect(page.getByRole('button',{name:'刷新当前页面',exact:true})).toBeEnabled();await page.getByRole('button',{name:'刷新当前页面',exact:true}).click();};
  await page.goto(url);await page.locator('.chapter-item').first().click();
  await expect(page.getByLabel('绑定小说',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('作品操作',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'小说功能'}).getByRole('button')).toHaveCount(3);
  await expect(page.getByRole('button',{name:'写作预设',exact:true})).toHaveCount(0);
  const manuscript=page.getByLabel('正文',{exact:true}),scroll=page.locator('.editor-scroll');
  await expect(manuscript).toHaveValue(prose);
  await scroll.evaluate(e=>e.scrollTop=1000);
  await manuscript.evaluate(e=>{e.focus({preventScroll:true});e.setSelectionRange(1000,1000);});
  let held=false;
  const waitForSave=new Promise(resolve=>releaseSave=resolve);
  await page.route('**/dispatch',async route=>{if(route.request().postDataJSON().action==='chapter.update'){held=true;await waitForSave;}await route.continue();});
  await page.keyboard.insertText('保留当前草稿');
  await expect.poll(()=>held).toBe(true);
  const draft=await manuscript.inputValue(),top=await scroll.evaluate(e=>e.scrollTop);
  await refresh();await expect(page.getByRole('button',{name:'刷新当前页面',exact:true})).toBeEnabled();
  await expect(manuscript).toHaveValue(draft);expect(await scroll.evaluate(e=>e.scrollTop)).toBe(top);
  expect(await manuscript.evaluate(e=>e.selectionStart)).toBe(1006);
  releaseSave();await expect(page.locator('.auto-savebar')).toContainText('已保存');await page.unroute('**/dispatch');
  expect((await call('chapter.get',{novelId,chapterId:chapter.id,maxChars:200000})).content).toBe(draft);

  // A real refresh adopts remote prose without replacing the document viewport.
  const before=await call('chapter.get',{novelId,chapterId:chapter.id,maxChars:200000});
  await call('chapter.update',{novelId,chapterId:chapter.id,expectedRevision:before.revision,content:'新的开场。\n\n'+draft});
  await refresh();await expect(manuscript).toHaveValue('新的开场。\n\n'+draft);
  expect(await scroll.evaluate(e=>e.scrollTop)).toBe(top);
  const spacing=[];
  for(const width of [1200,560,360]) {
    await page.setViewportSize({width,height:900});
    await page.getByLabel('正文显示设置',{exact:true}).click();
    await page.getByLabel('正文字号',{exact:true}).selectOption(width===1200?'18':width===560?'22':'16');
    await page.getByLabel('当前正文行距',{exact:true}).selectOption(width===560?'2.2':'1.95');
    await page.keyboard.press('Escape');
    const measure=()=>scroll.evaluate(el=>{el.scrollTop=el.scrollHeight;const ta=el.querySelector('textarea.manuscript'),cs=getComputedStyle(ta);const box=el.getBoundingClientRect(),text=ta.getBoundingClientRect();return {width:innerWidth,gap:box.bottom-text.bottom,padding:Number.parseFloat(cs.paddingBottom),bodyOverflow:document.body.scrollHeight-innerHeight,clippedText:ta.scrollHeight-ta.clientHeight};});
    await expect.poll(async()=>(await measure()).gap).toBeGreaterThanOrEqual(10);
    const result=await measure();expect(result.gap).toBeLessThanOrEqual(14);expect(result.padding).toBe(0);expect(result.bodyOverflow).toBe(0);expect(result.clippedText).toBeLessThanOrEqual(1);spacing.push(result);
    await shot('manuscript-bottom-'+width);
  }
  await page.setViewportSize({width:1200,height:900});
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await selectSettingsCategory(page,'AI与写作');
  await expect(page.getByRole('button',{name:'写作预设',exact:true})).toBeVisible();await shot('settings-1200');
  await expect(page.getByRole('dialog',{name:'设置',exact:true}).getByRole('button',{name:'关于催更姬',exact:true})).toHaveCount(0);
  await selectSettingsCategory(page,'AI与写作');await page.getByRole('button',{name:'写作预设',exact:true}).click();await expect(page.getByRole('heading',{name:'写作预设',exact:true})).toBeVisible();await page.getByRole('button',{name:'‹ 返回设置',exact:true}).click();await page.getByRole('button',{name:'关闭设置',exact:true}).click();
  for(const width of [1200,560,360]){await page.setViewportSize({width,height:900});const about=page.getByRole('button',{name:'关于催更姬',exact:true});await expect(about).toBeInViewport();await about.click();await expect(page.getByRole('dialog',{name:'关于催更姬',exact:true})).toBeVisible();await shot('about-'+width);await page.getByLabel('关闭关于催更姬',{exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(about).toBeFocused();}
  await page.setViewportSize({width:1200,height:900});
  await page.getByRole('button',{name:'规划',exact:true}).click();await expect(page.locator('.planning-card')).toHaveCount(3);
  await page.getByRole('button',{name:'新建画布',exact:true}).click();await page.getByLabel('画布名称',{exact:true}).fill('码头决战 · 沙盘');await page.getByRole('button',{name:'保存画布',exact:true}).click();await expect(selectedPlanningPage(page)).toContainText('码头决战 · 沙盘');await selectPlanningPage(page,'');
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('潜入仓库');await expect(page.locator('.directory-entry')).toHaveCount(1);await expect(page.locator('.planning-card')).toHaveCount(3);await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('');await expect(page.locator('.directory-entry')).toHaveCount(3);
  await page.getByLabel('添加画布内容',{exact:true}).click();await page.getByRole('button',{name:'文字批注',exact:true}).click();await expect(page.locator('.canvas-draft')).toBeVisible();await page.locator('.canvas-draft').getByRole('button',{name:'取消',exact:true}).click();
  const canvas=page.locator('.planning-canvas-scroll'),world=page.locator('.planning-canvas').first();
  await canvas.hover({position:{x:700,y:400}});await page.mouse.wheel(0,160);
  const camera=await world.getAttribute('style');
  await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'node.update',id:plan.mapping.a,expectedRevision:1,value:{title:'潜入仓库 · 新讨论'}}]});
  await refresh();await expect(page.getByRole('button',{name:'潜入仓库 · 新讨论',exact:true})).toBeVisible();expect(await world.getAttribute('style')).toBe(camera);
  await page.getByRole('button',{name:'适应视图',exact:true}).click();
  await page.locator(`[data-node-id="${plan.mapping.a}"] p`).click();
  const tools=page.getByRole('toolbar',{name:'画布选中操作',exact:true});await expect(tools).toBeVisible();await tools.getByLabel('移动选中卡片',{exact:true}).click();await expect(tools.locator('details')).toHaveJSProperty('open',true);await page.keyboard.press('Escape');await expect(tools.locator('details')).toHaveJSProperty('open',false);
  await tools.getByLabel('取消画布选择',{exact:true}).click();await expect(tools).toHaveCount(0);
  for(const width of [1200,560,360]){await page.setViewportSize({width,height:900});await shot('planning-'+width);await expect(page.getByRole('button',{name:'＋ 情节',exact:true})).toBeInViewport();}
  await page.setViewportSize({width:1200,height:900});
  await page.getByRole('button',{name:'设定',exact:true}).click();await page.getByRole('button',{name:'适应视图',exact:true}).click();await page.locator(`[data-node-id="${person.id}"] p`).click();
  await expect(tools).toBeVisible();await tools.getByLabel('移动选中卡片',{exact:true}).click();await tools.getByRole('button',{name:group.name,exact:true}).click();await expect.poll(async()=>(await call('graph.get',{novelId,nodeId:person.id})).groupId).toBe(group.id);
  await page.locator(`[data-node-id="${person.id}"] .planning-title`).dblclick();await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('全文',{exact:true}).fill('这份人物草稿应在刷新后保留。');
  await refresh();await expect(page.getByLabel('全文',{exact:true})).toHaveValue('这份人物草稿应在刷新后保留。');
  await page.getByRole('button',{name:'保存设定',exact:true}).click();await expect(page.getByRole('button',{name:'编辑',exact:true})).toBeVisible();
  const remote=await call('graph.get',{novelId,nodeId:person.id});await call('graph.update',{novelId,nodeId:person.id,expectedRevision:remote.revision,content:'AI 刚刚补充了她的过去。'});await refresh();await expect(page.locator('.document-body')).toHaveText('AI 刚刚补充了她的过去。');await page.getByRole('button',{name:'‹ 返回设定',exact:true}).click();
  for(const width of [1200,560,360]){await page.setViewportSize({width,height:900});await shot('settings-canvas-'+width);}
  await page.getByRole('button',{name:'作品首页',exact:true}).click();expect((await call('binding.get')).novelId).toBe(novelId);
  await page.locator('.welcome-book').filter({hasText:second.title}).click();await expect(page.locator('.navigation-book')).toHaveText(second.title);expect((await call('binding.get')).novelId).toBe(novelId);
  if(await page.getByRole('dialog',{name:'章节目录抽屉',exact:true}).count())await page.getByRole('button',{name:'关闭章节目录',exact:true}).click();
  await page.getByRole('button',{name:'作品首页',exact:true}).click();await page.locator('.welcome-book').filter({hasText:'雾港来信'}).click();await expect(page.locator('.navigation-book')).toHaveText('雾港来信');expect((await call('binding.get')).novelId).toBe(novelId);
  await page.getByRole('button',{name:'规划',exact:true}).click();await page.setViewportSize({width:1200,height:900});
  await page.evaluate(()=>{document.documentElement.style.cssText='--dsw-alias-bg-base:#181a20;--dsw-alias-label-primary:#e9edf5;--dsw-alias-label-secondary:#99a0ad;--dsw-alias-border-l1:#353a46;--dsw-alias-state-business-primary:#6c8aff;';});await shot('planning-dark-1200');await page.getByRole('button',{name:'设置',exact:true}).click();await shot('settings-dark-1200');await page.getByLabel('关闭设置',{exact:true}).click();
  await openAuthorPage(page,'导入 / 导出');await page.getByRole('group',{name:'导入导出切换'}).getByRole('button',{name:'导出',exact:true}).click();await page.getByRole('button',{name:'设定',exact:true}).last().click();
  const selectionBefore=await page.locator('.transfer-scope').count();await refresh();expect(await page.locator('.transfer-scope').count()).toBe(selectionBefore);
  expect(errors).toEqual([]);await writeFile(join(shots,'manuscript-spacing.json'),JSON.stringify(spacing,null,2));
  console.log(JSON.stringify({ok:true,checks:['home-only work switching; preset inside settings; about visible in the header and closes directly with focus restored at 360/560/1200px','refresh preserves an in-flight manuscript draft, caret and scroll; remote prose updates','canvas refresh preserves camera; select and move via contextual toolbar; detail drafts stay intact','document bottom spacing and unclipped last lines at 360/560/1200px; light/dark screenshots'],screenshots:shots}));
} catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally {releaseSave?.();await browser?.close();host.kill();}
