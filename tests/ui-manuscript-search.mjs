import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','manuscript-search');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs','--sidebar-host'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try {
  const {url}=await new Promise((resolve,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(new Error(errors||'Preview timeout')),20000);
    preview.stderr.on('data',data=>{errors+=data;});preview.once('exit',code=>{clearTimeout(timer);reject(new Error(`Preview exit ${code}: ${errors}`));});
    preview.stdout.on('data',data=>{output+=data;const line=output.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{
    const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});
    const result=await response.json();if(!response.ok)throw new Error(result.error);return result;
  };
  const novelId=(await call('novel.list'))[0].id,a=(await call('chapter.list',{novelId}))[0];
  const first='雨声。雨声。Cat CAT cat。\n'+Array.from({length:100},(_,i)=>`第${i+1}段。她将来信放好，点亮窗边的灯。`).join('\n')+'\n远处仍有雨声。';
  await call('chapter.update',{novelId,chapterId:a.id,expectedRevision:a.revision,content:first});
  const b=await call('chapter.create',{novelId,title:'第二章 远行',content:'雨声之后，她开始远行。雨声还在身后。'});
  const trash=await call('chapter.create',{novelId,title:'旧稿',content:'雨声留在回收站。'});
  await call('chapter.delete',{novelId,chapterId:trash.id,expectedRevision:trash.revision,confirm:true});
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1250,height:920},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await page.locator('.chapter-item').first().click();
  let prose=page.getByLabel('正文',{exact:true});
  const panel=page.getByRole('dialog',{name:'正文查找与替换'}),query=page.getByRole('textbox',{name:'正文查找内容'}),replacement=page.getByRole('textbox',{name:'正文替换为'});
  const scope=page.getByRole('combobox',{name:'正文查找范围'});
  await expect(prose).toHaveValue(first);
  const editorBefore=await page.locator('.editor-scroll').boundingBox();
  await prose.focus();await page.keyboard.press('Control+f');await expect(panel).toBeVisible();await expect(query).toBeFocused();
  expect(await page.locator('.editor-scroll').boundingBox(),'floating search must not resize or move prose').toEqual(editorBefore);
  const floatingBefore=await panel.boundingBox(),handle=await panel.locator('.manuscript-search-heading').boundingBox();
  await page.mouse.move(handle.x+60,handle.y+14);await page.mouse.down();await page.mouse.move(handle.x-90,handle.y+95,{steps:6});await page.mouse.up();
  const floatingAfter=await panel.boundingBox();expect(floatingAfter.x).toBeLessThan(floatingBefore.x-100);expect(floatingAfter.y).toBeGreaterThan(floatingBefore.y+50);
  const sidebar=await page.locator('.sidebar-fixture-panel').boundingBox();
  expect(floatingAfter.x,'window can cross the sidebar boundary into DSH chat').toBeLessThan(sidebar.x-20);
  expect(await panel.evaluate(el=>el.closest('.manuscript-search-layer')?.parentElement===document.body)).toBe(true);
  expect(await page.locator('.editor-scroll').boundingBox()).toEqual(editorBefore);
  // The full-window layer must not intercept clicks or typing in DSH itself.
  await page.getByRole('textbox',{name:'试用聊天输入'}).fill('聊天区域仍能输入');
  await expect(page.getByRole('textbox',{name:'试用聊天输入'})).toHaveValue('聊天区域仍能输入');
  // Non-modal means the author can type behind it and then return to searching.
  await prose.evaluate(el=>{el.focus({preventScroll:true});el.setSelectionRange(0,0);});await page.keyboard.insertText('写');
  await expect(prose).toHaveValue('写'+first);await expect(panel).toBeVisible();await page.keyboard.press('Control+z');await expect(prose).toHaveValue(first);
  await query.fill('雨声');await expect(panel.locator('.manuscript-search-summary')).toContainText('3 处');
  await panel.getByRole('button',{name:'下一个正文匹配'}).click();
  expect(await prose.evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd))).toBe('雨声');
  await panel.locator('.manuscript-search-result').last().click();
  expect(await page.locator('.editor-scroll').evaluate(el=>el.scrollTop)).toBeGreaterThan(1000);
  expect(await prose.evaluate(el=>({start:el.selectionStart,end:el.selectionEnd}))).toEqual({start:first.lastIndexOf('雨声'),end:first.lastIndexOf('雨声')+2});
  await page.keyboard.press('Control+h');await expect(replacement).toBeVisible();await replacement.fill('风声');
  await panel.getByRole('button',{name:'替换当前',exact:true}).click();
  await expect(prose).toHaveValue(first.slice(0,first.lastIndexOf('雨声'))+'风声。');
  await expect(page.locator('.auto-savebar')).toContainText('已保存');
  await prose.focus();await page.keyboard.press('Control+z');await expect(prose).toHaveValue(first);
  await page.keyboard.press('Control+y');await expect(prose).toHaveValue(first.slice(0,first.lastIndexOf('雨声'))+'风声。');
  await page.keyboard.press('Control+z');await expect(prose).toHaveValue(first);
  await expect(page.locator('.auto-savebar')).toContainText('已保存');

  // Literal $ syntax, case switching and current-chapter replace-all with native undo.
  await query.fill('cat');await expect(panel.locator('.manuscript-search-summary')).toContainText('3 处');
  await panel.getByRole('checkbox',{name:'区分大小写'}).check();await expect(panel.locator('.manuscript-search-summary')).toContainText('1 处');
  await panel.getByRole('checkbox',{name:'区分大小写'}).uncheck();await replacement.fill('$&');
  await panel.getByRole('button',{name:'全部替换…'}).click();await expect(page.getByLabel('正文替换预览')).toBeVisible();
  await panel.getByRole('button',{name:'确认替换 3 处'}).click();await expect(prose).toHaveValue(first.replace(/cat/gi,'$'+'$&'));
  await prose.focus();await page.keyboard.press('Control+z');await expect(prose).toHaveValue(first);
  await expect(page.locator('.auto-savebar')).toContainText('已保存');

  // Search the whole book, navigate to another chapter without losing the panel.
  await query.fill('雨声');await replacement.fill('风声');await scope.selectOption('novel');
  await expect(panel.locator('.manuscript-search-summary')).toContainText('5 处',{timeout:15000});
  await panel.locator('.manuscript-search-result').last().click();
  await expect(page.getByRole('heading',{name:'第二章 远行',exact:true})).toBeVisible();
  prose=page.getByLabel('正文',{exact:true});await expect(panel).toBeVisible();await expect(query).toHaveValue('雨声');
  expect(await prose.evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd))).toBe('雨声');
  await expect(panel.locator('.manuscript-search-summary')).toContainText('5 处');
  await panel.getByRole('button',{name:'全部替换…'}).click();await expect(page.getByLabel('正文替换预览')).toContainText('5 处 · 2 章');
  const remote=await call('chapter.get',{novelId,chapterId:a.id,maxChars:200000});
  await call('chapter.update',{novelId,chapterId:a.id,expectedRevision:remote.revision,append:'\nAI新增内容。'});
  await panel.getByRole('button',{name:'确认替换 5 处'}).click();
  await expect(panel.getByRole('alert')).toContainText('正文已变化');
  expect((await call('chapter.get',{novelId,chapterId:b.id})).content).toContain('雨声');
  await panel.getByRole('button',{name:'重新查找'}).click();
  await expect(panel.locator('.manuscript-search-summary')).toContainText('5 处');
  await panel.getByRole('button',{name:'全部替换…'}).click();await panel.getByRole('button',{name:'确认替换 5 处'}).click();
  await expect(panel.getByRole('status').filter({hasText:'已替换 5 处'})).toBeVisible();
  expect((await call('chapter.get',{novelId,chapterId:a.id,maxChars:200000})).content).toContain('AI新增内容。');
  expect((await call('chapter.get',{novelId,chapterId:b.id})).content).toBe('风声之后，她开始远行。风声还在身后。');
  expect((await call('chapter.get',{novelId,chapterId:trash.id})).content).toBe('雨声留在回收站。');
  const history=await call('chapter.history',{novelId,chapterId:b.id,includeContent:true});
  expect(history[0].content).toBe('雨声之后，她开始远行。雨声还在身后。');
  await expect(panel.locator('.manuscript-search-summary')).toContainText('0 处');
  await page.screenshot({path:join(shots,'wide.png'),animations:'disabled'});

  // Small side panels stay usable without horizontal page overflow.
  await page.setViewportSize({width:460,height:900});
  await scope.selectOption('chapter');await query.fill('风声');
  await expect(panel.locator('.manuscript-search-summary')).toContainText('2 处');
  await expect(panel.getByRole('button',{name:'替换当前',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:join(shots,'narrow.png'),animations:'disabled'});
  await page.setViewportSize({width:1250,height:920});
  const cached=await call('chapter.create',{novelId,title:'第三章 草稿',content:'保存的旧稿。'}),cachedBase=await call('chapter.get',{novelId,chapterId:cached.id});
  const cachedContent='暗号。'.repeat(75);
  await page.evaluate(({novelId,id,base,content})=>localStorage.setItem(`cuigengji:draft:v2:production-preview:${novelId}:chapter:${id}`,JSON.stringify({base,value:{...base,content}})),{novelId,id:cached.id,base:cachedBase,content:cachedContent});
  await scope.selectOption('novel');await query.fill('暗号');await replacement.fill('密码');
  await expect(panel.locator('.manuscript-search-summary')).toContainText('75 处',{timeout:15000});
  expect((await call('chapter.get',{novelId,chapterId:cached.id})).content).toBe(cachedContent);
  await panel.getByRole('button',{name:'下一页',exact:true}).click();await expect(panel.locator('.manuscript-search-pages')).toContainText('61–75 / 75');
  // Replacing a match from a different chapter first opens it and checks its version.
  await panel.getByRole('button',{name:'替换当前',exact:true}).click();
  await expect(page.getByRole('heading',{name:'第三章 草稿',exact:true})).toBeVisible();
  await expect(prose).toHaveValue('暗号。'.repeat(60)+'密码。'+'暗号。'.repeat(14));
  await prose.focus();await page.keyboard.press('Control+z');await expect(prose).toHaveValue(cachedContent);
  await query.focus();await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(prose).toBeFocused();
  // A body portal follows native tab visibility, not merely component lifetime.
  await page.keyboard.press('Control+f');await expect(panel).toBeVisible();
  await page.getByRole('button',{name:'收起试用侧栏',exact:true}).click();await expect(panel).toBeHidden();
  await page.getByRole('textbox',{name:'试用聊天输入'}).fill('切换到其他会话后没有残留浮窗');
  await expect(page.getByRole('textbox',{name:'试用聊天输入'})).toBeFocused();
  await page.getByRole('button',{name:'展开试用侧栏',exact:true}).click();await expect(panel).toBeVisible();await expect(query).toHaveValue('暗号');
  await page.getByRole('button',{name:'设置',exact:true}).click();await expect(panel).toBeHidden();
  await page.getByRole('button',{name:'关闭设置',exact:true}).click();await expect(panel).toBeVisible();
  const dragTo=async(x,y)=>{
    const heading=await panel.locator('.manuscript-search-heading').boundingBox(),box=await panel.boundingBox();
    const pointer={x:heading.x+50,y:heading.y+14};
    await page.mouse.move(pointer.x,pointer.y);await page.mouse.down();await page.mouse.move(x+pointer.x-box.x,y+pointer.y-box.y,{steps:6});await page.mouse.up();
  };
  await dragTo(40,150);expect((await panel.boundingBox()).x).toBeCloseTo(40,0);
  // Resizing the sidebar neither moves nor constrains the app-level window.
  await page.locator('.sidebar-fixture-panel').evaluate(el=>el.style.width='560px');
  expect((await panel.boundingBox()).x).toBeCloseTo(40,0);
  await dragTo(1100,700);
  let fitted=await panel.boundingBox();expect(fitted.x+fitted.width).toBeLessThanOrEqual(1242);expect(fitted.y+fitted.height).toBeLessThanOrEqual(912);
  await page.setViewportSize({width:680,height:640});
  await expect.poll(async()=>{const box=await panel.boundingBox();return box.x+box.width;}).toBeLessThanOrEqual(672);
  fitted=await panel.boundingBox();expect(fitted.y+fitted.height).toBeLessThanOrEqual(632);
  await dragTo(-100,-100);fitted=await panel.boundingBox();expect(fitted.x).toBe(8);expect(fitted.y).toBe(8);
  await query.focus();await page.keyboard.press('Escape');await expect(page.locator('.manuscript-search-layer')).toHaveCount(0);await expect(prose).toBeFocused();
  expect(errors).toEqual([]);
  const report={ok:true,checks:['Ctrl+F/H and Escape','app-wide floating window escapes sidebar clipping and preserves prose geometry','DSH chat remains interactive outside the window','native tab visibility and settings suspend the portal without losing its state','sidebar resizing does not move the window','viewport resizing and drag boundaries keep the window reachable','literal/case search','long prose native selection and parent scrolling','single replacement native undo/redo after autosave','current chapter replace-all preview and undo','whole book results and cross-chapter navigation/replacement','atomic rejection of concurrent edits','whole book replacement/history/trash exclusion','dormant cached drafts included in search','paginated 75-match results','narrow floating window layout']};
  await writeFile(join(shots,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();preview.kill();}
