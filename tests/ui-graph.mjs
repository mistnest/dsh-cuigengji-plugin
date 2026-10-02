// Direct manipulation against the shipped components and an isolated real Store.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','graph');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try {
  const {url}=await new Promise((resolve,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(new Error('Preview timeout: '+errors)),20000);
    preview.stderr.on('data',v=>errors+=v);
    preview.once('exit',code=>{clearTimeout(timer);reject(new Error('Preview exited '+code+': '+errors));});
    preview.stdout.on('data',v=>{output+=v;const line=output.split('\n').find(v=>v.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;};
  const novelId=(await call('novel.list'))[0].id;
  const group=await call('graph.group.create',{novelId,name:'雨城'});
  const names=['雨夜来客','城南书铺','一封旧信'],memory=[];
  const positions=[{x:60,y:80},{x:500,y:80},{x:940,y:350}];
  for(let i=0;i<3;i++)memory.push(await call('graph.create',{novelId,name:names[i],type:i?'world_entry':'character_card',summary:'追寻雨夜来信中的线索',content:'不可被拖拽修改的全文',groupId:group.id,position:positions[i]}));
  await call('planning.apply',{novelId,requestId:crypto.randomUUID(),reason:'图交互验收',operations:names.map((title,i)=>({op:'node.create',value:{title,summary:'追寻雨夜来信中的线索',content:'不可被拖拽修改的正文',position:positions[i]}}))});
  const plans=(await call('planning.list',{novelId})).items;
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  page=await browser.newPage({viewport:{width:1400,height:1000},reducedMotion:'reduce'});
  const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().endsWith('/dispatch')&&r.method()==='POST'){const data=r.postDataJSON();if(['graph.update','edge.create','edge.delete','planning.apply'].includes(data.action))writes.push(data);}});
  await page.goto(url);
  const port=(name,side)=>page.getByRole('button',{name:`${name}：${side==='out'?'输出':'输入'}连接点`,exact:true});
  const card=name=>page.locator('.planning-card').filter({has:page.getByRole('button',{name,exact:true})});
  const center=async locator=>{const b=await locator.boundingBox();if(!b)throw new Error('No geometry');return{x:b.x+b.width/2,y:b.y+b.height/2};};
  const drag=async(locator,dx,dy,end=true)=>{const p=await center(locator);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy,{steps:8});if(end)await page.mouse.up();};
  const connect=async(from,to)=>{const a=await center(port(from,'out')),b=await center(port(to,'in'));await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move((a.x+b.x)/2,(a.y+b.y)/2,{steps:5});await expect(page.locator('.graph-preview')).toHaveCount(1);await page.mouse.move(b.x,b.y,{steps:5});await expect(port(to,'in')).toHaveClass(/port-target/);await page.mouse.up();};
  const waitIdle=async()=>{await expect(page.getByText('正在保存…',{exact:true})).toHaveCount(0);await expect(port(names[0],'out')).toBeEnabled();};
  for(const kind of ['规划','设定']){
    const planning=kind==='规划',items=planning?plans:memory;
    const read=async name=>{const item=items.find(n=>(n.title||n.name)===name);const r=await call(planning?'planning.get':'graph.get',{novelId,nodeId:item.id});return planning?r.node:r;};
    const edges=()=>call(planning?'planning.list':'edge.list',{novelId}).then(r=>planning?r.edges:r);
    await page.getByRole('button',{name:kind,exact:true}).click();
    await page.getByRole('button',{name:planning?'流程图':'关系图',exact:true}).click();
    await expect(page.locator('.planning-card')).toHaveCount(3);
    // Unmodified wheel down zooms out; the existing view buttons remain usable.
    const wheelCanvas=page.locator('.planning-canvas-scroll'),wheelBox=await wheelCanvas.boundingBox();
    await page.mouse.move(wheelBox.x+wheelBox.width-40,wheelBox.y+wheelBox.height-50);
    await page.mouse.wheel(0,120);
    await expect(page.locator('.planning-canvas')).toHaveCSS('transform','matrix(0.9, 0, 0, 0.9, 0, 0)');
    await page.locator('.canvas-tools summary').filter({hasText:'视图'}).click();await page.getByRole('button',{name:'放大画布',exact:true}).click();await page.locator('.canvas-tools summary').filter({hasText:'视图'}).click();
    await expect(page.locator('.planning-canvas')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
    // A card's body and its title can both be dragged without opening a detail.
    const before=await read(names[0]);
    await drag(card(names[0]).locator('p'),90,60);
    await expect.poll(async()=>(await read(names[0])).position).toEqual({x:before.position.x+90,y:before.position.y+60});await waitIdle();
    await expect(page.locator('.detail-page')).toHaveCount(0);
    expect((await read(names[0])).content).toBe(before.content);
    await drag(card(names[0]).locator('.planning-title'),20,10);await waitIdle();
    await expect.poll(async()=>(await read(names[0])).position.x).toBe(before.position.x+110);
    // Escape and pointercancel restore an in-progress card without a revision.
    const saved=await read(names[0]);
    await drag(card(names[0]).locator('p'),50,20,false);await page.keyboard.press('Escape');await page.mouse.up();
    expect((await read(names[0])).revision).toBe(saved.revision);
    await expect(card(names[0])).toHaveCSS('left',saved.position.x+'px');
    await drag(card(names[0]).locator('p'),40,20,false);
    await card(names[0]).dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();
    expect((await read(names[0])).revision).toBe(saved.revision);
    // Release a wire on blank canvas, Escape, and same-node links all write nothing.
    const noWrites=writes.length;
    await drag(port(names[0],'out'),70,160);await expect(page.locator('.graph-preview')).toHaveCount(0);
    await drag(port(names[0],'out'),60,130,false);await page.keyboard.press('Escape');await page.mouse.up();
    await port(names[0],'out').click();await port(names[0],'in').click();
    expect(writes.length).toBe(noWrites);expect(await edges()).toHaveLength(0);
    await connect(names[0],names[1]);await expect(page.locator('.edge-hit')).toHaveCount(1);await waitIdle();
    await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.relation-label')).toHaveCount(0);
    // Duplicate and planning cycle targets do not highlight or write.
    await port(names[0],'out').click();await expect(port(names[1],'in')).not.toHaveClass(/port-valid/);await port(names[1],'in').click();
    expect(await edges()).toHaveLength(1);
    if(planning){await port(names[1],'out').click();await expect(port(names[0],'in')).not.toHaveClass(/port-valid/);await page.keyboard.press('Escape');}
    // Edges are keyboard selectable/deletable; cards stay intact.
    await page.locator('.edge-hit').focus();await page.keyboard.press('Enter');await page.keyboard.press('Delete');
    await expect(page.locator('.edge-hit')).toHaveCount(0);await expect(page.locator('.planning-card')).toHaveCount(3);await waitIdle();
    await port(names[1],'in').focus();await page.keyboard.press('Enter');await port(names[0],'out').focus();await page.keyboard.press('Enter');
    await expect(page.locator('.edge-hit')).toHaveCount(1);await waitIdle();
    // Non-100% zoom and an already-scrolled viewport use graph coordinates.
    await page.mouse.move(wheelBox.x+wheelBox.width-40,wheelBox.y+wheelBox.height-50);await page.mouse.wheel(0,-120);
    await expect(page.locator('.planning-canvas')).toHaveCSS('transform','matrix(1.1, 0, 0, 1.1, 0, 0)');
    await page.locator('.planning-canvas-scroll').evaluate(el=>el.scrollTo(80,40));
    const zoomed=await read(names[1]);await drag(card(names[1]).locator('p'),55,33);
    await expect.poll(async()=>Math.round((await read(names[1])).position.x)).toBe(zoomed.position.x+50);
    expect(Math.round((await read(names[1])).position.y)).toBe(zoomed.position.y+30);await waitIdle();
    // Click still opens detail; returning keeps layout, zoom, and viewport.
    await card(names[1]).locator('.planning-title').click();await expect(page.getByRole('heading',{name:names[1],exact:true})).toBeVisible();
    await page.getByRole('button',{name:`‹ 返回${kind}`,exact:true}).click();await expect(page.locator('.planning-canvas')).toHaveCSS('transform','matrix(1.1, 0, 0, 1.1, 0, 0)');
    // Inject a failed layout save: keep visual position, allow retry, never lose text.
    let reject=true;
    const intercept=async route=>{const data=route.request().postDataJSON();if(reject&&data.action===(planning?'planning.apply':'graph.update')){reject=false;await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'测试版本冲突，请重试布局'})});}else await route.continue();};
    await page.route('**/dispatch',intercept);
    const original=await read(names[0]);await drag(card(names[0]).locator('p'),44,22);
    await expect(page.locator('.graph-save-error')).toBeVisible();expect((await read(names[0])).revision).toBe(original.revision);
    await page.locator('.graph-save-error').getByRole('button',{name:'重试',exact:true}).click();
    await expect(page.locator('.graph-save-error')).toHaveCount(0);await waitIdle();
    await expect.poll(async()=>Math.round((await read(names[0])).position.x)).toBe(original.position.x+40);
    reject=true;const beforeDiscard=await read(names[0]);await drag(card(names[0]).locator('p'),44,22);
    await expect(page.locator('.graph-save-error')).toBeVisible();await page.getByRole('button',{name:'还原布局',exact:true}).click();
    await expect(card(names[0])).toHaveCSS('left',beforeDiscard.position.x+'px');expect((await read(names[0])).revision).toBe(beforeDiscard.revision);
    await page.unroute('**/dispatch',intercept);
    await page.getByRole('button',{name:'关闭提示',exact:true}).click();
    // An agent edits the card during a gesture: use the drag's original revision.
    const concurrent=await read(names[0]);await drag(card(names[0]).locator('p'),44,22,false);
    if(planning)await call('planning.apply',{novelId,requestId:crypto.randomUUID(),reason:'模拟协作',operations:[{op:'node.update',id:concurrent.id,expectedRevision:concurrent.revision,value:{summary:'Agent 刚刚修改的摘要'}}]});
    else await call('graph.update',{novelId,nodeId:concurrent.id,expectedRevision:concurrent.revision,summary:'Agent 刚刚修改的摘要'});
    await expect(card(names[0])).toContainText('Agent 刚刚修改的摘要',{timeout:10000});
    await page.mouse.up();await expect(page.locator('.graph-save-error')).toBeVisible();
    expect((await read(names[0])).position).toEqual(concurrent.position);
    await page.getByRole('button',{name:'重试',exact:true}).click();await waitIdle();
    expect((await read(names[0])).summary).toBe('Agent 刚刚修改的摘要');
    const persisted=await read(names[0]);await page.reload();await page.getByRole('button',{name:kind,exact:true}).click();await page.getByRole('button',{name:planning?'流程图':'关系图',exact:true}).click();
    await expect(card(names[0])).toHaveCSS('left',persisted.position.x+'px');
    await expect(card(names[0])).toHaveCSS('top',persisted.position.y+'px');
    // Background pan and edge-triggered auto-pan let a narrow panel reach offscreen nodes.
    await page.setViewportSize({width:900,height:850});
    const canvas=page.locator('.planning-canvas-scroll');await canvas.evaluate(el=>el.scrollTo(0,0));
    const cb=await canvas.boundingBox();
    await page.mouse.move(cb.x+650,cb.y+cb.height-90);await page.mouse.down();await page.mouse.move(cb.x+500,cb.y+cb.height-90,{steps:5});await page.mouse.up();
    expect(await canvas.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
    await canvas.evaluate(el=>el.scrollTo(0,0));
    const source=await center(port(names[1],'out'));await page.mouse.move(source.x,source.y);await page.mouse.down();await page.mouse.move(cb.x+cb.width-12,source.y,{steps:5});
    await expect.poll(()=>canvas.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
    await page.keyboard.press('Escape');await page.mouse.up();await expect(page.locator('.graph-preview')).toHaveCount(0);
    await page.setViewportSize({width:1400,height:1000});await canvas.evaluate(el=>el.scrollTo(0,0));
    if(!planning){
      await page.locator('.edge-hit').focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'编辑关系',exact:true}).click();
      await page.getByLabel('关系名称（可选）').fill('常去');await page.getByRole('dialog').getByLabel('说明',{exact:true}).fill('每天晚上在这里查阅旧书，追寻故乡旧友留下的线索，书页里或许藏着答案。');await page.getByRole('button',{name:'保存关系',exact:true}).click();
      await expect(page.locator('.relation-label')).toContainText('常去');
    }
    await page.screenshot({path:join(shots,planning?'planning-wide.png':'settings-wide.png')});
    await page.setViewportSize({width:420,height:850});await page.screenshot({path:join(shots,planning?'planning-narrow.png':'settings-narrow.png')});
    await page.evaluate(()=>{document.documentElement.style.cssText='--dsw-alias-bg-base:#20251f;--dsw-alias-label-primary:#e4e8de;--dsw-alias-label-secondary:#a8b0a0;--dsw-alias-border-l1:#404a3b;--dsw-alias-state-success-primary:#a4c195';});
    await page.screenshot({path:join(shots,planning?'planning-dark.png':'settings-dark.png')});
    await page.evaluate(()=>document.documentElement.removeAttribute('style'));await page.setViewportSize({width:1400,height:1000});
  }
  // A note with long text retains native scrolling instead of zooming the graph.
  await call('planning.apply',{novelId,requestId:crypto.randomUUID(),reason:'批注滚轮验收',operations:[{op:'decoration.create',value:{pageId:null,kind:'note',title:'可滚动批注',content:'长批注内容。\n'.repeat(60),position:{x:40,y:450},width:280,height:160,color:'sky',fontSize:18,fontFamily:'sans'}}]});
  await page.getByRole('button',{name:'规划',exact:true}).click();
  const note=page.locator('.planning-decoration').filter({hasText:'可滚动批注'}).locator('.decoration-content');
  await expect(note).toBeVisible();await note.scrollIntoViewIfNeeded();
  const transform=await page.locator('.planning-canvas').evaluate(el=>getComputedStyle(el).transform);
  const noteCenter=await center(note);await page.mouse.move(noteCenter.x,noteCenter.y);await page.mouse.wheel(0,180);
  await expect.poll(()=>note.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await expect(page.locator('.planning-canvas')).toHaveCSS('transform',transform);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,checks:['both graphs: card/title drag auto-save','Escape, blank drop, pointercancel','port preview and valid targets','duplicate and planning cycle rejection','reverse keyboard connect and edge deletion','zoomed/scrolled coordinates','background and edge auto-pan','detail and reload preserve layout','failed save retry/discard','concurrent agent edit conflicts safely','optional inline relationship labels','wide/narrow/dark screenshots'],writes:writes.length}));
}catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();preview.kill();}
