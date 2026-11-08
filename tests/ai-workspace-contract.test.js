import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {apply} from '../src/index.js';

async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'cg-ai-workspace-')),tools=new Map(),effects=[],handlers=new Map();
  const ctx={tools:{register:tool=>tools.set(tool.name,tool)},skills:{register(){}},connection:{fetch:{register(){}}},
    on:(name,fn)=>handlers.set(name,fn),effect:fn=>effects.push(fn()),provide:(name,value)=>{ctx[name]=value;}};
  t.after(async()=>{for(const dispose of effects)await dispose();await rm(root,{recursive:true,force:true});});
  await apply(ctx,{dataRoot:root});
  let callId=0;
  const invoke=async(name,input,sessionId='writer')=>JSON.parse(await tools.get(name).execute(input,{agent:{id:sessionId},callId:`contract-${++callId}`,signal:new AbortController().signal}));
  const run=(name,action,args={},sessionId)=>invoke(name,{action,args},sessionId);
  const human=(action,args={})=>ctx.cuigengji.dispatch(action,args,{kind:'human',sessionId:'writer'});
  const a=await human('novel.create',{title:'当前作品'}),b=await human('novel.create',{title:'本次目标作品'});
  return {ctx,tools,handlers,run,invoke,human,a,b};
}

test('DSH model-facing arguments keep stages, folders and resource reads in the explicitly selected work',async t=>{
  const {run,a,b}=await fixture(t),project=(action,args={})=>run('cuigengji_project',action,args),memory=(action,args={})=>run('cuigengji_memory',action,{novelId:b.id,...args}),plan=(action,args={})=>run('cuigengji_plan',action,{novelId:b.id,...args});
  const character=await memory('graph.create',{type:'character_card',name:'守门人',summary:'只认手令',content:'只有目标作品中的当前正文。'});
  assert.equal(await run('cuigengji_context','binding.get'),null,'explicit target works without binding');
  await project('novel.focus',{novelId:a.id});
  const folder=await memory('graph.group.create',{name:'城门',members:[{id:character.id,expectedRevision:character.revision}]});
  const page=await plan('planning.page.create',{name:'城门推演'});
  const created=await plan('planning.apply',{requestId:'stages-and-folders',operations:[
    {op:'group.create',ref:'folder',value:{name:'开篇资料',pageId:page.id}},
    {op:'node.create',ref:'stage',value:{title:'开篇',summary:'围绕手令的争执',pageId:page.id,groupId:'folder'}},
    {op:'node.create',ref:'child',value:{title:'登门',pageId:page.id,groupId:'folder',parentId:'stage',memoryRefs:[character.id]}},
  ]});
  const detail=await plan('planning.get',{nodeId:created.mapping.child});
  assert.equal(detail.node.parentId,created.mapping.stage);assert.equal(detail.node.groupId,created.mapping.folder);
  assert.equal(detail.resources.items[0].summary,'只认手令');assert.ok(!JSON.stringify(detail.resources).includes('只有目标作品中的当前正文'));
  const {action,...args}=detail.resources.items[0].read;
  const resource=await run('cuigengji_memory',action,args);
  assert.equal(resource.content,character.content);assert.equal(resource.groupId,folder.id,'resource read hint wraps correctly even when focus is another work');
  const next=await plan('planning.continue',{nodeId:detail.node.id,expectedRevision:detail.node.revision,value:{title:'检查手令'}});
  assert.equal(next.node.parentId,created.mapping.stage,'continue makes a sibling event, not a child of the start');
  assert.equal(next.node.pageId,page.id);
  const before=await plan('planning.list',{pageId:page.id});
  await assert.rejects(plan('planning.apply',{operations:[{op:'node.create',value:{title:'不能把文件夹当阶段',pageId:page.id,parentId:created.mapping.folder}}]}),/父规划不存在/);
  assert.deepEqual(await plan('planning.list',{pageId:page.id}),before,'wrong hierarchy IDs cannot partially save');
  const stage=await plan('planning.get',{nodeId:created.mapping.stage});
  await plan('planning.apply',{operations:[{op:'node.delete',id:stage.node.id,expectedRevision:stage.node.revision,confirm:true,childPolicy:'detach'}]});
  assert.equal((await plan('planning.get',{nodeId:detail.node.id})).node.parentId,null);
  assert.equal((await plan('planning.get',{nodeId:next.node.id})).node.parentId,null);
  assert.equal((await run('cuigengji_context','binding.get')).novelId,a.id);
  assert.equal((await run('cuigengji_plan','planning.list',{novelId:a.id})).total,0);
});

test('old-page organization through MCP returns a usable folder and requires fresh versions after migration',async t=>{
  const {run,b}=await fixture(t),memory=(action,args={})=>run('cuigengji_memory',action,{novelId:b.id,...args});
  const page=await memory('graph.page.create',{name:'旧城门',summary:'保留旧页的说明'});
  const card=await memory('graph.create',{pageId:page.id,type:'world_entry',name:'城规',content:'升级前后都必须保留的原文。'});
  const migrated=await memory('graph.workspace.ensure',{requestId:'organize-legacy-page'});
  assert.ok(migrated.folders[page.id]);
  const groups=await memory('graph.groups');assert.equal(groups.find(g=>g.id===migrated.folders[page.id]).name,page.name);
  assert.equal((await memory('graph.list',{groupId:migrated.folders[page.id]}))[0].id,card.id);
  const current=await memory('graph.get',{nodeId:card.id});assert.equal(current.content,card.content);assert.equal(current.pageId,null);
  await assert.rejects(memory('graph.update',{nodeId:card.id,expectedRevision:card.revision,summary:'旧版本不能覆盖'}),/版本已变化/);
  await memory('graph.update',{nodeId:card.id,expectedRevision:current.revision,summary:'重读后正确更新'});
  const history=await memory('graph.history',{nodeId:card.id});assert.ok(history.length>=3);assert.ok(history.every(version=>!('content' in version)));
  assert.deepEqual(await memory('graph.workspace.ensure',{requestId:'organize-again'}),{changed:false,folders:{}});
});

test('disabled guidance has resolvable references, unbound rules and explicit-work presets through actual tools',async t=>{
  const {ctx,run,invoke,human,a,b}=await fixture(t);
  await human('preset.set',{novelId:a.id,expectedRevision:0,preset:{enabled:true,name:'甲',blocks:[{identifier:'a',name:'文风',enabled:true,content:'当前书文风'}]}});
  await human('preset.set',{novelId:b.id,expectedRevision:0,preset:{enabled:true,name:'乙',blocks:[{identifier:'b',name:'文风',enabled:true,content:'目标书文风'}]}});
  await human('guidance.set',{enabled:false});
  const unbound=await invoke('cuigengji_guidance',{section:'all'},'unbound');
  assert.equal(unbound.modules.length,7);assert.equal(unbound.preset.unavailable,true);
  for(const section of ['plan','memory']){
    const guide=await invoke('cuigengji_guidance',{section});assert.equal(guide.modules.length,1);assert.equal(guide.preset,undefined);
    const resource=guide.modules[0].resourceBase;assert.equal(resource.kind,'directory');
    const text=await readFile(join(resource.path,'references/operations.md'),'utf8');
    assert.ok([...text.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)].map(match=>JSON.parse(match[1])).length>0);
  }
  const core=await invoke('cuigengji_guidance',{section:'core'});
  const skill=await invoke('cuigengji_guidance',{section:'project'});
  const marker=skill.modules[0].content.match(/shared-canvas-v\d+/)[0];assert.ok(core.modules[0].content.includes(marker),'old-chat reload marker agrees between entry points');
  await run('cuigengji_project','novel.focus',{novelId:a.id});
  assert.equal((await invoke('cuigengji_guidance',{section:'preset',args:{novelId:b.id}})).preset.content,'目标书文风');
  assert.equal((await run('cuigengji_context','binding.get')).novelId,a.id);
  assert.equal((await human('guidance.get')).enabled,false,'reading and focus do not undo an explicit off switch');
  const {client}=await ctx.cuigengji.memory.connection('writer');
  const advertised=await client.listTools();
  for(const name of ['memory_graph_list','memory_graph_group_create']){
    const parameters=advertised.tools.find(tool=>tool.name===name).inputSchema.properties;
    assert.equal(parameters.novelId.type,'string');assert.ok(parameters.groupId.oneOf.some(type=>type.type==='null'));
  }
});
