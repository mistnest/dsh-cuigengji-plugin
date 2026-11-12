import {selectSettingsCategory} from './helpers/navigation.mjs';
// Exercise the actual DSH slot registrations, a real isolated Store and delayed
// RPC responses. Never connect to the author's DSH profile or private novels.
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import { Store } from '../src/core/store.js';
import { DesktopPet } from '../src/application/pet/desktop.ts';
import { UsageService } from '../src/application/usage/service.ts';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..'), directory = await mkdtemp(join(tmpdir(), 'cuigengji-pet-ui-'));
const shots = join(root, 'test-results', 'pet'); await mkdir(shots, { recursive: true });
const store = new Store(directory), books = {},usage=new UsageService(join(directory,'usage'));
const usageConfig=await usage.configuration();
await usage.configure({expectedRevision:usageConfig.revision,prices:[...usageConfig.prices,{id:'pet-fixture',provider:'synthetic',model:'fixture-model',currency:'CNY',input:'2',output:'2',cacheRead:'2',revision:1}]});
await usage.ingest('pet-a',[{seq:0,time:Date.now(),type:'assistant/message',data:{turn:0,step:0,message:{source:{provider:'synthetic',model:'fixture-model'}},usage:{inputTokens:48210,cacheReadTokens:192810,outputTokens:45400,totalTokens:286420}}}]);
await usage.store.run(meta=>{meta.balances.deepseek={balance:'86.244999',at:Date.now()};},true);
let nativeProcess, nativeOutput = '';
const desktopPet = new DesktopPet(directory, (action, args, actor) => store.dispatch(action, args, actor), { usage,supported: process.platform === 'win32', launch() {
  const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', resolve(root, 'src/desktop/pet.ps1'), '-StateDirectory', directory, '-AssetsDirectory', resolve(root, 'src/client/assets/pets'), '-ParentProcessId', String(process.pid), '-Headless'], { windowsHide: true });
  child.stdout.on('data', value => nativeOutput += value); nativeProcess = child; return child;
} });
for (const [session, title, text] of [['pet-a', '甲作品', '今天写下了一个故事。'], ['pet-b', '乙作品', '另一部作品。']]) {
  const actor = { kind: 'human', sessionId: session };
  const book = await store.dispatch('novel.create', { title }, actor);
  await store.dispatch('binding.set', { novelId: book.id }, actor);
  await store.dispatch('chapter.create', { novelId: book.id, title: '第一章', content: text }, actor);
  books[session] = book.id;
}
const bundle = await build({ stdin: { resolveDir: root, loader: 'tsx', contents: `
import React,{useSyncExternalStore} from 'react';import{createRoot}from'react-dom/client';
import{applyWithRPC}from'./src/client/index.tsx';import{styles}from'./src/client/style.ts';
function source(value){const listeners=new Set();return{getSnapshot:()=>value,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},set(next){value=next;listeners.forEach(fn=>fn())}}}
const mounted=source('pet-a'),panel=source(null),counter=source(0),status=source(new Map()),show=source(true);
const registrations=[],disposers=[],retired=[],requests=[],opened=[],held=new Map(),pending=[],failures=new Map();let statusFault=false;
const statusSource={subscribe:status.subscribe,getSnapshot(){if(statusFault)throw Error('测试：宿主状态暂不可读');return status.getSnapshot()}};
const ctx={effect:fn=>{const off=fn();if(typeof off==='function')disposers.push(off)},slots:{inject:(_,fn)=>fn(),register:(options,Component)=>{registrations.push({options,Component});return()=>{}}},
uiWorkspace:{openSession:id=>{opened.push({sessionId:id,kind:'conversation'});mounted.set(id)}},layout:{selectPanel:()=>panel.set(null)},
sidebarRightTabs:{register:options=>{if(options.kind==='cuigengji-pet')throw Error('不能再注册独立陪伴页');return()=>{}}},sidebarRight:{mounted,openResource:address=>{const sessionId=decodeURIComponent(address.slice(address.lastIndexOf('/')+1));opened.push({sessionId,kind:'cuigengji'});panel.set({sessionId,visible:true})}},
sessions:{list:source({byId:{'pet-b':{id:'pet-b',retainedBy:{mainView:1}},'pet-a':{id:'pet-a',retainedBy:{mainView:1}}}})},uiSession:{sessionStatus:statusSource},workspaces:{list:source({items:[]})}};
applyWithRPC(ctx,async(action,args,sessionId)=>{
 requests.push({action,args,sessionId});const key=action+':'+sessionId;if(failures.has(key))throw Error(failures.get(key));
 const response=await fetch('/dispatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args,sessionId})});const value=await response.json();if(!response.ok)throw Error(value.error);
 if(held.has(key)){await new Promise(resolve=>pending.push({key,resolve}));}return value;
});
const overlay=registrations.find(r=>r.options.name==='shell.overlay'),tab=registrations.find(r=>r.options.key==='dsh-cuigengji-plugin');
const useSource=s=>useSyncExternalStore(s.subscribe,s.getSnapshot);
const useMounted=selector=>selector(useSource(mounted));
function useTabInfo(){const p=useSource(panel);return{tab:{visible:p?.visible!==false,navigation:{address:'dsh-resource://cuigengji/'+encodeURIComponent(p?.sessionId||'')}}}}
class HostBoundary extends React.Component{state={failed:false};static getDerivedStateFromError(){return{failed:true}}componentDidCatch(e){retired.push(e.message)}render(){return this.state.failed?<div data-retired/>:this.props.children}}
function App(){const p=useSource(panel),count=useSource(counter),visible=useSource(show),injected=overlay.options.inject();return <><style>{styles}</style><header><button onClick={()=>counter.set(count+1)}>聊天继续 {count}</button><button onClick={()=>panel.set({sessionId:mounted.getSnapshot()||'',visible:true})}>打开工作台</button></header><main style={{transform:'translateZ(0)',overflow:'hidden',width:220,height:200}}><HostBoundary>{visible&&<overlay.Component {...injected} useMounted={useMounted}/>}</HostBoundary></main>{p&&<aside style={{position:'fixed',left:0,top:50,width:'min(420px,100vw)',height:'calc(100vh - 50px)'}}><HostBoundary><tab.Component sessionId={p.sessionId} useTabInfo={useTabInfo}/></HostBoundary></aside>}</>}
window.fixture={session:id=>{panel.set(null);mounted.set(id)},rerender:()=>counter.set(counter.getSnapshot()+1),status:(id,value)=>status.set(new Map([[id,value]])),panel:value=>panel.set(value),show:value=>show.set(value),fault:value=>{statusFault=value;status.set(new Map(status.getSnapshot()))},
call:(action,args,sessionId)=>overlay.options.inject().rpc(action,args,sessionId),
hold:(action,id)=>held.set(action+':'+id,true),release:()=>{held.clear();pending.splice(0).forEach(p=>p.resolve())},pending:()=>pending.length,
fail:(action,id,message)=>{const key=action+':'+id;if(message)failures.set(key,message);else failures.delete(key)},stats:()=>({requests,retired,opened}),clear:()=>requests.splice(0)};
createRoot(document.getElementById('root')).render(<App/>);
` }, bundle: true, write: false, format: 'iife', loader: { '.png': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' } });
const server = createServer(async (req, res) => {
  try {
    res.setHeader('cache-control', 'no-store');
    if (req.url === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); res.end(bundle.outputFiles[0].contents); return; }
    if (req.url === '/native-command') {
      let body = ''; for await (const chunk of req) body += chunk;
      nativeProcess?.stdin.write(JSON.stringify({ type: 'test-command', action: JSON.parse(body).action }) + '\n');
      res.setHeader('content-type', 'application/json'); res.end('{}'); return;
    }
    if (req.url === '/dispatch') {
      let body = ''; for await (const chunk of req) body += chunk;
      const request = JSON.parse(body), value = request.action.startsWith('usage.') ? await usage.dispatch(request.action,request.args||{}) : request.action === 'settings.get' ? {dataRoot:directory} : request.action === 'pet.desktop' ? await desktopPet.sync({ ...request.args, sessionId: request.sessionId }) : await store.dispatch(request.action, request.args || {}, { kind: 'human', sessionId: request.sessionId });
      if (request.action === 'usage.presentation' && value.event?.id.startsWith('ui-waiting-')) {
        // Simulate an older server still asking the client to open a reminder.
        value.showBubble = true;
        value.ttl = 1;
      }
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)); return;
    }
    res.setHeader('content-type', 'text/html'); res.end('<!doctype html><html><meta charset="utf-8"><style>html,body,#root{margin:0;height:100%;font:14px system-ui;background:#e9edf4}header{position:relative;z-index:2;padding:8px}</style><div id="root"></div><script src="/bundle.js"></script></html>');
  } catch (error) { res.statusCode = 500; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ error: error.message })); }
});
let browser;
async function openWorkbenchSettings(page) {
  await page.getByRole('button', { name: '打开工作台', exact: true }).click();
  // The narrow drawer is mounted after the workbench's first ResizeObserver
  // update. Wait for that layout before deciding whether it needs closing.
  await page.waitForFunction(() => {
    const workspace = document.querySelector('.chapter-workspace');
    return workspace && (workspace.clientWidth >= 760 || !workspace.classList.contains('show-directory') || workspace.querySelector('.directory-drawer[open]'));
  });
  const drawer = page.getByRole('dialog', { name: '章节目录抽屉', exact: true });
  if (await drawer.isVisible()) await drawer.getByRole('button', { name: '关闭章节目录', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await page.getByRole('button', { name: '设置', exact: true }).click();await selectSettingsCategory(page,'桌宠与记录');
}
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1060, height: 800 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('http://127.0.0.1:' + server.address().port);
  const pet = page.locator('.pet-companion'), avatar = pet.locator('.pet-avatar'), dialog = pet.getByRole('dialog');
  await expect(avatar).toBeVisible();
  await expect.poll(async () => (await page.evaluate(() => fixture.stats())).requests.filter(r => r.action === 'activity.today').length).toBe(1);
  // Portal escapes a clipped/transformed 220x200 host column.
  let box = await avatar.boundingBox(); expect(box.x).toBeGreaterThan(900); expect(box.y).toBeGreaterThan(650);
  await avatar.click(); await expect(dialog.locator('.pet-companion-scope')).toContainText('甲作品');
  await expect(dialog.locator('.pet-quick-token-line strong')).toHaveText('286,420');
  await expect(dialog.locator('.pet-quick-amounts').nth(0)).toHaveText('¥ 0.57');
  await expect(dialog.locator('.pet-quick-amounts').nth(1)).toHaveText('¥ 86.24');
  await expect(dialog.getByText('作者聊天',{exact:true})).toBeHidden();
  await page.screenshot({path:join(shots,'compact-overview.png'),animations:'disabled'});
  await dialog.getByRole('button',{name:/今日写作/}).click();
  await expect(dialog.getByText('作者聊天',{exact:true})).toBeVisible();
  await dialog.getByLabel('今日 Token 构成',{exact:true}).click();
  await expect(dialog.locator('.pet-quick-breakdown')).toContainText('192,810');
  await dialog.getByLabel('账户余额来源',{exact:true}).click();
  await expect(dialog.locator('.pet-quick-accounts')).toContainText('DeepSeek');
  await page.screenshot({path:join(shots,'expanded-overview.png'),animations:'disabled'});
  await avatar.click();await expect(dialog).toHaveCount(0);
  await avatar.click();await expect(dialog.getByText('作者聊天',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:/今日写作/}).click();
  await dialog.getByRole('button', { name: '查看记录', exact: true }).click();
  const records=page.getByRole('dialog', { name: '写作记录', exact: true });
  await expect(records).toBeVisible();expect(await records.evaluate(el=>el.matches(':modal'))).toBe(true);await expect(page.locator('.workbench-base')).toBeVisible();await expect(records.getByLabel('统计范围')).toHaveValue(books['pet-a']);
  expect((await page.evaluate(() => fixture.stats())).opened.at(-1)).toEqual({ sessionId: 'pet-a', kind: 'cuigengji' });
  // An explicit book scope stays fixed even if the session association changes.
  // Re-rendering the same records scope does not create another request chain.
  await expect.poll(async()=> (await page.evaluate(() => fixture.stats())).requests.filter(r => r.action === 'activity.stats').length).toBe(1);
  await page.evaluate(()=>fixture.rerender());expect((await page.evaluate(() => fixture.stats())).requests.filter(r=>r.action==='activity.stats')).toHaveLength(1);
  expect((await page.evaluate(() => fixture.stats())).requests.filter(r=>r.action==='activity.today')).toHaveLength(1);
  const libraryToday=await store.dispatch('activity.today',{}, {kind:'human',sessionId:'pet-a'});
  await records.getByLabel('统计范围').selectOption('');await expect(records.locator('.records-metric').first()).toContainText(String(libraryToday.stats.proseAdded));await expect(records.locator('.records-books [role=row]')).toHaveCount(3);
  await records.getByRole('button',{name:'关闭写作记录',exact:true}).click();
  if(await page.getByRole('button',{name:'关闭章节目录',exact:true}).isVisible())await page.getByRole('button',{name:'关闭章节目录',exact:true}).click();
  await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'桌宠与记录');
  const panel = page.getByRole('dialog', { name: '设置', exact: true });
  await panel.getByLabel('陪伴角色',{exact:true}).selectOption('cuigengji');
  await expect(avatar).toHaveClass(/pet-avatar-cuigengji/);
  await page.evaluate(() => fixture.status('pet-a', { running: true }));
  await expect(avatar).toHaveClass(/pet-mood-writing/);
  expect(await avatar.locator('.pet-avatar-art').evaluate(el => getComputedStyle(el).backgroundPosition)).toMatch(/^100% 0(px|%)$/);
  await page.evaluate(() => fixture.status('pet-a', { running: false, pendingInteraction: { kind: 'approval' } }));
  await expect(avatar).toHaveClass(/pet-mood-waiting/);
  await page.evaluate(() => fixture.status('pet-a', { running: false }));
  await page.screenshot({ path: join(shots, 'panel-and-pet.png'), animations: 'disabled' });
  await page.evaluate(() => fixture.panel(null));

  // Drag with several pointermoves must preserve exact displacement and not click.
  box = await avatar.boundingBox(); const start = { x: box.x + 55, y: box.y + 55 };
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x - 180, start.y - 100, { steps: 12 }); await page.mouse.up();
  let moved = await avatar.boundingBox(); expect(Math.abs(moved.x - box.x + 180)).toBeLessThan(2); expect(Math.abs(moved.y - box.y + 100)).toBeLessThan(2);
  await expect(dialog).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cuigengji:pet:position:v2')));
  await page.reload(); await expect(avatar).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cuigengji:pet:position:v2')))).toEqual(saved);

  async function dragTo(x, y) {
    const b = await avatar.boundingBox(); await page.mouse.move(b.x + 55, b.y + 55); await page.mouse.down(); await page.mouse.move(x, y, { steps: 8 }); await page.mouse.up(); await expect(dialog).toHaveCount(0);
  }
  async function fits() {
    await expect.poll(async () => { const b = await dialog.boundingBox(), size = page.viewportSize(); return b && b.x >= 7 && b.y >= 7 && b.x + b.width <= size.width - 7 && b.y + b.height <= size.height - 7; }).toBe(true);
  }
  for (const [x, y] of [[0, 0], [1060, 0], [0, 800], [1060, 800]]) {
    await dragTo(x, y); await avatar.click(); await fits(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  }
  await page.setViewportSize({ width: 320, height: 440 }); await avatar.click(); await fits();
  await expect(dialog).toBeVisible(); await page.screenshot({ path: join(shots, 'narrow.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 260, height: 300 }); await fits();
  await page.keyboard.press('Escape');
  // A cancel/blur must clean listeners; subsequent movement cannot move the pet.
  box = await avatar.boundingBox(); await page.mouse.move(box.x + 55, box.y + 55); await page.mouse.down(); await page.mouse.move(box.x + 35, box.y + 25, { steps: 3 });
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); const afterCancel = await avatar.boundingBox(); await page.mouse.move(150, 40); await page.mouse.up();
  expect((await avatar.boundingBox()).x).toBeCloseTo(afterCancel.x, 0); await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 1060, height: 800 });

  // Context menu hiding is persistent and always recoverable from the panel.
  await avatar.click({ button: 'right' }); const menu = pet.getByRole('menu', { name: '桌宠操作' });
  await menu.getByRole('menuitem', { name: '暂时隐藏', exact: true }).click(); await expect(pet).toHaveCount(0);
  await page.reload(); await expect(pet).toHaveCount(0);
  await page.getByRole('button', { name: '打开工作台', exact: true }).click();if(await page.getByRole('button',{name:'关闭章节目录',exact:true}).isVisible())await page.getByRole('button',{name:'关闭章节目录',exact:true}).click();await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'桌宠与记录');
  await panel.getByRole('switch', { name: '开启桌宠' }).check(); await expect(avatar).toBeVisible();
  await panel.getByRole('button', { name: '放回右下角', exact: true }).click();
  await page.evaluate(() => fixture.panel(null));

  // Late results for an old session cannot replace the current book.
  await page.evaluate(() => { fixture.hold('activity.today', 'pet-b'); fixture.session('pet-b'); });
  await expect.poll(() => page.evaluate(() => fixture.pending())).toBeGreaterThan(0);
  await page.evaluate(() => fixture.session('pet-a')); await avatar.click(); await expect(dialog.locator('.pet-companion-scope')).toContainText('甲作品');
  await page.evaluate(() => fixture.release()); await expect(dialog.locator('.pet-companion-scope')).toContainText('甲作品');
  await page.keyboard.press('Escape');
  // A failed binding read must stay an error, never query activity for all works.
  await page.evaluate(() => { fixture.fail('binding.get', 'broken', '测试绑定失败'); fixture.clear(); fixture.session('broken'); });
  await expect(avatar).toHaveClass(/pet-mood-error/); await avatar.click();
  expect((await page.evaluate(() => fixture.stats())).requests.some(r => r.action === 'activity.today' && r.sessionId === 'broken')).toBe(false);
  await expect(dialog.getByRole('button', { name: '进度未连接，点击重试' })).toBeVisible();
  await page.evaluate(() => { fixture.fail('binding.get', 'broken', null); fixture.session(undefined); fixture.clear(); });
  await avatar.click(); await expect(dialog).toContainText('打开一个对话'); await expect(dialog.getByRole('button', { name: '查看记录', exact: true })).toBeDisabled();
  // Device usage remains available without binding a writing conversation.
  expect((await page.evaluate(() => fixture.stats())).requests.filter(r=>!r.action.startsWith('usage.'))).toEqual([]);
  await page.getByRole('button', { name: /聊天继续/ }).click(); await expect(dialog).toHaveCount(0);

  // A render failure stays inside the companion and the host keeps working.
  await page.evaluate(() => { fixture.session('pet-a'); fixture.fault(true); });
  await expect(page.getByRole('button', { name: '恢复桌宠', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /聊天继续/ }).click();
  await page.evaluate(() => fixture.fault(false)); await page.getByRole('button', { name: '恢复桌宠', exact: true }).click(); await expect(avatar).toBeVisible();
  // A menu defers delivery. A pending notice is visible on click and stays
  // pending until DSH resolves it, even if the author closes the quick view.
  await avatar.click({button:'right'});await expect(menu).toBeVisible();
  await usage.notification({id:'ui-waiting-a',kind:'question',sessionId:'pet-a',time:Date.now(),pending:true,text:'合成提醒：请确认这段情节'});
  await page.clock.fastForward(4100);
  await expect.poll(async()=> (await page.evaluate(()=>fixture.stats())).requests.filter(r=>r.action==='usage.presentation').length).toBeGreaterThan(0);
  await expect(menu).toBeVisible();expect((await usage.dispatch('usage.export')).meta.events.find(e=>e.id==='ui-waiting-a').deliveredAt).toBeUndefined();
  await page.keyboard.press('Escape');
  await expect.poll(async()=>!!(await usage.dispatch('usage.export')).meta.events.find(e=>e.id==='ui-waiting-a').deliveredAt).toBe(true);
  await expect(dialog).toHaveCount(0);
  await avatar.click();
  await expect(dialog).toContainText('合成提醒：请确认这段情节');
  await page.clock.runFor(1500);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'收起桌宠对话'}).click();await expect(dialog).toHaveCount(0);
  await page.clock.fastForward(4100);await expect(dialog).toHaveCount(0);
  expect((await usage.dispatch('usage.export')).meta.events.find(e=>e.id==='ui-waiting-a').pending).toBe(true);
  await usage.resolveNotification('ui-waiting-a');
  await usage.notification({id:'ui-waiting-b',kind:'approval',sessionId:'pet-b',time:Date.now(),pending:true,text:'合成提醒：另一对话等待确认'});
  await page.clock.fastForward(4100);
  await expect.poll(async()=>!!(await usage.dispatch('usage.export')).meta.events.find(e=>e.id==='ui-waiting-b').deliveredAt).toBe(true);
  await expect(dialog).toHaveCount(0);
  await avatar.click();
  await expect(dialog).toContainText('合成提醒：另一对话等待确认');
  await dialog.getByRole('button',{name:'回到待处理对话',exact:true}).click();
  await expect.poll(async()=> (await page.evaluate(()=>fixture.stats())).opened.filter(e=>e.kind==='conversation').at(-1)?.sessionId).toBe('pet-b');
  expect((await usage.dispatch('usage.export')).meta.events.find(e=>e.id==='ui-waiting-b').pending).toBe(true);
  await usage.resolveNotification('ui-waiting-b');
  await page.evaluate(()=>fixture.session('pet-a'));
  // The intentional render exception is caught by our boundary, never pageerror.
  expect((await page.evaluate(() => fixture.stats())).retired).toEqual([]); expect(errors).toEqual([]);
  await page.evaluate(() => fixture.show(false)); await expect(pet).toHaveCount(0);
  if (process.platform === 'win32') {
    // Use the *real* WPF process with hidden test windows. The desktop preload
    // and the official slot/RPC wiring remain the same as a visible install.
    const nativePage = await browser.newPage({ viewport: { width: 1060, height: 800 } });
    nativePage.on('pageerror', error => errors.push(error.message));
    await nativePage.addInitScript(() => { window.dshDesktop = { protocolVersion: 1 }; });
    await nativePage.clock.install();
    await nativePage.goto('http://127.0.0.1:' + server.address().port);
    await openWorkbenchSettings(nativePage);
    const nativePanel = nativePage.getByRole('dialog', { name: '设置', exact: true });
    await expect(nativePanel).toContainText('桌面陪伴已启动');
    await expect(nativePage.locator('.pet-companion')).toHaveCount(0);
    await nativePanel.getByLabel('陪伴角色',{exact:true}).selectOption('cuigengji');
    await expect.poll(() => nativeOutput.includes('"role":"cuigengji"')).toBe(true);
    await nativePanel.getByRole('switch', { name: '开启桌宠' }).uncheck();
    await expect.poll(() => nativeOutput.includes('"visible":false')).toBe(true);
    await nativePanel.getByRole('switch', { name: '开启桌宠' }).check();
    const command = action => fetch('http://127.0.0.1:' + server.address().port + '/native-command', { method: 'POST', body: JSON.stringify({ action }) });
    await command('role'); await expect(nativePanel.getByLabel('陪伴角色',{exact:true})).toHaveValue('bigfish');
    await command('hide'); await expect(nativePanel.getByRole('switch', { name: '开启桌宠' })).not.toBeChecked();
    await nativePanel.getByRole('switch', { name: '开启桌宠' }).check();
    const beforeDetails = (await nativePage.evaluate(() => fixture.stats())).opened.length;
    await command('details'); await nativePage.clock.fastForward(2100);
    await expect.poll(async () => (await nativePage.evaluate(() => fixture.stats())).opened.length).toBe(beforeDetails + 1);
    await expect(nativePage.getByRole('dialog',{name:'写作记录',exact:true})).toBeVisible();
    await nativePage.evaluate(() => { fixture.panel(null); fixture.show(false); });
    await nativePage.evaluate(() => fixture.show(true));
    await nativePage.clock.fastForward(2100);
    await expect(nativePage.locator('.pet-companion')).toHaveCount(0);
    expect((await nativePage.evaluate(() => fixture.stats())).opened.length).toBe(beforeDetails + 1);
    await expect(nativePanel).toHaveCount(0);
    await openWorkbenchSettings(nativePage);
    await expect(nativePanel).toContainText('桌面陪伴已启动');
    await command('crash'); await expect(nativePage.locator('.pet-companion')).toBeVisible();
    await nativePanel.getByRole('button', { name: '重新启动桌宠', exact: true }).click();
    await expect(nativePanel).toContainText('桌面陪伴已启动'); await expect(nativePage.locator('.pet-companion')).toHaveCount(0);
    await nativePage.evaluate(() => fixture.hold('pet.desktop', 'pet-a'));
    await nativePage.clock.fastForward(2100);
    await expect.poll(() => nativePage.evaluate(() => fixture.pending())).toBeGreaterThan(0);
    await nativePage.clock.fastForward(26_000);
    await expect(nativePage.locator('.pet-companion')).toBeVisible();
    await nativePage.evaluate(() => fixture.release());
    await nativePage.clock.fastForward(2100);
    await expect(nativePage.locator('.pet-companion')).toHaveCount(0);
    expect(errors).toEqual([]);
    await nativePage.screenshot({ path: join(shots, 'desktop-bridge.png'), animations: 'disabled' });
    await nativePage.close();
  }
  console.log(JSON.stringify({ ok: true, checks: ['real DSH overlay/tab registration and selected-session targeting', 'shared stats, role sync and actual host running/waiting status', 'accurate multi-step drag without accidental clicks, persistence and blur cleanup', 'four edges, narrow viewports and live resize', 'persistent hide and restore', 'late response ignored and binding error stays scoped', 'no-session behavior and click-through shell', 'click-only quick view despite legacy reminder flags; pending navigation preserved', 'render recovery without retiring host slots', 'real WPF process through desktop bridge: two-way roles and visibility, fallback on exit and manual restart'] }));
} finally {
  await browser?.close(); await desktopPet.close(); await usage.close(); await new Promise(resolve => server.close(resolve));
  assert.equal(resolve(directory), directory); assert.ok(basename(directory).startsWith('cuigengji-pet-ui-')); await rm(directory, { recursive: true, force: true });
}
