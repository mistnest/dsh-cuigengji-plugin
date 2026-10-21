// Real production UI and persistence, with disposable synthetic work only.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization} from './helpers/navigation.mjs';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','nested-groups');
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try{
  const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',part=>errors+=part);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',part=>{output+=part;const line=output.split('\n').find(row=>row.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})}),result=await response.json();if(!response.ok)throw Error(result.error);return result;};
  const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,...args});
  const tx=await run('planning.apply',{requestId:crypto.randomUUID(),operations:[
    {op:'group.create',ref:'root',value:{name:'第一卷'}},{op:'group.create',ref:'child',value:{name:'皇城篇',parentId:'root'}},{op:'group.create',ref:'leaf',value:{name:'各方布局',parentId:'child'}},{op:'group.create',ref:'other',value:{name:'第二卷'}},
    {op:'node.create',ref:'a',value:{title:'卷目标',summary:'目标摘要',content:'完整目标正文',groupId:'root',position:{x:100,y:100}}},
    {op:'node.create',ref:'b',value:{title:'深层行动',summary:'行动摘要',content:'完整行动正文',groupId:'leaf',position:{x:100,y:100}}},
    {op:'node.create',ref:'fixed',value:{title:'另一卷事件',content:'保持原来的位置',groupId:'other',position:{x:1200,y:900}}},
    {op:'edge.create',value:{from:'a',to:'b'}},
  ]});
  const ids=tx.mapping;
  const mg=await run('graph.group.create',{name:'皇城设定'}),mc=await run('graph.group.create',{name:'势力',parentId:mg.id}),ml=await run('graph.group.create',{name:'守方',parentId:mc.id});
  const character=await run('graph.create',{type:'character_card',name:'守卫',summary:'人物摘要',content:'人物原文',groupId:ml.id,position:{x:100,y:100}});
  const otherCharacter=await run('graph.create',{type:'character_card',name:'城主',summary:'另一个人物摘要',content:'另一个人物原文',groupId:mg.id,position:{x:100,y:100}});
  const world=await run('graph.create',{type:'world_entry',name:'皇城',content:'世界原文',groupId:mg.id,position:{x:1200,y:900}});
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const button=name=>page.getByRole('button',{name,exact:true}),folder=(id,within=page)=>within.locator(`.tree-folder[data-tree-id="${id}"]`),row=(id,within=page)=>folder(id,within).locator(':scope>.tree-folder-row');
  const expand=async(id,within=page)=>{const arrow=row(id,within).locator('.tree-chevron');if(await arrow.getAttribute('aria-expanded')==='false')await arrow.click();};
  const drag=async(source,target)=>{await source.scrollIntoViewIfNeeded();await target.scrollIntoViewIfNeeded();const a=await source.boundingBox(),b=await target.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await page.mouse.up();};
  await page.goto(url);await button('规划').click();await showOrganization(page);
  await expect(row(ids.root).locator('small')).toHaveText('2');
  await expect(page.locator('.tree-folder[data-tree-id="__ungrouped"],.tree-new-group,.content-tree-toolbar')).toHaveCount(0);
  await row(ids.root).getByRole('button',{name:'第一卷',exact:true}).click();await expect(page.locator('.planning-card')).toHaveCount(3);await expect(row(ids.child)).toHaveCount(0);await row(ids.root).getByRole('button',{name:'第一卷',exact:true}).click();
  await expand(ids.child);await expand(ids.leaf);await expect(page.locator(`[data-entry-id="${ids.b}"]`)).toBeVisible();
  await row(ids.child).locator('.tree-chevron').click();await expect(page.locator(`[data-entry-id="${ids.b}"]`)).toHaveCount(0);await expect(page.locator('.planning-card')).toHaveCount(3);
  // Search temporarily reveals all ancestor folders, and restores normal folds.
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('深层行动');await expect(page.locator(`[data-entry-id="${ids.b}"]`)).toBeVisible();
  await button('清除目录搜索').click();await expect(page.locator(`[data-entry-id="${ids.b}"]`)).toHaveCount(0);await expand(ids.child);await expand(ids.leaf);
  // Collapse-all applies once: searching and reopening must not replay an old collapse command.
  await button('折叠全部目录').click();await expect(row(ids.root).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('深层行动');await expect(page.locator(`[data-entry-id="${ids.b}"]`)).toBeVisible();
  await button('清除目录搜索').click();await expect(row(ids.root).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  // Root creation stays visible without adding a synthetic page/type folder.
  await button('新建文件夹').click();let folderPrompt=page.getByRole('dialog',{name:'新建文件夹名称',exact:true});await folderPrompt.getByRole('textbox').fill('页内新文件夹');await folderPrompt.locator('button[type="submit"]').click();
  let pageFolder;await expect.poll(async()=>{pageFolder=(await run('planning.groups')).find(g=>g.name==='页内新文件夹');return pageFolder?.parentId;}).toBe(null);
  await expect(row(pageFolder.id)).toBeVisible();await expect(row(ids.root).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  await row(pageFolder.id).locator('.tree-chevron').click();
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('深层行动');await button('清除目录搜索').click();
  await expect(row(ids.root).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  await expect(row(pageFolder.id).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  await expand(ids.root);await expand(ids.child);await expand(ids.leaf);
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('深层行动');await button('清除目录搜索').click();await expect(page.locator(`[data-entry-id="${ids.b}"]`)).toBeVisible();
  await button('刷新当前页面').click();await expect(page.locator(`[data-entry-id="${ids.b}"]`)).toBeVisible();
  // Creating a child uses the group's visible menu and immediately reveals its path.
  await row(ids.child).locator('.tree-folder-name').click({button:'right'});await folder(ids.child).locator(':scope>.tree-folder-row .menu-panel').getByRole('button',{name:'新建子文件夹',exact:true}).click();
  const prompt=page.getByRole('dialog',{name:'新建子文件夹名称',exact:true});await prompt.getByRole('textbox').fill('待讨论');await prompt.locator('button[type="submit"]').click();
  let created;await expect.poll(async()=>{created=(await run('planning.groups')).find(g=>g.name==='待讨论');return created?.parentId;}).toBe(ids.child);
  await expect(row(created.id)).toBeVisible();
  await drag(row(created.id).locator('.tree-folder-grip'),row(ids.other).locator('.tree-folder-name'));
  await expect.poll(async()=>(await run('planning.groups')).find(g=>g.id===created.id)?.parentId).toBe(ids.other);
  await expect(folder(ids.other).locator(`.tree-folder[data-tree-id="${created.id}"]`)).toBeVisible();
  await row(ids.other).locator('.tree-chevron').click();await expect(row(ids.other).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('另一卷事件');await button('清除目录搜索').click();
  await expect(row(ids.other).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');await button('刷新当前页面').click();
  await expect(row(ids.other).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');await expand(ids.other);
  // The parent menu cannot offer itself or any descendant as a new parent.
  await row(ids.root).locator('summary').click();const destinations=row(ids.root).getByRole('combobox',{name:'移动文件夹 第一卷',exact:true});
  expect(await destinations.locator('option').evaluateAll(options=>options.map(o=>o.value))).not.toContain(ids.leaf);await row(ids.root).locator('summary').click();
  // Repeated right clicks reposition the same open menu; Escape and keyboard context-menu work.
  const parentMenu=row(ids.root).locator('.menu-panel');
  await row(ids.root).locator('.tree-folder-name').click({button:'right'});await expect(parentMenu).toBeVisible();
  await row(ids.root).locator('.tree-chevron').click({button:'right'});await expect(parentMenu).toBeVisible();await page.keyboard.press('Escape');await expect(parentMenu).toBeHidden();
  await row(ids.root).locator('.tree-folder-name').focus();await page.keyboard.press('Shift+F10');await expect(parentMenu.getByRole('button',{name:'新建情节',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(parentMenu).toBeHidden();
  // Delay readback and a later refresh independently, as on a slow desktop connection.
  let pauseNextMove=true,holdReads=false;const heldReads=[];
  await page.route('**/dispatch',async route=>{
    const {action}=route.request().postDataJSON();
    if(pauseNextMove&&action==='planning.directory.move'){pauseNextMove=false;const response=await route.fetch();holdReads=true;await route.fulfill({response});}
    else if(holdReads&&action==='planning.list'){const response=await route.fetch(),received=page.waitForResponse(response=>response.request()===route.request()).then(response=>response.finished());await new Promise(release=>heldReads.push({release,received}));await route.fulfill({response});}
    else if(holdReads&&action==='planning.layout.get'){const response=await route.fetch();holdReads=false;await route.fulfill({response});}
    else await route.continue();
  });
  // Reordering an entry into an ancestor folder is a single real write.
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('深层行动');await expect(page.locator('.planning-card')).toHaveCount(3);await button('清除目录搜索').click();await expect(page.locator('.planning-card')).toHaveCount(3);await expand(ids.child);await expand(ids.leaf);
  await drag(page.locator(`[data-entry-id="${ids.b}"] .directory-grip`),row(ids.root).locator('.tree-folder-name'));
  await expect.poll(async()=>(await run('planning.get',{nodeId:ids.b})).node.groupId).toBe(ids.root);
  await expect.poll(()=>heldReads.length).toBeGreaterThan(0);await expect(button('自动排布')).toBeDisabled();await expect(button('多选')).toBeDisabled();
  await button('刷新当前页面').click();await expect.poll(()=>heldReads.length).toBeGreaterThan(1);
  heldReads[0].release();await expect(page.locator('.directory-order-status')).toHaveCount(0);
  // Arrangement is scoped to selected cards; unrelated cards stay fixed, and undo restores both coordinates.
  await button('多选').click();await page.getByRole('checkbox',{name:'选择 卷目标',exact:true}).check();await page.getByRole('checkbox',{name:'选择 深层行动',exact:true}).check();
  const before=(await run('planning.list')).items;await button('自动排布').click();await expect(button('自动排布')).toBeEnabled();
  const arranged=(await run('planning.list')).items;
  for(const held of heldReads)held.release();await Promise.all(heldReads.map(held=>held.received));await page.evaluate(()=>new Promise(requestAnimationFrame));
  await expect(page.locator('.graph-status [role=alert]')).toHaveCount(0);
  for(const id of [ids.a,ids.b])await expect(page.locator(`.planning-card[data-node-id="${id}"]`)).toHaveCSS('left',`${arranged.find(n=>n.id===id).position.x}px`);
  expect(arranged.find(n=>n.id===ids.a).position).not.toEqual(arranged.find(n=>n.id===ids.b).position);
  expect(arranged.find(n=>n.id===ids.fixed).position).toEqual(before.find(n=>n.id===ids.fixed).position);
  await button('撤销布局').click();await expect(button('自动排布')).toBeEnabled();
  expect((await run('planning.list')).items.map(n=>[n.id,n.position])).toEqual(before.map(n=>[n.id,n.position]));
  await button('完成').click();await button('适应视图').click();await page.screenshot({path:join(shots,'planning-nested.png')});
  await button('设定').click();await showOrganization(page);const characterTree=page.getByLabel('设定文件夹',{exact:true});
  await expect(page.locator('.tree-folder[data-tree-id="character_card"],.tree-folder[data-tree-id="world_entry"]')).toHaveCount(0);
  await expect(row(mg.id,characterTree)).toBeVisible();await expect(row(mg.id,characterTree).locator('small')).toHaveText('3');
  await row(mg.id,characterTree).getByRole('button',{name:'皇城设定',exact:true}).click();await expect(page.locator('.planning-card')).toHaveCount(3);await expand(mg.id,characterTree);
  await expand(mc.id,characterTree);await expand(ml.id,characterTree);await expect(page.locator(`[data-entry-id="${character.id}"]`)).toBeVisible();
  await button('折叠全部目录').click();await expect(row(mg.id).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  await page.getByRole('textbox',{name:'搜索设定',exact:true}).fill('守卫');await expect(page.locator(`[data-entry-id="${character.id}"]`)).toBeVisible();
  await button('清除目录搜索').click();await expect(row(mg.id).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  // A new root folder is visible while existing folders keep their collapsed state.
  await button('新建文件夹').click();folderPrompt=page.getByRole('dialog',{name:'新建文件夹名称',exact:true});await folderPrompt.getByRole('textbox').fill('设定新文件夹');await folderPrompt.locator('button[type="submit"]').click();
  let settingsFolder;await expect.poll(async()=>{settingsFolder=(await run('graph.groups')).find(g=>g.name==='设定新文件夹');return settingsFolder?.parentId;}).toBe(null);
  await expect(row(settingsFolder.id,characterTree)).toBeVisible();await expect(row(mg.id).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  await row(settingsFolder.id,characterTree).locator('.tree-chevron').click();
  await page.getByRole('textbox',{name:'搜索设定',exact:true}).fill('守卫');await button('清除目录搜索').click();
  await expect(row(mg.id).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  await expect(row(settingsFolder.id,characterTree).locator('.tree-chevron')).toHaveAttribute('aria-expanded','false');
  await expand(mg.id,characterTree);await expand(mc.id,characterTree);await expand(ml.id,characterTree);
  await page.getByRole('textbox',{name:'搜索设定',exact:true}).fill('守卫');await button('清除目录搜索').click();await expect(page.locator(`[data-entry-id="${character.id}"]`)).toBeVisible();
  await drag(page.locator(`[data-entry-id="${character.id}"] .directory-grip`),row(mg.id,characterTree).locator('.tree-folder-name'));
  await expect.poll(async()=>(await run('graph.get',{nodeId:character.id})).groupId).toBe(mg.id);
  await button('多选').click();await page.getByRole('checkbox',{name:'选择 守卫',exact:true}).check();await page.getByRole('checkbox',{name:'选择 城主',exact:true}).check();
  const memoryBefore=await run('graph.list');await button('自动排布').click();await expect(button('自动排布')).toBeEnabled();
  const memoryArranged=await run('graph.list');expect(memoryArranged.find(n=>n.id===world.id).position).toEqual(world.position);
  expect(memoryArranged.find(n=>n.id===character.id).position).not.toEqual(memoryArranged.find(n=>n.id===otherCharacter.id).position);
  await button('撤销布局').click();await expect(button('自动排布')).toBeEnabled();expect((await run('graph.list')).map(n=>[n.id,n.position])).toEqual(memoryBefore.map(n=>[n.id,n.position]));
  await button('完成').click();await expect.poll(async()=>(await run('graph.get',{nodeId:character.id})).content).toBe('人物原文');
  await page.screenshot({path:join(shots,'settings-nested.png')});
  await page.setViewportSize({width:360,height:800});await showOrganization(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const toolbar=await button('自动排布').boundingBox();expect(await page.evaluate(box=>!document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.closest('.graph-top-area'),toolbar)).toBe(true);
  await row(mg.id,characterTree).locator('summary').click();const menu=row(mg.id,characterTree).locator('.menu-panel');await expect(menu).toBeVisible();const box=await menu.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(360);expect(box.y+box.height).toBeLessThanOrEqual(800);await row(mg.id,characterTree).locator('summary').click();
  await page.screenshot({path:join(shots,'nested-360.png')});
  // DSH embeds the plugin in an offset panel: fixed menu coordinates are local to it.
  await page.setViewportSize({width:1200,height:900});await page.locator('.cuigengji').evaluate(el=>Object.assign(el.style,{position:'fixed',right:'24px',top:'50px',width:'420px',height:'800px'}));await showOrganization(page);
  await row(mg.id,characterTree).locator('summary').click();await expect(menu).toBeVisible();const embedded=await page.locator('.cuigengji').boundingBox(),positioned=await menu.boundingBox();
  expect(positioned.x).toBeGreaterThanOrEqual(embedded.x);expect(positioned.y).toBeGreaterThanOrEqual(embedded.y);expect(positioned.x+positioned.width).toBeLessThanOrEqual(embedded.x+embedded.width);expect(positioned.y+positioned.height).toBeLessThanOrEqual(embedded.y+embedded.height);
  await page.screenshot({path:join(shots,'nested-embedded-menu.png')});await row(mg.id,characterTree).locator('summary').click();
  expect(errors).toEqual([]);await writeFile(join(shots,'report.json'),JSON.stringify({ok:true,checks:['recursive counts and independent filters','fold state survives search, collapse-all and refresh','root creation is visible without synthetic page/type folders','create and move reveal paths without overriding later manual folds','create and drag child folders','repeated right click, Escape and keyboard folder menu','cycle destinations excluded','drag entries into parent then immediately arrange in both canvases','delayed readback and manual refresh preserve current versions; stale refresh cannot roll back saved layout','partial arrangement and undo in both canvases','unselected settings and prose preserved','360px layout and menu bounds','menu bounds in an embedded DSH-sized panel','no browser errors']},null,2));console.log('Nested folder UI and automatic arrangement passed.');
}catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();}
