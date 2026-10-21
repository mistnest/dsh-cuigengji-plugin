// Production UI, real persistence, disposable libraries; no desktop profile or model calls.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization,selectSettingsCategory} from './helpers/navigation.mjs';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','library-tree'),scratch=await mkdtemp(join(tmpdir(),'cuigengji-ui-libraries-'));
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs','--canvas-demo'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try{
  const {url,dataDirectory}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',part=>errors+=part);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',part=>{output+=part;const line=output.split('\n').find(row=>row.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;};
  const novel=(await call('novel.list'))[0],novelId=novel.id,plan=(await call('planning.list',{novelId,pageId:null})).items[0];
  if(!plan.groupId){const group=await call('planning.group.create',{novelId,name:'主线事件',requestId:crypto.randomUUID()});await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'node.update',id:plan.id,expectedRevision:plan.revision,value:{groupId:group.id}}]});plan.groupId=group.id;}
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().endsWith('/dispatch'))requests.push(request.postDataJSON());});
  await page.goto(url);await page.getByRole('button',{name:'规划',exact:true}).click();await showOrganization(page);
  let row=page.locator(`.directory-entry[data-entry-id="${plan.id}"]`);
  const before=requests.filter(request=>request.action==='planning.get').length;
  await row.getByRole('button').click();await expect(page.locator('.workspace-detail')).toHaveCount(0);await expect(row).toHaveAttribute('data-active','true');
  expect(requests.filter(request=>request.action==='planning.get').length).toBe(before);
  await row.getByRole('button').dblclick();await expect(page.locator('.workspace-detail')).toBeVisible();
  await page.getByRole('button',{name:'‹ 返回规划',exact:true}).click();
  await page.screenshot({path:join(shots,'planning-tree.png')});
  const folder=page.locator(`[aria-label="规划文件夹"]>.tree-folder[data-tree-id="${plan.groupId}"]`),chevron=folder.locator(':scope>.tree-folder-row>.tree-chevron');
  await chevron.click();await expect(row).toHaveCount(0);await chevron.click();await expect(row).toBeVisible();
  // Searching reveals entries even when their normal parent group was folded.
  await chevron.click();await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill(plan.title);await expect(row).toBeVisible();await page.getByRole('button',{name:'清除目录搜索',exact:true}).click();await expect(row).toHaveCount(0);await chevron.click();
  await page.getByRole('button',{name:'设定',exact:true}).click();await showOrganization(page);
  const entries=await call('graph.list',{novelId}),character=entries.find(entry=>entry.type==='character_card'),world=entries.find(entry=>entry.type==='world_entry');
  row=page.locator(`.directory-entry[data-entry-id="${character.id}"]`);await row.getByRole('button').click();await expect(page.locator('.workspace-detail')).toHaveCount(0);
  await row.getByRole('button').dblclick();await expect(page.locator('.workspace-detail')).toBeVisible();await page.getByRole('button',{name:'‹ 返回设定',exact:true}).click();
  const drag=async(source,target)=>{const from=await source.boundingBox(),to=await target.boundingBox();await page.mouse.move(from.x+30,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+40,to.y+to.height/2,{steps:12});await page.mouse.up();};
  // A drag into a different type cannot silently convert a character to a world entry.
  await drag(row,page.locator(`[data-entry-id="${world.id}"]`));expect((await call('graph.get',{novelId,nodeId:character.id})).type).toBe('character_card');
  // A narrow-screen first click must leave the directory available for a double click.
  await page.setViewportSize({width:360,height:780});await showOrganization(page);await row.getByRole('button').click();await expect(page.getByRole('dialog',{name:'内容组织',exact:true})).toBeVisible();await expect(page.locator('.workspace-detail')).toHaveCount(0);
  await row.getByRole('button').dblclick();await expect(page.locator('.workspace-detail')).toBeVisible();await page.getByRole('button',{name:'‹ 返回设定',exact:true}).click();await page.setViewportSize({width:1440,height:1000});await showOrganization(page);
  await page.screenshot({path:join(shots,'settings-tree.png')});
  const openData=async()=>{await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'数据与备份');};
  const dialog=page.getByRole('dialog',{name:'设置',exact:true});await openData();
  await dialog.getByRole('button',{name:'新建空作品库',exact:false}).click();const target=join(scratch,'empty');
  await dialog.getByLabel('目标作品库目录').fill(target);await dialog.getByRole('button',{name:'检查目标目录',exact:true}).click();await expect(dialog).toContainText('目标文件夹为空');
  await page.setViewportSize({width:360,height:780});await page.screenshot({path:join(shots,'library-switch-360.png')});expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await dialog.getByRole('button',{name:'创建并打开',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.locator('.welcome-work-card')).toHaveCount(0);
  expect(await call('novel.list')).toEqual([]);
  await page.setViewportSize({width:1440,height:1000});await openData();await expect(dialog.getByLabel('作品库目录',{exact:true})).toHaveText(target);
  await dialog.getByRole('button',{name:'打开已有作品库',exact:false}).click();await dialog.getByLabel('最近使用的作品库').selectOption(dataDirectory);
  await dialog.getByRole('button',{name:'检查目标目录',exact:true}).click();await expect(dialog).toContainText(novel.title);await dialog.getByRole('button',{name:'打开此作品库',exact:true}).click();await expect(dialog).toHaveCount(0);
  expect((await call('novel.list'))[0].id).toBe(novelId);
  const stale=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'novel.create',args:{title:'旧页面不能写入',__libraryRoot:target}})});expect(stale.ok).toBe(false);expect((await call('novel.list')).length).toBe(1);
  await openData();await dialog.getByRole('button',{name:'迁移当前作品库',exact:false}).click();await dialog.getByLabel('目标作品库目录').fill(join(scratch,'migrated'));await dialog.getByRole('button',{name:'检查目标目录',exact:true}).click();await dialog.getByRole('button',{name:'迁移并打开',exact:true}).click();await expect(dialog).toHaveCount(0);
  expect((await call('planning.get',{novelId,nodeId:plan.id})).node.content).toBe((await call('novel.export',{novelId})).novel.planning.nodes[plan.id].content);
  expect(errors).toEqual([]);await writeFile(join(shots,'report.json'),JSON.stringify({ok:true,checks:['real folder collapse without a synthetic root','single click locates, double click reads details','cross-type drag reorders without converting entries','create, recent, switch and complete migration through real settings','library-scoped stale request guard','360px layout']},null,2));console.log('Library settings, file-tree interactions and complete UI migration passed.');
}catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();await rm(scratch,{recursive:true,force:true});}
