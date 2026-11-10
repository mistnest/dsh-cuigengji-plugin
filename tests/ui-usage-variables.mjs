// Actual workbench components, ephemeral library and synthesized account data.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {selectSettingsCategory} from './helpers/navigation.mjs';
import {usageDay} from '../src/domain/usage/settings.ts';
import {observeBalance} from '../src/domain/usage/balance.js';
const root=resolve(import.meta.dirname,'..'),output=join(root,'test-results/usage-variables');await mkdir(output,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});let browser,page;const checks=[];
try{
  const {url}=await new Promise((resolve,reject)=>{let log='',err='';const timer=setTimeout(()=>reject(Error(err||'Preview timeout')),25000);host.stderr.on('data',c=>err+=c);host.once('exit',()=>{clearTimeout(timer);reject(Error(err));});host.stdout.on('data',c=>{log+=c;const line=log.split('\n').find(l=>l.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const v=await r.json();if(!r.ok)throw Error(v.error);return v;};
  const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,...args});
  const ledger={},time=Date.now();observeBalance(ledger,{balance:10,currency:'CNY',scope:'synthetic',at:time-30000});observeBalance(ledger,{balance:8,currency:'CNY',scope:'synthetic',at:time-10000});
  const legacy={events:Array.from({length:255},(_,i)=>({ts:time-i*1000,tokens:100+i,model:i%2?'synthetic-a':'synthetic-b',cost:.01})),...ledger};
  let pre=await call('usage.importPreview',{input:legacy});await call('usage.import',{input:legacy,expectedDigest:pre.digest});
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1400,height:980},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));const button=name=>page.getByRole('button',{name,exact:true});
  const missingVariableSessions=[];
  await page.route('**/dispatch',async route=>{
    const payload=route.request().postDataJSON();
    if(payload?.action?.startsWith('variables.')&&payload.sessionId!=='production-preview'){
      missingVariableSessions.push(payload.action);
      await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'请选择一个 DSH 会话'})});return;
    }
    await route.continue();
  });
  await page.goto(url);await button('设置').click();await selectSettingsCategory(page,'桌宠与记录');
  const settings=page.getByRole('dialog',{name:'设置',exact:true});await settings.getByRole('button',{name:/用量、费用与气泡/}).click();
  let usage=page.getByRole('dialog',{name:'桌宠用量与气泡',exact:true});const saveUsage=async()=>{await usage.getByRole('button',{name:'保存配置',exact:true}).click();await expect(usage.getByRole('button',{name:'保存配置',exact:true})).toBeDisabled();};
  await expect(usage.getByText('记录模型用量（隐藏桌宠后继续）',{exact:true})).toBeVisible();
  await usage.getByLabel('每日模型预算（0 不提醒）',{exact:true}).fill('12');await saveUsage();
  expect((await call('usage.config')).settings.dailyBudget).toBe('12');
  await usage.getByRole('button',{name:'数据来源',exact:true}).click();await usage.getByLabel('来源模板',{exact:true}).selectOption('openai');await usage.getByRole('button',{name:'添加来源',exact:true}).click();
  const source=usage.locator('.companion-section').last();await source.getByLabel('来源名称',{exact:true}).fill('合成来源');await source.getByLabel('此来源每日预算（原币，0 不提醒）').fill('3');await saveUsage();expect((await call('usage.config')).sources.some(s=>s.name==='合成来源')).toBe(true);
  await usage.getByRole('button',{name:'模型价格',exact:true}).click();await page.screenshot({path:join(output,'prices-1400.png')});
  await usage.getByRole('button',{name:'气泡内容',exact:true}).click();await usage.getByRole('button',{name:'添加气泡',exact:true}).click();
  const entry=usage.locator('.companion-section').last();await entry.getByLabel('气泡名称').fill('写作搭子');await entry.getByLabel('文字内容',{exact:true}).fill('今天花了 {{cost}}');await saveUsage();
  await usage.getByRole('button',{name:'预览已保存的气泡',exact:true}).click();await expect(usage.getByLabel('用量与提醒')).toBeVisible();
  await usage.getByRole('button',{name:'提醒与声音',exact:true}).click();const completion=usage.locator('.companion-event').filter({has:page.getByText('本轮完成',{exact:true})});await completion.getByLabel('提醒声音').selectOption({label:'写完一段'});await saveUsage();
  await expect(completion.getByLabel('显示气泡',{exact:true})).toHaveCount(0);
  expect((await call('usage.config')).settings.events.complete.sound).toBeTruthy();
  await usage.getByRole('button',{name:'素材库',exact:true}).click();await expect(usage.getByText('轻轻一点',{exact:true})).toBeVisible();
  await usage.getByLabel('选择文件',{exact:true}).setInputFiles({name:'合成图.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});await usage.getByRole('button',{name:'处理并加入素材库',exact:true}).click();await expect(usage.getByText('合成图.png',{exact:true})).toBeVisible();
  await usage.getByRole('button',{name:'账本备份',exact:true}).click();const backup=await call('usage.export');await usage.getByLabel('导入催更姬备份 / 小鲸鱼账本').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await expect(usage.getByText(/新增 0 条记录/)).toBeVisible();await page.screenshot({path:join(output,'backup-1400.png')});
  checks.push('configuration, sources, budgets, bubbles, built-in sounds, image upload and backup preview work through the actual interface');
  await page.setViewportSize({width:390,height:850});await page.screenshot({path:join(output,'usage-settings-390.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.setViewportSize({width:1400,height:980});
  await usage.getByRole('button',{name:'关闭桌宠用量与气泡',exact:true}).click();await settings.getByRole('button',{name:'关闭设置',exact:true}).click();
  await button('设置').click();await selectSettingsCategory(page,'桌宠与记录');await settings.getByRole('button',{name:/查看写作记录/}).click();const records=page.getByRole('dialog',{name:'写作记录',exact:true});await records.getByRole('button',{name:'Token、费用与余额',exact:true}).click();
  await records.getByRole('button',{name:'调用明细',exact:true}).click();await expect(records.getByText('255 次 · 第 1 页',{exact:true})).toBeVisible();await records.getByRole('button',{name:'下一页',exact:true}).click();await expect(records.getByText('255 次 · 第 2 页',{exact:true})).toBeVisible();
  await records.getByRole('button',{name:'筛选模型',exact:true}).click();await records.getByLabel('搜索模型',{exact:true}).fill('synthetic-a');await expect(records.getByText('127 次 · 第 1 页',{exact:true})).toBeVisible();
  const download=page.waitForEvent('download');await records.getByRole('button',{name:'导出当前用量报表',exact:true}).click();const d=await download,stream=await d.createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);const exported=JSON.parse(Buffer.concat(chunks).toString());expect(exported.records).toHaveLength(127);expect(exported.total.calls).toBe(127);
  await records.getByRole('button',{name:'账户余额',exact:true}).click();await records.getByRole('button',{name:'核对充值 / 校正',exact:true}).click();const correction=page.getByRole('dialog',{name:'余额校正',exact:true});await expect(correction).toBeVisible();await correction.getByRole('button',{name:'取消',exact:true}).click();
  await page.screenshot({path:join(output,'report-1400.png')});await records.getByRole('button',{name:'关闭写作记录',exact:true}).click();
  checks.push('reports filter totals and details together, paginate, export the entire filtered range and open an explicit correction dialog');
  await settings.getByRole('button',{name:'关闭设置',exact:true}).click();await button('设置').click();await selectSettingsCategory(page,'AI与写作');await settings.getByRole('button',{name:/剧情变量/}).click();let vars=page.getByRole('dialog',{name:'剧情变量',exact:true});
  await expect(vars.getByRole('switch')).toBeVisible();expect(missingVariableSessions).toEqual([]);
  await vars.getByRole('switch').check();await vars.getByLabel('路径（JSON Pointer）',{exact:true}).fill('/主角');await vars.getByLabel('值（JSON）',{exact:true}).fill('{"等级":1,"背包":["药"]}');await vars.getByRole('button',{name:'预览变更',exact:true}).click();await expect(vars.getByRole('button',{name:'确认保存状态',exact:true})).toBeVisible();expect((await run('variables.read')).data).toEqual({});
  await vars.getByRole('button',{name:'确认保存状态',exact:true}).click();await expect(vars.getByText('/主角/等级',{exact:true})).toBeVisible();await vars.getByRole('button',{name:'编辑 /主角/等级',exact:true}).click();
  await vars.getByLabel('操作',{exact:true}).selectOption('inc');await vars.getByLabel('值（JSON）',{exact:true}).fill('2');await vars.getByRole('button',{name:'预览变更',exact:true}).click();await vars.getByRole('button',{name:'确认保存状态',exact:true}).click();await expect.poll(async()=>(await run('variables.read')).data.主角.等级).toBe(3);
  await vars.getByRole('button',{name:'变化轨迹',exact:true}).click();await vars.getByRole('button',{name:'查看历史快照',exact:true}).last().click();const old=page.getByRole('dialog',{name:'历史变量快照',exact:true});await expect(old.getByText(/"等级": 1/)).toBeVisible();await old.getByRole('button',{name:'准备恢复到当前剧情位置',exact:true}).click();await expect(vars.getByLabel('操作',{exact:true})).toHaveValue('set');await vars.getByRole('button',{name:'预览变更',exact:true}).click();await vars.getByRole('button',{name:'确认保存状态',exact:true}).click();await expect.poll(async()=>(await run('variables.read')).data.主角.等级).toBe(1);
  await vars.getByRole('button',{name:'导入酒馆变量',exact:true}).click();await vars.getByLabel('选择 JSON 文件',{exact:true}).setInputFiles({name:'worldbook.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({entries:[{name:'[InitVar]',content:'天气: 晴'}]}))});await expect(vars.getByRole('button',{name:'确认导入初始化',exact:true})).toBeVisible();await vars.getByRole('button',{name:'确认导入初始化',exact:true}).click();await expect.poll(async()=>(await run('variables.read')).data.stat_data.天气).toBe('晴');
  await vars.getByRole('button',{name:'状态与变更',exact:true}).click();await page.screenshot({path:join(output,'variables-1400.png')});await page.setViewportSize({width:390,height:850});await page.screenshot({path:join(output,'variables-390.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  checks.push('variables are opt-in, preview is read-only, nested values can be edited, restoration resets scope/op, and Tavern initialization is explicit');
  expect(errors).toEqual([]);await writeFile(join(output,'report.json'),JSON.stringify({ok:true,checks},null,2));console.log(JSON.stringify({ok:true,checks}));
}catch(error){if(page)await page.screenshot({path:join(output,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();}
