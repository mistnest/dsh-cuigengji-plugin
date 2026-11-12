// Production UI + Store, disposable synthetic data. No desktop control or model calls.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization,clearCanvasSelection,batchCommand} from './helpers/navigation.mjs';
const root=resolve(import.meta.dirname,'..'),out=join(root,'test-results','director-workspaces');
await mkdir(out,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;const errors=[],checks=[];
try{
 const {url}=await new Promise((resolve,reject)=>{let stdout='',stderr='';const timer=setTimeout(()=>reject(Error(stderr||'Preview timeout')),25000);host.stderr.on('data',s=>stderr+=s);host.once('exit',()=>{clearTimeout(timer);reject(Error(stderr||'Preview stopped'));});host.stdout.on('data',s=>{stdout+=s;const line=stdout.split('\n').find(s=>s.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
 const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})}),body=await r.json();if(!r.ok)throw Error(body.error);return body;};
 const novelId=(await call('novel.list'))[0].id,run=(action,args={})=>call(action,{novelId,requestId:crypto.randomUUID(),...args});
 const old=await run('graph.page.create',{name:'乌坦城',summary:'旧版画布自动变成真实文件夹'}),clan=await run('graph.group.create',{name:'萧家',pageId:old.id}),branch=await run('graph.group.create',{name:'年轻一辈',parentId:clan.id});
 const a=await run('graph.create',{type:'character_card',name:'萧炎',summary:'立下约定的少年',content:'当前人物全文',groupId:branch.id,position:{x:160,y:200}}),b=await run('graph.create',{type:'character_card',name:'萧战',summary:'萧家族长',content:'当前族长全文',groupId:clan.id,position:{x:520,y:200}}),outside=await run('graph.create',{type:'world_entry',name:'云岚宗',summary:'三年约定的山门',content:'外部资源正文',position:{x:1000,y:200}});
 await run('edge.create',{from:a.id,to:outside.id,name:'三年之约'});
 const tx=await run('planning.apply',{operations:[
  {op:'node.create',ref:'opening',value:{title:'开篇',summary:'处境与选择',position:{x:50,y:60}}},
  {op:'node.create',ref:'incident',value:{title:'退婚风波',summary:'登门引出冲突与约定',parentId:'opening',position:{x:100,y:180}}},
  {op:'node.create',ref:'arrival',value:{title:'登门退婚',parentId:'incident',memoryRefs:[a.id],position:{x:170,y:280}}},
  {op:'node.create',ref:'conflict',value:{title:'双方冲突',parentId:'incident',position:{x:500,y:280}}},
  {op:'node.create',ref:'promise',value:{title:'立下约定',parentId:'opening',position:{x:900,y:280}}},
  {op:'edge.create',value:{from:'arrival',to:'conflict'}},{op:'edge.create',value:{from:'conflict',to:'promise'}},
 ]});
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true}),card=id=>page.locator(`.planning-card[data-node-id="${id}"]`),folder=id=>page.locator(`.canvas-folder[data-folder-id="${id}"]`),entry=id=>page.locator(`.directory-entry[data-entry-id="${id}"]`),row=id=>page.locator(`.tree-folder[data-tree-id="${id}"]>.tree-folder-row`);
 await page.goto(url);await button('设定').click();await showOrganization(page);await expect(card(a.id)).toBeVisible();
 await expect(page.getByRole('listbox',{name:'设定画布'})).toHaveCount(0);
 const oldFolder=(await run('graph.groups')).find(g=>g.name==='乌坦城');expect(oldFolder).toBeTruthy();
 await row(clan.id).getByRole('button',{name:'萧家',exact:true}).click();await expect(page.getByRole('navigation',{name:'设定路径'})).toContainText('乌坦城');await expect(card(a.id)).toBeVisible();await expect(card(outside.id)).toHaveCount(0);await expect(folder(clan.id)).toHaveCount(0);await expect(folder(branch.id)).toBeVisible();
 await expect(page.locator('.resource-external')).toContainText('文件夹外的关联 · 1');
 // The full directory stays accessible, while select all follows the active folder.
 const batch=page.getByRole('region',{name:'批量管理',exact:true});
 await button('多选').click();
 const allInFolder=batch.getByRole('checkbox',{name:'全选当前文件夹',exact:true});
 await allInFolder.check();
 await expect(batch.getByRole('status')).toHaveText('已选 2 项');
 await expect(card(a.id)).toHaveClass(/selected/);
 await expect(card(b.id)).toHaveClass(/selected/);
 await expect(entry(outside.id).getByRole('checkbox')).not.toBeChecked();
 await batchCommand(page,'删除');
 const removal=page.getByRole('dialog').filter({hasText:'删除选中的 2 张设定卡片'});
 await expect(removal).toBeVisible();
 await removal.getByRole('button',{name:'取消',exact:true}).click();
 await allInFolder.uncheck();
 const search=page.getByRole('textbox',{name:'搜索设定',exact:true});
 await search.fill('约定');
 await batch.getByRole('checkbox',{name:'全选本文件夹命中项',exact:true}).check();
 await expect(batch.getByRole('status')).toHaveText('已选 1 项');
 await expect(card(a.id)).toHaveClass(/selected/);
 await expect(entry(outside.id).getByRole('checkbox')).not.toBeChecked();
 await button('完成').click();
 await search.fill('');
 checks.push('setting select all covers the active folder and descendants and intersects search matches');
 const current=await run('graph.get',{nodeId:a.id});expect(current.content).toBe('当前人物全文');expect(current.pageId).toBe(null);expect((await run('graph.groups')).find(g=>g.id===clan.id).parentId).toBe(oldFolder.id);
 // Chevron folds the explorer only, without switching scope or hiding the canvas.
 await row(clan.id).locator('.tree-chevron').click();await expect(card(a.id)).toBeVisible();await expect(page.getByRole('navigation',{name:'设定路径'})).toContainText('萧家');
 await button('收纳文件夹 年轻一辈').click();await expect(card(a.id)).toHaveCount(0);await button('展开文件夹 年轻一辈').click();await expect(card(a.id)).toBeVisible();
 await button('进入文件夹 年轻一辈').click();await expect(card(a.id)).toBeVisible();await expect(card(b.id)).toHaveCount(0);await expect(folder(branch.id)).toHaveCount(0);
 await button('适应视图').click();await page.mouse.move(1050,480);await page.keyboard.down('Control');await page.mouse.wheel(0,160);await page.keyboard.up('Control');await page.waitForTimeout(350);
 const zoom=await page.getByRole('button',{name:'恢复百分之百缩放'}).textContent();
 await page.getByRole('navigation',{name:'设定路径'}).getByRole('button',{name:'萧家',exact:true}).click();await expect(card(b.id)).toBeVisible();await button('进入文件夹 年轻一辈').click();await expect(page.getByRole('button',{name:'恢复百分之百缩放'})).toHaveText(zoom);
 checks.push('legacy pages become real folders; folder navigation, explorer folds and per-folder camera are independent');
 await button('收起组织侧栏').click();
 await page.locator('.resource-external summary').click();await button('云岚宗 ↗').click();await expect(page.locator('.memory-detail')).toContainText('外部资源正文');await button('‹ 返回设定').click();await expect(card(outside.id)).toBeVisible();
 await showOrganization(page);
 await row(clan.id).getByRole('button',{name:'萧家',exact:true}).click();await card(b.id).click();await expect(page.locator('.memory-detail')).toHaveCount(0);await card(b.id).dblclick();await expect(page.locator('.memory-detail')).toContainText('当前族长全文');await button('‹ 返回设定').click();
 // Single-clicking an item outside the current folder enters its location before focusing.
 if(await row(clan.id).locator('.tree-chevron').getAttribute('aria-expanded')==='false')await row(clan.id).locator('.tree-chevron').click();
 if(await row(branch.id).locator('.tree-chevron').getAttribute('aria-expanded')==='false')await row(branch.id).locator('.tree-chevron').click();
 await row(branch.id).getByRole('button',{name:'年轻一辈',exact:true}).click();await entry(b.id).getByRole('button',{name:'选中 萧战',exact:true}).click();await expect(card(b.id)).toBeVisible();await expect(page.locator('.memory-detail')).toHaveCount(0);
 checks.push('external relations jump to the original card; single click selects, double click opens and directory focus changes scope');
 await page.screenshot({path:join(out,'resources-wide.png')});
 await button('规划').click();await showOrganization(page);await button('适应视图').click();
 await entry(tx.mapping.opening).locator('.tree-chevron').click();await entry(tx.mapping.incident).locator('.tree-chevron').click();
 await expect(folder(tx.mapping.opening)).toBeVisible();await expect(folder(tx.mapping.incident)).toBeVisible();await expect(card(tx.mapping.incident)).toHaveCount(0);await expect(entry(tx.mapping.incident)).toBeVisible();
 const incidentBranch=entry(tx.mapping.incident).locator('..');await expect(incidentBranch.locator(`[data-entry-id="${tx.mapping.arrival}"]`)).toBeVisible();
 await button('收起阶段 退婚风波').click();await expect(entry(tx.mapping.arrival)).toHaveCount(0);await expect(card(tx.mapping.arrival)).toBeVisible();await button('展开阶段 退婚风波').click();
 await button('收纳阶段 退婚风波').click();await expect(card(tx.mapping.arrival)).toHaveCount(0);await expect(folder(tx.mapping.incident)).toContainText('登门引出冲突与约定');await expect(folder(tx.mapping.incident)).toContainText('1 条外部连接');await expect(entry(tx.mapping.arrival)).toBeVisible();
 await button('展开阶段 退婚风波').click();await expect(card(tx.mapping.arrival)).toBeVisible();
 await button('自动排布').click();await expect(page.locator('.graph-status')).not.toContainText('保存失败');await expect.poll(async()=>((await run('planning.get',{nodeId:tx.mapping.arrival})).node.revision)).toBeGreaterThan(1);
 checks.push('planning stages are one node with nested children; independent directory folds, canvas summary and real edge projection');
 // Reordering siblings in the directory never changes their canvas positions.
 const before=(await run('planning.get',{nodeId:tx.mapping.conflict})).node;
 await expect(entry(before.id).getByRole('button',{name:'选中 双方冲突',exact:true})).toBeEnabled();await entry(before.id).getByRole('button',{name:'选中 双方冲突',exact:true}).focus();await page.keyboard.press('Alt+ArrowUp');
 await expect.poll(async()=>{const items=(await run('planning.list',{pageId:null})).items.filter(n=>n.parentId===tx.mapping.incident);return items.map(n=>n.id);}).toEqual([tx.mapping.conflict,tx.mapping.arrival]);expect((await run('planning.get',{nodeId:before.id})).node.position).toEqual(before.position);
 await expect(button('打开阶段 退婚风波')).toBeEnabled();await folder(tx.mapping.incident).locator('header').dblclick();await expect(page.locator('.planning-detail')).toContainText('退婚风波');await page.locator('.planning-detail').getByRole('button',{name:'＋ 子情节',exact:true}).click();
 const draft=page.locator('.canvas-draft');await button('折叠全部目录').click();await expect(entry(tx.mapping.arrival)).toHaveCount(0);await expect(draft).toContainText('属于 · 退婚风波');await draft.getByLabel('情节标题',{exact:true}).fill('离场余波');await draft.getByRole('button',{name:'创建',exact:true}).click();
 let created;await expect.poll(async()=>{created=(await run('planning.list')).items.find(n=>n.title==='离场余波');return created?.parentId;}).toBe(tx.mapping.incident);
 await expect(draft).toHaveCount(0);await expect(entry(created.id)).toBeVisible();await clearCanvasSelection(page);await button('适应视图').click();await button('收纳阶段 开篇').click();await expect(card(created.id)).toHaveCount(0);await expect(folder(tx.mapping.incident)).toHaveCount(0);
 await button('导出图片').click();const dialog=page.getByRole('dialog',{name:'导出画布图片',exact:true});await dialog.getByLabel('图片格式',{exact:true}).selectOption('svg');const downloading=page.waitForEvent('download');await dialog.getByRole('button',{name:'保存图片',exact:true}).click();await (await downloading).saveAs(join(out,'planning.svg'));expect(await readFile(join(out,'planning.svg'),'utf8')).toContain('开篇');await page.keyboard.press('Escape');
 const portBox=await folder(tx.mapping.opening).locator('[data-graph-port]').first().boundingBox();expect(portBox.width).toBeGreaterThan(10);expect(portBox.width).toBeLessThanOrEqual(33);await page.screenshot({path:join(out,'planning-wide.png')});await page.reload();await button('规划').click();await expect(folder(tx.mapping.opening)).toHaveClass(/canvas-folder-folded/);await expect(card(created.id)).toHaveCount(0);
 await page.setViewportSize({width:440,height:820});await page.screenshot({path:join(out,'planning-narrow.png')});await page.setViewportSize({width:1500,height:1000});
 // Duplicating a parent and child preserves their relationship in the copy.
 await button('多选').click();await entry(created.id).getByRole('checkbox').check();await entry(tx.mapping.incident).getByRole('checkbox').check();await batchCommand(page,'复制');
 let copiedChild,copiedStage;await expect.poll(async()=>{const all=(await run('planning.list')).items;copiedChild=all.find(n=>n.title==='离场余波 · 副本');copiedStage=all.find(n=>n.title==='退婚风波 · 副本');return Boolean(copiedStage&&copiedChild?.parentId===copiedStage.id);}).toBe(true);await button('完成').click();
 await entry(copiedStage.id).locator('.tree-chevron').click();
 // C wraps selected items in a folder, removing only their old external stage parent.
 await entry(copiedChild.id).getByRole('button',{name:'选中 离场余波 · 副本',exact:true}).click();await expect(card(copiedChild.id)).toHaveClass(/selected/);await page.locator('.planning-canvas-scroll').press('c');const folderPrompt=page.getByRole('dialog',{name:'文件夹名称',exact:true});await folderPrompt.getByRole('textbox').fill('独立试演');await folderPrompt.locator('button[type=submit]').click();await expect(folderPrompt).toHaveCount(0);
 await expect.poll(async()=>(await run('planning.get',{nodeId:copiedChild.id})).node.parentId).toBe(null);const movedCopy=(await run('planning.get',{nodeId:copiedChild.id})).node;expect((await run('planning.groups')).find(g=>g.id===movedCopy.groupId).name).toBe('独立试演');expect((await run('planning.get',{nodeId:created.id})).node.parentId).toBe(tx.mapping.incident);
 // Delete on an original stage removes that header and keeps the real children.
 await expect(entry(tx.mapping.opening).getByRole('button',{name:'选中 开篇',exact:true})).toBeEnabled();await entry(tx.mapping.opening).getByRole('button',{name:'选中 开篇',exact:true}).click();await expect(folder(tx.mapping.opening)).toHaveClass(/selected/);await expect(page.getByRole('toolbar',{name:'阶段操作',exact:true})).toHaveCount(0);await page.locator('.planning-canvas-scroll').press('Delete');const confirmation=page.getByRole('dialog');await expect(confirmation).toContainText('删除选中的 1 项');await confirmation.locator('button[type=submit]').click();await expect.poll(async()=>(await run('planning.list')).items.some(n=>n.id===tx.mapping.opening)).toBe(false);expect((await run('planning.get',{nodeId:tx.mapping.incident})).node.parentId).toBe(null);expect((await run('planning.get',{nodeId:created.id})).node.parentId).toBe(tx.mapping.incident);
 // The middle of a target row means containment, with a visible drop cue.
 const dragNode=tx.mapping.arrival,targetNode=tx.mapping.promise,positionBefore=(await run('planning.get',{nodeId:dragNode})).node.position;
 const startDrag=async()=>{const start=await entry(dragNode).locator('.directory-grip').boundingBox();await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(start.x+25,start.y+start.height/2,{steps:4});};
 await expect(entry(tx.mapping.opening)).toHaveCount(0);await expect(entry(targetNode).getByRole('button',{name:'选中 立下约定',exact:true})).toBeEnabled();await expect(entry(dragNode)).toBeVisible();const targetBounds=await entry(targetNode).boundingBox();await startDrag();await page.mouse.move(targetBounds.x+75,targetBounds.y+targetBounds.height/2,{steps:12});await expect(entry(targetNode)).toHaveClass(/directory-drop-inside/);await page.mouse.up();await expect.poll(async()=>(await run('planning.get',{nodeId:dragNode})).node.parentId).toBe(targetNode);expect((await run('planning.get',{nodeId:dragNode})).node.position).toEqual(positionBefore);
 await entry(targetNode).locator('.tree-chevron').click();await expect(entry(dragNode).getByRole('button',{name:'选中 登门退婚',exact:true})).toBeEnabled();await startDrag();const dropRoot=page.locator('.tree-root-drop');await expect(dropRoot).toBeVisible();const rootBounds=await dropRoot.boundingBox();await page.mouse.move(rootBounds.x+rootBounds.width/2,rootBounds.y+rootBounds.height/2,{steps:12});await page.mouse.up();await expect.poll(async()=>(await run('planning.get',{nodeId:dragNode})).node.parentId).toBe(null);expect((await run('planning.get',{nodeId:dragNode})).node.position).toEqual(positionBefore);
 checks.push('parent-child copies reference the copied parent; folder wrapping detaches only the old parent; deletion preserves children; pointer reparenting and root moves preserve coordinates');
 expect(errors).toEqual([]);checks.push('sibling order does not move cards; stage child creation, reload, SVG export and narrow layout succeed without runtime errors');
 await writeFile(join(out,'result.json'),JSON.stringify({ok:true,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks}));
}catch(error){await page?.screenshot({path:join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();host.kill();}
