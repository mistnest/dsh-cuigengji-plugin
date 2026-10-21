// Exercise the production editors with long synthetic text in an isolated store.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {chromium, expect} from '@playwright/test';
import {countManuscript} from '../src/domain/manuscript.ts';
import {showOrganization} from './helpers/navigation.mjs';

const root = resolve(import.meta.dirname, '..');
const shots = join(root, 'test-results', 'document-editing');
await mkdir(shots, {recursive: true});
const preview = spawn(process.execPath, ['scripts/preview-workbench.mjs'], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
let browser;
try {
  const {url} = await new Promise((resolve, reject) => {
    let output = '', errors = '';
    const timer = setTimeout(() => reject(new Error(errors || 'Preview timeout')), 20000);
    preview.stderr.on('data', chunk => {errors += chunk;});
    preview.once('exit', code => {clearTimeout(timer); reject(new Error(`Preview exit ${code}: ${errors}`));});
    preview.stdout.on('data', chunk => {
      output += chunk;
      const line = output.split('\n').find(line => line.startsWith('{'));
      if (line) {clearTimeout(timer); resolve(JSON.parse(line));}
    });
  });
  const call = async (action, args = {}) => {
    const response = await fetch(new URL('/dispatch', url), {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action, args})});
    const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
  };
  const novelId = (await call('novel.list'))[0].id;
  const sample = '甲 乙\n　丙，🙂';
  const prose = '甲乙丙丁戊己庚辛壬癸\n\n' + sample + '\n\n' + Array.from({length: 120}, (_, i) => `第${i + 1}段。${'她读完来信，将窗边的灯熄灭了。'.repeat(5)}`).join('\n\n');
  const world = await call('graph.create', {novelId, type: 'world_entry', name: '长世界书', summary: '雨城设定', content: prose});
  const character = await call('graph.create', {novelId, type: 'character_card', name: '长角色卡', summary: '雨城的人物', content: prose});
  const chapter = (await call('chapter.list', {novelId}))[0];
  await call('chapter.update', {novelId, chapterId: chapter.id, expectedRevision: chapter.revision, content: prose});
  await call('planning.apply', {novelId, requestId: crypto.randomUUID(), reason: '编辑验收', operations: [{op: 'node.create', value: {title: '长情节讨论', summary: '长篇推演', content: prose}}]});
  browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1100, height: 900}, reducedMotion: 'reduce'});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  const selectedCount = page.getByLabel('选中文字数', {exact: true});

  const geometry = editor => editor.evaluate(element => ({
    top: element.closest('.detail-scroll,.editor-scroll,.creation-scroll').scrollTop,
    innerTop: element.scrollTop, height: element.clientHeight,
    clipped: element.scrollHeight - element.clientHeight,
    start: element.selectionStart, end: element.selectionEnd,
  }));
  const stableTyping = async (editor, label) => {
    // A viewport resize first updates the shared detail layout, then its native
    // autosized textarea. Wait for those real layout frames before hit testing.
    await page.waitForFunction(()=>{const root=document.querySelector('.organized-workspace');return !root||root.dataset.narrow===String(root.clientWidth<560)&&root.dataset.detail===(root.clientWidth<1060?'full':'side');});
    await editor.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    // Scroll deep into the document and click visible text like the author does.
    // Programmatically moving an offscreen textarea caret has its own delayed
    // browser reveal behavior; that must not be mistaken for a layout jump.
    const point = await editor.evaluate(element => {
      const viewport = element.closest('.detail-scroll,.editor-scroll,.creation-scroll');
      viewport.scrollTop += element.getBoundingClientRect().top - viewport.getBoundingClientRect().top + element.clientHeight * .6;
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return {x: box.left + Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.fontSize) * 3, y: viewport.getBoundingClientRect().top + viewport.clientHeight / 2};
    });
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(100);
    const before = await geometry(editor);
    expect(before.top, `${label}: test must edit well down the document`).toBeGreaterThan(1000);
    expect(before.start, `${label}: test must place the native caret in long text`).toBeGreaterThan(1000);
    await page.keyboard.insertText('新增');
    await page.waitForTimeout(100);
    const after = await geometry(editor);
    expect(after.top, `${label}: typing must preserve the page scroll ${JSON.stringify({before, after})}`).toBe(before.top);
    expect(after.start, `${label}: typing must preserve the caret`).toBe(before.start + 2);
    expect(after.innerTop, `${label}: textarea must not scroll internally`).toBe(0);
    expect(after.clipped, `${label}: long text must fit`).toBeLessThanOrEqual(1);
    expect(after.height, `${label}: a short insertion must not collapse the editor`).toBeGreaterThan(before.height - 50);
  };

  const selectionChecks = async editor => {
    const before = await editor.inputValue();
    const barGeometry = () => editor.evaluate(element => {
      const header = element.closest('.detail-page,.editor-shell,.creation').querySelector(':scope > header');
      return {height: header.clientHeight, overflow: header.scrollWidth - header.clientWidth};
    });
    const barBefore = await barGeometry();
    // A real left-mouse drag, with the first line placed inside the viewport.
    const point = await editor.evaluate(element => {
      element.focus({preventScroll: true}); element.setSelectionRange(0, 0);
      const viewport = element.closest('.detail-scroll,.editor-scroll,.creation-scroll');
      viewport.scrollTop += element.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 80;
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const x = box.left + Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.borderLeftWidth);
      return {x, y: box.top + Number.parseFloat(style.paddingTop) + Number.parseFloat(style.lineHeight) / 2, width: context.measureText('甲乙丙丁').width};
    });
    await page.mouse.move(point.x + 1, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + point.width + 1, point.y, {steps: 6});
    await page.mouse.up();
    await expect(selectedCount).toHaveText('已选 4 字');
    await expect(selectedCount).toBeInViewport();
    expect(await editor.inputValue()).toBe(before);
    await page.keyboard.press('ArrowRight');
    await expect(selectedCount).toHaveCount(0);

    // UTF-16 offsets, reverse selections, whitespace and Unicode use the same
    // counting rule as chapter totals; counting itself must never move the caret.
    await editor.evaluate((element, text) => {
      const start = element.value.indexOf(text);
      element.focus({preventScroll: true}); element.setSelectionRange(start, start + text.length, 'backward');
    }, sample);
    const selection = await geometry(editor);
    await expect(selectedCount).toHaveText('已选 5 字');
    expect(await geometry(editor)).toEqual(selection);
    expect(await editor.evaluate(element => element.selectionDirection)).toBe('backward');
    await page.keyboard.press('Control+a');
    await expect(selectedCount).toHaveText(`已选 ${countManuscript(before).toLocaleString('zh-CN')} 字`);
    expect((await barGeometry()).height).toBe(barBefore.height);
    expect((await barGeometry()).overflow).toBeLessThanOrEqual(1);
    await editor.evaluate(element => {
      const start = element.value.indexOf('\n\n'); element.setSelectionRange(start, start + 2);
    });
    await expect(selectedCount).toHaveText('已选 0 字');
    await editor.evaluate(element => element.setSelectionRange(0, 0));
    await expect(selectedCount).toHaveCount(0);
    expect(await editor.inputValue()).toBe(before);
    await editor.evaluate((element, text) => {
      const start = element.value.indexOf(text); element.setSelectionRange(start, start + text.length);
    }, sample);
    await expect(selectedCount).toHaveText('已选 5 字');
    await page.keyboard.press('Backspace');
    await expect(selectedCount).toHaveCount(0);
    await expect(editor).toHaveValue(before.replace(sample, ''));
    await page.keyboard.insertText(sample);
    await expect(editor).toHaveValue(before);
    await expect(selectedCount).toHaveCount(0);
  };

  const readingSelection = async () => {
    const before = await page.locator('.detail-scroll').evaluate(element => element.scrollTop);
    await page.locator('.document-body').evaluate(element => {
      const range = document.createRange(); range.setStart(element.firstChild, 0); range.setEnd(element.firstChild, 4);
      const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    await expect(selectedCount).toHaveText('已选 4 字');
    expect(await page.locator('.detail-scroll').evaluate(element => element.scrollTop)).toBe(before);
    await page.evaluate(() => document.getSelection().removeAllRanges());
    await expect(selectedCount).toHaveCount(0);
  };

  for (const entry of [world, character]) {
    await page.getByRole('button', {name: '设定', exact: true}).click();
    await showOrganization(page);
    await page.locator('.directory-entry').filter({hasText: entry.name}).getByRole('button').dblclick();
    await page.getByRole('button', {name: '编辑', exact: true}).click();
    const editor = page.getByLabel('全文', {exact: true});
    for (const width of [1100, 360]) {
      await page.setViewportSize({width, height: 900});
      await stableTyping(editor, `${entry.name} at ${width}px`);
      await selectionChecks(editor);
      await editor.evaluate(element => element.setSelectionRange(0, 4));
      await expect(selectedCount).toHaveText('已选 4 字');
      await page.screenshot({path: join(shots, `${entry.type}-${width}.png`)});
    }
    await page.getByRole('button', {name: '阅读', exact: true}).click();
    await readingSelection();
    const savedContent=await page.locator('.document-body').innerText();
    await page.getByRole('button', {name: '保存设定', exact: true}).click();
    await expect(page.getByRole('button', {name: '保存设定', exact: true})).toHaveCount(0);
    await expect(page.getByRole('button', {name: '编辑', exact: true})).toBeVisible();
    expect((await call('graph.get', {novelId, nodeId: entry.id})).content).toBe(savedContent);
    await page.getByRole('button', {name: '‹ 返回设定', exact: true}).click();
    await showOrganization(page);
    await page.locator('.directory-entry').filter({hasText: entry.name}).getByRole('button').dblclick();
    await expect(page.locator('.document-body')).toHaveText(savedContent);
    await page.getByRole('button', {name: '‹ 返回设定', exact: true}).click();
    await expect(selectedCount).toHaveCount(0);
    await page.setViewportSize({width: 1100, height: 900});
  }

  await page.getByRole('button', {name: '规划', exact: true}).click();
  await page.locator('.directory-entry').filter({hasText:'长情节讨论'}).getByRole('button').dblclick();
  await page.getByRole('button', {name: '编辑规划', exact: true}).click();
  const planning = page.locator('.planning-detail').getByLabel('正文', {exact: true});
  await stableTyping(planning, 'planning inspector');
  await selectionChecks(planning);
  await planning.evaluate(element => element.setSelectionRange(0, 4));
  await expect(selectedCount).toHaveText('已选 4 字');
  await page.screenshot({path: join(shots, 'planning.png')});
  await page.getByRole('button', {name: '阅读预览', exact: true}).click();
  await readingSelection();
  await page.getByRole('button', {name: '‹ 返回规划', exact: true}).click();
  await expect(selectedCount).toHaveCount(0);

  await page.getByRole('button', {name: '正文', exact: true}).click();
  await page.locator('.chapter-open').first().click();
  const manuscript = page.getByLabel('正文', {exact: true});
  await stableTyping(manuscript, 'chapter');
  await selectionChecks(manuscript);
  await manuscript.evaluate(element => {element.focus({preventScroll: true}); element.setSelectionRange(0, 4);});
  await expect(selectedCount).toHaveText('已选 4 字');
  await expect(page.locator('.auto-savebar')).toContainText('已保存');
  await expect(selectedCount).toHaveText('已选 4 字');
  await page.screenshot({path: join(shots, 'manuscript.png')});
  // Selections elsewhere in DSH must not be counted as novel text.
  await page.evaluate(() => {
    const input = document.createElement('input'); input.id = 'outside-editor'; input.value = '另一个区域';
    document.body.appendChild(input); input.focus({preventScroll: true}); input.select();
  });
  await expect(selectedCount).toHaveCount(0);
  await page.evaluate(() => document.getElementById('outside-editor').remove());

  await page.getByRole('button', {name: '设定', exact: true}).click();
  await page.locator('summary.primary').filter({hasText: '＋ 设定'}).click();
  await page.getByRole('button', {name: '新建世界书', exact: true}).click();
  const creation=page.getByRole('region',{name:'新建世界书',exact:true});
  await creation.getByLabel('设定名称',{exact:true}).fill('新的设定');
  await creation.getByLabel('设定摘要',{exact:true}).fill('先记录摘要，再进入详情补充长文。');
  await creation.getByRole('button',{name:'创建',exact:true}).click();
  await expect(page.locator('.canvas-draft')).toHaveCount(0);
  await showOrganization(page);
  await page.locator('.directory-entry').filter({hasText:'新的设定'}).getByRole('button').dblclick();
  await page.getByRole('button',{name:'编辑',exact:true}).click();
  const newDocument=page.getByLabel('全文',{exact:true});await newDocument.fill(prose);
  for(const width of [1100,360]){await page.setViewportSize({width,height:900});await stableTyping(newDocument,'new setting detail');await selectionChecks(newDocument);await page.screenshot({path:join(shots,`creation-${width}.png`)});}
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok: true, checks: ['long world/character editor scroll and caret at wide/narrow widths', 'planning inspector and creation scroll', 'real left-mouse drag selection', 'keyboard and reverse selections', 'Unicode and whitespace counts', 'reading-view selections', 'selection survives chapter autosave', 'collapse, navigation and external selection clear the count']}));
} finally {await browser?.close(); preview.kill();}
