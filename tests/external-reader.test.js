import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {EventEmitter,once} from 'node:events';
import {ToolListChangedNotificationSchema} from '@modelcontextprotocol/sdk/types.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {LibraryService} from '../src/composition/library-runtime.ts';
import {createExternalAccess} from '../src/composition/external-reader.ts';
import {QueryService} from '../src/modules/workspace/queries/service.ts';
import {Store} from '../src/composition/store.ts';
import {READER_MODULES,QUERY_CAPABILITIES} from '../src/modules/workspace/queries/catalog.ts';
import {ACTION_CAPABILITIES} from '../src/modules/access/catalog/capabilities.ts';
import {registerRpcRoute} from '../src/modules/access/rpc/route.ts';
import {apply} from '../src/index.ts';

const actor={kind:'human',sessionId:'main-author'};
const connectorPath=resolve(process.env.CUIGENGJI_TEST_CONNECTOR||'src/modules/access/mcp/external-server.ts');
async function bytes(root){const result={};async function visit(dir){for(const entry of await readdir(join(root,dir),{withFileTypes:true})){if(entry.name==='.lock')continue;const path=dir?dir+'/'+entry.name:entry.name;if(entry.isDirectory())await visit(path);else if(entry.isFile())result[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');}}await visit('');return result;}
async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'cg-reader-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const libraries=new LibraryService(join(root,'books'),{persist:async()=>{}});await libraries.current.maintenance.ensureReady();
  const store=libraries.current.store,novel=await store.dispatch('novel.create',{title:'合成作品·雾城来信'},actor),other=await store.dispatch('novel.create',{title:'另一部合成作品'},actor);
  const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
  await run('binding.set',{novelId:other.id});
  const volume=await run('volume.create',{title:'第二卷·内城',order:1});
  const content='合成测试正文😀。测试设备记录：A-61 已下线。林舟和白露一起走下楼梯。\n'+('这一段用于验证按需续读，不是实际小说。'.repeat(900));
  const chapter=await run('chapter.create',{title:'第61章 合成来信',content,volumeId:volume.id,order:0});
  const next=await run('chapter.create',{title:'第62章 合成草稿',content:'尚未改写的合成正文。',volumeId:volume.id,order:1});
  const person=await run('graph.create',{type:'character_card',name:'林舟',aliases:['小舟'],summary:'看守设备记录的人。',content:'当前人物设定：林舟负责核对设备记录。',status:'active',factType:'fact',sources:[{chapterId:chapter.id,revision:1}]});
  const friend=await run('graph.create',{type:'character_card',name:'白露',summary:'同行者，身份仍待讨论。',content:'这是一份尚未确认的角色资料。',status:'unconfirmed',factType:'unconfirmed',knownBy:[person.id]});
  const edge=await run('edge.create',{from:person.id,to:friend.id,name:'同行',content:'两人在楼梯口碰面。',status:'unconfirmed',factType:'plan'});
  await run('chapter.update',{chapterId:chapter.id,expectedRevision:1,append:'\n合成设备备注：待复核。'});
  const page=await run('planning.page.create',{name:'第二卷·内城',summary:'合成规划，用于查阅验收',requestId:crypto.randomUUID()});
  const plan=await run('planning.apply',{requestId:crypto.randomUUID(),operations:[{op:'node.create',ref:'parent',value:{title:'内城行动',pageId:page.id,summary:'计划中的行动',content:'这是未采用的规划，不是已发生的正文。',status:'idea'}},{op:'node.create',ref:'child',value:{title:'下楼核对设备',summary:'查清 A-61 的记录',pageId:page.id,parentId:'parent',memoryRefs:[person.id,friend.id],status:'selected'}},{op:'edge.create',value:{from:'parent',to:'child'}}]});
  await run('preset.set',{expectedRevision:0,preset:{name:'合成文风',enabled:true,blocks:[{identifier:'style',name:'文风',content:'通过人物行动推进场景。',enabled:true}]}});
  let external=createExternalAccess(libraries,{root:join(root,'external'),connectorPath});
  t.after(async()=>external.close());
  const profile=await external.create({name:'合成写手',modules:[...READER_MODULES]});
  const descriptor=()=>readFile(profile.connectionFile,'utf8').then(JSON.parse);
  const raw=async(path,body)=>{const info=await descriptor();const response=await fetch(info.endpoint+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+info.token,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,...await response.json()};};
  const connect=async()=>{
    const client=new Client({name:'independent-writer-test',version:'1.0'},{capabilities:{}}),transport=new StdioClientTransport({command:process.execPath,args:[connectorPath,'--connection',profile.connectionFile],stderr:'pipe'});let stderr='';transport.stderr?.on('data',part=>stderr+=part);await client.connect(transport);t.after(()=>client.close());
    const call=async(name,args={})=>{const response=await client.callTool({name,arguments:args});if(response.isError)throw Object.assign(new Error(response.content[0].text),response.structuredContent.error);return JSON.parse(response.content[0].text);};
    return {client,call,stderr:()=>stderr};
  };
  const restart=async()=>{await external.close();external=createExternalAccess(libraries,{root:join(root,'external'),connectorPath});await external.start();return external;};
  return {root,libraries,store,novel,other,run,chapter,next,person,friend,edge,page,plan,profile,descriptor,raw,connect,restart,get external(){return external;}};
}
test('query modules expose current prose, card facts, relationships and planning without writing a byte',async t=>{
  const f=await fixture(t),reader={id:'standalone-reader',presets:{}},query=(action,args={})=>f.libraries.current.queries.query(action,action==='novel.list'?args:{novelId:f.novel.id,...args},reader,READER_MODULES);
  const before=await bytes(f.store.root);
  assert.equal((await query('novel.list',{query:'雾城'})).items[0].id,f.novel.id);
  assert.equal((await query('chapter.list')).items[0].id,f.chapter.id);
  assert.equal((await query('chapter.search',{query:'A-61'})).items[0].chapterId,f.chapter.id);
  const first=await query('chapter.get',{chapterId:f.chapter.id,maxChars:9});assert.equal(first.revision,2);assert.equal(first.totalLength,(await f.run('chapter.get',{chapterId:f.chapter.id,maxChars:200000})).content.length);
  let text=first.content,offset=first.nextStart;while(offset!==null){const chunk=await query('chapter.get',{chapterId:f.chapter.id,start:offset,maxChars:7000,expectedRevision:first.revision});text+=chunk.content;offset=chunk.nextStart;}
  assert.equal(text,(await f.run('chapter.get',{chapterId:f.chapter.id,maxChars:200000})).content);assert(text.includes('一起走下楼梯'));
  const eof=await query('chapter.get',{chapterId:f.chapter.id,start:first.totalLength+100});assert.equal(eof.start,first.totalLength);assert.equal(eof.end,eof.start);assert.equal(eof.content,'');assert.equal(eof.nextStart,null);
  assert.equal((await query('graph.list',{query:'小舟'})).items[0].id,f.person.id);
  assert.equal((await query('graph.get',{nodeId:f.person.id})).status,'stale');assert.equal((await query('graph.get',{nodeId:f.friend.id})).factType,'unconfirmed');
  assert.equal((await query('edge.list',{nodeId:f.person.id})).items[0].id,f.edge.id);
  assert.equal((await query('planning.pages',{query:'第二卷·内城'}))[0].id,f.page.id);
  const child=await query('planning.get',{nodeId:f.plan.mapping.child});assert.equal(child.node.status,'selected');assert.equal(child.parent.id,f.plan.mapping.parent);assert.equal(child.resources.items.length,2);
  const guidance=await query('guidance.read',{section:'all'});assert.equal(guidance.mode,'read-only');assert.equal(guidance.preset.revision,1);
  assert.deepEqual(await bytes(f.store.root),before);
  assert.equal((await f.run('binding.get')).novelId,f.other.id);
});
test('standard stdio MCP allows autonomous lookup and records actual reads; direct writes are denied',async t=>{
  const f=await fixture(t),{client,call,stderr}=await f.connect(),before=await bytes(f.store.root);
  const advertised=await client.listTools();assert(advertised.tools.some(tool=>tool.name==='cuigengji_chapter_get'));assert(!advertised.tools.some(tool=>/delete|update|import|restore/.test(tool.name)));
  const novels=await call('cuigengji_novel_list',{query:'雾城'}),novelId=novels.items[0].id;
  const requested=[{kind:'chapter',id:f.chapter.id,maxChars:7},{kind:'setting',id:f.friend.id},
    {kind:'planning',id:f.plan.mapping.parent},{kind:'setting',id:'missing'},{kind:'chapter',id:f.next.id,expectedRevision:99}];
  const batch=await call('cuigengji_context_readMany',{novelId,items:requested});
  assert.deepEqual(batch.items.map(item=>item.id),requested.map(item=>item.id));
  const [first,setting,plan,missing,stale]=batch.items;
  assert.equal(first.revision,2);assert(first.nextStart>0);
  assert.equal(setting.status,'unconfirmed');assert.equal(setting.content,f.friend.content);
  for (const field of ['aliases','storyTime','sources','knownBy','dependsOn']) assert.deepEqual(setting[field],f.friend[field]);
  assert.equal(plan.status,'idea');assert(plan.content.includes('未采用'));
  assert.equal(missing.error.code,'NOT_FOUND');assert.equal(stale.error.code,'CONFLICT');
  const more=await call('cuigengji_context_readMany',{novelId,items:[{kind:'chapter',id:f.chapter.id,start:first.nextStart,expectedRevision:2,maxChars:20}]});
  assert.equal(first.content+more.items[0].content,(await f.run('chapter.get',{chapterId:f.chapter.id})).content.slice(0,more.items[0].end));
  await assert.rejects(call('cuigengji_graph_updateMany',{novelId,updates:[]}),{code:'READ_ONLY'});
  const hits=await call('cuigengji_chapter_search',{novelId,query:'设备记录'});
  const chapter=await call('cuigengji_chapter_get',{novelId,chapterId:hits.items[0].chapterId,maxChars:200000});assert(chapter.content.includes('A-61'));assert(chapter.content.includes('一起走下楼梯'));
  const characters=await call('cuigengji_graph_list',{novelId,query:'白露'});assert.equal((await call('cuigengji_graph_get',{novelId,nodeId:characters.items[0].id})).status,'unconfirmed');
  const plans=await call('cuigengji_planning_pages',{novelId,query:'内城'});assert.equal((await call('cuigengji_planning_list',{novelId,pageId:plans[0].id})).items.length,2);
  await assert.rejects(call('cuigengji_chapter_delete',{novelId,chapterId:f.chapter.id}),{code:'READ_ONLY'});
  const session=await call('cuigengji_reader_status');
  for(const action of ['chapter.update','chapter.delete','graph.update','graph.delete','planning.apply','novel.focus','preset.import','preset.update','workspace.import','library.change']){
    const denied=await f.raw('/query',{readerSessionId:session.readerSessionId,action,args:{novelId,chapterId:f.chapter.id,content:'不能写入'}});assert.equal(denied.error.code,'READ_ONLY');
  }
  assert.deepEqual(await bytes(f.store.root),before);
  const records=await f.external.records({id:f.profile.id,limit:100});assert(records.items.some(row=>row.action==='chapter.get'&&row.ok&&row.revision===2&&row.returnedChars===chapter.content.length));assert(records.items.some(row=>row.action==='chapter.delete'&&!row.ok));assert(records.items.every(row=>row.actor==='external-agent'));
  const audit=records.items.find(row=>row.action==='context.readMany'&&row.resources?.length===requested.length);
  assert.deepEqual(audit.resources.map(item=>item.id),requested.map(item=>item.id));
  assert(!JSON.stringify(audit).includes(f.friend.content));
  const secret=(await f.descriptor()).token;assert(!JSON.stringify(await f.external.status()).includes(secret));assert(!JSON.stringify(records).includes(secret));assert(!stderr().includes(secret));
});
test('shared clients have independent reader snapshots that survive a host restart',async t=>{
  const f=await fixture(t),{call}=await f.connect(),novelId=f.novel.id;
  const one=await call('cuigengji_reader_open',{label:'写手一'}),a=await call('cuigengji_preset_read',{novelId,readerSessionId:one.readerSessionId});assert.equal(a.revision,1);
  await f.run('preset.update',{expectedRevision:1,requestId:'new-preset',operations:[{op:'update',identifier:'style',content:'新版合成写作要求。'}]});
  const two=await call('cuigengji_reader_open',{label:'写手二'}),b=await call('cuigengji_preset_read',{novelId,readerSessionId:two.readerSessionId});assert.equal(b.revision,2);assert.notEqual(a.content,b.content);
  await f.restart();
  assert.deepEqual(await call('cuigengji_preset_read',{novelId,readerSessionId:one.readerSessionId}),a);
  assert.deepEqual(await call('cuigengji_preset_read',{novelId,readerSessionId:two.readerSessionId}),b);
  assert.equal((await f.run('binding.get')).novelId,f.other.id);
});
test('book scope and module levels govern discovery, paging, saved writes and retries on the same connection',async t=>{
  const f=await fixture(t),{client,call}=await f.connect(),novelId=f.novel.id;
  const notices=new EventEmitter();
  client.setNotificationHandler(ToolListChangedNotificationSchema,()=>{notices.emit('change')});
  await client.listTools();
  const notice=once(notices,'change',{signal:AbortSignal.timeout(8000)});
  const profile=await f.external.update({id:f.profile.id,expectedRevision:1,novelIds:[novelId],permissions:{manuscript:'write',settings:'read',planning:'none',guidance:'none'}});
  await notice;
  const names=async()=>new Set((await client.listTools()).tools.map(tool=>tool.name));
  assert((await names()).has('cuigengji_chapter_update'));assert(!(await names()).has('cuigengji_graph_create'));
  const list=await call('cuigengji_novel_list',{limit:1});assert.equal(list.total,1);assert.equal(list.items[0].id,novelId);assert.equal(list.nextOffset,null);
  for(const [name,args] of [['cuigengji_novel_get',{}],['cuigengji_chapter_get',{chapterId:f.chapter.id}],['cuigengji_context_readMany',{items:[{kind:'chapter',id:f.chapter.id}]}]]){
    await assert.rejects(call(name,{...args,novelId:f.other.id}),{code:'CAPABILITY_DENIED'});
  }
  const newChapter={title:'外部交稿',content:'保存的正文',novelId,requestId:'one-create'};
  await assert.rejects(call('cuigengji_chapter_create',{...newChapter,novelId:f.other.id}),{code:'CAPABILITY_DENIED'});
  const chapter=await call('cuigengji_chapter_create',newChapter);
  assert.deepEqual(await call('cuigengji_chapter_create',newChapter),chapter);
  const edit={novelId,chapterId:chapter.id,expectedRevision:1,append:'。',requestId:'once'};
  const changed=await call('cuigengji_chapter_update',edit);assert.equal(changed.revision,2);
  assert.deepEqual(await call('cuigengji_chapter_update',edit),changed);
  await assert.rejects(call('cuigengji_chapter_update',{...edit,requestId:'stale'}),{code:'CONFLICT'});
  assert.equal((await f.run('chapter.get',{chapterId:chapter.id})).content,'保存的正文。');
  await assert.rejects(call('cuigengji_graph_create',{novelId,type:'world_entry',name:'不能写',requestId:'blocked'}),{code:'READ_ONLY'});
  const rights=await f.external.update({id:profile.id,expectedRevision:profile.revision,permissions:{manuscript:'read',settings:'write',planning:'write',guidance:'write'}});
  await assert.rejects(call('cuigengji_chapter_update',{...edit,expectedRevision:2,requestId:'downgraded'}),{code:'READ_ONLY'});
  const card=await call('cuigengji_graph_create',{novelId,type:'world_entry',name:'山门',requestId:'new-card'});
  assert.equal((await call('cuigengji_graph_updateMany',{novelId,requestId:'edit-cards',updates:[{nodeId:card.id,expectedRevision:card.revision,summary:'山路的入口'}]})).items[0].changed,true);
  const plan=await call('cuigengji_planning_apply',{novelId,requestId:'scene',operations:[{op:'node.create',ref:'scene',value:{title:'再访山门'}}]});
  assert.equal((await call('cuigengji_planning_get',{novelId,nodeId:plan.mapping.scene})).node.title,'再访山门');
  const memory=await call('cuigengji_creativeMemory_read',{novelId});
  await call('cuigengji_creativeMemory_update',{novelId,requestId:'style',expectedRevision:memory.revision,expectedHash:memory.contentHash,append:'此后用有限视角。'});
  assert.match((await call('cuigengji_creativeMemory_read',{novelId,full:true})).content,/有限视角/);
  assert.equal((await call('cuigengji_guidance_read',{novelId,section:'core'})).mode,'read-write');
  const audit=await f.external.records({id:profile.id});assert(audit.items.some(row=>row.action==='chapter.update'&&row.ok&&row.actor==='external-agent'));
  assert.equal((await f.run('binding.get')).novelId,f.other.id);
  await f.restart();assert((await names()).has('cuigengji_graph_update'));
  await assert.rejects(f.external.update({id:profile.id,expectedRevision:1,novelIds:null}),{code:'CONFLICT'});
  await f.external.update({id:profile.id,expectedRevision:rights.revision,permissions:{manuscript:'none',settings:'none',planning:'none',guidance:'none'}});
  assert(!(await names()).has('cuigengji_novel_list'));await assert.rejects(call('cuigengji_novel_list',{}),{code:'CAPABILITY_DENIED'});
  const create={requestId:'assistant-creation',name:'限定连接',novelIds:[novelId],permissions:{settings:'read'}};
  const issued=await f.external.create(create);assert.equal((await f.external.create(create)).id,issued.id);
  await assert.rejects(f.external.create({...create,novelIds:null}),{code:'REQUEST_ID_REUSED'});
  await f.external.revoke({id:issued.id,expectedRevision:issued.revision});
  await assert.rejects(f.external.create(create),{code:'NOT_FOUND'});
});
test('permissions are enforced after discovery, on library switches and after revocation',async t=>{
  const f=await fixture(t),{client,call}=await f.connect(),novelId=f.novel.id;
  await call('cuigengji_chapter_list',{novelId});
  const updated=await f.external.update({id:f.profile.id,expectedRevision:1,modules:['settings']});
  const {tools}=await client.listTools();
  assert(!tools.some(tool=>tool.name==='cuigengji_chapter_get'));
  const kinds=tools.find(tool=>tool.name==='cuigengji_context_readMany').inputSchema.properties.items.items.properties.kind;
  assert.deepEqual(kinds.enum??[kinds.const],['setting']);
  await assert.rejects(call('cuigengji_context_readMany',{novelId,items:[{kind:'setting',id:f.person.id},{kind:'chapter',id:f.chapter.id}]}),{code:'CAPABILITY_DENIED'});
  await assert.rejects(call('cuigengji_chapter_list',{novelId}),{code:'CAPABILITY_DENIED'});
  await assert.rejects(call('cuigengji_novel_handoff',{novelId}),{code:'CAPABILITY_DENIED'});
  assert.equal((await call('cuigengji_graph_get',{novelId,nodeId:f.person.id})).name,'林舟');
  const otherRoot=join(f.root,'other-library'),other=new LibraryService(otherRoot,{persist:async()=>{}});await other.current.maintenance.ensureReady();
  await f.libraries.change({mode:'switch',path:otherRoot,confirm:true});
  await assert.rejects(call('cuigengji_graph_get',{novelId,nodeId:f.person.id}),{code:'LIBRARY_CHANGED'});
  const credentials=await f.descriptor();await f.external.revoke({id:f.profile.id,expectedRevision:updated.revision});
  const denied=await fetch(credentials.endpoint+'/capabilities',{headers:{authorization:'Bearer '+credentials.token}});assert.equal(denied.status,401);
});
test('continuation rejects changed revisions, invalid args and pending recovery without repairing the library',async t=>{
  const f=await fixture(t),reader={id:'readonly',presets:{}},query=(action,args={})=>new QueryService(f.store).query(action,{novelId:f.novel.id,...args},reader,READER_MODULES);
  const first=await query('chapter.get',{chapterId:f.chapter.id,maxChars:10});await f.run('chapter.update',{chapterId:f.chapter.id,expectedRevision:2,append:'新保存的内容'});
  await assert.rejects(query('chapter.get',{chapterId:f.chapter.id,start:first.nextStart,expectedRevision:first.revision}),{code:'CONFLICT'});
  await assert.rejects(query('graph.get',{nodeId:f.person.id,actor:{kind:'human'}}),{code:'INVALID_INPUT'});
  await assert.rejects(query('novel.get',{novelId:'constructor'}),{code:'NOT_FOUND'});
  await writeFile(join(f.store.root,'transaction.pending.json'),'{}');const before=await bytes(f.store.root);
  await assert.rejects(query('chapter.list'),{code:'READ_ONLY_RECOVERY_REQUIRED'});assert.deepEqual(await bytes(f.store.root),before);
});
test('capabilities explicitly classify operations and readonly assembly has no command handlers',()=>{
  const ids=new Set(ACTION_CAPABILITIES.map(value=>value.id));assert.equal(ids.size,ACTION_CAPABILITIES.length);
  for(const id of ['chapter.get','graph.get','planning.get','preset.read'])assert.equal(ACTION_CAPABILITIES.find(value=>value.id===id).effect,'read');
  for(const id of ['chapter.update','graph.delete','planning.apply','preset.update'])assert.equal(ACTION_CAPABILITIES.find(value=>value.id===id).effect,'write');
  for(const id of ['chapter.update','graph.updateMany','planning.apply','creativeMemory.update'])assert.equal(ACTION_CAPABILITIES.find(value=>value.id===id).external,true);
  for(const id of ['external.update','graph.delete','chapter.delete','preset.update'])assert.equal(ACTION_CAPABILITIES.find(value=>value.id===id).external,false);
  assert(QUERY_CAPABILITIES.every(query=>ACTION_CAPABILITIES.some(value=>value.id===query.id&&value.effect==='read'&&value.external)));
  assert.equal(ACTION_CAPABILITIES.find(value=>value.id==='guidance.read').dshTool,'cuigengji_guidance');
  assert.equal(ACTION_CAPABILITIES.find(value=>value.id==='maintenance.status').dshTool,'cuigengji_maintenance');
  assert(QUERY_CAPABILITIES.every(query=>!/(?:create|update|delete|import|restore|apply|focus)$/.test(query.id)));
});

test('reader sessions belong to one connection and invalid request objects never enter audit identifiers',async t=>{
  const f=await fixture(t),{call}=await f.connect(),reader=await call('cuigengji_reader_status');
  const second=await f.external.create({name:'另一位审稿人',modules:['settings']});
  const mcpServers={...f.profile.clientConfig.mcpServers,...second.clientConfig.mcpServers};
  assert.match(f.profile.serverName,/^cg_read_[A-Za-z0-9_-]{22}$/);
  assert.equal(Object.keys(mcpServers).length,2);
  assert.equal(mcpServers[second.serverName].args.at(-1),second.connectionFile);
  await f.restart();
  const restored=(await f.external.status()).profiles.find(profile=>profile.id===second.id);
  assert.equal(restored.serverName,second.serverName);
  assert.deepEqual(restored.clientConfig,second.clientConfig);
  const descriptor=JSON.parse(await readFile(second.connectionFile,'utf8'));
  const response=await fetch(descriptor.endpoint+'/query',{method:'POST',headers:{authorization:'Bearer '+descriptor.token,'content-type':'application/json'},body:JSON.stringify({readerSessionId:reader.readerSessionId,action:'graph.get',args:{novelId:f.novel.id,nodeId:f.person.id}})});
  assert.equal((await response.json()).error.code,'UNAUTHORIZED');
  await f.raw('/query',{readerSessionId:reader.readerSessionId,action:'chapter.delete',args:{chapterId:{content:'UNTRUSTED_CONTENT_MUST_NOT_BE_LOGGED'}}});
  const record=(await f.external.records({id:f.profile.id,limit:1})).items[0];assert.equal(record.resourceId,undefined);assert(!JSON.stringify(record).includes('UNTRUSTED_CONTENT'));
});

test('author can disable and revoke a connection even when the library needs repair',async t=>{
  const f=await fixture(t);let route;
  registerRpcRoute({connection:{fetch:{register:value=>route=value}}},{dataRoot:f.store.root,external:f.external,maintenance:{ensureReady:async()=>{throw Object.assign(Error('合成库等待检查'),{code:'UPGRADE_REQUIRED'});}}});
  const rpc=async(action,args={})=>(await (await route.fetch(new Request('http://localhost/api/cuigengji/dispatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',method:'cuigengji/dispatch',rpcId:'author-external-test',payload:{action,args}})}))).json()).result;
  assert.equal((await rpc('external.create',{name:'不能新增'})).error.code,'UPGRADE_REQUIRED');
  assert.equal((await rpc('external.status')).ok,true);
  const disabled=await rpc('external.update',{id:f.profile.id,expectedRevision:1,enabled:false});assert.equal(disabled.ok,true);assert.equal(disabled.value.enabled,false);
  const revoked=await rpc('external.revoke',{id:f.profile.id,expectedRevision:disabled.value.revision});assert.equal(revoked.ok,true);assert.equal(revoked.value.revoked,true);
});

test('invalid optional external configuration cannot prevent the main DSH tools from starting',async t=>{
  const root=await mkdtemp(join(tmpdir(),'cg-reader-startup-')),externalRoot=join(root,'external');await mkdir(externalRoot);await writeFile(join(externalRoot,'store.json'),'{broken');
  const tools=new Map(),effects=[],routes=[],warnings=[];
  const ctx={tools:{register:tool=>tools.set(tool.name,tool)},skills:{register(){}},connection:{fetch:{register:route=>routes.push(route)}},logger:{warn:message=>warnings.push(message)},on(){},effect:fn=>effects.push(fn()),provide:(key,value)=>ctx[key]=value};
  t.after(async()=>{for(const dispose of effects)await dispose();await rm(root,{recursive:true,force:true});});
  await apply(ctx,{dataRoot:join(root,'books'),externalRoot,usageRoot:join(root,'usage')});
  assert.ok(tools.has('cuigengji_project'));assert.equal(warnings.length,1);
  assert.deepEqual(JSON.parse(await tools.get('cuigengji_project').execute({action:'novel.list',args:{}},{agent:{id:'test'},signal:new AbortController().signal})),[]);
  const response=await routes[0].fetch(new Request('http://localhost/api/cuigengji/dispatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',method:'cuigengji/dispatch',rpcId:'invalid-external',payload:{action:'external.status',args:{}}})}));
  assert.equal((await response.json()).result.error.code,'CORRUPT_STORE');
  assert.equal(await readFile(join(externalRoot,'store.json'),'utf8'),'{broken');
});

test('legacy task credentials stay disabled after restarting with a long-lived manuscript grant',async t=>{
  const f=await fixture(t);
  const grant=await f.external.update({
    id:f.profile.id,expectedRevision:1,novelIds:[f.novel.id],permissions:{manuscript:'write'},
  });
  const id=crypto.randomUUID(),token='a'.repeat(64);
  const config=await f.external.config.load();
  config.profiles[id]={
    id,name:'已停用的旧任务连接',revision:1,enabled:true,modules:[],libraryRoot:f.store.root,
    tokenHash:createHash('sha256').update(token).digest('hex'),createdAt:new Date().toISOString(),task:true,
  };
  const legacyFile=join(f.root,'external','connections',id+'.json');
  const legacyDescriptor=JSON.stringify({...await f.descriptor(),profileId:id,token,mode:'task'});
  await writeFile(legacyFile,legacyDescriptor);
  await f.external.config.save(config);
  await f.restart();

  const status=await f.external.status();
  assert.equal(status.mode,'read-write');
  assert.deepEqual(status.profiles.map(profile=>profile.id),[grant.id]);
  assert.equal(status.profiles[0].permissions.manuscript,'write');
  assert.equal(await readFile(legacyFile,'utf8'),legacyDescriptor);
  const {endpoint}=await f.descriptor();
  const rejected=await fetch(endpoint+'/capabilities',{headers:{authorization:'Bearer '+token}});
  assert.equal(rejected.status,401);
  assert.equal((await rejected.json()).error.code,'UNAUTHORIZED');

  const {call}=await f.connect();
  const chapter=await call('cuigengji_chapter_create',{
    novelId:f.novel.id,title:'长期授权直接写入',content:'正式正文。',requestId:'legacy-profile-check',
  });
  assert.equal((await f.run('chapter.get',{chapterId:chapter.id})).content,'正式正文。');
});
