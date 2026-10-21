// Real components and RPC, using a disposable synthetic library and no model calls.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization,selectPlanningPage} from './helpers/navigation.mjs';
const root=resolve(import.meta.dirname,'..'),out=join(root,'test-results','canvas-workspaces');
await mkdir(out,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
const checks=[],errors=[];
try{
 const {url}=await new Promise((resolve,reject)=>{let stdout='',stderr='';const timer=setTimeout(()=>reject(Error(stderr||'Preview timeout')),25000);host.stderr.on('data',part=>stderr+=part);host.once('exit',()=>{clearTimeout(timer);reject(Error(stderr||'Preview stopped'));});host.stdout.on('data',part=>{stdout+=part;const line=stdout.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
 const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})}),body=await r.json();if(!r.ok)throw Error(body.error);return body;};
 const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,requestId:crypto.randomUUID(),...args});
 const plan=await run('planning.apply',{operations:[
  {op:'group.create',ref:'root',value:{name:'雨城篇'}},{op:'group.create',ref:'child',value:{name:'调查线',parentId:'root'}},
  {op:'node.create',ref:'a',value:{title:'发现账本',summary:'主角发现线索',content:'规划甲全文',groupId:'child',position:{x:120,y:180}}},
  {op:'node.create',ref:'b',value:{title:'追查港口',summary:'循线追查',content:'规划乙全文',groupId:'child',position:{x:500,y:180}}},
  {op:'node.create',ref:'c',value:{title:'码头会合',summary:'主角与守方会合',position:{x:900,y:180}}},
  {op:'edge.create',value:{from:'a',to:'c'}},{op:'edge.create',value:{from:'b',to:'c'}},
  {op:'decoration.create',ref:'note',value:{kind:'note',title:'未决问题',content:'如何解释账本来历？',groupId:'child',position:{x:120,y:440}}},
 ]});
 const mg=await run('graph.group.create',{name:'雨城人物'}),mc=await run('graph.group.create',{name:'守方',parentId:mg.id});
 const a=await run('graph.create',{type:'character_card',name:'守卫',summary:'城门守方',content:'人物原文',groupId:mc.id,position:{x:120,y:180}}),b=await run('graph.create',{type:'world_entry',name:'城门',summary:'雨城东门',content:'地点原文',groupId:mc.id,position:{x:500,y:180}}),c=await run('graph.create',{type:'character_card',name:'城主',summary:'雨城主事人',content:'城主原文',position:{x:900,y:180}});
 await run('edge.create',{from:a.id,to:c.id,name:'隶属'});await run('edge.create',{from:b.id,to:c.id,name:'管辖'});
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',error=>errors.push(error.message));
 const button=name=>page.getByRole('button',{name,exact:true}),card=id=>page.locator(`.planning-card[data-node-id="${id}"]`),folder=id=>page.locator(`.canvas-folder[data-folder-id="${id}"]`),entry=id=>page.locator(`.directory-entry[data-entry-id="${id}"]`);
 const prompt=async(name,text)=>{const dialog=page.getByRole('dialog',{name,exact:true});await expect(dialog).toBeVisible();await dialog.getByRole('textbox').fill(text);await dialog.locator('button[type="submit"]').click();await expect(dialog).toHaveCount(0);};
 const newPage=async name=>{await button('新建画布').click();const dialog=page.getByRole('dialog',{name:'新建画布',exact:true});await dialog.getByLabel('画布名称',{exact:true}).fill(name);await dialog.getByLabel('用途摘要',{exact:true}).fill('独立画布验证');await dialog.getByRole('button',{name:'保存画布',exact:true}).click();await expect(dialog).toHaveCount(0);};
 const dragBy=async(locator,dx,dy)=>{await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();const x=box.x+45,y=box.y+18;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:12});await page.mouse.up();};
 await page.goto(url);await button('规划').click();await showOrganization(page);await expect(card(plan.mapping.a)).toBeVisible();
 await expect(page.locator('.directory-filters')).toHaveCount(0);await expect(page.getByRole('listbox',{name:'规划画布'})).toBeVisible();
 await button('适应视图').click();
 await button('收纳文件夹 雨城篇').click();await expect(card(plan.mapping.a)).toHaveCount(0);await expect(folder(plan.mapping.root)).toContainText('3 项内容');await expect(folder(plan.mapping.root)).toContainText('2 条外部连接');
 await expect(page.locator(`[data-entry-id="${plan.mapping.note}"]`)).toHaveCount(0);await expect(page.locator('.tree-folder[data-tree-id="'+plan.mapping.root+'"]')).toBeVisible();
 await button('展开文件夹 雨城篇').click();await expect(card(plan.mapping.a)).toBeVisible();
 // Directory folds do not change the canvas; canvas folds do not hide directory data.
 const rootRow=page.locator(`.tree-folder[data-tree-id="${plan.mapping.root}"]>.tree-folder-row`);
 await rootRow.locator('.tree-chevron').click();await expect(card(plan.mapping.a)).toBeVisible();await rootRow.locator('.tree-chevron').click();
 await page.getByRole('textbox',{name:'搜索规划',exact:true}).fill('发现账本');await expect(entry(plan.mapping.a)).toBeVisible();await expect(card(plan.mapping.b)).toBeVisible();await button('清除目录搜索').click();
 await card(plan.mapping.a).click();await expect(page.locator('.planning-detail')).toHaveCount(0);await card(plan.mapping.a).dblclick();await expect(page.locator('.planning-detail')).toContainText('规划甲全文');await button('‹ 返回规划').click();
 checks.push('planning single/double click, shared nested membership, independent folds and directory-only search');
 await newPage('港口沙盘');const namedPlan=(await run('planning.pages')).find(p=>p.name==='港口沙盘');await expect(page.locator('.planning-card')).toHaveCount(0);await expect(page.locator('.tree-folder')).toHaveCount(0);
 await button('新建文件夹').click();await prompt('新建文件夹名称','新页目录');
 await expect.poll(async()=>(await run('planning.groups',{pageId:namedPlan.id})).map(g=>g.name)).toEqual(['新页目录']);
 await selectPlanningPage(page,'');await expect(card(plan.mapping.a)).toBeVisible();await expect(page.locator('.workspace-sidebar')).not.toContainText('新页目录');
 // One drag moves every nested card and note by the same world-space delta.
 await button('适应视图').click();const before=(await run('planning.get',{nodeId:plan.mapping.a})).node,other=(await run('planning.get',{nodeId:plan.mapping.c})).node;
 await dragBy(folder(plan.mapping.root).locator('header'),65,40);
 await expect.poll(async()=>(await run('planning.get',{nodeId:before.id})).node.position.x).not.toBe(before.position.x);
 const after=(await run('planning.get',{nodeId:before.id})).node,delta={x:after.position.x-before.position.x,y:after.position.y-before.position.y},second=(await run('planning.get',{nodeId:plan.mapping.b})).node;
 expect(second.position.x-500).toBeCloseTo(delta.x,0);expect(second.position.y-180).toBeCloseTo(delta.y,0);expect((await run('planning.get',{nodeId:other.id})).node.position).toEqual(other.position);
 checks.push('independent planning page creation and whole nested-folder drag preserve outside cards');
 await button('收纳文件夹 雨城篇').click();await button('导出图片').click();const exportDialog=page.getByRole('dialog',{name:'导出画布图片',exact:true});await exportDialog.getByLabel('图片格式',{exact:true}).selectOption('svg');const dl=page.waitForEvent('download');await exportDialog.getByRole('button',{name:'保存图片',exact:true}).click();const download=await dl;await download.saveAs(join(out,'planning.svg'));expect(await readFile(join(out,'planning.svg'),'utf8')).toContain('雨城篇');await page.keyboard.press('Escape');await expect(exportDialog).toHaveCount(0);
 await page.screenshot({path:join(out,'planning-wide.png')});await page.reload();await button('规划').click();await expect(folder(plan.mapping.root)).toHaveClass(/canvas-folder-folded/);await expect(card(plan.mapping.a)).toHaveCount(0);
 checks.push('fold state survives reload; image export contains the folder projection');
 await button('设定').click();await showOrganization(page);await button('适应视图').click();await expect(page.getByRole('listbox',{name:'设定画布'})).toHaveCount(0);
 await button('收纳文件夹 雨城人物').click();await expect(card(a.id)).toHaveCount(0);await expect(folder(mg.id)).toContainText('2 条外部连接');await button('展开文件夹 雨城人物').click();
 await page.getByRole('textbox',{name:'搜索设定',exact:true}).fill('守卫');await expect(entry(a.id)).toBeVisible();await expect(card(c.id)).toBeVisible();await button('清除目录搜索').click();
 await button('新建文件夹').click();await prompt('新建文件夹名称','外城设定');const outer=(await run('graph.groups')).find(g=>g.name==='外城设定');
 const folderRow=id=>page.locator(`.tree-folder[data-tree-id="${id}"]>.tree-folder-row`);
 await folderRow(outer.id).getByRole('button',{name:'外城设定',exact:true}).click();await expect(page.locator('.setting-card')).toHaveCount(0);await expect(page.getByRole('navigation',{name:'设定路径'})).toContainText('外城设定');
 await folderRow(outer.id).getByRole('button',{name:'外城设定',exact:true}).click({button:'right'});await folderRow(outer.id).locator('.menu-panel').getByRole('button',{name:'新建子文件夹',exact:true}).click();await prompt('新建子文件夹名称','城外势力');
 const newGroup=(await run('graph.groups')).find(g=>g.name==='城外势力');expect(newGroup.parentId).toBe(outer.id);
 await folderRow(newGroup.id).getByRole('button',{name:'城外势力',exact:true}).click({button:'right'});await folderRow(newGroup.id).locator('.menu-panel').getByRole('button',{name:'新建角色卡',exact:true}).click();
 const draft=page.locator('.canvas-draft');await draft.getByLabel('角色名称',{exact:true}).fill('外城信使');await draft.getByRole('button',{name:'创建',exact:true}).click();await expect(draft).toHaveCount(0);
 let messenger;await expect.poll(async()=>{messenger=(await run('graph.list')).find(n=>n.name==='外城信使');return messenger?.groupId;}).toBe(newGroup.id);
 await card(messenger.id).dblclick();await button('编辑').click();await page.getByLabel('全文',{exact:true}).fill('外城信使正文\n'.repeat(30));await button('保存设定').click();
 await expect.poll(async()=>(await run('graph.get',{nodeId:messenger.id})).content).toBe('外城信使正文\n'.repeat(30));const saved=await run('graph.get',{nodeId:messenger.id});expect(saved.groupId).toBe(newGroup.id);expect(saved.pageId).toBe(null);
 await button('‹ 返回设定').click();await expect(card(messenger.id)).toBeVisible();await expect(card(a.id)).toHaveCount(0);checks.push('resource folder is the canvas scope; nested context creation retains one identity and thirty lines of prose');
 // Classification changes keep the source identity and external relationships intact.
 await button('全书设定').click();await expect(card(a.id)).toBeVisible();await button('多选').click();const childToggle=folderRow(mc.id).locator('.tree-chevron');if(await childToggle.getAttribute('aria-expanded')==='false')await childToggle.click();await entry(a.id).getByRole('checkbox').check();await page.getByLabel('批量移动目标',{exact:true}).selectOption('group:'+newGroup.id);await page.getByRole('region',{name:'批量管理',exact:true}).getByRole('button',{name:'移动',exact:true}).click();await button('完成').click();
 await expect.poll(async()=>(await run('graph.get',{nodeId:a.id})).groupId).toBe(newGroup.id);await folderRow(outer.id).getByRole('button',{name:'外城设定',exact:true}).click();await expect(card(a.id)).toBeVisible();const moved=await run('graph.get',{nodeId:a.id});expect(moved.content).toBe(a.content);expect(moved.id).toBe(a.id);expect((await run('edge.list',{nodeId:a.id})).length).toBe(1);await expect(page.locator('.resource-external')).toContainText('1');
 await button('适应视图').click();await page.screenshot({path:join(out,'settings-wide.png')});await page.setViewportSize({width:440,height:850});await showOrganization(page);await expect(page.getByRole('navigation',{name:'设定路径'})).toContainText('外城设定');await page.screenshot({path:join(out,'settings-narrow.png')});
 await page.setViewportSize({width:1500,height:1000});await page.evaluate(()=>{document.documentElement.style.cssText='--dsw-alias-bg-base:#20251f;--dsw-alias-label-primary:#e4e8de;--dsw-alias-label-secondary:#a8b0a0;--dsw-alias-border-l1:#404a3b;--dsw-alias-state-success-primary:#a4c195';});await button('适应视图').click();await page.screenshot({path:join(out,'settings-dark.png')});
 // A folder export starts with its subtree; deselection switches to the exact subset.
 await page.getByLabel('设定更多操作',{exact:true}).click();await button('导出当前文件夹').click();await expect(page.getByLabel('设定分组',{exact:true})).toHaveValue(outer.id);await expect(page.locator('.transfer-selection-row')).toHaveCount(2);
 const take=async()=>{await expect(button('下载文件')).toBeEnabled();const pending=page.waitForEvent('download');await button('下载文件').click();return JSON.parse(await readFile(await (await pending).path(),'utf8')).payload.projects[0];};
 expect(Object.keys((await take()).nodes).sort()).toEqual([a.id,messenger.id].sort());await page.getByRole('checkbox',{name:'选择 外城信使',exact:true}).uncheck();await expect(page.getByLabel('导出预览')).toContainText('1');await expect.poll(async()=>Object.keys((await take()).nodes)).toEqual([a.id]);
 checks.push('folder export includes descendants and exact checkbox subset; external relations survive a move; narrow and dark views have no runtime errors');expect(errors).toEqual([]);
 await writeFile(join(out,'result.json'),JSON.stringify({ok:true,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks}));
}catch(error){await page?.screenshot({path:join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();}
