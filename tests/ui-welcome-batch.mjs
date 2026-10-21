import {selectSettingsCategory} from './helpers/navigation.mjs';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {openAuthorPage,showOrganization} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','welcome-batch');
await mkdir(shots,{recursive:true});
const hosts=[];
async function preview(flags) {
  const child=spawn(process.execPath,['scripts/preview-workbench.mjs',...flags],{cwd:root,stdio:['ignore','pipe','pipe']});hosts.push(child);
  const {url}=await new Promise((resolve,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(new Error('Preview timeout: '+errors)),25000);
    child.once('exit',code=>{clearTimeout(timer);reject(new Error('Preview exit '+code+': '+errors));});
    child.stderr.on('data',chunk=>{errors+=chunk;});
    child.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  return {url,call:async(action,args={})=>{
    const res=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});
    const value=await res.json();if(!res.ok)throw new Error(value.error);return value;
  }};
}
let browser,page;
try {
  const host=await preview(['--welcome']),{url,call}=host;
  const book=(await call('novel.list'))[0],initialFocus=await call('binding.get');
  for(const title of ['雾港来信','海边书店','月亮落在屋顶上','一千零一个故事','很长的作品名称也应该可以清楚显示并且不会把其他操作挤出页面','雨城归途','旧街的灯'])await call('novel.create',{title});
  const group=await call('graph.group.create',{novelId:book.id,name:'雾港 · 人物与世界'});
  const entries=[];
  for(let i=0;i<14;i++)entries.push(await call('graph.create',{novelId:book.id,type:i%2?'world_entry':'character_card',name:i===0?'林序':i===1?'雾港':'测试设定 '+(i+1),summary:i<2?'人物隐瞒了真正的来意，与雾港的旧案有关。':'一条用于验证长列表滚动的设定。',content:'正文保持不变。'}));
  const planGroup=await call('planning.group.create',{novelId:book.id,name:'码头行动',requestId:crypto.randomUUID()});
  const pageB=await call('planning.page.create',{novelId:book.id,name:'码头决战',summary:'主角与反派的行动在这里汇合。',requestId:crypto.randomUUID()});
  const plan=await call('planning.apply',{novelId:book.id,requestId:crypto.randomUUID(),operations:[
    ...Array.from({length:12},(_,i)=>({op:'node.create',ref:'beat'+i,value:{title:['潜入仓库','守卫发现异样','旧案线索浮出水面'][i%3]+(i>2?' · '+(i+1):''),summary:'行动与线索交错推进，在码头汇合。',position:{x:i*260,y:120}}})),
    {op:'edge.create',value:{from:'beat0',to:'beat1'}}
  ]});
  browser=await chromium.launch({headless:true});
  page=await browser.newPage({viewport:{width:1200,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const fits=async()=>expect(await page.locator('.cuigengji').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  const shot=async name=>{await fits();await page.screenshot({path:join(shots,name+'.png'),animations:'disabled'});};
  const openMenu=name=>openAuthorPage(page,name);
  const begin=async kind=>{await showOrganization(page);await page.getByRole('button',{name:'多选',exact:true}).click();await expect(page.getByRole('region',{name:'批量管理',exact:true})).toBeVisible();};
  const manager=()=>page.getByRole('region',{name:'批量管理',exact:true});
  await page.goto(url);
  await expect(page.getByRole('heading',{name:'故事，等你继续。'})).toBeVisible();
  await expect(page.getByAltText('催更姬头像，抱着玩偶的紫发少女')).toBeVisible();
  expect(await page.getByAltText('催更姬头像，抱着玩偶的紫发少女').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
  await expect(page.locator('.welcome-book')).toHaveCount(6);
  await shot('welcome-library-1200');
  await page.getByLabel('查找作品',{exact:true}).fill(book.title);
  await expect(page.locator('.welcome-book')).toHaveCount(1);
  await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'数据与备份');await page.getByRole('button',{name:'数据管理',exact:false}).click();
  await expect(page.getByRole('heading',{name:'导入 / 导出',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'‹ 返回设置',exact:true}).click();await page.getByRole('button',{name:'关闭设置',exact:true}).click();
  await expect(page.getByRole('heading',{name:'故事，等你继续。'})).toBeVisible();
  await page.getByLabel('查找作品',{exact:true}).fill(book.title);
   await page.getByRole('button',{name:'打开作品 '+book.title,exact:true}).click();
   await expect(page.getByRole('button',{name:'设定',exact:true})).toBeVisible();
  expect(await call('binding.get')).toEqual(initialFocus);
  await openMenu('作品首页');
  expect(await call('binding.get')).toEqual(initialFocus);
  await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'数据与备份');await page.getByRole('button',{name:'数据管理',exact:false}).click();
  await page.getByRole('button',{name:'‹ 返回设置',exact:true}).click();await page.getByRole('button',{name:'关闭设置',exact:true}).click();
   await page.getByLabel('查找作品',{exact:true}).fill(book.title);await page.getByRole('button',{name:'打开作品 '+book.title,exact:true}).click();
  await page.getByRole('button',{name:'设定',exact:true}).click();
  await begin('设定');
  await expect(manager().getByRole('status')).toHaveText('已选 0 项');
  await expect(manager().getByRole('button',{name:'移动',exact:true})).toBeDisabled();
  await page.locator('.directory-entry').filter({hasText:'林序'}).getByRole('button').click();
  await expect(page.getByRole('checkbox',{name:'选择 林序',exact:true})).toBeChecked();
  await page.getByRole('checkbox',{name:'选择 雾港',exact:true}).check();
  expect(await page.getByRole('checkbox',{name:'全选当前列表'}).evaluate(e=>e.indeterminate)).toBe(true);
  await manager().getByLabel('批量移动目标').selectOption('group:'+group.id);
  await shot('batch-settings-1200');
  await page.getByRole('button',{name:'搜索设定',exact:true}).click();
  await page.getByRole('textbox',{name:'搜索设定',exact:true}).fill('林序');
  await expect(page.locator('.directory-entry')).toHaveCount(1);
  await expect(manager().getByRole('status')).toHaveText('已选 1 项');
  await manager().getByRole('button',{name:'移动',exact:true}).click();
  await expect(manager().getByRole('status')).toHaveText('已选 0 项');
  expect((await call('graph.get',{novelId:book.id,nodeId:entries[0].id})).groupId).toBe(group.id);
  expect((await call('graph.get',{novelId:book.id,nodeId:entries[1].id})).groupId).toBe(null);
  await manager().getByRole('button',{name:'完成',exact:true}).click();
  await expect(page.getByRole('button',{name:'列表',exact:true})).toHaveCount(0);
  await page.getByRole('textbox',{name:'搜索设定',exact:true}).fill('');
  await begin('设定');await expect(page.locator('.directory-entry')).toHaveCount(14);await page.getByRole('checkbox',{name:'全选当前列表'}).check();
  await expect(manager().getByRole('status')).toHaveText('已选 14 项');
  await page.locator('.workspace-sidebar-scroll').evaluate(e=>{e.scrollTop=e.scrollHeight;});
  await expect(manager().getByRole('button',{name:'完成',exact:true})).toBeInViewport();
  await manager().getByRole('button',{name:'清空选择',exact:true}).click();
  await expect(manager().getByRole('status')).toHaveText('已选 0 项');
  await manager().getByRole('button',{name:'完成',exact:true}).click();
  await page.getByRole('button',{name:'规划',exact:true}).click();await begin('规划');
  await page.getByRole('checkbox',{name:'选择 潜入仓库',exact:true}).check();
  await manager().getByLabel('批量移动目标').selectOption('group:'+planGroup.id);
  // A failed save must retain both the author's selection and the current data.
  await page.route('**/dispatch',async route=>{const body=route.request().postDataJSON();if(body.action==='planning.apply'&&body.args.reason==='移动规划分组'){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'模拟保存失败'})});return;}await route.continue();});
  await manager().getByRole('button',{name:'移动',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('模拟保存失败');
  await expect(manager().getByRole('status')).toHaveText('已选 1 项');
  expect((await call('planning.get',{novelId:book.id,nodeId:plan.mapping.beat0})).node.groupId).toBe(null);
  await page.unroute('**/dispatch');await manager().getByRole('button',{name:'移动',exact:true}).click();
  await expect(manager().getByRole('status')).toHaveText('已选 0 项');
  expect((await call('planning.get',{novelId:book.id,nodeId:plan.mapping.beat0})).node.groupId).toBe(planGroup.id);
  await page.getByRole('checkbox',{name:'选择 潜入仓库',exact:true}).check();
  await manager().getByLabel('批量移动目标').selectOption('page:'+pageB.id);
  await manager().getByRole('button',{name:'移动',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('断开 1 条跨页连线');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await expect(manager().getByRole('status')).toHaveText('已选 1 项');
  expect((await call('planning.get',{novelId:book.id,nodeId:plan.mapping.beat0})).node.pageId).toBe(null);
  await page.getByRole('checkbox',{name:'选择 守卫发现异样',exact:true}).check();
  for(const width of [1200,560,360]){await page.setViewportSize({width,height:900});await shot('batch-planning-'+width);await expect(manager().getByRole('button',{name:'移动',exact:true})).toBeInViewport();}
  await page.setViewportSize({width:1200,height:900});
  await page.evaluate(()=>{for(const [name,value] of Object.entries({'--dsw-alias-bg-base':'#181a20','--dsw-alias-label-primary':'#e9edf5','--dsw-alias-label-secondary':'#99a0ad','--dsw-alias-border-l1':'#353a46'}))document.documentElement.style.setProperty(name,value);});
  await shot('batch-planning-dark-1200');
  await manager().getByRole('button',{name:'移动',exact:true}).click();
  await expect(page.getByRole('listbox',{name:'规划画布',exact:true}).getByRole('option',{selected:true})).toHaveAttribute('data-page-id',pageB.id);
  await expect(page.locator('.batch-manager')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'列表',exact:true})).toHaveCount(0);
  const saved=await call('planning.list',{novelId:book.id,pageId:pageB.id});
  expect(saved.items.map(n=>n.id).sort()).toEqual([plan.mapping.beat0,plan.mapping.beat1].sort());expect(saved.edges).toHaveLength(1);
  await openMenu('作品首页');await shot('welcome-dark-1200');
  await page.evaluate(()=>document.documentElement.removeAttribute('style'));
  for(const width of [560,360]){await page.setViewportSize({width,height:900});await shot('welcome-library-'+width);}
  const empty=await preview(['--empty']);await page.goto(empty.url);
  await expect(page.getByRole('heading',{name:'你的故事，从这里开始。'})).toBeVisible();
  await shot('welcome-empty-360');
  await page.getByRole('button',{name:'＋ 新建作品',exact:true}).click();await page.getByLabel('输入值',{exact:true}).fill('新故事');await page.getByRole('button',{name:'确定',exact:true}).click();
  await expect(page.getByRole('heading',{name:'选择一章，继续写作',exact:true})).toBeVisible();
  await expect(page.getByLabel('绑定小说',{exact:true})).toHaveCount(0);
  expect(await empty.call('binding.get')).toBe(null);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,checks:['welcome image, recent works, search, new/open/import and return without changing the agent focus','batch full-row selection, all/indeterminate/clear and visible-only movement','failed move retains selection; page cancellation preserves data; connected scenes move together','fixed operations and scrolling lists at 360/560/1200px; light/dark screenshots'],screenshots:shots}));
} catch(error){if(page)await page.screenshot({path:join(shots,'failure.png')});throw error;}
finally {await browser?.close();for(const child of hosts)child.kill();}
