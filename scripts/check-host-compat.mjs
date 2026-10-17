// Actual bundled DSH Host + browser integration, using only disposable data.
// This test never sends a chat message or calls a model provider.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';

const argv=process.argv.slice(2),arg=name=>argv[argv.indexOf(name)+1];
assert.ok(argv.includes('--desktop-exe')&&argv.includes('--package'),'--desktop-exe <exe> --package <tgz> [--report <json>]');
const exe=resolve(arg('--desktop-exe')),archive=resolve(arg('--package'));
const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const root=await mkdtemp(join(tmpdir(),'cuigengji-host-compat-')),home=join(root,'home'),profile=join(home,'profiles/compatibility');
const runtime=join(dirname(exe),'resources/runtime'), windows=process.env.SystemRoot||'C:\\Windows';
const env={...process.env,DSH_HOME:home,CUIGENGJI_DATA_ROOT:join(root,'novel-data'),DSH_DESKTOP_NODE_EXECUTABLE:exe,ELECTRON_RUN_AS_NODE:'1',CI:'true',
  PNPM_HOME:join(root,'pnpm'),PATH:[join(runtime,'bin'),join(windows,'System32'),windows].join(';')};
for(const key of ['NODE_OPTIONS','DEEPSEEK_API_KEY','OPENAI_API_KEY','DSH_URL','DSH_TOKEN'])delete env[key];
const report={ok:false,pluginVersion:manifest.version,modelCalls:0,checks:[]};
let child,browser,page,log='';
try {
  await mkdir(profile,{recursive:true});
  await writeFile(join(profile,'package.json'),JSON.stringify({name:'isolated-host-compatibility',private:true,dsh:{profile:{bundles:['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app']}}}));
  const installed=spawnSync(exe,['--expose-internals',fileURLToPath(new URL('./desktop-package-operation.mjs',import.meta.url)),JSON.stringify({
    context:{profile:'compatibility',dir:profile,cwd:root,home},args:['add',archive],options:{execution:'service',outputBytes:5000,activateNewBundles:true,idleTimeoutMs:120000,lookupTimeoutMs:20000,lockWaitMs:10000},
  })],{env,encoding:'utf8',windowsHide:true,timeout:240000});
  assert.equal(installed.status,0,installed.stderr||installed.stdout||installed.error?.message);
  const installation=JSON.parse(installed.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(installation.exitCode,0,installation.output);report.dshVersion=installation.runtimeVersion;
  const probe=join(root,'probe.mjs');
  await mkdir(join(root,'writing-workspace'));
  await writeFile(probe,`export const inject=['connection','cuigengji','tools','skills','workspaceRegistry'];
export function apply(ctx){ctx.connection.fetch.register({path:'/api/isolated-cuigengji-probe',methods:['POST'],requestBody:'buffered',fetch:async request=>{
  const {sessionId,name,action,args}=await request.json();
  if(name==='fixture-workspace')return Response.json({id:(await ctx.workspaceRegistry.create(args.path,'兼容验收')).id});
  const tools=['cuigengji_project','cuigengji_plan','cuigengji_memory','cuigengji_context','cuigengji_maintenance'];
  for(const tool of tools)if(!ctx.tools.get(tool))throw new Error('Missing tool '+tool);
  const skills=(await ctx.skills.list()).filter(skill=>skill.name.startsWith('cuigengji-')).map(skill=>skill.name);
  const result=await ctx.tools.get(name).execute({action,args},{agent:{id:sessionId},callId:crypto.randomUUID(),signal:request.signal});
  return Response.json({tools,skills,result:JSON.parse(result)});
}});}`);
  const patch=join(root,'probe.patch.yml');await writeFile(patch,`- insert:\n    - id: isolated-compatibility-probe\n      name: ${JSON.stringify(probe)}\n`);
  const cli=join(dirname(exe),'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js');
  child=spawn(exe,['--expose-internals',cli,'--profile','compatibility','--patch',patch,'--host','127.0.0.1','--port','0','--no-open'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const url=await new Promise((done,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Host startup timed out')),45000);
    const receive=bytes=>{log+=bytes;const match=log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/);if(match){clearTimeout(timer);done(match[0]);}};
    child.stdout.on('data',receive);child.stderr.on('data',receive);child.once('exit',code=>{clearTimeout(timer);reject(new Error('Host exited '+code));});child.once('error',reject);
  });
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});
  const errors=[],failedRpc=[];let sessionId;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().endsWith('/api/cuigengji/dispatch')){const payload=request.postDataJSON()?.payload;if(payload?.sessionId)sessionId=payload.sessionId;}});
  page.on('response',response=>{if(response.url().endsWith('/api/cuigengji/dispatch')&&response.status()!==200)failedRpc.push(response.status());});
  await page.goto(url);const launcher=page.getByRole('button',{name:'打开催更姬',exact:true});await expect(launcher).toBeVisible();
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
  const novelId=(await rpc('binding.get')).novelId;
  const chapter=await rpc('chapter.create',{novelId,title:'第一章 兼容验收',content:'　　雨停以后，灯还亮着。'});
  await rpc('graph.create',{novelId,type:'character_card',name:'林岚',summary:'雾港守夜人',content:'她在雨夜寻找失踪的信使。'});
  await rpc('planning.apply',{novelId,requestId:crypto.randomUUID(),operations:[{op:'node.create',value:{title:'灯塔来信',summary:'在码头发现新线索',content:'两条行动线索在灯塔会合。',position:{x:200,y:200}}}]});
  await workbench.getByRole('complementary',{name:'章节目录',exact:true}).getByText('第一章 兼容验收',{exact:true}).click();const prose=workbench.getByRole('textbox',{name:'正文',exact:true});await expect(prose).toHaveValue('　　雨停以后，灯还亮着。');
  const edited='　　雨停以后，灯还亮着。\n\n　　门外传来脚步声。';await prose.fill(edited);await expect.poll(async()=>(await rpc('chapter.get',{novelId,chapterId:chapter.id})).content).toBe(edited);
  report.checks.push('sidebar entry, first work, manuscript read/edit/autosave');
  await workbench.getByRole('button',{name:'规划',exact:true}).click();await expect(workbench.getByText('灯塔来信',{exact:true})).toBeVisible();
  await workbench.getByRole('button',{name:'设定',exact:true}).click();await expect(workbench.getByText('林岚',{exact:true})).toBeVisible();
  await workbench.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'写作预设',exact:true}).click();await expect(workbench.getByRole('heading',{name:'写作预设',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'作品首页',exact:true}).click();await workbench.getByRole('button',{name:'导入 / 导出',exact:true}).click();await expect(workbench.getByRole('heading',{name:'导入 / 导出',exact:true})).toBeVisible();
  report.checks.push('planning canvas, character/world settings, presets, transfer');
  const probeTool=async(name,action,args={})=>{
    const response=await page.request.post(new URL('/api/isolated-cuigengji-probe',url).href,{headers:{origin:new URL(url).origin},data:{sessionId,name,action,args}});assert.equal(response.status(),200);return response.json();
  };
  const handoff=await probeTool('cuigengji_project','novel.handoff');assert.equal(handoff.result.novel.id,novelId);assert.equal(handoff.skills.length,6);
  const memory=await probeTool('cuigengji_memory','graph.list');assert.equal(memory.result[0].name,'林岚');
  const planning=await probeTool('cuigengji_plan','planning.list');assert.equal(planning.result.items[0].title,'灯塔来信');
  const maintenance=await probeTool('cuigengji_maintenance','verify',{expectedVersion:manifest.version,expectedNovelIds:[novelId]});assert.equal(maintenance.result.verified,true);
  report.checks.push('real host tool and Skill registries, handoff, MCP, planning, integrity');
  assert.deepEqual(errors,[]);assert.deepEqual(failedRpc,[]);report.ok=true;
  if(argv.includes('--report')){const target=resolve(arg('--report'));await mkdir(dirname(target),{recursive:true});await page.screenshot({path:target.replace(/\.json$/,'.png')});await writeFile(target,JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report));
}catch(error){
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
  assert.ok(resolve(root).startsWith(resolve(tmpdir())));await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:300});
}
