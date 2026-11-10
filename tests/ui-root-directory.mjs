// Exercise author-visible creation targets against disposable real persistence.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization,selectPlanningPage} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','root-directory');
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
const checks=[];
try{
  const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',part=>errors+=part);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',part=>{output+=part;const line=output.split('\n').find(row=>row.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})}),result=await response.json();if(!response.ok)throw Error(result.error);return result;};
  const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,...args});
  const tx=await run('planning.apply',{requestId:crypto.randomUUID(),operations:[
    {op:'group.create',ref:'old',value:{name:'原有情节'}},
    {op:'node.create',ref:'oldNode',value:{title:'原有行动',summary:'原线',status:'selected',threads:['原线'],groupId:'old',position:{x:100,y:100}}},
    {op:'node.create',ref:'loose',value:{title:'根目录旧事件',content:'保留原来的完整情节',position:{x:700,y:400}}},
  ]});
  const memoryGroup=await run('graph.group.create',{name:'原有设定'});
  const character=await run('graph.create',{type:'character_card',name:'原有人物',groupId:memoryGroup.id,content:'原来的人物全文',position:{x:100,y:100}});
  const world=await run('graph.create',{type:'world_entry',name:'原有地点',groupId:memoryGroup.id,content:'原来的世界全文',position:{x:700,y:400}});
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const button=name=>page.getByRole('button',{name,exact:true}),tree=kind=>page.getByLabel(`${kind}文件夹`,{exact:true});
  const folder=id=>page.locator(`.tree-folder[data-tree-id="${id}"]`),folderRow=id=>folder(id).locator(':scope>.tree-folder-row');
  const folderMenu=id=>folderRow(id).locator('.menu-panel'),entry=id=>page.locator(`.directory-entry[data-entry-id="${id}"]`);
  const openRoot=async kind=>{await tree(kind).focus();await page.keyboard.press('Shift+F10');const menu=tree(kind).locator(':scope>.tree-root-menu .menu-panel');await expect(menu).toBeVisible();return menu;};
  const openFolder=async id=>{await folderRow(id).locator('.tree-folder-name').click({button:'right'});await expect(folderMenu(id)).toBeVisible();return folderMenu(id);};
  const createQuick=async(title,label)=>{const draft=page.locator('.canvas-draft');await expect(draft).toBeVisible();await draft.getByRole('textbox',{name:label,exact:true}).fill(title);await draft.getByRole('button',{name:'创建',exact:true}).click();await expect(draft).toHaveCount(0);};
  const named=async(action,name,field)=>{let item;await expect.poll(async()=>{const list=await run(action);item=(list.items||list).find(n=>n[field]===name);return Boolean(item);}).toBe(true);return item;};
  await page.goto(url);await button('规划').click();await showOrganization(page);
  await expect(tree('规划').locator(':scope>.tree-folder[data-tree-id="main"]')).toHaveCount(0);
  await expect(tree('规划').locator(`:scope>.directory-entries>.directory-branch>[data-entry-id="${tx.mapping.loose}"]`)).toBeVisible();
  // Root and folder context menus expose the actual creation destination.
  let menu=await openRoot('规划');await expect(menu.getByRole('button',{name:'新建情节',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowDown');await expect(menu.getByRole('button',{name:'新建文件夹',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(tree('规划')).toBeFocused();
  const rootBox=await tree('规划').boundingBox();await page.mouse.click(rootBox.x+5,rootBox.y+rootBox.height-6,{button:'right'});await expect(menu).toBeVisible();await menu.getByRole('button',{name:'新建文件夹',exact:true}).click();
  let prompt=page.getByRole('dialog',{name:'新建文件夹名称',exact:true});await prompt.getByRole('textbox').fill('自由根文件夹');await prompt.locator('button[type=submit]').click();
  const newFolder=await named('planning.groups','自由根文件夹','name');expect(newFolder.parentId??null).toBe(null);
  await expect(tree('规划').locator(`:scope>.tree-folder[data-tree-id="${newFolder.id}"]`)).toBeVisible();
  menu=await openFolder(newFolder.id);await menu.getByRole('button',{name:'新建子文件夹',exact:true}).click();
  prompt=page.getByRole('dialog',{name:'新建子文件夹名称',exact:true});await prompt.getByRole('textbox').fill('自由子文件夹');await prompt.locator('button[type=submit]').click();
  const child=await named('planning.groups','自由子文件夹','name');expect(child.parentId).toBe(newFolder.id);
  checks.push('root and nested folders are created without a fixed page/type wrapper; keyboard menu focus and Escape');
  // Explicit root creation must override an unrelated folder/search/status/thread filter.
  await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('原有');
  const positions=(await run('planning.list')).items.map(n=>[n.id,n.position]);
  menu=await openRoot('规划');await menu.getByRole('button',{name:'新建情节',exact:true}).click();await createQuick('根目录新事件','情节标题');
  const rootBeat=await named('planning.list','根目录新事件','title');expect(rootBeat.groupId??null).toBe(null);expect(rootBeat.pageId??null).toBe(null);
  await expect(tree('规划').locator(`:scope>.directory-entries>.directory-branch>[data-entry-id="${rootBeat.id}"]`)).toBeVisible();
  await expect(page.getByRole('textbox',{name:'搜索规划',exact:true})).toHaveValue('');await expect(page.locator('.workspace-filter-notice')).toHaveCount(0);
  for(const [id,position] of positions)expect((await run('planning.get',{nodeId:id})).node.position).toEqual(position);
  // Creation in a collapsed child reveals that path once, and does not undo a later manual fold.
  await folderRow(child.id).locator('.tree-chevron').click();
  menu=await openFolder(child.id);await menu.getByRole('button',{name:'新建情节',exact:true}).click();await createQuick('子目录新事件','情节标题');
  const childBeat=await named('planning.list','子目录新事件','title');expect(childBeat.groupId).toBe(child.id);await expect(entry(childBeat.id)).toBeVisible();
  await folderRow(child.id).locator('.tree-chevron').click();await button('刷新当前页面').click();await expect(entry(childBeat.id)).toHaveCount(0);
  checks.push('explicit root/folder targets override old filters; new items are visible; later manual folds and existing coordinates survive');
  // A planning page changes canvas membership, not folder identity or story contents.
  await button('新建画布').click();const pageDialog=page.getByRole('dialog',{name:'新建画布',exact:true});await pageDialog.getByLabel('画布名称').fill('独立沙盘');await pageDialog.getByRole('button',{name:'保存画布',exact:true}).click();await expect(pageDialog).toHaveCount(0);
  const canvasPage=(await run('planning.pages')).find(p=>p.name==='独立沙盘');await expect(page.getByRole('combobox',{name:'规划画布',exact:true})).toHaveValue(canvasPage.id);
  menu=await openRoot('规划');await menu.getByRole('button',{name:'新建情节',exact:true}).click();await createQuick('独立画布根事件','情节标题');const pageBeat=await named('planning.list','独立画布根事件','title');expect(pageBeat.pageId).toBe(canvasPage.id);expect(pageBeat.groupId??null).toBe(null);
  await selectPlanningPage(page,'');await expect(entry(rootBeat.id)).toBeVisible();await expect(entry(pageBeat.id)).toHaveCount(0);
  checks.push('independent planning canvases keep root creation in the selected canvas and preserve existing folder IDs');
  await page.screenshot({path:join(shots,'free-planning-root.png')});
  await button('设定').click();await showOrganization(page);await expect(folder(memoryGroup.id)).toHaveCount(1);
  await expect(folderRow(memoryGroup.id).locator('small')).toHaveText('2');await expect(page.locator('.tree-folder[data-tree-id="character_card"],.tree-folder[data-tree-id="world_entry"]')).toHaveCount(0);
  await page.getByRole('textbox',{name:'搜索设定',exact:true}).fill('原有');
  const beforeMemory=(await run('novel.export')).novel;
  menu=await openRoot('设定');await menu.getByRole('button',{name:'新建角色卡',exact:true}).click();await createQuick('根目录新人物','角色名称');
  const rootCharacter=await named('graph.list','根目录新人物','name');expect(rootCharacter.groupId??null).toBe(null);expect(rootCharacter.type).toBe('character_card');
  await expect(tree('设定').locator(`:scope>.directory-entries>.directory-branch>[data-entry-id="${rootCharacter.id}"]`)).toBeVisible();await expect(page.locator('.workspace-filter-notice')).toHaveCount(0);
  await folderRow(memoryGroup.id).locator('.tree-chevron').click();menu=await openFolder(memoryGroup.id);await menu.getByRole('button',{name:'新建世界书',exact:true}).click();await createQuick('同组的新地点','设定名称');
  const addedWorld=await named('graph.list','同组的新地点','name');expect(addedWorld.groupId).toBe(memoryGroup.id);await expect(entry(addedWorld.id)).toBeVisible();await expect(folder(memoryGroup.id)).toHaveCount(1);
  for(const id of [character.id,world.id])expect((await run('novel.export')).novel.nodes[id]).toEqual(beforeMemory.nodes[id]);
  checks.push('one mixed-type folder appears once; explicit root creation clears conflicting type/search filters without changing existing prose or history');
  // A failed folder write plus failed refresh must show the original useful error.
  await page.route('**/dispatch',async route=>{const {action}=route.request().postDataJSON();if(action==='graph.group.update')await route.fulfill({status:409,json:{error:'文件夹已被另一位作者修改'}});else if(action==='graph.groups')await route.fulfill({status:503,json:{error:'读取暂时失败'}});else await route.continue();});
  menu=await openFolder(memoryGroup.id);await menu.getByRole('button',{name:'重命名',exact:true}).click();prompt=page.getByRole('dialog',{name:'文件夹名称',exact:true});await prompt.getByRole('textbox').fill('不应写入的名称');await prompt.locator('button[type=submit]').click();
  await expect(page.locator('.workbench-base>.notice.error')).toContainText('文件夹已被另一位作者修改');expect((await run('graph.groups')).find(g=>g.id===memoryGroup.id).name).toBe('原有设定');await page.unroute('**/dispatch');await button('关闭提示').click();await button('刷新当前页面').click();await expect(entry(addedWorld.id)).toBeVisible();
  checks.push('a failed write preserves data and the original save error even when readback also fails');
  // Export/import and a reload keep the same logical folder structure for the tools and UI.
  const exported=await call('transfer.export',{selection:{kind:'works',novelIds:[novelId]},format:'package'}),file={name:exported.filename,text:exported.content},options={mode:'copy'};
  const preview=await call('transfer.preview',{file,options});expect(preview.valid).toBe(true);const imported=await call('transfer.import',{file,options,proof:preview.proof,requestId:crypto.randomUUID()}),copy=await call('novel.export',{novelId:imported.novelIds[0]});
  const copiedRoot=Object.values(copy.novel.planning.nodes).find(n=>n.title===rootBeat.title),copiedChild=Object.values(copy.novel.planning.nodes).find(n=>n.title===childBeat.title);
  expect(copiedRoot.groupId??null).toBe(null);expect(copy.novel.planning.groups[copiedChild.groupId].name).toBe(child.name);
  const copiedMemory=Object.values(copy.novel.nodes);expect(copiedMemory.find(n=>n.name===rootCharacter.name).groupId??null).toBe(null);
  const copiedWorld=copiedMemory.find(n=>n.name===addedWorld.name),copiedPerson=copiedMemory.find(n=>n.name===character.name);expect(copiedWorld.groupId).toBe(copiedPerson.groupId);
  await page.reload();await showOrganization(page);await expect(folder(memoryGroup.id)).toHaveCount(1);await expect(entry(rootCharacter.id)).toBeVisible();
  await page.screenshot({path:join(shots,'free-settings-root.png')});
  await page.setViewportSize({width:360,height:800});await showOrganization(page);menu=await openRoot('设定');const bounds=await menu.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(360);expect(bounds.y+bounds.height).toBeLessThanOrEqual(800);await page.screenshot({path:join(shots,'root-menu-360.png')});await page.keyboard.press('Escape');
  checks.push('root and mixed folders survive portable copy and page reload; root menu fits a 360px panel');
  expect(errors).toEqual([]);await writeFile(join(shots,'report.json'),JSON.stringify({ok:true,checks},null,2));console.log('Free-root author workflows passed.');
}catch(error){await writeFile(join(shots,'report.json'),JSON.stringify({ok:false,checks,error:String(error)},null,2));if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();}
