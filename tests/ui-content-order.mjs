// Real UI + disposable persistence. No desktop profile or model requests.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization,moveBatch} from './helpers/navigation.mjs';
import {directorySnapshot} from '../src/domain/directory/order.ts';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results/content-order');
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;const requests=[],checks=[];
try{
  const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',part=>errors+=part);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',part=>{output+=part;const line=output.split('\n').find(row=>row.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})}),result=await response.json();if(!response.ok)throw Error(result.error);return result;};
  const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,...args});
  const tx=await run('planning.apply',{requestId:crypto.randomUUID(),operations:[
    {op:'group.create',ref:'group',value:{name:'剧情'}},{op:'group.create',ref:'other',value:{name:'后续剧情'}},
    ...['起因','调查','汇合','尾声'].map((title,index)=>({op:'node.create',ref:`n${index}`,value:{title,content:`规划原文${index}`,groupId:'group',...(index===3?{position:{x:1200,y:450}}:{})}})),
    {op:'node.create',ref:'loose',value:{title:'未归类灵感',content:'保留灵感原文'}},
    {op:'edge.create',value:{from:'n0',to:'n3'}},
  ]});
  const ids=[0,1,2,3].map(index=>tx.mapping[`n${index}`]);
  const memoryGroup=await run('graph.group.create',{name:'故事设定'}),memoryOther=await run('graph.group.create',{name:'备选设定'}),memory={};
  for(const [type,names] of [['character_card',['主角','同伴','对手']],['world_entry',['都城','宗门','秘境']]]){
    memory[type]=[];
    for(const [index,name] of names.entries())memory[type].push((await run('graph.create',{type,name,summary:`${name}摘要`,content:`${name}完整原文`,groupId:memoryGroup.id,...(index===2?{position:{x:1400,y:type==='character_card'?100:600}}:{})})).id);
  }
  const looseCharacter=await run('graph.create',{type:'character_card',name:'待整理人物',content:'待整理人物完整原文'});
  await run('edge.create',{from:memory.character_card[0],to:memory.world_entry[0],name:'居住地',content:'关系原文'});
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',async response=>{if(response.url().endsWith('/dispatch')){const request=response.request().postDataJSON();if(request.action?.endsWith('.directory.move'))requests.push({request,result:await response.json().catch(()=>null)});}});
  let fault=null;
  await page.route('**/dispatch',async route=>{
    const data=route.request().postDataJSON();
    if(!data.action.endsWith('.directory.move')||!fault){await route.continue();return;}
    const current=fault;fault=null;
    if(current.kind==='conflict'){await current.mutate();await route.continue();}
    else if(current.kind==='lost'){const response=await route.fetch();expect(response.ok()).toBe(true);await route.fulfill({status:502,json:{error:'模拟：已保存但响应丢失'}});}
    else await route.fulfill({status:503,json:{error:'模拟：本次未提交'}});
  });
  const button=name=>page.getByRole('button',{name,exact:true}),row=id=>page.locator(`.directory-entry[data-entry-id="${id}"]`);
  const folder=(id,within=page)=>within.locator(`.tree-folder[data-tree-id="${id}"]`);
  const folderMenu=(id,within=page)=>folder(id,within).locator(':scope>.tree-folder-row .menu-panel');
  const dragTo=async(from,target,fraction=.2)=>{await row(from).scrollIntoViewIfNeeded();await target.scrollIntoViewIfNeeded();const a=await row(from).locator('.directory-grip').boundingBox(),b=await target.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+Math.min(35,b.width/2),b.y+b.height*fraction,{steps:16});await page.mouse.up();};
  const dragBefore=(from,to)=>dragTo(from,row(to));
  const domOrder=ids=>page.locator('.directory-entry').evaluateAll((rows,ids)=>rows.map(row=>row.dataset.entryId).filter(id=>ids.includes(id)),ids);
  const coordinates=()=>page.locator('.planning-card').evaluateAll(cards=>Object.fromEntries(cards.map(card=>[card.dataset.nodeId,{x:card.style.left,y:card.style.top}])));
  const planningOrder=async()=>((await run('planning.list',{pageId:null})).items.map(n=>n.id)).filter(id=>ids.includes(id));
  const sorted=async(ids,expected)=>{await expect.poll(()=>domOrder(ids)).toEqual(expected);await expect(page.locator('.content-tree')).toHaveAttribute('aria-busy','false');};
  const noOrderError=()=>expect(page.locator('.directory-reorder-error')).toHaveCount(0);
  await page.goto(url);await button('规划').click();await showOrganization(page);
  await sorted(ids,ids);await expect(page.locator('.planning-card')).toHaveCount(5);
  const legacyPositions=await coordinates(),planningBefore=(await run('novel.export')).novel.planning;
  await dragBefore(ids[2],ids[0]);await sorted(ids,[ids[2],ids[0],ids[1],ids[3]]);
  await dragBefore(ids[1],ids[2]);await sorted(ids,[ids[1],ids[2],ids[0],ids[3]]);
  await dragBefore(ids[3],ids[1]);await sorted(ids,[ids[3],ids[1],ids[2],ids[0]]);
  await expect.poll(coordinates).toEqual(legacyPositions);expect((await run('novel.export')).novel.planning).toEqual(planningBefore);
  await page.reload();await showOrganization(page);await sorted(ids,[ids[3],ids[1],ids[2],ids[0]]);await expect.poll(coordinates).toEqual(legacyPositions);
  checks.push('legacy planning positions stay fixed through repeated sorting and reload');
  // Arrangement creates a local, complete board snapshot. Sorting must supersede it.
  await button('自动排布').click();await expect(button('自动排布')).toBeEnabled();
  const arrangedPositions=await coordinates(),arranged=(await run('novel.export')).novel.planning;
  expect(arrangedPositions).not.toEqual(legacyPositions);
  await dragBefore(ids[0],ids[3]);await sorted(ids,[ids[0],ids[3],ids[1],ids[2]]);
  await dragBefore(ids[2],ids[0]);await sorted(ids,[ids[2],ids[0],ids[3],ids[1]]);
  await dragBefore(ids[1],ids[2]);await sorted(ids,[ids[1],ids[2],ids[0],ids[3]]);
  await expect.poll(coordinates).toEqual(arrangedPositions);expect((await run('novel.export')).novel.planning).toEqual(arranged);await noOrderError();
  checks.push('sorting supersedes local written snapshot without moving cards or touching prose, revisions or links');
  // A genuine concurrent directory change is refreshed without replaying the stale write.
  fault={kind:'conflict',mutate:async()=>{const list=await run('planning.list',{pageId:null}),groups=await run('planning.groups');await run('planning.directory.move',{pageId:null,nodeId:ids[3],groupId:tx.mapping.group,beforeId:ids[1],expectedDirectory:directorySnapshot(list.items,groups),requestId:crypto.randomUUID()});}};
  await dragBefore(ids[0],ids[1]);await sorted(ids,[ids[3],ids[1],ids[2],ids[0]]);
  await expect(page.locator('.directory-reorder-error')).toHaveText('目录有新变化，已自动刷新，请重新拖动。');
  expect(await planningOrder()).toEqual([ids[3],ids[1],ids[2],ids[0]]);
  await dragBefore(ids[0],ids[3]);await sorted(ids,[ids[0],ids[3],ids[1],ids[2]]);await noOrderError();
  checks.push('real conflict refreshes latest order, preserves concurrent change and permits next drag');
  const requestCount=requests.length;fault={kind:'lost'};
  await dragBefore(ids[2],ids[0]);await sorted(ids,[ids[2],ids[0],ids[3],ids[1]]);await noOrderError();
  expect(requests.length-requestCount).toBe(1);expect(await planningOrder()).toEqual([ids[2],ids[0],ids[3],ids[1]]);
  fault={kind:'failed'};await dragBefore(ids[1],ids[2]);await sorted(ids,[ids[2],ids[0],ids[3],ids[1]]);
  await expect(page.locator('.directory-reorder-error')).toHaveText('顺序未能保存，目录已刷新，请重试。');
  await dragBefore(ids[1],ids[2]);await sorted(ids,[ids[1],ids[2],ids[0],ids[3]]);await noOrderError();
  checks.push('lost receipt is confirmed by readback without duplicate write; rejected write rolls back and can retry');
  // Moving between folders changes classification only; layout remains explicit.
  await dragTo(ids[3],folder(tx.mapping.other).locator(':scope>.tree-folder-row .tree-folder-name'),.5);
  await expect.poll(async()=>(await run('planning.get',{nodeId:ids[3]})).node.groupId).toBe(tx.mapping.other);
  await expect.poll(coordinates).toEqual(arrangedPositions);
  // Root entries live beside folders; the compact header creates a real root folder.
  await expect(page.locator('.tree-folder[data-tree-id="__ungrouped"],.tree-new-group,.content-tree-toolbar')).toHaveCount(0);
  await expect(page.locator(`[aria-label="规划文件夹"]>.directory-entries>.directory-branch>[data-entry-id="${tx.mapping.loose}"]`)).toBeVisible();
  await button('新建文件夹').click();
  const prompt=page.getByRole('dialog',{name:'新建文件夹名称',exact:true});await prompt.getByRole('textbox').fill('灵感收纳');await prompt.locator('button[type=submit]').click();
  let created;await expect.poll(async()=>{created=(await run('planning.groups')).find(g=>g.name==='灵感收纳');return created?.parentId??(created?'root':null);}).toBe('root');
  await expect(page.locator('.planning-card')).toHaveCount(5);await button('多选').click();await row(tx.mapping.loose).getByRole('checkbox').check();
  const batch=page.getByRole('region',{name:'批量管理'}).or(page.locator('.batch-manager'));
  await expect(batch.getByRole('status')).toHaveText('已选 1 项');
  await moveBatch(page,`group:${created.id}`);
  await expect.poll(async()=>(await run('planning.get',{nodeId:tx.mapping.loose})).node.groupId).toBe(created.id);
  await button('完成').click();await expect.poll(coordinates).toEqual(arrangedPositions);
  const dragToRoot=async(id,within)=>{await row(id).scrollIntoViewIfNeeded();const box=await row(id).locator('.directory-grip').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+16,box.y+box.height/2,{steps:4});const target=within.locator(':scope>.tree-root-drop');await expect(target).toBeVisible();const end=await target.boundingBox();await page.mouse.move(end.x+end.width/2,end.y+end.height/2,{steps:12});await page.mouse.up();};
  await dragToRoot(ids[3],page.getByLabel('规划文件夹',{exact:true}));await expect.poll(async()=>(await run('planning.get',{nodeId:ids[3]})).node.groupId??null).toBe(null);await expect.poll(coordinates).toEqual(arrangedPositions);
  checks.push('root entries need no virtual folder; compact header creates folders, batch move and dragging back to root preserve positions');
  await page.screenshot({path:join(shots,'planning-order.png')});
  await button('设定').click();await showOrganization(page);await expect(page.locator('.planning-card')).toHaveCount(7);
  const memoryPositions=await coordinates(),memoryBefore=(await run('novel.export')).novel;
  for(const type of ['character_card','world_entry']){
    const entries=memory[type];await sorted(entries,entries);
    await dragBefore(entries[2],entries[0]);await sorted(entries,[entries[2],entries[0],entries[1]]);
    await dragBefore(entries[1],entries[2]);await sorted(entries,[entries[1],entries[2],entries[0]]);
    await dragBefore(entries[0],entries[1]);await sorted(entries,entries);
  }
  await expect.poll(coordinates).toEqual(memoryPositions);
  const memoryAfter=(await run('novel.export')).novel;expect(memoryAfter.nodes).toEqual(memoryBefore.nodes);expect(memoryAfter.edges).toEqual(memoryBefore.edges);
  // Entry types share one directory; reordering never converts a character to a world entry.
  const mixedBefore=(await run('novel.export')).novel.nodes;await dragBefore(memory.character_card[0],memory.world_entry[0]);
  await expect(page.locator('.directory-order-status')).toHaveCount(0);await expect.poll(async()=>{const nodes=await run('graph.list');return nodes.findIndex(n=>n.id===memory.character_card[0])+1===nodes.findIndex(n=>n.id===memory.world_entry[0]);}).toBe(true);
  expect((await run('novel.export')).novel.nodes).toEqual(mixedBefore);
  await dragTo(memory.character_card[2],folder(memoryOther.id).locator(':scope>.tree-folder-row .tree-folder-name'),.5);
  await expect.poll(async()=>(await run('graph.get',{nodeId:memory.character_card[2]})).groupId).toBe(memoryOther.id);await expect.poll(coordinates).toEqual(memoryPositions);
  await page.reload();await showOrganization(page);await expect.poll(coordinates).toEqual(memoryPositions);
  await dragToRoot(memory.character_card[2],page.getByLabel('设定文件夹',{exact:true}));await expect.poll(async()=>(await run('graph.get',{nodeId:memory.character_card[2]})).groupId??null).toBe(null);await expect.poll(coordinates).toEqual(memoryPositions);
  await button('多选').click();await row(looseCharacter.id).getByRole('checkbox').check();await expect(page.locator('.batch-toolbar [role=status]')).toHaveText('已选 1 项');await button('完成').click();
  checks.push('repeated character/world sorting, cross-group movement and reload preserve positions, types, content, history and relations');
  checks.push('mixed-type entries share root and folders; sorting and grouping preserve each entry type and prose');
  await noOrderError();await page.screenshot({path:join(shots,'memory-order.png')});
  expect(errors).toEqual([]);await writeFile(join(shots,'report.json'),JSON.stringify({ok:true,checks,requests},null,2));
  console.log('Content directory ordering passed.');
}catch(error){await writeFile(join(shots,'requests.json'),JSON.stringify(requests,null,2));if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();}
