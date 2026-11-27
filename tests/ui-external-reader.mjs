// Real settings and standard MCP client; synthetic saved work only.
import {spawn} from 'node:child_process';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {chromium,expect} from '@playwright/test';
import {selectSettingsCategory} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'),out=join(root,'test-results','external-reader');
await mkdir(out,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,page,client;
async function hashes(root){
  const result={};
  async function scan(path=''){for(const entry of await readdir(join(root,path),{withFileTypes:true})){if(entry.name==='.lock')continue;const file=path?path+'/'+entry.name:entry.name;if(entry.isDirectory())await scan(file);else if(entry.isFile())result[file]=createHash('sha256').update(await readFile(join(root,file))).digest('hex');}}
  await scan();return result;
}
try{
  const {url,dataDirectory}=await new Promise((done,reject)=>{
    let text='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),30000);
    host.stderr.on('data',part=>errors+=part);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors||'Preview exited'));});
    host.stdout.on('data',part=>{text+=part;const line=text.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);done(JSON.parse(line));}});
  });
  const rpc=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});if(!response.ok)throw Error(await response.text());return response.json();};
  const novelId=(await rpc('novel.list'))[0].id;
  const card=await rpc('graph.create',{novelId,type:'character_card',name:'合成角色·林岚',summary:'负责灯塔夜巡。',content:'他正在追查 A-61 的设备记录。'});
  const before=await hashes(dataDirectory);
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1250,height:950}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url);
  await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'AI与写作');
  await page.getByRole('button',{name:'MCP 连接管理',exact:true}).click();
  const external=page.getByRole('region',{name:'外部连接管理',exact:true});
  await external.getByRole('button',{name:/新建连接/}).click();
  const form=page.getByRole('dialog',{name:'新建长期连接',exact:true});
  await form.getByLabel('助手名称').fill('合成写手');
  await form.getByRole('checkbox',{name:'催更姬 · 试用作品'}).check();
  await form.getByRole('group',{name:'人物与世界设定',exact:true}).getByRole('button',{name:'只读'}).click();
  await form.getByRole('button',{name:'创建连接',exact:true}).click();
  const profile=external.getByRole('article',{name:'外部连接 合成写手',exact:true});await expect(profile).toBeVisible();
  const nav=external.getByRole('navigation',{name:'连接列表'});
  await rpc('external.create',{name:'负责世界观与长篇连续性的校对助手',novelIds:[novelId],permissions:{settings:'read'}});
  await expect(nav.getByRole('button')).toHaveCount(2,{timeout:8000});
  const rowsStacked=()=>nav.getByRole('button').evaluateAll(rows=>{
    const [first,second]=rows.map(row=>row.getBoundingClientRect());
    return second.top>=first.bottom&&Math.abs(second.left-first.left)<1&&first.height<100;
  });
  expect(await rowsStacked()).toBe(true);
  await profile.getByRole('button',{name:'客户端配置',exact:true}).click();
  const json=await profile.getByRole('textbox',{name:'合成写手的MCP客户端配置',exact:true}).inputValue();
  expect(json).not.toContain('token');
  const entries=Object.entries(JSON.parse(json).mcpServers);
  expect(entries).toHaveLength(1);expect(entries[0][0]).toMatch(/^cg_read_/);
  const config=entries[0][1];
  client=new Client({name:'settings-mcp-acceptance',version:'1.0'},{capabilities:{}});
  await client.connect(new StdioClientTransport({...config,stderr:'pipe'}));
  const call=(name,args={})=>client.callTool({name,arguments:args});
  const toolList=await client.listTools();expect(toolList.tools.some(tool=>tool.name==='cuigengji_chapter_get')).toBe(true);
  const found=JSON.parse((await call('cuigengji_novel_list',{query:'试用'})).content[0].text).items[0];expect(found.id).toBe(novelId);
  const read=await call('cuigengji_graph_get',{novelId,nodeId:card.id});expect(JSON.parse(read.content[0].text).content).toContain('A-61');
  await profile.getByRole('button',{name:'调用记录',exact:true}).click();
  await expect(profile.getByLabel('合成写手的调用记录', {exact:true})).toContainText('graph.get');
  await page.screenshot({path:join(out,'settings-desktop.png')});
  await profile.getByRole('button',{name:'权限',exact:true}).click();
  await profile.getByRole('button',{name:'编辑连接'}).click();
  const editing=page.getByRole('dialog',{name:'编辑连接'}),prior=(await rpc('external.status')).profiles.find(row=>row.name==='合成写手');
  await rpc('external.update',{id:prior.id,expectedRevision:prior.revision,permissions:{planning:'write'}});
  await expect(editing.getByRole('button',{name:'保存',exact:true})).toBeDisabled({timeout:8000});
  await editing.getByRole('button',{name:'载入最新配置'}).click();
  await expect(editing.getByRole('group',{name:'剧情规划'}).getByRole('button',{name:'读写'})).toHaveAttribute('aria-pressed','true');
  await editing.getByRole('button',{name:'取消'}).click();
  await profile.getByRole('group',{name:'正文与目录',exact:true}).getByRole('button',{name:'无权限'}).click();
  await expect(profile.getByRole('switch',{name:'启用连接 合成写手',exact:true})).toBeEnabled();
  expect((await call('cuigengji_chapter_list',{novelId})).structuredContent.error.code).toBe('CAPABILITY_DENIED');
  await profile.getByRole('switch',{name:'启用连接 合成写手',exact:true}).click();
  await expect(profile.getByRole('switch',{name:'启用连接 合成写手',exact:true})).not.toBeChecked();
  await expect(profile.getByRole('switch',{name:'启用连接 合成写手',exact:true})).toBeEnabled();
  expect((await call('cuigengji_graph_get',{novelId,nodeId:card.id})).structuredContent.error.code).toBe('UNAUTHORIZED');
  await profile.getByRole('switch',{name:'启用连接 合成写手',exact:true}).click();
  await expect(profile.getByRole('switch',{name:'启用连接 合成写手',exact:true})).toBeChecked();
  await expect(profile.getByRole('switch',{name:'启用连接 合成写手',exact:true})).toBeEnabled();
  expect((await call('cuigengji_graph_get',{novelId,nodeId:card.id})).isError).not.toBe(true);
  await page.setViewportSize({width:380,height:850});
  await profile.getByRole('button',{name:'‹ 连接列表'}).click();
  expect(await rowsStacked()).toBe(true);
  await nav.getByRole('button',{name:/合成写手/}).click();
  await expect(nav).toBeHidden();
  expect(await external.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await profile.getByRole('button',{name:'编辑连接'}).click();
  await page.setViewportSize({width:320,height:540});
  await expect(editing.getByRole('button',{name:'保存',exact:true})).toBeInViewport({ratio:1});
  expect(await editing.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await editing.getByRole('button',{name:'取消'}).click();
  await page.setViewportSize({width:380,height:850});
  await profile.scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'settings-narrow.png')});
  await page.setViewportSize({width:1250,height:950});
  await profile.getByRole('button',{name:'删除连接',exact:true}).click();
  await page.getByRole('dialog',{name:'删除连接',exact:true}).getByRole('button',{name:'确认删除',exact:true}).click();
  await expect(profile).toHaveCount(0);
  expect((await call('cuigengji_graph_get',{novelId,nodeId:card.id})).structuredContent.error.code).toBe('CONNECTION_UNAVAILABLE');
  expect(await hashes(dataDirectory)).toEqual(before);
  expect(errors).toEqual([]);
  await writeFile(join(out,'ui-report.json'),JSON.stringify({ok:true,checks:['create connection from production settings','client config contains no bearer token','real stdio MCP calls using copied configuration','actual query audit visible','permission change enforced immediately','disable and re-enable','narrow settings without horizontal overflow','revoke invalidates connection','every library byte unchanged'],pageErrors:errors},null,2));
  console.log('External reader settings and MCP acceptance passed.');
}catch(error){if(page)await page.screenshot({path:join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await client?.close();await browser?.close();if(host.exitCode===null)await new Promise(done=>{host.once('exit',done);host.kill();});}
