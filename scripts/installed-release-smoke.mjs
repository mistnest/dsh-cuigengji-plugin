// Invoked by check-release-install.mjs with the DSH desktop executable in Node
// mode. Loads the package from node_modules, not the source tree.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [packagePath,dataRoot,expectationPath] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(join(packagePath,'package.json'),'utf8'));
const expectedVersion = JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
assert.equal(manifest.version,expectedVersion);
const {apply} = await import(pathToFileURL(join(packagePath,manifest.main)));
const {TOOL_ACTIONS} = await import(pathToFileURL(join(packagePath,'runtime/contracts/actions.js')));
const registered = new Map(), skills = new Map(), effects = [], routes = [], listeners = new Map();
const ctx = {tools:{register:tool=>registered.set(tool.name,tool)},skills:{register:skill=>skills.set(skill.name,skill)},connection:{fetch:{register:route=>routes.push(route)}},
  on:(event,fn)=>listeners.set(event,[...(listeners.get(event)||[]),fn]),effect:fn=>effects.push(fn()),provide:(key,value)=>{ctx[key]=value;}};
const emit=async(event,value)=>{for(const callback of listeners.get(event)||[])await callback(value);};
try {
  await apply(ctx,{dataRoot,usageRoot:join(dataRoot,'test-usage')});
  const execute = async (name,action,args={},session='synthetic-upgrade-author') => JSON.parse(await registered.get(name).execute({action,args},
    {agent:{id:session},callId:crypto.randomUUID(),signal:new AbortController().signal}));
  const status = await execute('cuigengji_maintenance','status'); assert.equal(status.status,'ready',JSON.stringify(status.error));
  const verification = await execute('cuigengji_maintenance','verify',{expectedVersion,expectedDataRoot:resolve(dataRoot)});
  assert.equal(verification.verified,true);
  if(expectationPath){
    const before=JSON.parse(await readFile(expectationPath,'utf8')),after=await ctx.cuigengji.store.load();
    assert.deepEqual(after.novels,before.novels,'every old work, history, setting, page, preset and original source must survive');
    assert.deepEqual(after.requests,before.requests,'old idempotency receipts survive');
    for(const [id,binding] of Object.entries(before.bindings))assert.deepEqual(after.bindings[id],{...binding,scope:'library',activeNovelId:binding.activeNovelId||binding.novelId,novelId:binding.activeNovelId||binding.novelId});
  }
  if (verification.summary.counts.novels) {
    const info = await execute('cuigengji_project','novel.handoff'); assert.equal(info.novel.title,'雾港 · 公开合成升级样例');
    assert.ok((await execute('cuigengji_memory','graph.list')).length >= 3,'actual MCP in desktop Node mode');
    assert.ok((await execute('cuigengji_plan','planning.pages')).length >= 2);
    assert.ok((await execute('cuigengji_context','preset.read')).content.includes('动作推进'));
  }
  // Exercise the installed Human RPC contract, not an imported source Store.
  // This whole profile/data root is disposable and contains only synthetic data.
  const sessionId='synthetic-recycle-author';
  const rpc=async(action,args={},session=sessionId)=>{
    const response=await routes[0].fetch(new Request('http://localhost/api/cuigengji/dispatch',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({type:'client-request',rpcId:crypto.randomUUID(),method:'cuigengji/dispatch',payload:{action,args,...(session?{sessionId:session}:{})}})}));
    return (await response.json()).result;
  };
  const novel=(await rpc('novel.create',{title:'安装回收站验收作品'})).value;
  const prose='安装包内的正文必须可完整恢复。';
  const chapter=(await rpc('chapter.create',{novelId:novel.id,title:'原稿',content:prose})).value;
  assert.equal((await rpc('binding.set',{novelId:novel.id})).ok,true);
  const revision=(await rpc('novel.list')).value.find(n=>n.id===novel.id).revision;
  await emit('agent/status',{agent:{id:sessionId},status:'running'});
  assert.equal((await rpc('novel.archive',{novelId:novel.id,expectedRevision:revision,confirm:true})).error.code,'NOVEL_BUSY');
  await emit('agent/status',{agent:{id:sessionId},status:'idle'});
  const recycled=(await rpc('novel.archive',{novelId:novel.id,expectedRevision:revision,confirm:true})).value;
  assert.ok(recycled.archivedAt);assert.equal((await rpc('binding.get')).value,null);
  const restored=(await rpc('novel.restore',{novelId:novel.id,expectedRevision:recycled.revision})).value;
  assert.equal((await rpc('chapter.get',{novelId:novel.id,chapterId:chapter.id})).value.content,prose);
  assert.equal((await rpc('binding.set',{novelId:novel.id})).ok,true);
  assert.ok(!skills.has('cuigengji-collaborate'),'retired collaboration Skill must not register');
  for(const [name,actions] of Object.entries(TOOL_ACTIONS))assert.deepEqual(registered.get(name)?.parameters.properties.action.enum,actions,`installed ${name} must expose its complete action contract`);
  // The on-demand guidance tool uses section, rather than action.
  for(const tool of registered.values())assert.ok(!(tool.parameters.properties.action?.enum||[]).some(action=>action.startsWith('collaboration.')));
  assert.equal((await rpc('collaboration.overview')).error.code,'INVALID_INPUT');
  const sourceText='安装包中的规划资料仅按需读取。';
  const outline=(await rpc('planning.apply',{novelId:novel.id,requestId:'installed-source',operations:[{op:'node.create',value:{title:'双线汇合',summary:'各自潜入，码头会合',content:sourceText}}]})).value;
  const arranged=await execute('cuigengji_plan','planning.layout',{pageId:null,expectedSequence:outline.sequence,requestId:'installed-canvas-layout'},sessionId);
  assert.equal(Object.keys(arranged.positions).length,1,'installed ELK dependency must run without TypeScript or build scripts');
  const arrangedNode=await execute('cuigengji_plan','planning.get',{nodeId:Object.keys(arranged.positions)[0]},sessionId);
  assert.equal(arrangedNode.node.content,sourceText);
  for(const name of ['cuigengji-plan','cuigengji-memory'])assert.ok((await readFile(join(skills.get(name).resourceBase.path,'references/operations.md'),'utf8')).includes('```json'),'installed Skill reference path must resolve');
  const derived=await execute('cuigengji_project','novel.create',{title:'安装包独立作品验收',requestId:'installed-independent-work'},sessionId);
  assert.equal((await rpc('preset.set',{novelId:derived.id,expectedRevision:0,preset:{name:'本书文风',enabled:true,blocks:[{identifier:'style',name:'文风',enabled:true,content:'安装包专属写作要求'}]}})).ok,true);
  const handoff=await execute('cuigengji_project','novel.handoff',{novelId:derived.id},sessionId);
  assert.equal(handoff.chapterCount,0);assert.doesNotMatch(JSON.stringify(handoff),/安装包中的规划资料/);
  assert.equal(handoff.sharedPlan,undefined);
  assert.equal((await execute('cuigengji_plan','planning.list',{novelId:derived.id},sessionId)).items.length,0,'new work does not inherit the source canvas');
  assert.equal((await execute('cuigengji_context','preset.read',{novelId:derived.id},sessionId)).content,'安装包专属写作要求');
  assert.deepEqual(await execute('cuigengji_memory','graph.list',{novelId:derived.id},sessionId),[],'explicit novel scope must work through the installed MCP');
  const setting=await execute('cuigengji_memory','graph.create',{novelId:novel.id,name:'安装包合成设定',type:'world_entry',content:'整理不能改变设定正文。'},sessionId);
  const settingLayout=await execute('cuigengji_memory','graph.arrange',{novelId:novel.id,members:[{id:setting.id,expectedRevision:setting.revision}],requestId:'installed-setting-layout'},sessionId);
  assert.equal(settingLayout.length,1);assert.equal((await execute('cuigengji_memory','graph.get',{novelId:novel.id,nodeId:setting.id},sessionId)).content,setting.content);
  // Native child sessions use the same focus tools, without inherited locks.
  // This fixture exercises the installed tool boundary without any model calls.
  const childSession='synthetic-native-child';
  await emit('agent/created',{agent:{id:childSession,session:{header:{parentSession:sessionId}}}});
  assert.equal(await execute('cuigengji_context','binding.get',{},childSession),null);
  await execute('cuigengji_project','novel.focus',{novelId:derived.id},childSession);
  const written=await execute('cuigengji_project','chapter.create',{title:'雨夜开篇',content:'安装包合成写作成果。'},childSession);
  assert.equal((await execute('cuigengji_project','chapter.get',{novelId:derived.id,chapterId:written.id},sessionId)).content,'安装包合成写作成果。');
  await execute('cuigengji_project','novel.focus',{novelId:novel.id},childSession);
  assert.equal((await execute('cuigengji_context','binding.get',{},childSession)).novelId,novel.id);
  assert.equal((await execute('cuigengji_context','binding.get',{},sessionId)).novelId,novel.id);
  const records=(await rpc('activity.stats',{},null)).value;
  assert.ok(records.activeDays>=1);assert.ok(records.stats.proseAdded>=prose.length);
  assert.ok(records.novels.some(row=>row.novelId===derived.id));
  const prosePreview=await rpc('chapter.find',{novelId:novel.id,query:'正文'});
  assert.equal(prosePreview.ok,true);assert.equal(prosePreview.value.total,1);
  const proseReplacement=await rpc('chapter.replace',{novelId:novel.id,query:'正文',replacement:'原文',expectedSnapshot:prosePreview.value.snapshot,requestId:'installed-prose-replace',confirm:true});
  assert.equal(proseReplacement.ok,true);assert.equal(proseReplacement.value.count,1);
  const proseHistory=await rpc('chapter.history',{novelId:novel.id,chapterId:chapter.id,includeContent:true});
  assert.equal(proseHistory.value[0].content,prose,'the installed replacement keeps the original version');
  const derivedCurrent=(await rpc('novel.list',{includeArchived:true})).value.find(row=>row.id===derived.id);
  const derivedRecycled=(await rpc('novel.archive',{novelId:derived.id,expectedRevision:derivedCurrent.revision,confirm:true})).value;
  assert.equal((await rpc('novel.purge',{novelId:derived.id,expectedRevision:derivedRecycled.revision,confirm:true})).value.purged,true);
  const currentRevision=(await rpc('novel.list')).value.find(n=>n.id===novel.id).revision;
  const again=(await rpc('novel.archive',{novelId:novel.id,expectedRevision:currentRevision,confirm:true})).value;
  assert.equal((await rpc('novel.purge',{novelId:novel.id,expectedRevision:again.revision,confirm:true})).value.purged,true);
  assert.equal((await rpc('novel.list',{includeArchived:true})).value.some(n=>n.id===novel.id),false);
  console.log(JSON.stringify({ok:true,installedVersion:manifest.version,node:process.version,electron:process.versions.electron,
    fromStorageVersion:status.fromStorageVersion,migrated:status.migrated,counts:verification.summary.counts,backupPath:status.backupPath,lifecycleVerified:true,ordinarySessionsVerified:true,writingRecordsVerified:true,canvasVerified:true,manuscriptSearchVerified:true}));
} finally {for (const dispose of effects) await dispose();}
