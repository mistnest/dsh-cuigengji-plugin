// Real production settings/canvases; all story data lives in a disposable preview.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {selectSettingsCategory} from './helpers/navigation.mjs';
import {clickWire} from './helpers/graph.mjs';
const root=resolve(import.meta.dirname,'..'),output=join(root,'test-results/link-style');
await mkdir(output,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;const checks=[];
try{
  const {url}=await new Promise((resolve,reject)=>{let log='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',chunk=>errors+=chunk);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',chunk=>{log+=chunk;const line=log.split('\n').find(row=>row.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const value=await response.json();if(!response.ok)throw Error(value.error);return value;};
  const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,...args});
  const specs=[['s','发现密信',0,210],['a','追查寄信人',400,0],['b','保护证人',400,420],['end','码头会合',800,210]],edges=[['s','a'],['s','b'],['a','end'],['b','end']];
  await run('planning.apply',{requestId:crypto.randomUUID(),operations:[...specs.map(([ref,title,x,y])=>({op:'node.create',ref,value:{title,summary:'一条线索与不同选择',position:{x,y}}})),...edges.map(([from,to])=>({op:'edge.create',value:{from,to}}))]});
  const settingIds={};for(const [ref,name,x,y] of specs)settingIds[ref]=(await run('graph.create',{name,type:'character_card',summary:'设定资源',position:{x,y}})).id;
  for(const [from,to] of edges)await run('edge.create',{from:settingIds[from],to:settingIds[to],name:'同行'});
  const before={plan:await run('planning.list'),settings:await run('graph.list')};
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1400,height:980},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const button=name=>page.getByRole('button',{name,exact:true});
  const setStyle=async(name)=>{await button('设置').click();await selectSettingsCategory(page,'编辑与外观');const dialog=page.getByRole('dialog',{name:'设置',exact:true});await dialog.getByRole('radio',{name,exact:true}).click();await expect(dialog.getByRole('radio',{name,exact:true})).toBeChecked();await dialog.getByRole('button',{name:'关闭设置',exact:true}).click();};
  const paths=()=>page.locator('.graph-line').evaluateAll(rows=>rows.map(row=>row.getAttribute('d')).sort());
  const checkExport=async()=>{
    const live=await paths();await button('导出图片').click();const dialog=page.getByRole('dialog',{name:'导出画布图片',exact:true});
    await expect.poll(()=>dialog.getByAltText('画布图片预览').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
    const exported=await dialog.getByAltText('画布图片预览').evaluate(image=>{const svg=decodeURIComponent(image.src.split(',').slice(1).join(',')),doc=new DOMParser().parseFromString(svg,'image/svg+xml');return [...doc.querySelectorAll('g[stroke-width="1.6"]>path')].map(path=>path.getAttribute('d')).sort();});
    expect(exported).toEqual(live);await dialog.getByRole('button',{name:'关闭导出画布图片',exact:true}).click();
  };
  await page.goto(url);await button('规划').click();await expect(page.locator('.graph-line')).toHaveCount(4);
  await expect(page.locator('.graph-junction')).toHaveCount(2);
  for(const name of ['经典曲线','整理连线']){
    await setStyle(name);await expect.poll(async()=>(await paths()).every(path=>path.includes(' C'))).toBe(name==='经典曲线');
    await expect(page.locator('.graph-junction')).toHaveCount(name==='经典曲线'?0:2);
    await button('适应视图').click();await checkExport();await page.screenshot({path:join(output,`planning-${name}.png`)});
    await button('设定').click();await expect(page.locator('.graph-line')).toHaveCount(4);expect((await paths()).every(path=>path.includes(' C'))).toBe(name==='经典曲线');await checkExport();
    await clickWire(page,page.locator('.edge-hit').first());await expect(page.locator('.edge-selected')).toHaveCount(1);await page.locator('.planning-canvas-scroll').press('Escape');
    await button('规划').click();
  }
  checks.push('both live canvases and SVG/PNG previews share style; organized hubs and individual edge selection work');
  await setStyle('经典曲线');await page.reload();await expect(page.locator('.graph-line')).toHaveCount(4);expect((await paths()).every(path=>path.includes(' C'))).toBe(true);
  expect(await run('planning.list')).toEqual(before.plan);expect(await run('graph.list')).toEqual(before.settings);
  checks.push('preference survives reload; switching styles does not write relationships, card coordinates or revisions');
  await button('设置').click();const dialog=page.getByRole('dialog',{name:'设置',exact:true});await dialog.getByRole('textbox',{name:'搜索设置'}).fill('曲线');await expect(dialog.getByRole('radio',{name:'经典曲线',exact:true})).toBeChecked();
  await page.setViewportSize({width:390,height:850});await page.screenshot({path:join(output,'settings-390.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await dialog.getByRole('button',{name:'重置画布连线样式',exact:true}).click();await expect(dialog.getByRole('radio',{name:'整理连线',exact:true})).toBeChecked();
  checks.push('setting is searchable, has previews and reset, and fits a narrow panel');
  expect(errors).toEqual([]);await writeFile(join(output,'report.json'),JSON.stringify({ok:true,checks},null,2));console.log(JSON.stringify({ok:true,checks}));
}catch(error){if(page)await page.screenshot({path:join(output,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();}
