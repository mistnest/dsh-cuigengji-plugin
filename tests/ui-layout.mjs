import {selectPlanningPage,selectedPlanningPage,showOrganization} from './helpers/navigation.mjs';
// Exercise screen transitions against a disposable production UI/Store preview.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {chromium, expect} from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const preview = spawn(process.execPath, ['scripts/preview-workbench.mjs'], {cwd:root, stdio:['ignore','pipe','pipe']});
let browser;
try {
  const {url} = await new Promise((resolve, reject) => {
    let output = '', errors = '';
    const timeout = setTimeout(() => reject(new Error('Preview startup timed out')), 20000);
    preview.stderr.on('data', chunk => {errors += chunk;});
    preview.once('exit', code => {clearTimeout(timeout); reject(new Error(`Preview exited ${code}: ${errors}`));});
    preview.stdout.on('data', chunk => {
      output += chunk;
      const line = output.split('\n').find(line => line.startsWith('{'));
      if (line) {try {const result = JSON.parse(line);clearTimeout(timeout);resolve(result);} catch {}}
    });
  });
  const call = async (action, args={}) => {
    const response = await fetch(new URL('/dispatch', url), {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action,args})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  };
  const novelId = (await call('novel.list'))[0].id;
  const prose = Array.from({length:40}, (_, i) => `第 ${i+1} 段。${'雨停之后，街上的行人渐渐多了起来。她将信收进口袋，回头看了一眼灯火未熄的书铺。'.repeat(3)}`).join('\n\n');
  const chapter = (await call('chapter.list',{novelId}))[0];
  await call('chapter.update',{novelId,chapterId:chapter.id,expectedRevision:chapter.revision,content:prose});
  const group = await call('graph.group.create', {novelId,name:'雨城'});
  const memories = [];
  for (let i=0; i<24; i++) memories.push(await call('graph.create', {novelId,type:'character_card',groupId:group.id,name:`人物 ${String(i).padStart(2,'0')}`,summary:'雨城的居民',content:prose}));
  await call('edge.create', {novelId,from:memories[0].id,to:memories[1].id,name:'同伴'});
  const planGroup = await call('planning.group.create', {novelId,name:'主线',requestId:crypto.randomUUID()});
  await call('planning.apply', {novelId,requestId:crypto.randomUUID(),reason:'布局验收',operations:[
    ...Array.from({length:24}, (_,i) => ({op:'node.create',ref:`p${i}`,value:{title:`情节 ${String(i).padStart(2,'0')}`,summary:'追寻雨夜来信的线索',content:prose,groupId:planGroup.id,position:{x:40+(i%4)*300,y:60+Math.floor(i/4)*220}}})),
    {op:'edge.create',value:{from:'p0',to:'p1',type:'next'}},
  ]});
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page = await browser.newPage({viewport:{width:900,height:850},reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const screenshots = join(root,'test-results','detail-layout');
  await mkdir(screenshots,{recursive:true});
  await page.goto(url);
  const geometry = locator => locator.evaluate(el => ({top:el.scrollTop,left:el.scrollLeft}));
  const verifyDetail = async (kind, editLabel) => {
    const detail = page.locator(`.${kind}-detail`);
    for (const width of [360,760,999,1000,1099,1100,1600]) {
      await page.setViewportSize({width,height:850});
      if(await page.locator('.organized-workspace').evaluate(el=>el.clientWidth>=1060))await expect(page.locator('.workspace-detail-size')).toBeVisible();
      const expand=page.getByRole('button',{name:'展开详情',exact:true});
      if(await expand.isVisible())await expand.click();
      await expect(page.locator('.organized-workspace')).toHaveAttribute('data-detail','full');
      await expect(detail).toBeVisible();
      await expect(page.locator('.overview-page')).toBeHidden();
      await expect(page.getByRole('button',{name:'列表',exact:true})).toHaveCount(0);
      expect(await detail.evaluate(el => el.clientWidth)).toBeGreaterThan((await page.locator('.organized-workspace').evaluate(el=>el.clientWidth))-5);
      expect(await page.locator('.workbench-body').evaluate(el => el.scrollWidth<=el.clientWidth+1)).toBe(true);
    }
    const bar = page.locator('.detail-bar'), viewport = page.locator('.detail-scroll');
    const before = await bar.boundingBox();
    await viewport.evaluate(el => {el.scrollTop=el.scrollHeight;});
    expect((await geometry(viewport)).top).toBeGreaterThan(500);
    await expect(page.locator('.detail-back')).toBeInViewport();
    await expect(bar.getByRole('button',{name:editLabel,exact:true})).toBeInViewport();
    expect((await bar.boundingBox()).y).toBe(before.y);
    await viewport.evaluate(el => {el.scrollTop=0;});
    await page.waitForTimeout(180);
    await page.screenshot({path:join(screenshots,`${kind}-1600.png`)});
    await page.setViewportSize({width:360,height:850});
    await page.screenshot({path:join(screenshots,`${kind}-360.png`)});
    await page.setViewportSize({width:900,height:850});
  };

  await page.getByRole('button',{name:'设定',exact:true}).click();

  await page.getByRole('textbox',{name:'搜索设定',exact:true}).fill('人物');
  await expect(page.locator('.directory-entry')).toHaveCount(24);
  const memoryEntry = page.locator('.directory-entry').getByRole('button',{name:'选中 人物 20',exact:true});
  await memoryEntry.scrollIntoViewIfNeeded();
  const listBefore = await geometry(page.locator('.workspace-sidebar-scroll'));
  expect(listBefore.top).toBeGreaterThan(100);
  await memoryEntry.dblclick();
  await verifyDetail('memory','编辑');
  await page.getByRole('button',{name:'‹ 返回设定',exact:true}).click();
  await showOrganization(page);
  await expect(page.locator(`.tree-folder[data-tree-id="${group.id}"]`)).toBeVisible();
  await expect(page.getByRole('textbox',{name:'搜索设定',exact:true})).toHaveValue('人物');
  await expect.poll(()=>geometry(page.locator('.workspace-sidebar-scroll'))).toEqual(listBefore);
  await expect(memoryEntry).toHaveAttribute('aria-current','true');

  await page.getByRole('button',{name:'选中 人物 00',exact:true}).dblclick();
  await page.getByRole('button',{name:'编辑',exact:true}).click();
  await page.getByLabel('全文',{exact:true}).fill('保留这份尚未保存的设定草稿。');
  const related=page.locator('.related-entry').getByRole('button',{name:'人物 01',exact:true});
  if(!await related.isVisible())await page.locator('.memory-detail details').filter({hasText:'人物 01'}).locator('summary').first().click();
  await related.click();
  await expect(page.getByRole('heading',{name:'人物 01',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'‹ 返回上一条',exact:true}).click();
  await expect(page.getByLabel('全文',{exact:true})).toHaveValue('保留这份尚未保存的设定草稿。');
  await page.getByRole('button',{name:'‹ 返回设定',exact:true}).click();
  await page.getByRole('button',{name:'选中 人物 04',exact:true}).click();
  await page.getByRole('button',{name:'适应视图',exact:true}).click();
  const graphEntry = page.locator('.relation-canvas').getByRole('button',{name:'人物 04',exact:true});
  await expect(graphEntry).toBeInViewport();
  const zoomBefore = await page.locator('.planning-canvas').getAttribute('style');
  await graphEntry.dblclick();
  await page.getByRole('button',{name:'‹ 返回设定',exact:true}).click();
  await expect(page.locator('.planning-canvas')).toHaveAttribute('style',zoomBefore);

  await page.getByRole('button',{name:'规划',exact:true}).click();

  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('情节');
  const planEntry = page.locator('.directory-entry').getByRole('button',{name:'选中 情节 12',exact:true});
  await planEntry.scrollIntoViewIfNeeded();
  const plansBefore = await geometry(page.locator('.workspace-sidebar-scroll'));
  await planEntry.dblclick();
  await verifyDetail('planning','编辑规划');
  await page.getByRole('button',{name:'‹ 返回规划',exact:true}).click();
  await showOrganization(page);
  await expect.poll(()=>geometry(page.locator('.workspace-sidebar-scroll'))).toEqual(plansBefore);
  await expect(page.locator(`.tree-folder[data-tree-id="${planGroup.id}"]`)).toBeVisible();
  await expect(page.getByRole('textbox',{name:'搜索规划',exact:true})).toHaveValue('情节');
  await page.getByRole('button',{name:'选中 情节 00',exact:true}).dblclick();
  await page.getByRole('button',{name:'编辑规划',exact:true}).click();
  await page.getByLabel('正文',{exact:true}).fill('保留尚未保存的讨论。');
  await page.locator('.planning-detail details').filter({hasText:'情节关系'}).locator('summary').click();
  await page.locator('.flow-context').getByRole('button',{name:'情节 01',exact:true}).click();
  await page.getByRole('button',{name:'‹ 返回上一条',exact:true}).click();
  await expect(page.getByLabel('正文',{exact:true})).toHaveValue('保留尚未保存的讨论。');
  await page.getByRole('button',{name:'‹ 返回规划',exact:true}).click();
  await page.getByRole('button',{name:'选中 情节 05',exact:true}).click();
  await page.getByRole('button',{name:'适应视图',exact:true}).click();
  const planCard = page.locator('.planning-card').getByRole('button',{name:'情节 05',exact:true});
  await expect(planCard).toBeInViewport();
  const planZoom = await page.locator('.planning-canvas').getAttribute('style');
  await planCard.dblclick();
  await page.getByRole('button',{name:'‹ 返回规划',exact:true}).click();
  await expect(page.locator('.planning-canvas')).toHaveAttribute('style',planZoom);

  await page.getByRole('button',{name:'正文',exact:true}).click();
  await page.locator('.chapter-item').first().click();
  const collapse = page.getByRole('button',{name:'收起章节目录',exact:true});
  if (await collapse.isVisible()) await collapse.click();
  for (const mode of ['unified']) {
    const widths = [];
    for(const width of [900,1200,1600]) {
      await page.setViewportSize({width,height:850});
      const element = page.locator('.chapter-main .manuscript');
      const box = await element.boundingBox();
      const available = await page.locator('.editor-scroll').boundingBox();
      expect(available.width-box.width).toBeLessThan(90);
      widths.push(box.width);
    }
    expect(widths[1]-widths[0]).toBeGreaterThan(270);
    expect(widths[2]-widths[1]).toBeGreaterThan(370);
    await page.screenshot({path:join(screenshots,`prose-${mode}-1600.png`)});
  }
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,checks:['detail isolation through seven panel widths','fixed back/edit controls','list position, filters and focus restored','both graph zoom and scroll restored','related entry back trail preserves drafts','single manuscript grows with panel']}));
} catch (error) {
  const page=browser?.contexts()[0]?.pages()[0];
  if(page){await page.screenshot({path:join(root,'test-results','detail-layout','failure.png')});console.error((await page.locator('body').innerText()).slice(0,1600));}
  throw error;
} finally {
  await browser?.close();
  preview.kill();
}
