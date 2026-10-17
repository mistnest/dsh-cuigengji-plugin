// Invoked by check-release-install.mjs with the DSH desktop executable in Node
// mode. Loads the package from node_modules, not the source tree.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [packagePath,dataRoot,versionOverride] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(join(packagePath,'package.json'),'utf8'));
const expectedVersion = versionOverride || JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
assert.equal(manifest.version,expectedVersion);
const {apply} = await import(pathToFileURL(join(packagePath,manifest.main)));
const registered = new Map(), effects = [], routes = [], listeners = new Map();
const ctx = {tools:{register:tool=>registered.set(tool.name,tool)},skills:{register(){}},connection:{fetch:{register:route=>routes.push(route)}},
  on:(event,fn)=>listeners.set(event,fn),effect:fn=>effects.push(fn()),provide:(key,value)=>{ctx[key]=value;}};
try {
  await apply(ctx,{dataRoot});
  const execute = async (name,action,args={}) => JSON.parse(await registered.get(name).execute({action,args},
    {agent:{id:'synthetic-upgrade-author'},callId:'smoke-read',signal:new AbortController().signal}));
  const status = await execute('cuigengji_maintenance','status'); assert.equal(status.status,'ready',JSON.stringify(status.error));
  const verification = await execute('cuigengji_maintenance','verify',{expectedVersion,expectedDataRoot:resolve(dataRoot)});
  assert.equal(verification.verified,true);
  if (verification.summary.counts.novels) {
    const info = await execute('cuigengji_project','novel.handoff'); assert.equal(info.novel.title,'雾港 · 公开合成升级样例');
    assert.ok((await execute('cuigengji_memory','graph.list')).length >= 3,'actual MCP in desktop Node mode');
    assert.ok((await execute('cuigengji_plan','planning.pages')).length >= 2);
    assert.ok((await execute('cuigengji_context','preset.read')).content.includes('动作推进'));
  }
  // Exercise the installed Human RPC contract, not an imported source Store.
  // This whole profile/data root is disposable and contains only synthetic data.
  const sessionId='synthetic-recycle-author';
  const rpc=async(action,args={})=>{
    const response=await routes[0].fetch(new Request('http://localhost/api/cuigengji/dispatch',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({type:'client-request',rpcId:crypto.randomUUID(),method:'cuigengji/dispatch',payload:{action,args,sessionId}})}));
    return (await response.json()).result;
  };
  const novel=(await rpc('novel.create',{title:'安装回收站验收作品'})).value;
  const prose='安装包内的正文必须可完整恢复。';
  const chapter=(await rpc('chapter.create',{novelId:novel.id,title:'原稿',content:prose})).value;
  assert.equal((await rpc('binding.set',{novelId:novel.id})).ok,true);
  const revision=(await rpc('novel.list')).value.find(n=>n.id===novel.id).revision;
  listeners.get('agent/status')({agent:{id:sessionId},status:'running'});
  assert.equal((await rpc('novel.archive',{novelId:novel.id,expectedRevision:revision,confirm:true})).error.code,'NOVEL_BUSY');
  listeners.get('agent/status')({agent:{id:sessionId},status:'idle'});
  const recycled=(await rpc('novel.archive',{novelId:novel.id,expectedRevision:revision,confirm:true})).value;
  assert.ok(recycled.archivedAt);assert.equal((await rpc('binding.get')).value,null);
  const restored=(await rpc('novel.restore',{novelId:novel.id,expectedRevision:recycled.revision})).value;
  assert.equal((await rpc('chapter.get',{novelId:novel.id,chapterId:chapter.id})).value.content,prose);
  const again=(await rpc('novel.archive',{novelId:novel.id,expectedRevision:restored.revision,confirm:true})).value;
  assert.equal((await rpc('novel.purge',{novelId:novel.id,expectedRevision:again.revision,confirm:true})).value.purged,true);
  assert.equal((await rpc('novel.list',{includeArchived:true})).value.some(n=>n.id===novel.id),false);
  const finalVerification=await execute('cuigengji_maintenance','verify',{expectedVersion});
  assert.equal(finalVerification.verified,true);
  console.log(JSON.stringify({ok:true,installedVersion:manifest.version,node:process.version,electron:process.versions.electron,
    initialStateDigest:verification.currentStateDigest,finalStateDigest:finalVerification.currentStateDigest,
    fromStorageVersion:status.fromStorageVersion,migrated:status.migrated,counts:verification.summary.counts,backupPath:status.backupPath,lifecycleVerified:true}));
} finally {for (const dispose of effects) await dispose();}
