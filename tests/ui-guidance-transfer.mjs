import {selectSettingsCategory} from './helpers/navigation.mjs';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','guidance-transfer');
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs','--welcome'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser;
try {
 const {url}=await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);host.stderr.on('data',c=>errors+=c);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors));});host.stdout.on('data',c=>{output+=c;const line=output.split('\n').find(l=>l.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});});
 const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});if(!r.ok)throw Error(await r.text());return r.json();};
 const first=(await call('novel.list'))[0],second=await call('novel.create',{title:'尚未打开的第二部作品'});
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:900,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 const toggle=page.getByRole('switch',{name:'当前会话写作指引'});
 await expect(toggle).toHaveCount(0);
 await page.getByRole('button',{name:'设置',exact:true}).click();const settings=page.getByRole('dialog',{name:'设置'});
 await selectSettingsCategory(page,'AI与写作');await expect(toggle).not.toBeChecked();await toggle.click();await expect(toggle).toBeChecked();
 await settings.getByRole('button',{name:'关闭设置'}).click();await page.reload();await expect(toggle).toHaveCount(0);
 await page.getByRole('button',{name:'设置',exact:true}).click();await expect(toggle).toBeChecked();await toggle.click();await expect(toggle).not.toBeChecked();await settings.getByRole('button',{name:'关闭设置'}).click();
 await page.getByRole('button',{name:`导出《${second.title}》`,exact:true}).click();
 await expect(page.getByRole('button',{name:'下载文件',exact:true})).toBeEnabled();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'下载文件',exact:true}).click();const file=await pending;
 const exported=JSON.parse(await readFile(await file.path(),'utf8'));expect(exported.payload.projects.map(p=>p.id)).toEqual([second.id]);expect(await call('binding.get')).toBe(null);
 await page.getByRole('button',{name:'返回作品首页'}).click();await page.screenshot({path:join(shots,'home.png')});
 await page.getByRole('button',{name:`打开作品 ${first.title}`,exact:true}).click();await expect(toggle).toHaveCount(0);expect(await call('binding.get')).toBe(null);
 const cleanHeader=async()=>{await expect(page.locator('.guidance-bar,.conversation-scope')).toHaveCount(0);await expect(page.getByLabel('当前作品操作',{exact:true})).toHaveCount(0);await expect(page.getByText(/当前对话正在处理/)).toHaveCount(0);};
 await expect(page.locator('.chapter-item').first()).toBeVisible();await page.locator('.chapter-item').first().click();await cleanHeader();
 for(const width of [900,360]){await page.setViewportSize({width,height:850});expect(await page.locator('.cuigengji').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);await page.screenshot({path:join(shots,`book-${width}.png`)});}
 // Browsing another work stays quiet and does not silently change AI focus.
 // Seed an existing conversation target independently of the browsing UI.
 await call('binding.set',{novelId:first.id});
 await page.setViewportSize({width:900,height:850});await page.getByRole('button',{name:'作品首页',exact:true}).click();
 await page.getByRole('button',{name:`打开作品 ${second.title}`,exact:true}).click();await cleanHeader();expect((await call('binding.get')).novelId).toBe(first.id);
 await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'AI与写作');await expect(settings.getByRole('button',{name:'让当前对话接手此书',exact:false})).toHaveCount(0);
 expect((await call('binding.get')).novelId).toBe(first.id);await settings.getByRole('button',{name:'关闭设置'}).click();
 for(const name of ['规划','设定']){await page.getByRole('button',{name,exact:true}).click();await cleanHeader();}
 // The per-book card export remains available without opening the work first.
 await page.getByRole('button',{name:'作品首页',exact:true}).click();await page.getByRole('button',{name:`导出《${first.title}》`,exact:true}).click();await expect(page.getByRole('button',{name:'下载文件',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'返回作品首页'}).click();expect((await call('binding.get')).novelId).toBe(first.id);
 expect(errors).toEqual([]);console.log('Guidance settings, clean manuscript/planning/settings headers, browsing without changing conversation focus, card exports and 360px layout passed.');
} finally {await browser?.close();host.kill();}
