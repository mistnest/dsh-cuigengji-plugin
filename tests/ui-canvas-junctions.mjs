// Real canvas, pointer interactions and image export with disposable story data.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization} from './helpers/navigation.mjs';
import {clickWire} from './helpers/graph.mjs';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results/canvas-junctions');
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;const checks=[];
try{
  const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',chunk=>errors+=chunk);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(row=>row.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})}),value=await response.json();if(!response.ok)throw Error(value.error);return value;};
  const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,...args});
  const specs=[['source','发现密信',0,210],['a','追查寄信人',320,210],['b','先保护证人',320,500],['end','码头会合',640,210]];
  const links=[['source','a','next'],['source','b','alternative'],['a','end','next'],['b','end','next']];
  const tx=await run('planning.apply',{requestId:crypto.randomUUID(),operations:[
    ...specs.map(([ref,title,x,y])=>({op:'node.create',ref,value:{title,content:`${title}原文`,summary:'目标、选择与后续变化',position:{x,y}}})),
    ...links.map(([from,to,type])=>({op:'edge.create',value:{from,to,type}})),
    {op:'decoration.create',ref:'note',value:{kind:'note',title:'动机便签',content:'关键动机尚未确认',position:{x:1120,y:500},width:248,height:160}},
    {op:'decoration.create',ref:'frame',value:{kind:'frame',title:'待讨论区域',position:{x:1080,y:420},width:328,height:300,members:['note']}},
  ]});
  const settingIds={};for(const [ref,name,x,y] of specs)settingIds[ref]=(await run('graph.create',{type:ref==='source'?'character_card':'world_entry',name,content:`${name}设定原文`,position:{x,y}})).id;
  for(const [from,to] of links)await run('edge.create',{from:settingIds[from],to:settingIds[to],name:'线索关联'});
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const button=name=>page.getByRole('button',{name,exact:true}),hub=kind=>page.locator(`.graph-junction[data-junction-kind="${kind}"]`);
  const coordinateSnapshot=()=>page.locator('.planning-card').evaluateAll(cards=>Object.fromEntries(cards.map(card=>[card.dataset.nodeId,[card.style.left,card.style.top]])));
  await page.goto(url);await button('规划').click();await showOrganization(page);await expect(page.locator('.planning-card')).toHaveCount(4);
  await expect(hub('split')).toHaveCount(1);await expect(hub('merge')).toHaveCount(1);
  await expect(page.locator('.tree-folder[data-tree-id="annotations"]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'批注搜索结果',exact:true})).toHaveCount(0);
  const originalPositions=await coordinateSnapshot();
  await button('适应视图').click();await page.screenshot({path:join(shots,'planning-split-merge.png')});
  const hubBox=await hub('split').boundingBox();await page.mouse.move(hubBox.x+hubBox.width/2,hubBox.y+hubBox.height/2);await expect(page.locator('.edge-related')).toHaveCount(2);await page.mouse.move(5,5);
  checks.push('compact next/alternative branches share a visible split; incoming paths share a merge; hover highlights correct branches');
  // Notes stay on the canvas; searching is their lightweight locator, including folded notes.
  await page.locator(`[data-decoration-id="${tx.mapping.frame}"] header`).click({button:'right'});await page.getByRole('menuitem',{name:'转换为文件夹',exact:true}).click();const prompt=page.getByRole('dialog',{name:'文件夹名称',exact:true});await prompt.getByRole('textbox').fill('待讨论区域');await prompt.locator('button[type=submit]').click();await expect(prompt).toHaveCount(0);await expect(button('收纳文件夹 待讨论区域')).toBeEnabled();await button('收纳文件夹 待讨论区域').click();await expect(page.locator('.decoration-note')).toHaveCount(0);
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('关键动机');await expect(page.getByRole('heading',{name:'批注搜索结果',exact:true})).toBeVisible();
  const result=page.getByRole('button',{name:'选中 动机便签',exact:true});await result.click();await expect(page.locator('.decoration-note.selected')).toBeVisible();await expect(page.locator('.decoration-inline-editor')).toHaveCount(0);
  await result.dblclick();const editor=page.locator('.decoration-inline-editor');await expect(editor).toBeVisible();await editor.getByRole('textbox',{name:'批注内容',exact:true}).fill('关键动机尚未确认；需要与作者继续讨论。');await editor.getByRole('button',{name:'完成',exact:true}).click();await expect(editor).toHaveCount(0);
  await button('清除目录搜索').click();await expect(page.getByRole('heading',{name:'批注搜索结果',exact:true})).toHaveCount(0);await expect(page.locator('.decoration-note')).toHaveCount(1);
  await expect.poll(coordinateSnapshot).toEqual(originalPositions);await expect(hub('split')).toHaveCount(1);await expect(hub('merge')).toHaveCount(1);
  checks.push('no permanent annotations folder; search finds body text, unfolds and selects note, double click edits, clear restores ordinary directory');
  await button('取消画布选择').click();await button('适应视图').click();await button('导出图片').click();const exporter=page.getByRole('dialog',{name:'导出画布图片',exact:true});
  await expect.poll(()=>exporter.getByAltText('画布图片预览').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
  const image=await exporter.getByAltText('画布图片预览').evaluate(image=>{const svg=decodeURIComponent(image.src.split(',').slice(1).join(',')),doc=new DOMParser().parseFromString(svg,'image/svg+xml');return {hubs:doc.querySelectorAll('circle').length,paths:[...doc.querySelectorAll('g[stroke-width="1.6"]>path')].map(path=>path.getAttribute('d')).sort(),svg};});
  const paths=await page.locator('.graph-line').evaluateAll(paths=>paths.map(path=>path.getAttribute('d')).sort());expect(image.hubs).toBe(2);expect(image.paths).toEqual(paths);await writeFile(join(shots,'planning-export.svg'),image.svg);await exporter.getByRole('button',{name:'关闭导出画布图片',exact:true}).click();
  checks.push('image preview decodes and SVG uses identical split/merge paths and junctions');
  const beforeRemoval=await run('planning.list'),branch=beforeRemoval.edges.find(edge=>edge.from===tx.mapping.source&&edge.to===tx.mapping.b);
  await clickWire(page,page.locator(`.edge-hit[data-edge-id="${branch.id}"]`));await expect(page.locator('.edge-selected')).toHaveCount(1);await page.locator('.planning-canvas-scroll').press('Delete');
  await expect.poll(async()=>(await run('planning.list')).edges.length).toBe(3);await expect(hub('split')).toHaveCount(0);await expect(hub('merge')).toHaveCount(1);
  const afterRemoval=await run('planning.list');expect(afterRemoval.items).toEqual(beforeRemoval.items);expect(afterRemoval.edges.map(edge=>edge.id).sort()).toEqual(beforeRemoval.edges.filter(edge=>edge.id!==branch.id).map(edge=>edge.id).sort());
  await page.reload();await showOrganization(page);await expect(hub('merge')).toHaveCount(1);await expect(page.locator('.tree-folder[data-tree-id="annotations"]')).toHaveCount(0);
  checks.push('individual branch remains clickable/removable; other edges and cards are preserved after reload');
  await button('设定').click();await showOrganization(page);await expect(hub('split')).toHaveCount(1);await expect(hub('merge')).toHaveCount(1);
  const settingsBefore=await run('graph.list');await button('适应视图').click();await page.screenshot({path:join(shots,'settings-split-merge.png')});
  await clickWire(page,page.locator('.edge-hit').first());await expect(page.locator('.edge-selected')).toHaveCount(1);await page.locator('.planning-canvas-scroll').press('Escape');await expect(page.locator('.edge-selected')).toHaveCount(0);expect(await run('graph.list')).toEqual(settingsBefore);
  await page.setViewportSize({width:360,height:850});await button('适应视图').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:join(shots,'settings-360.png')});
  checks.push('character/world canvas shares the same hubs, supports pointer selection and keeps narrow layout within bounds');
  expect(errors).toEqual([]);await writeFile(join(shots,'report.json'),JSON.stringify({ok:true,checks},null,2));console.log(JSON.stringify({ok:true,checks}));
}catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();}
