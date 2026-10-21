import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {clickWire} from './helpers/graph.mjs';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','readable-canvas');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try{
 const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(new Error('Preview timeout '+errors)),20000);preview.stderr.on('data',v=>errors+=v);preview.once('exit',code=>reject(new Error('Preview exited '+code+errors)));preview.stdout.on('data',v=>{output+=v;const line=output.split('\n').find(s=>s.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
 const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})}),value=await r.json();if(!r.ok)throw new Error(value.error);return value;};
 const novelId=(await call('novel.list'))[0].id;
 const tx=await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[
  {op:'group.create',ref:'folder',value:{name:'主角行动'}},
  ...[['a','主角潜入'],['b','触发警报'],['c','守方设伏'],['d','封锁出口'],['e','第三方断电'],['f','黑暗中争夺账本'],['g','代价与余波']].map(([ref,title])=>({op:'node.create',ref,value:{title,summary:'讨论各方目标、行动与后果。',content:`${title}的完整讨论正文。`,...(['a','b'].includes(ref)?{groupId:'folder'}:{})}})),
  ...[['a','b'],['c','d'],['a','f'],['b','f'],['d','f'],['e','f'],['f','g']].map(([from,to])=>({op:'edge.create',value:{from,to}})),
 ]});
 await call('planning.layout',{novelId,expectedSequence:tx.sequence,requestId:crypto.randomUUID()});
 const settings=[];for(const name of ['陆沉','同行者','码头守卫','旧港','无关的远方'])settings.push(await call('graph.create',{novelId,type:name==='旧港'?'world_entry':'character_card',name,summary:'人物或地点的摘要。',content:'完整设定，视图操作不能改动。'}));
 for(const [a,b,name] of [[0,1,'同行'],[0,2,'试探'],[2,3,'驻守'],[1,3,'前往']])await call('edge.create',{novelId,from:settings[a].id,to:settings[b].id,name});
 await call('graph.arrange',{novelId,requestId:crypto.randomUUID(),members:settings.map(n=>({id:n.id,expectedRevision:1}))});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});page=await browser.newPage({viewport:{width:1450,height:940},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.getByRole('button',{name:'规划',exact:true}).click();
 const canvas=page.locator('.planning-canvas-scroll'),card=name=>page.locator('.planning-card').filter({has:page.getByRole('button',{name,exact:true})}),button=name=>page.getByRole('button',{name,exact:true});
 const read=async()=>({board:await call('planning.list',{novelId}),decorations:(await call('planning.decorations',{novelId})).items,groups:await call('planning.groups',{novelId})});
 const position=id=>call('planning.get',{novelId,nodeId:id}).then(r=>r.node.position);
 const idle=async()=>{await expect(page.getByText('正在保存…',{exact:true})).toHaveCount(0);await expect(button('自动排布')).toBeEnabled();};
 await expect(page.locator('.planning-card')).toHaveCount(7);await button('适应视图').click();
 const before=await read();await button('收纳文件夹 主角行动').click();await expect(page.locator('.canvas-folder-folded')).toBeVisible();await expect(page.locator('.planning-card')).toHaveCount(5);await expect(page.locator('.edge-hit')).toHaveCount(5);
 expect(await read()).toEqual(before);
 await page.screenshot({path:join(shots,'planning-folded.png')});
 await page.reload();await button('规划').click();await expect(page.locator('.canvas-folder-folded')).toBeVisible();await button('展开文件夹 主角行动').click();await expect(page.locator('.planning-card')).toHaveCount(7);expect(await read()).toEqual(before);
 // Moving a collapsed folder translates its hidden members once, including after a reload.
 await button('收纳文件夹 主角行动').click();await button('适应视图').click();
 const folded=page.locator('.canvas-folder-folded'),box=await folded.boundingBox(),matrix=await page.locator('.planning-canvas').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).a),aBefore=await position(tx.mapping.a),bBefore=await position(tx.mapping.b);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+48*matrix,box.y+box.height/2+32*matrix,{steps:6});await page.mouse.up();await idle();
 await expect.poll(async()=>Math.round((await position(tx.mapping.a)).x-aBefore.x)).toBe(48);expect(Math.round((await position(tx.mapping.b)).y-bBefore.y)).toBe(32);
 await button('展开文件夹 主角行动').click();await expect(page.locator('.planning-card')).toHaveCount(7);await button('撤销布局').click();await idle();expect(await position(tx.mapping.a)).toEqual(aBefore);expect(await position(tx.mapping.b)).toEqual(bBefore);
 // Focus is a view, moving the focus to a direct neighbor does not rewrite the graph.
 const fullView=await page.locator('.planning-canvas').evaluate(el=>getComputedStyle(el).transform);
 await card('黑暗中争夺账本').locator('p').click();await button('只看相关').click();await expect(page.locator('.planning-card')).toHaveCount(6);
 await card('封锁出口').locator('p').click();await expect(page.locator('.planning-card')).toHaveCount(3);await button('返回全图').click();await expect(page.locator('.planning-card')).toHaveCount(7);await expect.poll(()=>page.locator('.planning-canvas').evaluate(el=>getComputedStyle(el).transform)).toBe(fullView);
 // Rearrangement is saved atomically, keeps enclosing folders, and is undoable.
 const preLayout=await read();await button('自动排布').click();await idle();await expect.poll(async()=>(await read()).board.sequence).toBeGreaterThan(preLayout.board.sequence);
 await button('撤销布局').click();await idle();const restored=await read();expect(restored.board.items.map(n=>[n.id,n.position])).toEqual(preLayout.board.items.map(n=>[n.id,n.position]));expect(restored.decorations).toEqual(preLayout.decorations);expect(restored.groups.map(g=>[g.id,g.parentId,g.pageId])).toEqual(preLayout.groups.map(g=>[g.id,g.parentId,g.pageId]));
 await page.screenshot({path:join(shots,'planning-wide.png')});
 // A wire can be selected/cancelled with real pointer hit testing.
 await clickWire(page,page.locator('.edge-hit').first());await expect(page.locator('.edge-selected')).toHaveCount(1);await canvas.press('Escape');await expect(page.locator('.edge-selected')).toHaveCount(0);
 // Deleting one folded aggregate removes its exact underlying links, never its members.
 const preDisconnect=await read();await button('收纳文件夹 主角行动').click();await button('适应视图').click();
 await clickWire(page,page.getByRole('button',{name:'连线：主角行动 → 黑暗中争夺账本（2 条）',exact:true}));await canvas.press('Delete');await idle();
 const disconnected=await read();expect(disconnected.board.items).toEqual(preDisconnect.board.items);expect(disconnected.board.edges.length).toBe(preDisconnect.board.edges.length-2);expect(disconnected.board.edges.some(e=>[tx.mapping.a,tx.mapping.b].includes(e.from)&&e.to===tx.mapping.f)).toBe(false);await page.mouse.move(4,4);await expect(page.locator('.edge-selected,.edge-muted')).toHaveCount(0);
 await button('展开文件夹 主角行动').click();await expect(page.locator('.planning-card')).toHaveCount(7);
 await button('设定').click();await button('适应视图').click();await expect(page.locator('.planning-card')).toHaveCount(5);const settingBefore=await call('graph.list',{novelId});
 await card('陆沉').locator('p').click();await button('只看相关').click();await expect(page.locator('.planning-card')).toHaveCount(3);await card('码头守卫').locator('p').click();await expect(page.locator('.planning-card')).toHaveCount(3);
 await button('返回全图').click();await expect(page.locator('.planning-card')).toHaveCount(5);expect(await call('graph.list',{novelId})).toEqual(settingBefore);
 await page.screenshot({path:join(shots,'settings-wide.png')});
 for(const width of [420,320]){await page.setViewportSize({width,height:850});await button('适应视图').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(await canvas.evaluate(el=>el.scrollLeft)).toBe(0);await page.screenshot({path:join(shots,`settings-${width}.png`)});}
 await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>document.documentElement.style.cssText='--dsw-alias-bg-base:#181c25;--dsw-alias-label-primary:#e8ecf6;--dsw-alias-label-secondary:#99a3b5;--dsw-alias-border-l1:#353d4c;--dsw-alias-state-business-primary:#82a4ff;');await page.screenshot({path:join(shots,'settings-dark.png')});
 expect(errors).toEqual([]);console.log(JSON.stringify({ok:true,checks:['fold/reload/expand preserve source','collapsed drag moves members','undo restores positions and folder membership','focus, pivot and camera restoration','real pointer wire hit testing','disconnect exact folded links','setting focus','320/420px and dark screenshots','no browser errors']}));
}catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();preview.kill();}
