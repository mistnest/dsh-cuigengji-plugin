import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {chromium, expect} from '@playwright/test';
import {directorySnapshot} from '../src/domain/chapters/order.ts';

const root = resolve(import.meta.dirname, '..'), shots = join(root, 'test-results', 'chapter-order');
await mkdir(shots, {recursive: true});
const preview = spawn(process.execPath, ['scripts/preview-workbench.mjs'], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
let browser, page;
try {
  const {url} = await new Promise((resolve, reject) => {
    let output = '', errors = ''; const timer = setTimeout(() => reject(new Error(errors || 'Preview timeout')), 20000);
    preview.stderr.on('data', chunk => {errors += chunk;});
    preview.once('exit', code => {clearTimeout(timer); reject(new Error('Preview exit ' + code + errors));});
    preview.stdout.on('data', chunk => {output += chunk; const line = output.split('\n').find(line => line.startsWith('{')); if (line) {clearTimeout(timer); resolve(JSON.parse(line));}});
  });
  const call = async (action, args = {}) => {
    const response = await fetch(new URL('/dispatch', url), {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action, args})});
    const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
  };
  const novelId = (await call('novel.list'))[0].id, seed = (await call('chapter.list', {novelId}))[0];
  const volumes = [];
  for (const title of ['第一卷', '第二卷', '空卷']) volumes.push(await call('volume.create', {novelId, title}));
  const first = await call('chapter.update', {novelId, chapterId: seed.id, expectedRevision: seed.revision, title: '线索 · 开始', volumeId: volumes[0].id});
  const second = await call('chapter.create', {novelId, title: '正文 · 对话', content: '正在编辑的正文。', volumeId: volumes[0].id});
  const third = await call('chapter.create', {novelId, title: '线索 · 转折', content: '第三章正文。', volumeId: volumes[0].id});
  const fourth = await call('chapter.create', {novelId, title: '第二卷 · 开始', content: '第四章正文。', volumeId: volumes[1].id});
  const fifth = await call('chapter.create', {novelId, title: '第二卷 · 结尾', content: '第五章正文。', volumeId: volumes[1].id});
  browser = await chromium.launch({headless: true});
  page = await browser.newPage({viewport: {width: 1100, height: 850}, reducedMotion: 'reduce'});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const fetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await fetch(...args); let action;
      try {action = JSON.parse(args[1]?.body || '{}').action;} catch {}
      if (action === 'chapter.update') {
        const json = response.json.bind(response);
        response.json = async () => {
          const value = await json();
          if (window.__holdSaveReceipt) {window.__holdSaveReceipt = false; await new Promise(resolve => {window.__releaseSaveReceipt = resolve; window.__saveReceiptHeld = true;}); window.__saveReceiptHeld = false;}
          return value;
        };
      }
      return response;
    };
  });
  let fault = '', moveCount = 0, heldWrite, releaseWrite;
  const writes = [];
  await page.route('**/dispatch', async route => {
    const {action, args} = route.request().postDataJSON();
    if (action === 'chapter.update') {
      writes.push(args);
      if (fault === 'hold-write') {fault = ''; heldWrite = true; await new Promise(resolve => {releaseWrite = resolve;}); heldWrite = false;}
    }
    if (action === 'chapter.move') {
      moveCount++;
      const currentFault = fault; fault = '';
      if (currentFault === 'failure' || currentFault === 'lost-response') {
        if (currentFault === 'lost-response') await call(action, args);
        await route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: '模拟网络保存失败'})}); return;
      }
      if (currentFault === 'conflict') {
        const chapters = await call('chapter.list', {novelId}), currentVolumes = await call('volume.list', {novelId});
        await call('chapter.move', {novelId, chapterId: first.id, volumeId: volumes[0].id, beforeChapterId: second.id, expectedDirectory: directorySnapshot(chapters, currentVolumes)});
      }
    }
    await route.continue();
  });
  await page.goto(url);
  const row = id => page.locator(`.chapter-item[data-chapter-id="${id}"]`);
  const group = id => page.locator(`[data-chapter-volume="${id || ''}"]`);
  const directory = page.locator('.chapter-directory');
  const manuscript = page.getByLabel('正文', {exact: true});
  const order = async volumeId => (await call('chapter.list', {novelId})).filter(chapter => (chapter.volumeId || null) === volumeId).map(chapter => chapter.id);
  const waitOrder = async (volumeId, ids) => {
    await expect.poll(() => order(volumeId)).toEqual(ids);
    await expect(page.locator('.directory-sort-note')).toHaveCount(0);
    await expect(group(volumeId).locator('.chapter-item')).toHaveCount(ids.length);
    await expect.poll(() => group(volumeId).locator('.chapter-item').evaluateAll(items => items.map(item => item.dataset.chapterId))).toEqual(ids);
  };
  const startDrag = async id => {
    await row(id).scrollIntoViewIfNeeded(); const box = await row(id).boundingBox();
    await page.mouse.move(box.x + 32, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + 44, box.y + box.height / 2, {steps: 3});
  };
  const overRow = async (id, after = false) => {
    const box = await row(id).boundingBox();
    await page.mouse.move(box.x + 60, box.y + box.height * (after ? .8 : .2), {steps: 8});
  };
  const dragTo = async (from, to, after = false) => {await startDrag(from); await overRow(to, after); await page.mouse.up();};
  await row(second.id).click(); await expect(manuscript).toHaveValue('正在编辑的正文。');

  const visibleOrder = volumeId => group(volumeId).locator('.chapter-item').evaluateAll(items => items.map(item => item.dataset.chapterId));
  const toggleOrder = () => page.locator('.directory-order-toggle').click();
  await expect(page.locator('.directory-order-toggle')).toHaveText('倒序');
  await expect.poll(() => visibleOrder(volumes[0].id)).toEqual([third.id,second.id,first.id]);
  await expect.poll(() => page.locator('[data-chapter-volume]').evaluateAll(items => items.map(item => item.dataset.chapterVolume))).toEqual(volumes.map(v=>v.id).reverse());
  const placementBeforeSort = directorySnapshot(await call('chapter.list',{novelId}),await call('volume.list',{novelId})), movesBeforeSort=moveCount;
  await group(volumes[1].id).locator('.volume-toggle').click();
  await toggleOrder();
  await expect(page.locator('.directory-order-toggle')).toHaveText('正序');
  await expect(group(volumes[1].id).locator('.volume-toggle')).toHaveAttribute('aria-expanded','false');
  await expect.poll(() => visibleOrder(volumes[0].id)).toEqual([first.id,second.id,third.id]);
  await expect(page.locator('.directory-heading .menu')).toHaveCount(0);
  expect(directorySnapshot(await call('chapter.list',{novelId}),await call('volume.list',{novelId}))).toEqual(placementBeforeSort);
  expect(moveCount).toBe(movesBeforeSort);
  await page.reload();await expect(page.locator('.directory-order-toggle')).toHaveText('正序');
  await expect(manuscript).toHaveValue('正在编辑的正文。');
  await toggleOrder();await page.reload();await expect(page.locator('.directory-order-toggle')).toHaveText('倒序');
  await expect.poll(() => visibleOrder(volumes[0].id)).toEqual([third.id,second.id,first.id]);
  await group(volumes[1].id).locator('.volume-toggle').click();

  // Reverse display changes pointer placement and Alt+arrows, never the API's
  // canonical meaning of beforeChapterId or the chapter open in the editor.
  await startDrag(first.id);await overRow(third.id);
  await expect(row(third.id)).toHaveClass(/chapter-drop-before/);
  await page.mouse.up();
  await expect.poll(() => order(volumes[0].id)).toEqual([second.id,third.id,first.id]);
  await expect.poll(() => visibleOrder(volumes[0].id)).toEqual([first.id,third.id,second.id]);
  await row(first.id).locator('.chapter-open').focus();await page.keyboard.press('Alt+ArrowDown');
  await expect.poll(() => order(volumes[0].id)).toEqual([second.id,first.id,third.id]);
  await expect.poll(() => visibleOrder(volumes[0].id)).toEqual([third.id,first.id,second.id]);
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(() => order(volumes[0].id)).toEqual([second.id,third.id,first.id]);
  await startDrag(first.id);await overRow(second.id,true);
  await expect(group(volumes[0].id).locator('.chapter-drop-end')).toHaveCount(1);
  await page.mouse.up();
  await expect.poll(() => order(volumes[0].id)).toEqual([first.id,second.id,third.id]);
  await page.getByRole('textbox',{name:'搜索章节'}).fill('线索');
  await startDrag(third.id);await overRow(first.id);
  await expect(row(first.id)).toHaveClass(/chapter-drop-before/);
  await page.mouse.up();
  await expect.poll(() => order(volumes[0].id)).toEqual([first.id,third.id,second.id]);
  await page.getByRole('textbox',{name:'搜索章节'}).fill('');
  await dragTo(third.id,second.id);
  await expect.poll(() => order(volumes[0].id)).toEqual([first.id,second.id,third.id]);
  await expect(row(second.id).locator('.chapter-open')).toHaveAttribute('aria-pressed','true');
  await expect(manuscript).toHaveValue('正在编辑的正文。');

  await page.locator('.directory-heading>.primary').click();
  await page.locator('.creation').getByRole('textbox',{name:'标题',exact:true}).fill('追加的新章节');
  await page.getByRole('button',{name:'创建',exact:true}).click();
  await expect(group(volumes[0].id).locator('.chapter-open>span').first()).toHaveText('追加的新章节');
  const added=(await call('chapter.list',{novelId})).find(chapter=>chapter.title==='追加的新章节');
  await row(added.id).getByRole('button',{name:'移入回收站 追加的新章节',exact:true}).click();
  await expect(row(added.id)).toHaveCount(0);
  await row(second.id).click();await expect(manuscript).toHaveValue('正在编辑的正文。');
  await toggleOrder();await waitOrder(volumes[0].id,[first.id,second.id,third.id]);

  await startDrag(third.id); await overRow(first.id);
  await expect(row(first.id)).toHaveClass(/chapter-drop-before/);
  await expect(page.locator('.chapter-drag-preview')).toContainText(third.title);
  await page.screenshot({path: join(shots, 'desktop-drop.png')});
  await page.mouse.up(); await waitOrder(volumes[0].id, [third.id, first.id, second.id]);
  await expect(row(second.id).locator('.chapter-open')).toHaveAttribute('aria-pressed', 'true'); await expect(manuscript).toHaveValue('正在编辑的正文。');
  await dragTo(third.id, second.id, true); await waitOrder(volumes[0].id, [first.id, second.id, third.id]);
  await dragTo(first.id, second.id, true); await waitOrder(volumes[0].id, [second.id, first.id, third.id]);
  await page.reload(); await waitOrder(volumes[0].id, [second.id, first.id, third.id]); await expect(manuscript).toHaveValue('正在编辑的正文。');

  const beforeCancel = moveCount;
  await startDrag(third.id); await overRow(second.id); await page.keyboard.press('Escape'); await page.mouse.up();
  expect(moveCount).toBe(beforeCancel); expect(await order(volumes[0].id)).toEqual([second.id, first.id, third.id]);
  await startDrag(third.id); await page.mouse.move(800, 450, {steps: 8}); await page.mouse.up();
  expect(moveCount).toBe(beforeCancel); await expect(page.locator('.chapter-drag-preview')).toHaveCount(0);
  await dragTo(first.id, second.id, true); expect(moveCount).toBe(beforeCancel);

  await page.getByRole('textbox', {name: '搜索章节'}).fill('线索');
  await expect(row(second.id)).toHaveCount(0);
  await dragTo(third.id, first.id);
  await expect.poll(() => order(volumes[0].id)).toEqual([second.id, third.id, first.id]);
  await page.getByRole('textbox', {name: '搜索章节'}).fill(''); await waitOrder(volumes[0].id, [second.id, third.id, first.id]);

  fault = 'failure'; await dragTo(first.id, second.id);
  await expect(page.locator('.directory-sort-error')).toContainText('顺序未能保存');
  await waitOrder(volumes[0].id, [second.id, third.id, first.id]);
  fault = 'lost-response'; await dragTo(first.id, second.id);
  await waitOrder(volumes[0].id, [first.id, second.id, third.id]); await expect(page.locator('.directory-sort-error')).toHaveCount(0);
  // Create an actual competing placement before forwarding the user's stale request.
  await dragTo(first.id, third.id, true); await waitOrder(volumes[0].id, [second.id, third.id, first.id]);
  fault = 'conflict'; await dragTo(third.id, second.id);
  await expect(page.locator('.directory-sort-error')).toContainText('目录已变化');
  await waitOrder(volumes[0].id, [first.id, second.id, third.id]);

  // An autosave is still in flight when the currently open chapter changes position.
  fault = 'hold-write'; await manuscript.fill('拖动时还在写的新正文。');
  await expect.poll(() => heldWrite).toBe(true);
  await dragTo(second.id, third.id, true); await waitOrder(volumes[0].id, [first.id, third.id, second.id]);
  await expect(manuscript).toBeEnabled(); releaseWrite();
  await expect.poll(async () => (await call('chapter.get', {novelId, chapterId: second.id})).content, {timeout: 10000}).toBe('拖动时还在写的新正文。');
  await expect(page.locator('.auto-savebar')).toContainText('已保存');
  expect(await order(volumes[0].id)).toEqual([first.id, third.id, second.id]);
  expect(writes.every(args => !('order' in args) && !('volumeId' in args))).toBe(true);

  await page.evaluate(() => {window.__holdSaveReceipt = true;}); await manuscript.fill('保存回执回来后也不能改变顺序。');
  await expect.poll(() => page.evaluate(() => window.__saveReceiptHeld)).toBe(true);
  await dragTo(second.id, first.id); await waitOrder(volumes[0].id, [second.id, first.id, third.id]);
  await page.evaluate(() => {window.__releaseSaveReceipt();});
  await expect(page.locator('.auto-savebar')).toContainText('已保存');
  await expect(manuscript).toHaveValue('保存回执回来后也不能改变顺序。'); expect(await order(volumes[0].id)).toEqual([second.id, first.id, third.id]);

  await group(volumes[1].id).locator('.volume-toggle').click();
  await startDrag(third.id); const folded = await group(volumes[1].id).locator('.volume-toggle').boundingBox();
  await page.mouse.move(folded.x + 60, folded.y + folded.height / 2, {steps: 8}); await expect(group(volumes[1].id)).toHaveClass(/chapter-drop-group/);
  await page.mouse.up(); await waitOrder(volumes[1].id, [fourth.id, fifth.id, third.id]);
  await startDrag(first.id); const empty = await group(volumes[2].id).locator('.volume-toggle').boundingBox();
  await page.mouse.move(empty.x + 60, empty.y + empty.height / 2, {steps: 8}); await page.mouse.up(); await waitOrder(volumes[2].id, [first.id]);
  await startDrag(first.id); const unassigned = await group(null).locator('.volume-toggle').boundingBox();
  await page.mouse.move(unassigned.x + 60, unassigned.y + unassigned.height / 2, {steps: 8}); await page.mouse.up(); await waitOrder(null, [first.id]);
  await expect(row(second.id).locator('.chapter-open')).toHaveAttribute('aria-pressed', 'true'); await expect(manuscript).toHaveValue('保存回执回来后也不能改变顺序。');

  const deleted = await call('chapter.create', {novelId, title: '已删除的草稿', volumeId: volumes[0].id});
  await call('chapter.delete', {novelId, chapterId: deleted.id, expectedRevision: deleted.revision, confirm: true});
  await page.getByRole('button',{name:/^回收站/}).click();
  await expect(row(deleted.id)).toBeVisible();
  const beforeDeleted = moveCount; await startDrag(deleted.id); const deletedBox=await row(deleted.id).boundingBox(); await page.mouse.move(deletedBox.x+deletedBox.width+20,deletedBox.y+20); await page.mouse.up(); expect(moveCount).toBe(beforeDeleted);
  await page.getByRole('button',{name:'返回章节目录',exact:true}).click();

  const long = [];
  for (let i = 0; i < 30; i++) long.push(await call('chapter.create', {novelId, title: `长目录 ${i + 1}`, content: '滚动测试正文。'}));
  await page.reload(); await page.setViewportSize({width: 1100, height: 650});
  await row(first.id).scrollIntoViewIfNeeded(); await startDrag(first.id);
  const directoryBox = await directory.boundingBox(), scrollBefore = await directory.evaluate(element => element.scrollTop);
  await page.mouse.move(directoryBox.x + 70, directoryBox.y + directoryBox.height - 12, {steps: 8});
  await expect.poll(() => directory.evaluate(element => element.scrollTop), {timeout: 10000}).toBeGreaterThan(scrollBefore + 250);
  // Wait for the whole destination row: its top can be visible while the
  // "after" drop point is still outside the scrolling directory.
  await expect.poll(async () => {const box = await row(long.at(-1).id).boundingBox(); return box.y + box.height;}, {timeout: 10000}).toBeLessThan(directoryBox.y + directoryBox.height - 4);
  await overRow(long.at(-1).id, true); await expect(group(null).locator('.chapter-drop-end')).toHaveCount(1);
  const footer = await page.locator('.directory-foot').boundingBox();
  await page.mouse.move(footer.x + 25, footer.y + footer.height / 2, {steps: 4});
  await expect(group(null).locator('.chapter-drop-end')).toHaveCount(1);
  await page.mouse.up(); await waitOrder(null, [...long.map(chapter => chapter.id), first.id]);

  await row(long.at(-1).id).locator('.chapter-open').focus(); await page.keyboard.press('Alt+ArrowDown'); await waitOrder(null, [...long.slice(0, -1).map(chapter => chapter.id), first.id, long.at(-1).id]);
  await page.setViewportSize({width: 390, height: 780}); await page.getByRole('button', {name: '‹ 目录', exact: true}).click();
  const drawer = page.getByRole('dialog', {name: '章节目录抽屉'}); await expect(drawer).toBeVisible();
  await directory.evaluate(element => {element.scrollTop = 0;});
  await startDrag(second.id); const narrowTarget = await row(fourth.id).boundingBox();
  await page.mouse.move(narrowTarget.x + 60, narrowTarget.y + 8, {steps: 8});
  await expect(row(fourth.id)).toHaveClass(/chapter-drop-before/); await page.screenshot({path: join(shots, 'drawer-drop.png')});
  await page.keyboard.press('Escape'); await page.mouse.up(); await expect(drawer).toBeVisible();
  await startDrag(second.id); await page.mouse.move(375, 350, {steps: 8}); await page.mouse.up(); await expect(drawer).toBeVisible();
  await dragTo(second.id, fourth.id); await waitOrder(volumes[1].id, [second.id, fourth.id, fifth.id, third.id]);
  await expect(drawer).toBeVisible(); await page.getByRole('button', {name: '关闭章节目录', exact: true}).click();
  await expect(manuscript).toHaveValue('保存回执回来后也不能改变顺序。');
  await page.reload(); await expect(manuscript).toHaveValue('保存回执回来后也不能改变顺序。');
  expect((await call('chapter.get', {novelId, chapterId: second.id})).volumeId).toBe(volumes[1].id);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok: true, checks: ['default reverse directory and one-click toggle; preference/folds/editor survive reload', 'display sorting does not write manuscript placement', 'reverse pointer indicators, filtered drops and Alt+arrows', 'new chapter appears first in its volume', 'first/middle/last and reload persistence', 'drag leaves the current editor selected', 'Escape, outside and no-op cancellation', 'search does not reorder only the filtered subset', 'atomic failure, lost acknowledgement and concurrent placement', 'in-flight autosave and delayed receipt preserve prose/order', 'folded, empty and unassigned volumes', 'deleted chapters cannot drag', 'long-directory automatic edge scrolling', 'Alt+arrows', 'narrow panel drawer drag and close']}));
} catch (error) {if (page) await page.screenshot({path: join(shots, 'failure.png')}).catch(() => {}); throw error;}
finally {await browser?.close(); preview.kill();}
