// Author workflows against the production UI and disposable persistence only.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization,selectPlanningPage} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'),out=join(root,'test-results','directory-review');
await mkdir(out,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
const checks=[],errors=[],requests=[];
let browser,page;
try{
  const {url}=await new Promise((resolve,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);
    host.stderr.on('data',part=>errors+=part);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});
    host.stdout.on('data',part=>{output+=part;const line=output.split('\n').find(row=>row.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{
    const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});
    const result=await response.json();if(!response.ok)throw Error(result.error);return result;
  };
  const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,...args});
  const tx=await run('planning.apply',{requestId:crypto.randomUUID(),operations:[
    {op:'group.create',ref:'root',value:{name:'开篇整理'}},
    {op:'group.create',ref:'family',value:{name:'萧家',parentId:'root'}},
    {op:'group.create',ref:'hall',value:{name:'议事厅',parentId:'family'}},
    {op:'group.create',ref:'other',value:{name:'远行'}},
    {op:'node.create',ref:'stage',value:{title:'退婚风波',groupId:'hall',position:{x:60,y:60}}},
    {op:'node.create',ref:'conflict',value:{title:'双方争执',groupId:'hall',parentId:'stage',position:{x:120,y:140}}},
    {op:'node.create',ref:'evidence',value:{title:'出示凭据',summary:'交出婚书原件',content:'原始的详细情节',groupId:'hall',parentId:'conflict',position:{x:160,y:220}}},
    {op:'node.create',ref:'exit',value:{title:'离场',groupId:'hall',parentId:'stage',position:{x:640,y:220}}},
    {op:'node.create',ref:'journey',value:{title:'远行启程',groupId:'other',position:{x:1000,y:220}}},
    {op:'node.create',ref:'loose',value:{title:'准备行李',position:{x:1000,y:500}}},
    {op:'edge.create',value:{from:'evidence',to:'exit'}},
    {op:'decoration.create',value:{kind:'note',title:'婚书批注',content:'仅在画布上的想法',position:{x:1000,y:760},width:220,height:130}},
  ]});
  const ids=tx.mapping;
  const independent=await run('planning.page.create',{name:'另一张沙盘',requestId:crypto.randomUUID()});
  await run('planning.apply',{requestId:crypto.randomUUID(),operations:[{op:'node.create',value:{title:'独立沙盘事件',pageId:independent.id}}]});
  const mg=await run('graph.group.create',{name:'萧家资料'}),mc=await run('graph.group.create',{name:'年轻一辈',parentId:mg.id}),ml=await run('graph.group.create',{name:'人物关系',parentId:mc.id});
  const character=await run('graph.create',{type:'character_card',name:'萧炎',summary:'随身携带婚书原件',content:'人物全文',groupId:ml.id,position:{x:120,y:120}});
  const world=await run('graph.create',{type:'world_entry',name:'议事厅',content:'厅堂全文',groupId:mg.id,position:{x:600,y:120}});

  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().endsWith('/dispatch'))requests.push(request.postDataJSON());});
  const button=name=>page.getByRole('button',{name,exact:true});
  const entry=id=>page.locator(`.directory-entry[data-entry-id="${id}"]`);
  const row=id=>page.locator(`.tree-folder[data-tree-id="${id}"]>.tree-folder-row`);
  const expandFolder=async id=>{const arrow=row(id).locator('.tree-chevron');if(await arrow.getAttribute('aria-expanded')==='false')await arrow.click();};
  const stageArrow=id=>entry(id).locator('.tree-chevron');
  const expandStage=async id=>{if(await stageArrow(id).getAttribute('aria-expanded')==='false')await stageArrow(id).click();};
  const canvasSnapshot=()=>page.locator('.planning-canvas').evaluate(element=>({camera:element.getAttribute('style'),cards:[...element.querySelectorAll('.planning-card,.canvas-folder,.planning-decoration')].map(card=>({id:card.dataset.nodeId||card.dataset.folderId||card.dataset.decorationId,style:card.getAttribute('style')})),edges:[...element.querySelectorAll('.edge-hit')].map(edge=>edge.getAttribute('d'))}));
  const clear=()=>button('清除目录搜索').click();

  await page.goto(url);await button('规划').click();await showOrganization(page);
  await expect(row(ids.family)).toBeVisible();await expect(row(ids.hall)).toHaveCount(0);
  await expandFolder(ids.family);await expect(row(ids.hall)).toBeVisible();await expect(entry(ids.stage)).toHaveCount(0);
  await expandFolder(ids.hall);await expect(stageArrow(ids.stage)).toHaveAttribute('aria-expanded','false');await expect(entry(ids.conflict)).toHaveCount(0);
  await expandStage(ids.stage);await expect(entry(ids.conflict)).toBeVisible();await expect(entry(ids.evidence)).toHaveCount(0);
  await expandStage(ids.conflict);await expect(entry(ids.evidence)).toBeVisible();
  await stageArrow(ids.stage).click();
  checks.push('folders and stages open one level at a time; canvas folds remain independent');

  const beforeSearch=await canvasSnapshot(),beforeData=(await run('novel.export')).novel.planning,requestStart=requests.length;
  const search=page.getByRole('textbox',{name:'搜索规划',exact:true});
  await search.fill('婚书原件');
  await expect(entry(ids.evidence)).toBeVisible();await expect(entry(ids.exit)).toHaveCount(0);await expect(entry(ids.loose)).toHaveCount(0);
  await expect(entry(ids.evidence).locator('xpath=ancestor::*[contains(@class,"directory-branch")]')).toHaveCount(3);
  await expect(row(ids.root)).toBeVisible();await expect(row(ids.family)).toBeVisible();await expect(row(ids.hall)).toBeVisible();
  await page.screenshot({path:join(out,'planning-search.png')});
  await stageArrow(ids.conflict).click();await expect(entry(ids.evidence)).toHaveCount(0);
  await stageArrow(ids.stage).click();await stageArrow(ids.stage).click();
  await expect(stageArrow(ids.conflict)).toHaveAttribute('aria-expanded','false');
  await button('折叠全部目录').click();await expect(row(ids.family)).toHaveCount(0);
  await clear();await expect(row(ids.hall)).toBeVisible();await expect(stageArrow(ids.stage)).toHaveAttribute('aria-expanded','false');
  await expandStage(ids.stage);await expect(stageArrow(ids.conflict)).toHaveAttribute('aria-expanded','true');await expect(entry(ids.evidence)).toBeVisible();
  checks.push('summary search preserves all ancestors, supports temporary folds, and restores pre-search expansion even after collapsing all');

  await search.fill('萧家');await expect(row(ids.family)).toBeVisible();await expect(row(ids.hall)).toHaveCount(0);await expect(entry(ids.stage)).toHaveCount(0);
  await search.fill('婚书批注');await expect(page.getByLabel('规划内容目录')).toContainText('没有匹配项');await expect(page.locator('.workspace-sidebar')).not.toContainText('批注搜索结果');
  await clear();await expect.poll(canvasSnapshot).toEqual(beforeSearch);
  expect((await run('novel.export')).novel.planning).toEqual(beforeData);
  expect(requests.slice(requestStart).filter(request=>/\.apply$|\.move$|\.update$|\.create$|\.delete$|\.layout$/.test(request.action))).toEqual([]);
  checks.push('folder searches keep the original path; notes stay on canvas; filtering makes no data, camera, coordinate or link changes');

  await entry(ids.evidence).getByRole('button',{name:'选中 出示凭据',exact:true}).click();
  await expect(page.locator('.planning-detail')).toHaveCount(0);await expect(page.locator('.canvas-selection-tools')).toHaveCount(0);await expect(button('只看相关')).toHaveCount(0);
  const selectedView=await canvasSnapshot();
  await entry(ids.evidence).getByRole('button',{name:'选中 出示凭据',exact:true}).dblclick();
  await expect(page.locator('.planning-detail')).toContainText('原始的详细情节');await expect(page.locator('.organized-workspace')).toHaveAttribute('data-detail','side');
  await expect(page.locator('.workspace-sidebar')).toBeHidden();await expect(page.locator('.workspace-detail-size')).toHaveCount(0);
  await button('编辑规划').click();await page.getByRole('textbox',{name:'正文',exact:true}).fill('保留的编辑草稿');
  await button('‹ 返回规划').click();await expect(page.locator('.planning-detail')).toHaveCount(0);
  await expect(page.locator('.planning-overview')).not.toContainText('已返回画布');await expect.poll(canvasSnapshot).toEqual(selectedView);
  await entry(ids.evidence).getByRole('button',{name:'选中 出示凭据',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox',{name:'正文',exact:true})).toHaveValue('保留的编辑草稿');
  await button('保存规划').click();await expect(page.locator('.planning-detail')).toContainText('保留的编辑草稿');await button('‹ 返回规划').click();
  checks.push('single click stays on canvas; double click and Enter reuse the main area; draft and viewport survive return without extra notices');

  await button('多选').click();
  const batch=page.getByRole('region',{name:'批量管理',exact:true});
  await expect(page.locator('.workspace-tools .batch-toolbar')).toBeVisible();await expect(page.locator('.planning-overview .batch-toolbar,.batch-manager')).toHaveCount(0);
  await entry(ids.exit).getByRole('checkbox').check();await entry(ids.loose).getByRole('checkbox').check();
  await page.screenshot({path:join(out,'planning-batch.png')});
  await search.fill('婚书原件');await expect(batch).toContainText('已选 2');
  await batch.getByRole('checkbox',{name:'全选当前列表',exact:true}).check();await expect(batch).toContainText('已选 3');
  await batch.getByRole('checkbox',{name:'全选当前列表',exact:true}).uncheck();await expect(batch).toContainText('已选 2');await clear();
  await page.getByLabel('收纳选中条目',{exact:true}).click();await batch.getByRole('button',{name:'新建文件夹收纳',exact:true}).click();
  const prompt=page.getByRole('dialog',{name:'文件夹名称',exact:true});await prompt.getByRole('textbox').fill('待打磨情节');await prompt.locator('button[type=submit]').click();
  let collected;await expect.poll(async()=>{collected=(await run('planning.groups')).find(group=>group.name==='待打磨情节');return Boolean(collected);}).toBe(true);
  for(const id of [ids.exit,ids.loose])await expect.poll(async()=>(await run('planning.get',{nodeId:id})).node.groupId).toBe(collected.id);
  expect((await run('planning.get',{nodeId:ids.loose})).node.position).toEqual({x:1000,y:500});await batch.getByRole('button',{name:'完成',exact:true}).click();
  checks.push('top toolbar supports filtered selection without losing hidden selections and collects cards without moving coordinates');

  await selectPlanningPage(page,independent.id);await expect(page.getByLabel('规划内容目录')).toContainText('独立沙盘事件');await expect(entry(ids.stage)).toHaveCount(0);await selectPlanningPage(page,'');
  await expect(entry(ids.stage)).toBeVisible();await page.screenshot({path:join(out,'planning-light.png')});
  checks.push('directory scope follows the active planning canvas');

  await button('设定').click();await showOrganization(page);await expect(row(mc.id)).toBeVisible();await expect(row(ml.id)).toHaveCount(0);
  const memorySearch=page.getByRole('textbox',{name:'搜索设定',exact:true}),memoryBefore=await canvasSnapshot();
  await memorySearch.fill('婚书原件');await expect(entry(character.id)).toBeVisible();await expect(row(mg.id)).toBeVisible();await expect(row(mc.id)).toBeVisible();await expect(row(ml.id)).toBeVisible();await expect(entry(world.id)).toHaveCount(0);
  await row(mc.id).locator('.tree-chevron').click();await expect(entry(character.id)).toHaveCount(0);await clear();
  await expect(row(mc.id).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');await expect.poll(canvasSnapshot).toEqual(memoryBefore);
  await expandFolder(mc.id);await expandFolder(ml.id);await entry(character.id).getByRole('button',{name:'选中 萧炎',exact:true}).click();
  await expect(page.locator('.memory-detail')).toHaveCount(0);await expect(page.locator('.canvas-selection-tools')).toHaveCount(0);
  await entry(character.id).getByRole('button',{name:'选中 萧炎',exact:true}).dblclick();await expect(page.locator('.memory-detail')).toContainText('人物全文');await expect(page.locator('.organized-workspace')).toHaveAttribute('data-detail','side');await button('‹ 返回设定').click();
  await row(mc.id).getByRole('button',{name:'年轻一辈',exact:true}).click();await expect(page.locator('.workspace-heading')).toContainText('年轻一辈');await expect(page.locator('.planning-card')).toHaveCount(1);
  checks.push('settings use the same search and detail behavior; folder navigation still scopes the resource canvas');
  await page.screenshot({path:join(out,'settings-light.png')});

  await page.setViewportSize({width:520,height:780});await showOrganization(page);await expect(page.locator('.workspace-sidebar')).toBeVisible();
  await entry(character.id).getByRole('button',{name:'选中 萧炎',exact:true}).dblclick();await expect(page.locator('.memory-detail')).toBeVisible();await expect(page.locator('.workspace-sidebar')).toBeHidden();await button('‹ 返回设定').click();await showOrganization(page);
  await memorySearch.fill('婚书原件');await expect(entry(character.id)).toBeVisible();await clear();
  await page.screenshot({path:join(out,'settings-narrow.png')});
  await page.emulateMedia({colorScheme:'dark'});
  await page.evaluate(()=>document.documentElement.style.cssText='--dsw-alias-bg-base:#181c25;--dsw-alias-label-primary:#e8ecf6;--dsw-alias-label-secondary:#99a3b5;--dsw-alias-border-l1:#353d4c;--dsw-alias-state-business-primary:#82a4ff;');
  await memorySearch.fill('婚书原件');await expect(entry(character.id)).toBeVisible();
  await page.screenshot({path:join(out,'settings-narrow-dark.png')});
  await page.setViewportSize({width:1440,height:960});await button('规划').click();await showOrganization(page);
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('婚书原件');await expect(entry(ids.evidence)).toBeVisible();await page.screenshot({path:join(out,'planning-dark.png')});
  expect(errors).toEqual([]);checks.push('narrow layout and host dark colors support search and full detail without a permanent third column; no browser errors');
  await writeFile(join(out,'report.json'),JSON.stringify({ok:true,checks,requests},null,2));
  console.log(`Directory review passed: ${checks.length} author workflows.`);
}catch(error){
  if(page)await page.screenshot({path:join(out,'failure.png')}).catch(()=>{});
  await writeFile(join(out,'failure.json'),JSON.stringify({checks,errors,requests},null,2));throw error;
}finally{await browser?.close();host.kill();}
