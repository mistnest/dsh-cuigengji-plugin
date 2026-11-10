// Actual components and persistence; every account and call is synthetic and offline.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {UsageService} from '../src/application/usage/service.ts';
import {usageDay} from '../src/domain/usage/settings.ts';
import {selectSettingsCategory} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'),output=join(root,'test-results/usage-pricing');
await mkdir(output,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page,ledger;
const checks=[];
try{
  const {url,dataDirectory}=await new Promise((resolve,reject)=>{
    let log='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);
    host.stderr.on('data',c=>errors+=c);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});
    host.stdout.on('data',c=>{log+=c;const line=log.split('\n').find(l=>l.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
  ledger=new UsageService(join(dataDirectory,'usage'));
  const config=await ledger.configuration(),today=usageDay();
  await ledger.configure({expectedRevision:config.revision,sources:[{...config.sources[0],enabled:false,name:'DeepSeek 官方'},{id:'router',name:'自定义 API',template:'custom',enabled:false,keyRef:'',currency:'USD'},{id:'codex',name:'Codex 本机',template:'codex',enabled:false,keyRef:'',currency:'USD'}]});
  const sample={inputTokens:1000,outputTokens:100,cacheReadTokens:2000,cacheWriteTokens:0,totalTokens:3100};
  const event=(provider,model,time,usage=sample)=>({seq:0,type:'assistant/message',time,data:{turn:0,step:0,usage,message:{source:{provider,model}}}});
  for(const date of ['2026-10-28','2026-10-29'])for(let index=0;index<12;index++)await ledger.ingest(`${date}-${index}`,[event('deepseek-official','deepseek-flash',new Date(`${date}T10:${String(index).padStart(2,'0')}:00`).getTime())],'deepseek');
  await ledger.ingest('account-valley',[event('deepseek-account','deepseek-v4-pro',Date.parse('2026-10-31T10:00:00+08:00'))],'deepseek');
  await ledger.ingest('third-party',[event('example-router','example-model',Date.now(),{inputTokens:1000000,outputTokens:1000000,cacheReadTokens:1000000,cacheWriteTokens:0,totalTokens:3000000})],'router');
  await ledger.ingest('codex-unpriced',[event('openai','codex',Date.now())],'codex');
  await ledger.ingest('reported-only',[event('deepseek-official','deepseek-flash',Date.now(),{inputTokens:1000,outputTokens:100,cacheReadTokens:2000})],'deepseek');
  await ledger.store.run(meta=>{meta.balances.deepseek={balance:86.42173,recharge:82.41243,bonus:4.0093,at:Date.now()};meta.balances.router={balance:14.6852,at:Date.now()};meta.balances.codex={kind:'codex',sessions:2,at:Date.now(),windows:[{label:'5 小时',percent:32}]};},true);
  const before=await call('usage.report',{all:true,details:true,limit:200}),settled=before.records.find(r=>r.model==='deepseek-flash'&&r.cost!=null);
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1400,height:980},reducedMotion:'reduce'});
  const errors=[],reportRequests=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().endsWith('/dispatch')){const body=request.postDataJSON();if(body?.action==='usage.report')reportRequests.push(body.args);}});
  await page.goto(url);await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'桌宠与记录');
  const settings=page.getByRole('dialog',{name:'设置',exact:true});await settings.getByRole('button',{name:/查看写作记录/}).click();
  const records=page.getByRole('dialog',{name:'写作记录',exact:true});await records.getByRole('button',{name:'Token、费用与余额',exact:true}).click();
  const panel=records.locator('.usage-dashboard'),button=name=>panel.getByRole('button',{name,exact:true}),field=name=>panel.getByLabel(name,{exact:true});
  await expect(panel.locator('.usage-token-total')).not.toHaveText('—');
  await expect(panel.locator('.usage-balance')).toContainText('¥ 86.42');await expect(panel.locator('.usage-balance')).toContainText('US$ 14.69');
  await button('全部').click();await expect(panel.locator('.usage-stat-label').last()).toContainText(`${before.total.calls} 次请求`);
  await button('模型定价').click();await expect(field('谷价 未缓存输入单价')).toHaveValue('1');await expect(field('峰价 未缓存输入单价')).toHaveValue('2');
  await expect(field('峰价时段 1 开始')).toHaveValue('09:00');await expect(field('峰价时段 1 结束')).toHaveValue('12:00');
  await expect(panel.getByText('试算一下',{exact:true})).toHaveCount(0);
  for(const text of ['新定价用于之后的调用，已入账费用保留原价。','每个模型单独配置','金额显示两位小数，按原始精度汇总。'])expect(await panel.innerText()).not.toContain(text);
  await field('峰价时段 1 结束').fill('15:00');await expect(panel.getByRole('alert')).toContainText('重叠');await expect(button('保存定价')).toBeDisabled();
  await field('峰价时段 1 结束').fill('12:00');await field('峰价时段 1 开始').fill('11:00');await field('峰价 输出单价').fill('9');
  await button('保存定价').click();await expect(button('保存定价')).toBeDisabled();await expect(panel.getByRole('status')).toHaveText('已保存');
  let saved=await call('usage.config');expect(saved.prices[0].schedule.windows[0].start).toBe('11:00');expect(saved.prices[0].peak.output).toBe('9');
  await ledger.ingest('after-custom-schedule',[event('deepseek-official','deepseek-flash',Date.parse('2026-11-02T10:00:00+08:00'))],'deepseek');
  let report=await call('usage.report',{all:true,details:true,limit:200});expect(report.records.find(r=>r.sessionId==='after-custom-schedule').price.period).toBe('off-peak');expect(report.records.find(r=>r.id===settled.id)).toEqual(settled);
  await button('← 返回报表').click();await button('编辑 example-model 定价').click();
  await expect(field('厂商标识')).toHaveValue('example-router');await field('厂商标识').fill('*');await field('计价币种').selectOption('USD');await field('1 USD 折合人民币').fill('7.2');
  await field('未缓存输入单价').fill('0.6');await field('缓存读取单价').fill('0.1');await field('输出单价').fill('2');await field('缓存写入单价').fill('0.5');
  await button('保存定价').click();await expect(button('保存定价')).toBeDisabled();
  report=await call('usage.report',{all:true,details:true,limit:200});const other=report.records.find(r=>r.model==='example-model');expect(other.cost).toBe('2.700000000');expect(other.reportCost).toBe('19.440000000');
  await button('← 返回报表').click();await expect(panel.locator('.usage-spend')).toContainText('US$ 2.70');
  await button('编辑 example-model 定价').click();await expect(field('厂商标识')).toHaveValue('*');await expect(field('输出单价')).toHaveValue('2');
  await field('输出单价').fill('3');await button('保存定价').click();await expect(button('保存定价')).toBeDisabled();expect((await call('usage.report',{all:true,details:true,limit:200})).records.find(r=>r.id===other.id)).toEqual(other);
  checks.push('report opens per-model pricing; saved peak windows change new calls; wildcard/FX pricing restores and keeps paid snapshots');
  await button('＋ 添加模型').click();await field('定价模型名称').fill('my-test-model');await field('计价币种').selectOption('EUR');await field('未缓存输入单价').fill('1');await field('缓存读取单价').fill('0');await field('输出单价').fill('4');await button('保存定价').click();await expect(button('保存定价')).toBeDisabled();saved=await call('usage.config');expect(saved.prices.some(p=>p.model==='my-test-model'&&p.currency==='EUR')).toBe(true);
  await button('← 返回报表').click();await button('自定义').click();await field('用量开始日期').fill('2026-10-28');await field('用量结束日期').fill('2026-10-29');await button('应用').click();
  await expect(panel.locator('.usage-stat-label').last()).toContainText('24 次请求');await expect(panel.locator('.usage-chart-bars button')).toHaveCount(2);await button('调用明细').click();await expect(panel.locator('.usage-record')).toHaveCount(10);await expect(panel.locator('.usage-pager')).toContainText('24 次 · 第 1 页');
  await button('下一页').click();await expect(panel.locator('.usage-pager')).toContainText('24 次 · 第 2 页');
  const download=page.waitForEvent('download');await button('导出当前用量报表').click();const stream=await (await download).createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const exported=JSON.parse(Buffer.concat(chunks).toString());expect(exported.records).toHaveLength(24);expect(exported.total.calls).toBe(24);expect(exported.records.every(r=>r.time>=new Date('2026-10-28').getTime()&&r.time<new Date('2026-10-30').getTime())).toBe(true);expect(exported.records.every(r=>/^\d+\.\d{9}$/.test(r.cost))).toBe(true);
  await button('自定义').click();await field('用量开始日期').fill('2026-10-30');await field('用量结束日期').fill('2026-10-29');await button('应用').click();await expect(panel.getByRole('alert')).toHaveText('结束日期须不早于开始日期。');await expect(panel.locator('.usage-stat-label').last()).toContainText('24 次请求');
  await field('用量开始日期').fill('2026-12-01');await field('用量结束日期').fill('2026-12-01');await button('应用').click();await expect(panel.locator('.usage-stat-label').last()).toContainText('0 次请求');await expect(panel.getByText('这个区间没有调用记录',{exact:true})).toBeVisible();
  await button('全部').click();await field('用量来源').selectOption('codex');await expect(panel.locator('.usage-stat-label').last()).toContainText('1 次请求');await expect(panel.locator('.usage-spend')).toContainText('未定价');await expect(panel.locator('.usage-balance')).toContainText('订阅额度');await field('用量来源').selectOption('');
  await button('近 7 天').click();const weekStart=new Date();weekStart.setDate(weekStart.getDate()-6);const week=await call('usage.report',{from:usageDay(weekStart.getTime()),to:today});await expect(panel.locator('.usage-stat-label').last()).toContainText(`${week.total.calls} 次请求`);await expect(panel.locator('.usage-meta')).toContainText(week.from.replaceAll('-',' / '));
  await button('全部').click();await button('筛选模型').click();await field('搜索模型').fill('example-model');await expect(panel.locator('.usage-stat-label').last()).toContainText('1 次请求');await expect(panel.locator('.usage-spend')).toContainText('US$ 2.70');await button('费用').click();await expect(panel.locator('.usage-chart-brief')).toContainText('USD');
  await field('搜索模型').fill('');await button('按模型').click();await button('今天').click();await button('Token').click();
  await button('账户余额').click();await expect(panel.locator('.usage-account').filter({hasText:'Codex 本机'})).toContainText('32.0%');await expect(panel.locator('.usage-account').filter({hasText:'DeepSeek 官方'})).toContainText('¥ 86.42');await button('按模型').click();
  checks.push('inclusive/invalid/empty custom dates, source/model filters, chart currencies, 10-call pages, full-precision whole-range export and account quotas');
  await page.addStyleTag({content:'html[data-usage-test-theme="dark"]{--dsw-alias-bg-base:#1d2028;--dsw-alias-label-primary:#e6ebf5;--dsw-alias-label-secondary:#a6b0c2;--dsw-alias-border-l1:#343b48;--dsw-alias-state-business-primary:#9eafff;color-scheme:dark}'});
  for(const view of ['report','pricing']){
    if(view==='report')await button('自定义').click();
    else {await button('模型定价').click();await field('选择定价模型').selectOption({label:'deepseek-flash · deepseek'});}
    for(const theme of ['light','dark']){
      await page.evaluate(value=>{document.documentElement.dataset.usageTestTheme=value;},theme);
      for(const width of [1400,780,560,390,320]){
        await page.setViewportSize({width,height:980});await records.evaluate(el=>{el.scrollTop=0;});
        const overflow=await panel.evaluate(el=>[el,...el.querySelectorAll('.usage-summary,.usage-model-row,.usage-record,.usage-custom-dates,.usage-model-picker,.usage-rate-row,.usage-window-row,.usage-route-fields')].filter(e=>e.getBoundingClientRect().width>0&&e.scrollWidth>e.clientWidth+1).map(e=>({class:e.className,scroll:e.scrollWidth,client:e.clientWidth})));
        expect(overflow,`${view} ${theme} ${width}`).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
        await page.screenshot({path:join(output,`${view}-${theme}-${width}.png`)});
        if(view==='pricing'){await records.evaluate(el=>{el.scrollTop=el.scrollHeight;});await expect(button('保存定价')).toBeVisible();await page.screenshot({path:join(output,`${view}-schedule-${theme}-${width}.png`)});}
      }
    }
  }
  await page.setViewportSize({width:1400,height:980});await page.evaluate(()=>delete document.documentElement.dataset.usageTestTheme);
  await button('← 返回报表').click();await records.getByRole('button',{name:'关闭写作记录',exact:true}).click();
  await settings.getByRole('button',{name:/用量、费用与气泡/}).click();const usage=page.getByRole('dialog',{name:'桌宠用量与气泡',exact:true});await usage.getByRole('button',{name:'模型价格',exact:true}).click();await expect(usage.getByLabel('峰价时段 1 开始')).toHaveValue('11:00');
  checks.push('same editor is reachable from settings; light/dark report and pricing layouts fit 320–1400px');
  const final=await call('usage.config');expect(final.settings.events).toEqual(config.settings.events);expect(final.settings.bubbles).toEqual(config.settings.bubbles);
  expect(reportRequests.every(args=>args.all||!args.from||args.from<=args.to)).toBe(true);expect(errors).toEqual([]);
  await writeFile(join(output,'report.json'),JSON.stringify({ok:true,checks},null,2));console.log(JSON.stringify({ok:true,checks}));
}catch(error){await page?.screenshot({path:join(output,'failure.png')}).catch(()=>{});throw error;}
finally{await ledger?.close();await browser?.close();host.kill();}
