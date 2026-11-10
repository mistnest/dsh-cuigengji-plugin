// Exercise the shipped planning/settings canvases with isolated synthetic data.
// Wheel replay covers trackpad event signatures, not physical macOS hardware.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {selectSettingsCategory} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','canvas-input');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try{
  const {url}=await new Promise((resolve,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(new Error('Preview timeout: '+errors)),20000);
    preview.stderr.on('data',v=>errors+=v);
    preview.once('exit',code=>{clearTimeout(timer);reject(new Error('Preview exited '+code+': '+errors));});
    preview.stdout.on('data',v=>{output+=v;const line=output.split('\n').find(v=>v.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{
    const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});
    const result=await response.json();if(!response.ok)throw new Error(result.error);return result;
  };
  const novelId=(await call('novel.list'))[0].id;
  for(const [i,title] of ['收到来信','前往旧城'].entries()){
    const position={x:80+i*360,y:100+i*120};
    await call('graph.create',{novelId,name:title,type:'world_entry',summary:'合成的触摸板验收资料',content:'保持不变的设定正文',position});
    await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'node.create',value:{title,summary:'合成的触摸板验收情节',content:'保持不变的情节正文',position}}]});
  }
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1.25,reducedMotion:'reduce'});
  const errors=[],writes=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('request',r=>{if(r.url().endsWith('/dispatch')&&r.method()==='POST'){const d=r.postDataJSON();if(['planning.apply','graph.layout','graph.update'].includes(d.action))writes.push(d);}});
  // Existing preferences retain default wheel zoom and unrelated choices.
  await page.addInitScript(()=>{if(!localStorage.getItem('cuigengji:workbench:preferences:v1'))localStorage.setItem('cuigengji:workbench:preferences:v1',JSON.stringify({fontSize:22,canvasLinkStyle:'classic'}));});
  await page.goto(url);
  const canvas=page.locator('.planning-canvas-scroll');
  const camera=()=>page.locator('.planning-canvas').evaluate(el=>{const m=new DOMMatrixReadOnly(getComputedStyle(el).transform);return{x:m.e,y:m.f,zoom:m.a};});
  const near=(a,b)=>expect(Math.abs(a-b)).toBeLessThan(.02);
  const unchanged=async(before)=>{const after=await camera();near(after.x,before.x);near(after.y,before.y);near(after.zoom,before.zoom);};
  const reset=async()=>{await page.getByRole('button',{name:'适应视图',exact:true}).click();await page.getByRole('button',{name:'恢复百分之百缩放',exact:true}).click();await expect.poll(async()=>(await camera()).zoom).toBe(1);};
  const emit=event=>canvas.evaluate((el,data)=>{
    const r=el.getBoundingClientRect();const e=new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:r.left+r.width*.7,clientY:r.top+r.height*.55,...data});
    el.dispatchEvent(e);return{prevented:e.defaultPrevented,anchor:{x:r.width*.7,y:r.height*.55}};
  },event);
  const mode=async(value,expected)=>{
    await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'编辑与外观');
    const settings=page.getByRole('dialog',{name:'设置',exact:true});
    await expect(settings.getByLabel('默认正文字号',{exact:true})).toHaveValue('22');
    if(expected)await expect(settings.getByLabel('画布滚动操作',{exact:true})).toHaveValue(expected);
    await settings.getByLabel('画布滚动操作',{exact:true}).selectOption(value);
    await settings.getByRole('button',{name:'关闭设置',exact:true}).click();
  };
  for(const kind of ['规划','设定']){
    await page.getByRole('button',{name:kind,exact:true}).click();await expect(page.locator('.planning-card')).toHaveCount(2);await reset();
    const cameraKey=`cuigengji:camera:production-preview:${novelId}:${kind==='规划'?'planning:main':'settings:folder:root'}`;
    const read=()=>call(kind==='规划'?'planning.list':'graph.list',{novelId});
    const originals=await read();
    let before=await camera();
    await emit({deltaY:120});await expect.poll(async()=>(await camera()).zoom).toBeLessThan(before.zoom);
    await mode('pan','zoom');await reset();before=await camera();const box=await canvas.boundingBox();
    await canvas.evaluate(el=>el.addEventListener('wheel',e=>window.lastNativeWheel={x:e.deltaX,y:e.deltaY,mode:e.deltaMode},{once:true}));
    await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55);await page.mouse.wheel(38,64);
    await expect.poll(async()=>(await camera()).y).toBeLessThan(before.y);
    const delivered=await page.evaluate(()=>window.lastNativeWheel);expect(delivered.x).toBeGreaterThan(0);expect(delivered.y).toBeGreaterThan(0);
    let after=await camera();near(after.x,before.x-delivered.x);near(after.y,before.y-delivered.y);near(after.zoom,before.zoom);
    before=after;await emit({deltaX:27});after=await camera();near(after.x,before.x-27);near(after.y,before.y);
    before=after;await emit({deltaY:2,deltaMode:1});after=await camera();near(after.y,before.y-32);near(after.zoom,1);
    before=after;await emit({deltaY:1,deltaMode:2});after=await camera();near(after.y,before.y-box.height);near(after.zoom,1);
    before=after;await emit({deltaY:24,shiftKey:true});after=await camera();near(after.x,before.x-24);near(after.y,before.y);
    await reset();
    for(const modifier of ['ctrlKey','metaKey']){
      before=await camera();const {prevented,anchor}=await emit({deltaY:-3,[modifier]:true});expect(prevented).toBe(true);
      await expect.poll(async()=>(await camera()).zoom).toBeGreaterThan(before.zoom);after=await camera();
      near((anchor.x-before.x)/before.zoom,(anchor.x-after.x)/after.zoom);near((anchor.y-before.y)/before.zoom,(anchor.y-after.y)/after.zoom);
      await emit({deltaY:3,[modifier]:true});await expect.poll(async()=>(await camera()).zoom).toBeCloseTo(before.zoom,5);
    }
    const viewportBefore=await page.evaluate(()=>({scale:visualViewport.scale,width:innerWidth}));
    await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55);
    await page.keyboard.down('Control');await page.mouse.wheel(0,-2);await page.keyboard.up('Control');
    await expect.poll(async()=>(await camera()).zoom).toBeGreaterThan(1);
    expect(await page.evaluate(()=>({scale:visualViewport.scale,width:innerWidth}))).toEqual(viewportBefore);
    await reset();before=await camera();
    await page.evaluate(()=>{window.cameraWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('cuigengji:camera:'))window.cameraWrites++;return original.call(this,key,value);};window.restoreCameraSpy=()=>Storage.prototype.setItem=original;});
    await canvas.evaluate(el=>{const r=el.getBoundingClientRect();for(let i=0;i<160;i++)el.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX:.125,deltaY:.25,clientX:r.left+r.width*.7,clientY:r.top+r.height*.55}));});
    after=await camera();near(after.x,before.x-20);near(after.y,before.y-40);near(after.zoom,before.zoom);
    await expect.poll(()=>page.evaluate(()=>window.cameraWrites)).toBe(1);await page.evaluate(()=>window.restoreCameraSpy());
    expect(await read()).toEqual(originals);expect(writes).toHaveLength(0);
    // Momentum must not alter world coordinates during a card drag.
    await reset();const card=page.locator('.planning-card').first(),r=await card.boundingBox();
    await page.mouse.move(r.x+50,r.y+85);await page.mouse.down();before=await camera();await emit({deltaX:25,deltaY:35});await unchanged(before);await page.keyboard.press('Escape');await page.mouse.up();
    // Controls provide a gesture-independent route and keep wheel away from buttons.
    before=await camera();await page.getByRole('button',{name:'放大画布',exact:true}).click();await expect.poll(async()=>(await camera()).zoom).toBeGreaterThan(before.zoom);
    await page.getByRole('button',{name:'缩小画布',exact:true}).click();await expect.poll(async()=>(await camera()).zoom).toBeCloseTo(before.zoom,5);
    before=await camera();await page.getByRole('button',{name:'放大画布',exact:true}).dispatchEvent('wheel',{deltaY:120,cancelable:true});await unchanged(before);
    await mode('zoom');await reset();before=await camera();await emit({deltaY:120});await expect.poll(async()=>(await camera()).zoom).toBeLessThan(before.zoom);
    await emit({deltaY:-2,ctrlKey:true});await expect.poll(async()=>(await camera()).zoom).toBeGreaterThan(.84);
    const savedZoom=await camera();
    await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{}').zoom,cameraKey)).toBeCloseTo(savedZoom.zoom,5);
    await page.reload();await expect(canvas).toBeVisible();await unchanged(savedZoom);
    await mode('pan','zoom');await reset();
    await page.screenshot({path:join(shots,kind==='规划'?'planning.png':'memory.png')});
    const saved=await camera();await page.reload();await expect(canvas).toBeVisible();await unchanged(saved);
    before=await camera();await emit({deltaY:24});after=await camera();near(after.y,before.y-24);near(after.zoom,before.zoom);
    await mode('zoom','pan');await reset();
  }
  // Notes retain scrolling and never leak momentum into canvas movement at an edge.
  await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'decoration.create',value:{kind:'note',title:'滚动便签',content:'便签内容\n'.repeat(70),position:{x:80,y:400},width:280,height:160}}]});
  await page.getByRole('button',{name:'规划',exact:true}).click();const note=page.locator('.planning-decoration').filter({hasText:'滚动便签'}).locator('.decoration-content');
  await expect(note).toBeVisible();await page.getByRole('button',{name:'适应视图',exact:true}).click();
  let before=await camera(),n=await note.boundingBox();await page.mouse.move(n.x+n.width/2,n.y+n.height/2);await page.mouse.wheel(0,180);
  await expect.poll(()=>note.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await unchanged(before);
  await note.evaluate(el=>el.scrollTop=el.scrollHeight);await page.mouse.wheel(0,180);await unchanged(before);
  await page.setViewportSize({width:420,height:800});
  await expect(page.locator('.organized-workspace')).toHaveAttribute('data-narrow','true');
  const controls=page.locator('.graph-view-controls'),help=page.locator('.graph-help>summary');
  await expect(help).toBeVisible();
  const checkControls=()=>expect.poll(async()=>{
    const controlsBox=await controls.boundingBox(),helpBox=await help.boundingBox();
    return helpBox.x+helpBox.width-controlsBox.x;
  }).toBeLessThanOrEqual(0);
  await checkControls();await page.screenshot({path:join(shots,'narrow.png')});
  await page.setViewportSize({width:320,height:800});await checkControls();
  await expect(page.getByRole('button',{name:'放大画布',exact:true})).toBeInViewport();
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,checks:['existing preferences keep default mouse wheel zoom in planning and setting','optional touchpad mode: diagonal/horizontal/fractional pan','line/page wheel units and Shift pan','pinch and Ctrl/Command zoom around pointer','native Ctrl+wheel without page zoom','high-frequency input retains all deltas with one delayed preference write','navigation never modifies novel data','wheel during card drag is ignored','zoom controls and both scroll preferences','zoom/pan preference and camera survive reload','notes scroll without moving the canvas','125% scale and narrow controls'],screenshots:shots}));
}catch(error){if(page){await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});console.error(await page.evaluate(()=>({preferences:localStorage.getItem('cuigengji:workbench:preferences:v1'),wheel:window.lastNativeWheel,help:document.querySelector('.graph-help')?.textContent})).catch(()=>({})));}throw error;}
finally{await browser?.close();preview.kill();}
