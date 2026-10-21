import {spawn} from 'node:child_process';
import {mkdir, readFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {chromium, expect} from '@playwright/test';
import {openAuthorPage} from './helpers/navigation.mjs';

const root = resolve(import.meta.dirname, '..'), shots = join(root, 'test-results', 'management');
await mkdir(shots, {recursive: true});
const preview = spawn(process.execPath, ['scripts/preview-workbench.mjs'], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
let browser;
try {
  const {url} = await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(new Error('Preview timeout')), 20000);
    preview.once('exit', code => {clearTimeout(timer); reject(new Error('Preview exit ' + code));});
    preview.stdout.on('data', chunk => {output += chunk; const line = output.split('\n').find(line => line.startsWith('{')); if (line) {clearTimeout(timer); resolve(JSON.parse(line));}});
  });
  const call = async (action, args = {}) => {
    const response = await fetch(new URL('/dispatch', url), {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action, args})});
    if (!response.ok) throw new Error(await response.text()); return response.json();
  };
  const novelId = (await call('novel.list'))[0].id;
  const blocks = Array.from({length: 12}, (_, i) => ({identifier: 'block-' + i, name: ['叙事视角', '人物声音', '节奏与留白'][i % 3] + (i > 2 ? ' · 第' + (i + 1) + '条要求' : ''), content: i === 0 ? '保持第三人称有限视角。\n\n只描写人物能看到、听到和推断出的信息。让动作与选择推进情节，避免替读者总结道理。\n\n每个场景有明确的冲突和变化，结尾留下下一步的选择。' : '通过人物的动作与对话呈现信息，避免重复解释。', enabled: true}));
  await call('preset.set', {novelId, expectedRevision: 0, preset: {name: '雨城 · 写作要求', enabled: true, blocks}});
  browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1200, height: 900}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  const open = name => openAuthorPage(page, name);
  const capture = async name => {await expect(page.locator('.management-page')).toBeVisible(); await page.screenshot({path: join(shots, name + '.png'), animations: 'disabled'});};
  const fits = async () => expect(await page.locator('.cuigengji').first().evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.getByRole('button', {name: '规划', exact: true}).click();
  await open('写作预设');
  await page.getByRole('button', {name: '‹ 返回设置', exact: true}).click();
  await expect(page.getByRole('dialog', {name:'设置',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'关闭设置',exact:true}).click();
  await expect(page.locator('.planning-canvas-scroll')).toBeVisible();
  await open('写作预设');
  const content = page.getByLabel('提示词内容', {exact: true});
  const edited = blocks[0].content + '\n\n保留作者新增的要求。';
  await content.fill(edited);
  await open('作品与备份');
  await page.getByRole('button', {name: '‹ 返回作品首页', exact: true}).click();
  await page.locator('.welcome-book').first().click();
  await page.getByRole('button', {name: '规划', exact: true}).click();
  await expect(page.getByLabel('规划画布',{exact:true})).toBeVisible();
  await open('写作预设');
  await expect(content).toHaveValue(edited);
  await page.getByRole('button', {name: '保存预设', exact: true}).click();
  await expect(page.getByRole('button', {name: '保存预设', exact: true})).toBeDisabled();
  expect((await call('preset.get', {novelId})).blocks[0].content).toBe(edited);
  await page.getByRole('button', {name: '新增提示词', exact: true}).click();
  await page.getByLabel('条目名称', {exact: true}).fill('结尾要求'); await content.fill('让结尾留下一个具体的选择。');
  await page.getByLabel('提示词条目操作', {exact: true}).click(); await page.getByRole('button', {name: '上移', exact: true}).click();
  await page.getByRole('button', {name: '保存预设', exact: true}).click(); await expect(page.getByRole('button', {name: '保存预设', exact: true})).toBeDisabled();
  expect((await call('preset.get', {novelId})).blocks[11].name).toBe('结尾要求');
  await page.getByLabel('提示词条目操作', {exact: true}).click(); await page.getByRole('button', {name: '移除条目', exact: true}).click();
  await page.getByRole('button', {name: '保存预设', exact: true}).click(); await expect(page.getByRole('button', {name: '保存预设', exact: true})).toBeDisabled();
  expect((await call('preset.get', {novelId})).blocks).toHaveLength(12);
  await page.locator('.preset-list>button').first().click();
  await capture('preset-1200');
  await page.getByRole('button', {name: '导入预设', exact: true}).click(); await capture('preset-import-1200');
  await page.getByRole('button', {name: '‹ 返回写作预设', exact: true}).click();
  await page.locator('.management-scroll').evaluate(element => {element.scrollTop = element.scrollHeight;});
  await expect(page.getByRole('button', {name: '保存预设', exact: true})).toBeInViewport();
  await expect(page.getByRole('heading', {name: '写作预设', exact: true})).toBeInViewport();

  await open('作品与备份'); await capture('manage-1200');
  await page.getByRole('button', {name: '重命名', exact: true}).click(); await page.getByLabel('输入值', {exact: true}).fill('雾港来信 · 测试作品'); await page.getByRole('button', {name: '确定', exact: true}).click();
  await expect(page.getByRole('heading', {name: '雾港来信 · 测试作品', exact: true})).toBeVisible();
  await page.getByRole('button', {name: '导出这部作品', exact: true}).click();
  await expect(page.getByRole('button', {name: '下载文件', exact: true})).toBeEnabled();
  const bookDownload = page.waitForEvent('download'); await page.getByRole('button', {name: '下载文件', exact: true}).click();
  const bookFile = await bookDownload, bookPath = await bookFile.path(), bookBackup = JSON.parse(await readFile(bookPath, 'utf8'));
  expect(bookBackup.payload.projects[0].preset.blocks[0].content).toBe(edited);
  await page.getByRole('group', {name: '导入导出切换'}).getByRole('button', {name: '导入', exact: true}).click();
  await page.getByLabel('导入文件', {exact: true}).setInputFiles({name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}')});
  await expect(page.getByRole('alert')).toContainText('未识别');
  await page.getByLabel('导入文件', {exact: true}).setInputFiles(bookPath); await expect(page.getByLabel('导入预览', {exact: true})).toContainText('相同内容跳过');
  await capture('backup-preview-1200');
  await page.getByRole('button', {name: '确认导入', exact: true}).click(); await expect(page.getByRole('status')).toContainText('1 部相同作品跳过');
  expect((await call('novel.list')).length).toBe(1);
  await page.getByRole('button', {name: '继续导入', exact: true}).click();
  const legacy = {project: {id: 'management-test-legacy', name: '旧版试用作品'}, chapters: [{id: 'old-chapter', title: '来信', content: '她在门外收起雨伞。'}]};
  await page.getByLabel('导入文件', {exact: true}).setInputFiles({name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy))});
  await expect(page.getByText('旧版小说项目', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: '确认导入', exact: true})).toBeEnabled();
  await page.getByRole('button', {name: '确认导入', exact: true}).click(); await expect(page.getByRole('heading', {name: '导入完成', exact: true})).toBeVisible();
  expect((await call('novel.list')).length).toBe(2);

  await open('导入 / 导出'); await capture('data-1200');
  await page.getByText('存储位置与备份范围', {exact: true}).click(); await expect(page.locator('.work-data-path')).toBeVisible();
  await page.getByRole('group', {name: '导入导出切换'}).getByRole('button', {name: '导出', exact: true}).click();
  await page.getByRole('button', {name: '完整工作库', exact: true}).click();
  await expect(page.getByRole('button', {name: '下载文件', exact: true})).toBeEnabled();
  const allDownload = page.waitForEvent('download'); await page.getByRole('button', {name: '下载文件', exact: true}).click();
  const allFile = await allDownload, allPath = await allFile.path();
  expect(JSON.parse(await readFile(allPath, 'utf8')).summary.novels).toBe(2);
  await page.getByRole('group', {name: '导入导出切换'}).getByRole('button', {name: '导入', exact: true}).click();
  await page.getByLabel('导入文件', {exact: true}).setInputFiles(allPath); await expect(page.getByRole('button', {name: '确认导入', exact: true})).toBeEnabled();
  await capture('workspace-preview-1200');
  await page.getByRole('button', {name: '确认导入', exact: true}).click(); await expect(page.getByRole('heading', {name: '导入完成', exact: true})).toBeVisible();
  expect((await call('novel.list')).length).toBe(2);
  await page.getByText('导入前备份位置', {exact: true}).click(); await expect(page.locator('.transfer-complete .work-data-path')).toBeVisible();
  const beforeConflict = await call('novel.get', {novelId});
  await call('novel.update', {novelId, expectedRevision: beforeConflict.revision, title: '更新后的作品'});
  await page.getByRole('button', {name: '继续导入', exact: true}).click();
  await page.getByLabel('导入文件', {exact: true}).setInputFiles(allPath);
  await expect(page.getByRole('alert')).toContainText('暂不能导入'); await expect(page.getByRole('button', {name: '确认导入', exact: true})).toBeDisabled();
  await capture('workspace-conflict-1200');
  expect((await call('novel.get', {novelId})).title).toBe('更新后的作品');

  for (const width of [360, 560, 1200]) {
    await page.setViewportSize({width, height: 900});
    for (const [name, key] of [['写作预设', 'preset'], ['作品与备份', 'manage'], ['导入 / 导出', 'data']]) {
      await open(name); await fits();
      await expect(page.getByRole('heading', {name: key === 'data' ? '导入 / 导出' : name, exact: true})).toBeInViewport();
      if (key === 'preset') {
        await expect(page.getByRole('button', {name: '保存预设', exact: true})).toBeInViewport();
        if (width < 600) {await page.getByRole('button', {name: '‹ 条目列表', exact: true}).click(); await expect(page.getByRole('button', {name: '新增提示词', exact: true})).toBeVisible(); await page.locator('.preset-list>button').first().click();}
      }
      await capture(key + '-' + width);
    }
  }
  await page.evaluate(() => {document.documentElement.style.cssText = '--dsw-alias-bg-base:#17191f;--dsw-alias-label-primary:#e8eaf0;--dsw-alias-label-secondary:#a1a6b3;--dsw-alias-border-l1:#343946;--dsw-alias-state-business-primary:#6c8aff;';});
  await open('写作预设'); await capture('preset-dark-1200');
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok: true, checks: ['preset draft survives navigation; edit, reorder, remove and save preserve text', 'fixed header/footer and 360/560/1200px layouts', 'return to the previous planning page', 'actual per-book backup, invalid file rejection, deduplication and legacy migration', 'whole-library download/import, automatic backup path and conflict blocking']}));
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0]; if (page) await page.screenshot({path: join(shots, 'failure.png')}); throw error;
} finally {await browser?.close(); preview.kill();}
