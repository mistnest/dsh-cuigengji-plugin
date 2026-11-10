// Actual bundled DSH Host + browser integration, using only disposable data.
// This test never sends a chat message or calls a model provider.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {selectSettingsCategory} from '../tests/helpers/navigation.mjs';

const argv=process.argv.slice(2),arg=name=>argv[argv.indexOf(name)+1];
assert.ok((argv.includes('--desktop-exe')!==argv.includes('--cli'))&&argv.includes('--package'),'(--desktop-exe <exe> | --cli <bin.js> --pnpm <pnpm.mjs>) --package <tgz> [--report <json>]');
const cliMode=argv.includes('--cli');
const exe=cliMode?process.execPath:resolve(arg('--desktop-exe')),archive=resolve(arg('--package'));
const hostCli=cliMode?resolve(arg('--cli')):join(dirname(exe),'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js');
const hostAnchor=cliMode?resolve(dirname(hostCli),'../package.json'):undefined;
if(cliMode)assert.ok(argv.includes('--pnpm'),'CLI acceptance needs an explicit pnpm.mjs from a trusted runtime');
const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const root=await mkdtemp(join(tmpdir(),'cuigengji-host-compat-')),home=join(root,'home'),profile=join(home,'profiles/compatibility');
const runtime=join(dirname(exe),'resources/runtime'), windows=process.env.SystemRoot||'C:\\Windows';
const env={...process.env,DSH_HOME:home,CUIGENGJI_DATA_ROOT:join(root,'novel-data'),DSH_DESKTOP_NODE_EXECUTABLE:exe,ELECTRON_RUN_AS_NODE:'1',CI:'true',
  PNPM_HOME:join(root,'pnpm'),PATH:[cliMode?dirname(exe):join(runtime,'bin'),join(windows,'System32'),windows].join(';')};
for(const key of ['NODE_OPTIONS','DEEPSEEK_API_KEY','OPENAI_API_KEY','DSH_URL','DSH_TOKEN'])delete env[key];
const report={ok:false,pluginVersion:manifest.version,hostKind:cliMode?'npm-web':'desktop-bundled-web',modelCalls:0,checks:[]};
let child,browser,page,log='';
try {
  await mkdir(profile,{recursive:true});
  await writeFile(join(profile,'package.json'),JSON.stringify({name:'isolated-host-compatibility',private:true,dsh:{profile:{bundles:['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app']}}}));
  const installed=spawnSync(exe,['--expose-internals',fileURLToPath(new URL('./desktop-package-operation.mjs',import.meta.url)),JSON.stringify({
    context:{profile:'compatibility',dir:profile,cwd:root,home},args:['add',archive,...(argv.includes('--registry')?['--registry='+arg('--registry')]:[])],options:{execution:'service',outputBytes:5000,activateNewBundles:true,idleTimeoutMs:120000,lookupTimeoutMs:20000,lockWaitMs:10000},
    ...(cliMode?{runtime:{anchor:hostAnchor,pnpm:resolve(arg('--pnpm'))}}:{}),
  })],{env,encoding:'utf8',windowsHide:true,timeout:240000});
  assert.equal(installed.status,0,installed.stderr||installed.stdout||installed.error?.message);
  const installation=JSON.parse(installed.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(installation.exitCode,0,installation.output);report.dshVersion=installation.runtimeVersion;
  const metadata=spawnSync(exe,['--expose-internals',fileURLToPath(new URL('./check-installed-metadata.mjs',import.meta.url)),profile,...(hostAnchor?[hostAnchor]:[])],{env,encoding:'utf8',windowsHide:true,timeout:30000});
  assert.equal(metadata.status,0,metadata.stderr||metadata.stdout);report.metadata=JSON.parse(metadata.stdout.trim());
  const probe=join(root,'probe.mjs');
  await mkdir(join(root,'writing-workspace'));
  await writeFile(probe,`export const inject=['connection','cuigengji','tools','skills','workspaceRegistry'];
export function apply(ctx){ctx.connection.fetch.register({path:'/api/isolated-cuigengji-probe',methods:['POST'],requestBody:'buffered',fetch:async request=>{
  const {sessionId,name,action,args}=await request.json();
  if(name==='fixture-workspace')return Response.json({id:(await ctx.workspaceRegistry.create(args.path,'兼容验收')).id});
  const tools=['cuigengji_project','cuigengji_plan','cuigengji_memory','cuigengji_context','cuigengji_guidance','cuigengji_maintenance','cuigengji_variables'];
  for(const tool of tools)if(!ctx.tools.get(tool))throw new Error('Missing tool '+tool);
  const skills=(await ctx.skills.list()).filter(skill=>skill.name.startsWith('cuigengji-')).map(skill=>skill.name);
  const result=await ctx.tools.get(name).execute(name==='cuigengji_guidance'?{section:action,args}:{action,args},{agent:{id:sessionId},callId:crypto.randomUUID(),signal:request.signal});
  return Response.json({tools,skills,result:JSON.parse(result)});
}});}`);
  const patch=join(root,'probe.patch.yml');await writeFile(patch,`- insert:\n    - id: isolated-compatibility-probe\n      name: ${JSON.stringify(probe)}\n`);
  child=spawn(exe,['--expose-internals',hostCli,'--profile','compatibility','--patch',patch,'--host','127.0.0.1','--port','0','--no-open'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const url=await new Promise((done,reject)=>{
    // Cold alpha Hosts load a larger first-run plugin tree on Windows.
    const timer=setTimeout(()=>reject(new Error('Host startup timed out')),120000);
    const receive=bytes=>{log+=bytes;const match=log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/);if(match){clearTimeout(timer);done(match[0]);}};
    child.stdout.on('data',receive);child.stderr.on('data',receive);child.once('exit',code=>{clearTimeout(timer);reject(new Error('Host exited '+code));});child.once('error',reject);
  });
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});
  const errors=[],failedRpc=[];let sessionId;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().endsWith('/api/cuigengji/dispatch')){const payload=request.postDataJSON()?.payload;if(payload?.sessionId)sessionId=payload.sessionId;}});
  page.on('response',response=>{if(response.url().endsWith('/api/cuigengji/dispatch')&&response.status()!==200)failedRpc.push(response.status());});
  await page.goto(url);const launcher=page.getByRole('button',{name:'打开催更姬',exact:true});await expect(launcher).toBeVisible();
  await expect(launcher.locator('img.cg-launcher-icon')).toHaveJSProperty('naturalWidth',192);
  // DSH's first-run preview notice and optional login prompt, without credentials.
  const next=page.getByRole('button',{name:'继续',exact:true});await next.waitFor({state:'visible',timeout:2500}).catch(()=>{});if(await next.isVisible())await next.click();
  const onboarding=page.getByText('开始使用',{exact:true});await onboarding.waitFor({state:'visible',timeout:2500}).catch(()=>{});
  if(await onboarding.isVisible())await page.getByRole('button',{name:'关闭',exact:true}).last().click();
  const later=page.getByRole('button',{name:'稍后配置',exact:true});if(await later.isVisible())await later.click();
  const seeded=await page.request.post(new URL('/api/isolated-cuigengji-probe',url).href,{headers:{origin:new URL(url).origin},data:{name:'fixture-workspace',args:{path:join(root,'writing-workspace')}}});
  assert.equal(seeded.status(),200);await expect(page.getByRole('treeitem',{name:'兼容验收',exact:true})).toBeVisible();
  await launcher.click();
  const connect=page.getByRole('button',{name:'进入工作台',exact:true});if(await connect.isVisible())await connect.click();
  const workbench=page.getByRole('region',{name:'催更姬小说工作台'});await expect(workbench).toBeVisible();
  await workbench.getByRole('button',{name:'＋ 新建作品',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'作品名称',exact:true});await dialog.getByLabel('输入值').fill('雾港 · 新宿主兼容验收');await dialog.getByRole('button',{name:'确定',exact:true}).click();
  await expect(workbench.getByRole('button',{name:'规划',exact:true})).toBeVisible();assert.ok(sessionId);
  const rpc=async(action,args={})=>{
    const result=await page.evaluate(async({action,args,sessionId})=>{
      const response=await fetch('/api/cuigengji/dispatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:crypto.randomUUID(),method:'cuigengji/dispatch',payload:{action,args,sessionId}})});
      return {status:response.status,result:(await response.json()).result};
    },{action,args,sessionId});assert.equal(result.status,200);assert.equal(result.result.ok,true,JSON.stringify(result));return result.result.value;
  };
  assert.equal(await rpc('binding.get'),null,'browsing and creating a work must not bind the conversation');
  const novelId=(await rpc('novel.list')).find(book=>book.title==='雾港 · 新宿主兼容验收').id;
  const chapter=await rpc('chapter.create',{novelId,title:'第一章 兼容验收',content:'　　雨停以后，灯还亮着。'});
  await rpc('graph.create',{novelId,type:'character_card',name:'林岚',summary:'雾港守夜人',content:'她在雨夜寻找失踪的信使。'});
  await rpc('graph.create',{novelId,type:'world_entry',name:'雾港街区',summary:'逐行编辑验收',content:''});
  await rpc('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'node.create',value:{title:'灯塔来信',summary:'在码头发现新线索',content:'两条行动线索在灯塔会合。',position:{x:200,y:200}}}]});
  await workbench.getByRole('complementary',{name:'章节目录',exact:true}).getByText('第一章 兼容验收',{exact:true}).click();const prose=workbench.getByRole('textbox',{name:'正文',exact:true});await expect(prose).toHaveValue('　　雨停以后，灯还亮着。');
  const edited='　　雨停以后，灯还亮着。\n\n　　门外传来脚步声。';await prose.fill(edited);await expect.poll(async()=>(await rpc('chapter.get',{novelId,chapterId:chapter.id})).content).toBe(edited);
  report.checks.push('sidebar entry, first work, manuscript read/edit/autosave');
  await workbench.getByRole('button',{name:'规划',exact:true}).click();await expect(workbench.getByRole('button',{name:'灯塔来信',exact:true})).toBeVisible();
  await workbench.getByRole('button',{name:'设定',exact:true}).click();await expect(workbench.getByRole('button',{name:'林岚',exact:true})).toBeVisible();
  for(const name of ['林岚','雾港街区']) {
    // The resizable directory can cover a card's canvas position; open the
    // visible explorer entry as a user would, without bypassing hit testing.
    const showDirectory=workbench.getByRole('button',{name:'显示组织侧栏',exact:true});
    if(await showDirectory.isVisible())await showDirectory.click();
    await workbench.getByRole('button',{name:`选中 ${name}`,exact:true}).dblclick();
    await workbench.getByRole('button',{name:'编辑',exact:true}).click();
    const editor=workbench.getByRole('textbox',{name:'全文',exact:true});await editor.fill('');await editor.click();
    let body='',previousTop=0;
    for(let line=1;line<=65;line++) {
      const text=`第${String(line).padStart(2,'0')}行记录`;
      await page.keyboard.insertText(text);await page.keyboard.press('Enter');body+=text+'\n';
      if(line===20)await page.waitForTimeout(5200); // Polling must not disturb a live draft.
      const position=await editor.evaluate(element=>({start:element.selectionStart,end:element.selectionEnd,innerTop:element.scrollTop,top:element.closest('.detail-scroll').scrollTop,clipped:element.scrollHeight-element.clientHeight}));
      assert.equal(position.start,body.length,`${name} line ${line}: caret`);assert.equal(position.end,body.length);
      assert.ok(position.clipped<=1,`${name} line ${line}: clipped text`);assert.equal(position.innerTop,0);
      assert.ok(position.top>=previousTop-1,`${name} line ${line}: upward scroll jump`);previousTop=position.top;
    }
    await expect(editor).toHaveValue(body);await workbench.getByRole('button',{name:'保存设定',exact:true}).click();
    await expect(workbench.getByRole('button',{name:'编辑',exact:true})).toBeVisible();
    const node=(await rpc('graph.list',{novelId})).find(node=>node.name===name);assert.equal((await rpc('graph.get',{novelId,nodeId:node.id})).content,body);
    await workbench.getByRole('button',{name:'‹ 返回设定',exact:true}).click();
  }
  report.checks.push('real DSH character/world editors: 65 Enter lines, background polling, caret/scroll and saved content');
  await workbench.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'AI与写作');await page.getByRole('button',{name:'写作预设',exact:true}).click();await expect(workbench.getByRole('heading',{name:'写作预设',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'作品首页',exact:true}).click();await workbench.getByRole('button',{name:'导出《雾港 · 新宿主兼容验收》',exact:true}).click();await expect(workbench.getByRole('heading',{name:'导入 / 导出',exact:true})).toBeVisible();await expect(workbench.getByRole('button',{name:'下载文件',exact:true})).toBeEnabled();
  report.checks.push('planning canvas, character/world settings, presets, transfer');
  const probeTool=async(name,action,args={})=>{
    const response=await page.request.post(new URL('/api/isolated-cuigengji-probe',url).href,{headers:{origin:new URL(url).origin},data:{sessionId,name,action,args}});assert.equal(response.status(),200);return response.json();
  };
  await probeTool('cuigengji_project','novel.focus',{novelId});
  const handoff=await probeTool('cuigengji_project','novel.handoff');assert.equal(handoff.result.novel.id,novelId);assert.equal(handoff.skills.length,7);assert.ok(handoff.skills.includes('cuigengji-variables'));
  const memory=await probeTool('cuigengji_memory','graph.list');assert.ok(memory.result.some(node=>node.name==='林岚'));
  const planning=await probeTool('cuigengji_plan','planning.list');assert.equal(planning.result.items[0].title,'灯塔来信');
  const maintenance=await probeTool('cuigengji_maintenance','verify',{expectedVersion:manifest.version,expectedNovelIds:[novelId]});assert.equal(maintenance.result.verified,true);
  report.checks.push('real host tool and Skill registries, handoff, MCP, planning, integrity');
  const cfg=await rpc('usage.config');assert.ok(resolve(cfg.root).startsWith(resolve(home)));assert.equal(cfg.templates.length,34);
  const usage=await rpc('usage.report');assert.equal(usage.total.calls,0);
  assert.ok((await rpc('usage.presentation')).lines.length>0);
  await rpc('variables.configure',{novelId,baseRevision:0,enabled:true});
  const vars=await probeTool('cuigengji_variables','variables.read',{novelId});
  await probeTool('cuigengji_variables','variables.patch',{novelId,baseRevision:vars.result.revision,anchor:{kind:'chapter',chapterId:chapter.id,chapterRevision:(await rpc('chapter.get',{novelId,chapterId:chapter.id})).revision,position:'end'},operations:[{op:'set',path:'/等级',value:1}],reason:'临时兼容验收'});
  assert.equal((await probeTool('cuigengji_variables','variables.read',{novelId})).result.data.等级,1);
  const rules=await probeTool('cuigengji_guidance','variables',{novelId});assert.equal(rules.result.modules[0].id,'variables');
  report.checks.push('isolated usage service, built-in companion payload, variable tool writes and on-demand variable guidance');
  assert.deepEqual(errors,[]);assert.deepEqual(failedRpc,[]);report.ok=true;
  if(argv.includes('--report')){const target=resolve(arg('--report'));await mkdir(dirname(target),{recursive:true});await page.screenshot({path:target.replace(/\.json$/,'.png')});await writeFile(target,JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report));
}catch(error){
  if(argv.includes('--report')){
    const target=resolve(arg('--report'));await mkdir(dirname(target),{recursive:true});
    await writeFile(target,JSON.stringify({...report,error:error.message,...(argv.includes('--keep-on-failure')?{testRoot:root}:{})},null,2));
  }
  if(page&&argv.includes('--report')){
    const target=resolve(arg('--report'));await mkdir(dirname(target),{recursive:true});
    await page.screenshot({path:target.replace(/\.json$/,'.error.png')}).catch(()=>{});
    await writeFile(target.replace(/\.json$/,'.error.txt'),(await page.locator('body').innerText()).slice(0,12000)).catch(()=>{});
  }
  const safeLog=log.replace(/([?&]token=)[^\s]+/g,'$1[redacted]');
  throw new Error(`${error.message}\n${safeLog.slice(-5000)}`,{cause:error});
}finally{
  await browser?.close();
  if(child&&child.exitCode===null){const closed=new Promise(done=>child.once('exit',done));child.kill();await closed;}
  assert.ok(resolve(root).startsWith(resolve(tmpdir())));
  if(report.ok||!argv.includes('--keep-on-failure'))await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:300});
}
