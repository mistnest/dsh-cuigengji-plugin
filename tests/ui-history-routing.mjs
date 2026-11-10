// Real UI, persisted synthetic data, no user profile and no model requests.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization} from './helpers/navigation.mjs';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','history-routing');
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try {
  const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',c=>errors+=c);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',c=>{output+=c;const line=output.split('\n').find(l=>l.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});if(!r.ok)throw Error(await r.text());return r.json();};
  const novelId=(await call('novel.list'))[0].id;
  const original='# 最初的约定\n\n她还不知道来信出自谁手。\n\n- 一封缺页的信\n- 一段尚未证实的往事';
  const latest='# 选择与代价\n\n她已经查明寄信人，但还没有告诉同行的人。\n\n## 当前动机\n\n保护同行者，同时调查旧港失踪的账本。\n\n> 等天亮了，再说给你听。\n\n- 知道：账本曾被调包\n- 未知：谁在暗中传递消息';
  const node=await call('graph.create',{novelId,type:'character_card',name:'林舟',summary:'旧港来信的收件人',content:original,position:{x:60,y:60}});
  const update=async(value)=>{const current=await call('graph.get',{novelId,nodeId:node.id});return call('graph.update',{novelId,nodeId:node.id,expectedRevision:current.revision,...value});};
  await update({content:'第二版：她开始调查来信。',reason:'明确调查动机'});
  await call('graph.layout',{novelId,positions:[{nodeId:node.id,expectedRevision:2,position:{x:60,y:80}}]});
  const group=await call('graph.group.create',{novelId,name:'旧港调查组'});
  await call('graph.move',{novelId,groupId:group.id,members:[{id:node.id,expectedRevision:3}]});
  await update({content:latest,reason:'正文推进后更新知情范围'});
  await update({summary:'知道了真相，却选择暂时保密',reason:'补充当前人物摘要'});
  const other=[];
  for(const [name,type,position] of [['同行者','character_card',{x:500,y:80}],['旧港','world_entry',{x:60,y:410}],['失踪账本','world_entry',{x:500,y:410}],['码头守卫','character_card',{x:940,y:240}]])other.push(await call('graph.create',{novelId,name,type,summary:'调查目标、行动与人物关系',content:'用于验证关系画布的完整设定。',position}));
  for(const [from,to,name] of [[node.id,other[0].id,'同行'],[node.id,other[1].id,'长居于'],[node.id,other[2].id,'调查'],[other[0].id,other[2].id,'曾经保管'],[other[3].id,other[1].id,'驻守']])await call('edge.create',{novelId,from,to,name});
  const planning=await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'node.create',ref:'a',value:{title:'来信打破平静',position:{x:20,y:60}}},{op:'node.create',ref:'b',value:{title:'前往旧港调查',position:{x:500,y:60}}},{op:'edge.create',value:{from:'a',to:'b'}}]});
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1400,height:950},reducedMotion:'reduce'});
  const errors=[],historyReads=[],latePaints=[];let pollAction=null,pollStarted=false,failRevision=null,delayRevision=null;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/dispatch',async route=>{
    const {action,args={}}=route.request().postDataJSON();
    if(action===pollAction){pollStarted=true;await new Promise(r=>setTimeout(r,600));}
    if(action==='graph.history'){
      historyReads.push(args);
      if(args.includeContent&&args.revision===failRevision){failRevision=null;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'模拟单版读取失败'})});return;}
      if(args.includeContent&&args.revision===delayRevision)await new Promise(r=>setTimeout(r,650));
    }
    await route.continue();
  });
  await page.goto(url);
  for(const [kind,action,id] of [['规划','planning.list',planning.mapping.a],['设定','graph.list',node.id]]){
    await page.getByRole('button',{name:kind,exact:true}).click();await showOrganization(page);
    const entry=page.locator(`.directory-entry[data-entry-id="${id}"] button`);await expect(entry).toBeEnabled();const originalEntry=await entry.elementHandle();
    await page.evaluate(()=>{
      window.pollDisabled=[];window.watchedEntry=document.querySelector('.directory-entry button');
      window.entryWatch=new MutationObserver(records=>{for(const r of records)if(r.target.matches?.('.directory-entry button')&&r.attributeName==='disabled')window.pollDisabled.push(r.target.disabled);});
      window.entryWatch.observe(document.querySelector('.workspace-sidebar'),{subtree:true,attributes:true,attributeFilter:['disabled']});
    });
    const view=await page.locator('.planning-canvas').evaluate(el=>getComputedStyle(el).transform);
    pollStarted=false;pollAction=action;await expect.poll(()=>pollStarted,{timeout:7000}).toBe(true);
    await expect(entry).toBeEnabled();expect(await entry.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
    await expect(page.locator('.planning-canvas')).toHaveCSS('transform',view);
    await entry.click();await expect(page.locator('.workspace-detail')).toHaveCount(0);
    await entry.dblclick();await expect(page.locator('.workspace-detail')).toBeVisible();
    pollAction=null;
    await page.waitForTimeout(700);expect(await entry.evaluate((el,original)=>el===original,originalEntry)).toBe(true);
    expect(await page.evaluate(()=>window.pollDisabled)).toEqual([]);await page.evaluate(()=>window.entryWatch.disconnect());
    if(kind==='规划')await page.getByRole('button',{name:'‹ 返回规划',exact:true}).click();
  }
  // One comparison view requests summaries and only the explicitly selected body.
  expect(historyReads).toHaveLength(0);await page.getByRole('button',{name:'改动对比',exact:true}).click();
  const compare=page.getByRole('region',{name:'卡片改动对比',exact:true}),select=compare.getByRole('combobox',{name:'对照卡片版本',exact:true});
  await expect(select.locator('option:not([disabled])')).toHaveCount(4);
  expect(await select.locator('option:not([disabled])').evaluateAll(items=>items.map(el=>Number(el.value)))).toEqual([6,5,2,1]);
  expect(historyReads[0].includeContent).toBeUndefined();
  await expect(compare.locator('[data-field="content"]')).toContainText('选择与代价');
  failRevision=2;await select.selectOption('2');const failure=compare.getByRole('alert').filter({hasText:'模拟单版读取失败'});await expect(failure).toBeVisible();
  await failure.getByRole('button',{name:'重试',exact:true}).click();await expect(compare.locator('[data-field="content"]')).toContainText('第二版：她开始调查来信。');
  await select.selectOption('1');await expect(compare.locator('[data-field="content"]')).toContainText('最初的约定');
  // A late response must never appear under another selected revision.
  delayRevision=2;await select.selectOption('2');await expect.poll(()=>historyReads.filter(a=>a.includeContent&&a.revision===2).length).toBe(3);
  await select.selectOption('5');await expect(compare.locator('[data-field="content"]')).toContainText('选择与代价');
  await page.evaluate(()=>{window.wrongHistory=[];window.historyWatch=new MutationObserver(()=>{const root=document.querySelector('.card-comparison'),panel=root?.querySelector('[data-field="content"]');if(root?.querySelector('select')?.value==='5'&&panel?.textContent.includes('第二版：'))window.wrongHistory.push(panel.textContent);});window.historyWatch.observe(document.querySelector('.card-comparison'),{childList:true,subtree:true,characterData:true});});
  await page.waitForTimeout(750);latePaints.push(...await page.evaluate(()=>window.wrongHistory));expect(latePaints).toEqual([]);delayRevision=null;
  for(const width of [320,420,600,1400]){
    await page.setViewportSize({width,height:950});await expect(compare).toBeVisible();
    expect(await page.locator('.detail-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({path:join(shots,`history-${width}.png`)});
  }
  await page.evaluate(()=>document.documentElement.style.cssText='--dsw-alias-bg-base:#181a20;--dsw-alias-label-primary:#e9edf5;--dsw-alias-label-secondary:#99a0ad;--dsw-alias-border-l1:#353a46;--dsw-alias-state-business-primary:#6c8aff;');await page.screenshot({path:join(shots,'history-dark.png')});await page.evaluate(()=>document.documentElement.removeAttribute('style'));
  // A concurrent edit after confirmation opened must never be overwritten.
  await select.selectOption('1');await expect(compare.locator('[data-field="content"]')).toContainText('最初的约定');await compare.getByRole('button',{name:'恢复此版',exact:true}).click();
  const confirmation=page.getByRole('dialog').filter({hasText:'恢复设定到 v1'});await expect(confirmation).toBeVisible();await update({content:'并发的新版本，不应被覆盖。'});await confirmation.getByRole('button',{name:'确定',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'版本已变化'})).toBeVisible();expect((await call('graph.get',{novelId,nodeId:node.id})).content).toBe('并发的新版本，不应被覆盖。');
  await page.getByRole('button',{name:'刷新当前页面',exact:true}).click();await expect(compare.locator('.card-comparison-current')).toContainText('v7');
  await compare.getByRole('button',{name:'恢复此版',exact:true}).click();await confirmation.getByRole('button',{name:'确定',exact:true}).click();await expect(compare).toHaveCount(0);await expect(page.locator('.document-body')).toContainText('最初的约定');
  expect((await call('graph.get',{novelId,nodeId:node.id})).revision).toBe(8);expect((await call('graph.history',{novelId,nodeId:node.id})).length).toBe(8);
  await page.getByRole('button',{name:'编辑',exact:true}).click();await page.getByRole('textbox',{name:'全文',exact:true}).fill('尚未保存的本地设定。');await page.getByRole('button',{name:'改动对比',exact:true}).click();await select.selectOption('2');await expect(compare.getByRole('button',{name:'保存草稿后恢复',exact:true})).toBeEnabled();
  await compare.getByRole('button',{name:'返回内容',exact:true}).click();await expect(page.getByRole('textbox',{name:'全文',exact:true})).toHaveValue('尚未保存的本地设定。');await page.getByRole('button',{name:'保存设定',exact:true}).click();
  await expect(page.getByRole('button',{name:'编辑',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'‹ 返回设定',exact:true}).click();await expect(page.locator('.relation-canvas')).toBeVisible();await page.getByRole('button',{name:'适应视图',exact:true}).click();
  // Drawn route endpoints and interactive four-sided ports are the same world points.
  const edges=await call('edge.list',{novelId});const endpointErrors=await page.locator('.relation-canvas').evaluate((canvas,edges)=>{
    const errors=[];for(const e of edges){const path=canvas.querySelector(`[data-edge-id="${e.id}"]`).parentElement.querySelector('.graph-line'),matrix=path.getScreenCTM();for(const [id,length] of [[e.from,0],[e.to,path.getTotalLength()]]){const p=path.getPointAtLength(length),screen=new DOMPoint(p.x,p.y).matrixTransform(matrix),ports=[...canvas.querySelectorAll(`.planning-card[data-node-id="${id}"] .graph-port`)];const closest=Math.min(...ports.map(port=>{const r=port.getBoundingClientRect();return Math.hypot(screen.x-r.x-r.width/2,screen.y-r.y-r.height/2);}));if(closest>.65)errors.push({id,closest});}}return errors;
  },edges);expect(endpointErrors).toEqual([]);
  await page.screenshot({path:join(shots,'relations-wide.png')});
  await page.getByRole('button',{name:'导出图片',exact:true}).click();const exporter=page.getByRole('dialog',{name:'导出画布图片',exact:true});await exporter.getByLabel('图片格式',{exact:true}).selectOption('svg');const downloaded=page.waitForEvent('download');await exporter.getByRole('button',{name:'保存图片',exact:true}).click();const svg=await readFile(await (await downloaded).path(),'utf8');
  for(const path of await page.locator('.relation-canvas .graph-line').evaluateAll(paths=>paths.map(p=>p.getAttribute('d'))))expect(svg).toContain(`d="${path}"`);
  expect(historyReads.filter(a=>a.includeContent).every(a=>Number.isSafeInteger(a.revision)&&a.revision>0)).toBe(true);expect(errors).toEqual([]);
  await writeFile(join(shots,'report.json'),JSON.stringify({ok:true,checks:['no polling disable/fade; clicking during refresh','all semantic versions; organization events excluded from comparison','single-revision reads + read failure retry','two-version comparison; stale response isolation','restore CAS + retained history + unsaved draft protection','responsive/dark card comparison','four-sided ports align with routed endpoints','SVG export shares relation routing'],historyBodyRevisions:historyReads.filter(a=>a.includeContent).map(a=>a.revision)},null,2));console.log('History, silent polling and relation routing regression passed.');
}catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}finally{await browser?.close();host.kill();}
