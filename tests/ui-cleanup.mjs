// Production components and a persisted disposable library. No desktop profile.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'),out=join(root,'test-results','cleanup');
await mkdir(out,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try{
  const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',c=>errors+=c);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',c=>{output+=c;const line=output.split('\n').find(l=>l.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
  const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const result=await r.json();if(!r.ok)throw Error(result.error);return result;};
  const novelId=(await call('novel.list'))[0].id,chapter=(await call('chapter.list',{novelId}))[0];
  for(let revision=1;revision<5;revision++)await call('chapter.update',{novelId,chapterId:chapter.id,expectedRevision:revision,content:`正文修订 v${revision+1}，当年的信重新被打开。`});
  const node=await call('graph.create',{novelId,type:'character_card',name:'送信人',content:'设定第一稿',status:'stale',sources:[{chapterId:chapter.id,revision:2}]});
  await call('graph.update',{novelId,nodeId:node.id,expectedRevision:1,content:'设定第二稿'});
  await call('graph.update',{novelId,nodeId:node.id,expectedRevision:2,content:'设定当前稿'});
  const planning=await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'node.create',ref:'scene',value:{title:'拆开来信',content:'规划第一稿'}}]});
  await call('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'node.update',id:planning.mapping.scene,expectedRevision:1,value:{content:'规划当前稿'}}]});
  const trash=[];for(const title of ['丢弃的支线甲','丢弃的支线乙']){const c=await call('chapter.create',{novelId,title,content:'待清理的章节正文'});await call('chapter.delete',{novelId,chapterId:c.id,expectedRevision:1,confirm:true});trash.push(c);}
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1280,height:950},reducedMotion:'reduce'});
  const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('/dispatch')){const {action,args}=r.postDataJSON();if(action==='cleanup.apply')writes.push(args);}});
  let delayPreview=false;
  await page.route('**/dispatch',async route=>{if(delayPreview&&route.request().postDataJSON().action==='cleanup.preview')await new Promise(r=>setTimeout(r,500));await route.continue();});
  const dialog=()=>page.getByRole('dialog',{name:/^(清理历史版本|永久删除回收站内容)$/});
  const cancel=()=>dialog().getByRole('button',{name:'取消',exact:true}).click();
  const deleteItems=()=>dialog().getByRole('button',{name:/^永久删除 \d+ 项$/});
  const menu=async comparison=>{await comparison.getByLabel('历史更多操作',{exact:true}).click();await comparison.getByRole('button',{name:'删除此版本…',exact:true}).click();await expect(dialog()).toBeVisible();await expect(dialog().getByLabel('删除前备份',{exact:true})).toHaveCount(0);await expect(dialog()).toContainText('删除后无法恢复。');};
  const finish=async()=>{await expect(dialog().getByRole('status')).toContainText('已删除');await dialog().getByRole('button',{name:'完成',exact:true}).click();};
  await page.goto(url);await page.locator(`[data-chapter-id="${chapter.id}"] .chapter-open`).click();
  await page.getByLabel('章节设置',{exact:true}).click();await page.getByRole('button',{name:'改动对比',exact:true}).click();
  const compare=page.getByRole('region',{name:'修改前后对比',exact:true}),select=compare.getByRole('combobox',{name:'对照历史版本',exact:true});
  await select.selectOption('3');await menu(compare);
  await expect(deleteItems()).toHaveText('永久删除 1 项');
  const protectedRow=dialog().locator('.cleanup-item').filter({has:page.getByRole('checkbox',{name:'选择删除 v2',exact:true})});
  await expect(protectedRow.getByRole('checkbox')).toBeDisabled();await protectedRow.locator('summary').click();await expect(protectedRow).toContainText('送信人');
  // An old response must not masquerade as a review of the new filter.
  delayPreview=true;await dialog().getByLabel('历史清理方式',{exact:true}).selectOption('keep');await expect(deleteItems()).toBeDisabled();
  await dialog().getByLabel('保留版本数',{exact:true}).fill('2');await expect(deleteItems()).toHaveText('永久删除 2 项');await expect(deleteItems()).toBeEnabled();delayPreview=false;
  await dialog().getByLabel('历史清理方式',{exact:true}).selectOption('before');await dialog().getByLabel('历史清理截止日期',{exact:true}).fill('2099-01-01');await expect(deleteItems()).toHaveText('永久删除 3 项');
  for(const width of [320,420,1280]){
    await page.setViewportSize({width,height:950});await expect(dialog()).toBeVisible();expect(await dialog().evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:join(out,`history-${width}.png`)});
  }
  await page.evaluate(()=>document.documentElement.style.cssText='--dsw-alias-bg-base:#181a20;--dsw-alias-label-primary:#e9edf5;--dsw-alias-label-secondary:#aab2c1;--dsw-alias-border-l1:#353a46;--dsw-alias-state-business-primary:#6c8aff;');await page.screenshot({path:join(out,'history-dark.png')});await page.evaluate(()=>document.documentElement.removeAttribute('style'));
  await cancel();expect(writes).toHaveLength(0);expect((await call('chapter.history',{novelId,chapterId:chapter.id})).length).toBe(5);
  // A concurrent edit invalidates approval, then the author can recheck once.
  await select.selectOption('3');await menu(compare);await expect(deleteItems()).toBeEnabled();
  await call('chapter.update',{novelId,chapterId:chapter.id,expectedRevision:5,content:'并发写入的新正文，必须保留。'});
  await deleteItems().click();await expect(dialog().getByRole('alert')).toContainText('重新核对');
  await dialog().getByRole('button',{name:'重新核对',exact:true}).click();await expect(deleteItems()).toBeEnabled();await deleteItems().click();
  await expect(dialog().getByRole('status')).toContainText('已删除 1');
  await expect(dialog().getByRole('button',{name:/备份/})).toHaveCount(0);
  await finish();expect((await call('chapter.history',{novelId,chapterId:chapter.id})).map(v=>v.revision)).toEqual([1,2,4,5,6]);await expect(select.locator('option[value="3"]')).toHaveCount(0);
  await compare.getByRole('button',{name:'返回正文',exact:true}).click();await page.setViewportSize({width:1280,height:950});
  // Both card comparison editors expose the same cleanup interaction.
  for(const [tab,id,action] of [['规划',planning.mapping.scene,'planning.node.history'],['设定',node.id,'graph.history']]){
    await page.getByRole('button',{name:tab,exact:true}).click();await showOrganization(page);
    await page.locator(`.directory-entry[data-entry-id="${id}"] button`).dblclick();await page.getByRole('button',{name:'改动对比',exact:true}).click();
    const card=page.getByRole('region',{name:'卡片改动对比',exact:true});await card.getByRole('combobox',{name:'对照卡片版本',exact:true}).selectOption('1');await menu(card);
    await expect(deleteItems()).toBeEnabled();await deleteItems().click();await finish();
    await expect(card.getByRole('combobox',{name:'对照卡片版本',exact:true}).locator('option[value="1"]')).toHaveCount(0);
    const result=await call(action,{novelId,nodeId:id});expect((result.items||result).some(v=>v.revision===1)).toBe(false);
    await card.getByRole('button',{name:'返回内容',exact:true}).click();await page.getByRole('button',{name:`‹ 返回${tab}`,exact:true}).click();
  }
  // Chapter recycle bin: checkbox selection, cancel, permanent delete and clear.
  await page.getByRole('button',{name:'正文',exact:true}).click();await page.getByRole('button',{name:/^回收站/}).click();
  await expect(page.locator('.chapter-item.is-deleted')).toHaveCount(2);
  await page.getByLabel(`选择 ${trash[0].title}`,{exact:true}).check();await page.getByRole('button',{name:/^删除所选/}).click();await expect(deleteItems()).toHaveText('永久删除 1 项');await cancel();
  await page.getByRole('button',{name:`永久删除 ${trash[0].title}`,exact:true}).click();await expect(deleteItems()).toBeEnabled();await deleteItems().click();await finish();await expect(page.locator('.chapter-item.is-deleted')).toHaveCount(1);
  await page.setViewportSize({width:420,height:950});if(!await page.locator('.directory-drawer').isVisible())await page.getByRole('button',{name:/^(‹ 目录|打开目录)$/}).click();
  await page.getByRole('button',{name:'清空回收站',exact:true}).click();await expect(deleteItems()).toBeEnabled();await page.screenshot({path:join(out,'chapter-trash-narrow.png')});await deleteItems().click();await finish();await expect(page.locator('.chapter-item.is-deleted')).toHaveCount(0);
  const drawer=page.getByRole('dialog',{name:'章节目录抽屉',exact:true});if(await drawer.isVisible())await drawer.getByRole('button',{name:'关闭章节目录',exact:true}).click();
  // Work recycle bin: batch selection preserves active works.
  const dead=[];for(const title of ['待删除作品甲','待删除作品乙']){const n=await call('novel.create',{title});await call('novel.archive',{novelId:n.id,expectedRevision:n.revision,confirm:true});dead.push(n);}
  await page.getByRole('button',{name:'作品首页',exact:true}).click();await page.getByRole('button',{name:'刷新当前页面',exact:true}).click();await page.getByRole('button',{name:/^作品回收站/}).click();await expect(page.locator('.management-trash-row')).toHaveCount(2);
  await page.getByLabel('全选回收作品',{exact:true}).check();await page.getByRole('button',{name:/^删除所选/}).click();await expect(deleteItems()).toHaveText('永久删除 2 项');await cancel();
  await page.getByRole('button',{name:'清空作品回收站',exact:true}).click();await expect(deleteItems()).toBeEnabled();await page.screenshot({path:join(out,'work-trash-narrow.png')});await deleteItems().click();await finish();await expect(page.locator('.management-trash-row')).toHaveCount(0);
  expect((await call('novel.list',{includeArchived:true})).map(n=>n.id)).toEqual([novelId]);expect(errors).toEqual([]);
  // A retained reference can be opened from the checklist without writing.
  await page.setViewportSize({width:1280,height:950});await page.getByRole('button',{name:'作品首页',exact:true}).click();
  const title=(await call('novel.list'))[0].title;await page.getByRole('button',{name:`打开作品 ${title}`,exact:true}).click();await page.getByRole('button',{name:'正文',exact:true}).click();
  await page.locator(`[data-chapter-id="${chapter.id}"] .chapter-open`).click();await page.getByLabel('章节设置',{exact:true}).click();await page.getByRole('button',{name:'改动对比',exact:true}).click();await select.selectOption('2');await menu(compare);
  const reference=dialog().locator('.cleanup-item').filter({has:page.getByRole('checkbox',{name:'选择删除 v2',exact:true})});await reference.locator('summary').click();await reference.getByRole('button',{name:'定位',exact:true}).first().click();
  await expect(dialog()).toHaveCount(0);await expect(page.locator('.workspace-detail .document-heading')).toContainText('送信人');expect(errors).toEqual([]);
  expect(writes.length).toBeGreaterThan(0);expect(writes.every(args=>!Object.hasOwn(args,'backup'))).toBe(true);
  await writeFile(join(out,'report.json'),JSON.stringify({ok:true,checks:['three history scopes; refreshed selection after cleanup','protected sources; filter response isolation','cancel does not write; concurrent edit requires recheck','no backup option or request parameter','chapter and work recycle single/batch/clear','320/420/1280 and dark theme; nested drawer dialog'],writes:writes.length},null,2));
  console.log('Cleanup UI regression passed.');
}catch(error){if(page){await page.screenshot({path:join(out,'failure.png')}).catch(()=>{});await writeFile(join(out,'failure.txt'),await page.locator('body').innerText()).catch(()=>{});}throw error;}finally{await browser?.close();host.kill();}
