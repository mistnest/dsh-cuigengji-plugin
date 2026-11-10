import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {UsageService} from '../src/application/usage/service.ts';
import {UsageStore} from '../src/infrastructure/persistence/usage-store.ts';
import {ProviderReader,parseQuota} from '../src/adapters/usage/providers.ts';
import {usageDay} from '../src/domain/usage/settings.ts';
import {registerUsage} from '../src/adapters/dsh/usage.ts';
import {scanCodex} from '../src/adapters/usage/codex.ts';
import {moveBubbleModule} from '../src/client/features/pet/bubble-layout.ts';
const time=Date.parse('2026-10-31T14:00:00+08:00'),day=usageDay(time);
const event=(seq,type,data={},stamp=time)=>({seq,type,data,time:stamp});
const sample={inputTokens:1000,outputTokens:100,cacheReadTokens:2000,cacheWriteTokens:0,totalTokens:3100};
const route={provider:'deepseek',model:'deepseek-flash'};
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'cuigengji-usage-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
test('replacement, packed streams, failed retries, multi-step, replay and inherited logs produce one durable ledger',async t=>{
  const root=await fixture(t),service=new UsageService(root);const events=[event(0,'turn/start',{turn:1}),event(1,'step/start',{turn:1,step:1}),event(2,'assistant/attempt',{turn:1,step:1,stream:[{type:'chunk',time,chunk:{type:'usage',usage:sample}}]}),event(3,'assistant/message',{turn:1,step:1,usage:sample,message:{source:route}}),event(4,'llm/retry-started',{turn:1,step:1}),event(5,'assistant/attempt',{turn:1,step:1,usage:{...sample,outputTokens:50,totalTokens:3050}}),event(6,'step/end',{turn:1,step:1}),event(7,'step/start',{turn:1,step:2}),event(8,'assistant/message',{turn:1,step:2,usage:sample,message:{source:route}})];
  await service.ingest('chat',events);await new UsageService(root).ingest('chat',events);await service.ingest('child',events,'dsh',events.length);const report=await service.report({from:day,to:day,details:true});assert.equal(report.total.calls,3);assert.equal(report.total.tokens,9250);assert.equal(report.records.find(r=>r.step===1&&r.attempt===1).model,null);assert.equal(report.total.unpriced,1);assert.equal(report.total.costs.CNY,'0.002880000');assert.equal(report.total.cacheRead,6000);
});
test('reported total is not charged as input and incomplete/contradictory samples are never priced as free',async t=>{
  const service=new UsageService(await fixture(t));await service.ingest('a',[event(0,'assistant/message',{turn:0,step:0,message:{source:route},usage:{inputTokens:100,outputTokens:10,totalTokens:900}})]);const r=await service.report({from:day,to:day,details:true});assert.equal(r.total.tokens,900);assert.equal(r.records[0].cost,null);
});
test('configuration CAS is independent of ongoing token writes; old prices survive a later settlement',async t=>{
  const service=new UsageService(await fixture(t)),config=await service.configuration();await service.ingest('a',[event(0,'assistant/message',{turn:0,step:0,message:{source:route},usage:sample})]);await service.configure({expectedRevision:config.revision,prices:[{id:'custom',provider:'deepseek',model:'deepseek-flash',currency:'CNY',input:'100',output:'100',cacheRead:'100',revision:1}]});await assert.rejects(service.configure({expectedRevision:0,settings:config.settings}),e=>e.code==='CONFLICT');await service.ingest('a',[event(1,'assistant/message',{turn:0,step:0,message:{source:route},usage:sample})]);assert.equal((await service.report({from:day,to:day,details:true})).records[0].cost,'0.001440000');
});
test('journal recovery completes pages and cursors together after an interrupted commit',async t=>{
  const root=await fixture(t),store=new UsageStore(root);await store.run(m=>{m.cursors.x={seq:8,turn:1,step:1,attempt:0};m.pending={pages:[{day,records:{a:{id:'a',tokens:null}}}]};},false);
  const initial=await new UsageService(root).configuration();assert.ok(initial.settings);
  const file=join(root,'store.json'),meta=JSON.parse(await readFile(file,'utf8').catch(()=>'null'))||{version:1,revision:0,days:[],cursors:{}};meta.pending={pages:[{day,records:{a:{id:'a',tokens:null}}}]};meta.cursors.x={seq:8};await writeFile(file,JSON.stringify(meta));
  await store.run(async(m,load)=>{assert.equal(m.cursors.x.seq,8);assert.equal((await load(day)).records.a.id,'a');});assert.equal(JSON.parse(await readFile(file,'utf8')).pending,undefined);
});
test('provider credentials stay on the host; quota selectors and missing fields retain their meaning',async()=>{
  let options;const reader=new ProviderReader({get:n=>n==='credentials'?{resolve:async()=>({value:'synthetic-key'})}:undefined},async(url,o)=>{options=o;return Response.json({balance_infos:[{currency:'CNY',total_balance:'12.34'}]});});
  const b=await reader.read({id:'d',template:'deepseek',keyRef:'KEY',currency:'CNY'});assert.equal(b.balance,12.34);assert.equal(options.headers.Authorization,'Bearer synthetic-key');assert.equal(JSON.stringify(b).includes('synthetic-key'),false);
  assert.equal(parseQuota({data:{limits:[{type:'TIME_LIMIT',percentage:1,unit:3},{type:'TOKENS_LIMIT',percentage:57,unit:3}]}},{windows:[{pick:{list:'data.limits',types:['TOKENS_LIMIT'],unit:3},percent:'percentage'}]})[0].percent,57);
  await assert.rejects(new ProviderReader({get:()=>({resolve:async()=>({value:'x'})})},async()=>Response.json({})).read({id:'d',template:'deepseek',keyRef:'KEY',currency:'CNY'}),e=>e.code==='PROVIDER_FAILED');
});
test('account login path awaits state and uses a stable profile identity, including bonus wallets',async()=>{
  const account={getState:async()=>({status:'credential-stored'}),getProfile:async()=>({status:'ready',value:{id:'synthetic-user'}}),getBalance:async()=>({status:'ready',value:[{currency:'CNY',balance:'10'}],bonusWallets:[{currency:'CNY',balance:'2'}]})};const b=await new ProviderReader({get:n=>n==='deepseekAccount'?account:null}).read({id:'d',template:'deepseek',keyRef:'DEEPSEEK_API_KEY',currency:'CNY'});assert.equal(b.balance,12);assert.equal(b.bonus,2);assert.match(b.scope,/^[a-f0-9]{64}$/);
});

test('balance mappings convert same-endpoint totals and usage with one scale, and separate usage with its own scale',async()=>{
  const reader=new ProviderReader({get:()=>null},async url=>Response.json(url.pathname==='/usage'?{used:250}:{total:10000,used:2500}));
  const source={id:'scaled',template:'custom',keyRef:'',currency:'USD',balance:{url:'https://example.invalid/balance',json:{total:'total',used:'used',scale:.01}}};
  assert.equal((await reader.read(source)).balance,75);
  source.balance.usage={url:'https://example.invalid/usage',json:{used:'used',scale:.1}};
  assert.equal((await reader.read(source)).balance,75);
});
test('old whale import is previewed, copied and deduplicated without fabricated token splits',async t=>{
  const service=new UsageService(await fixture(t)),input={events:[{ts:time,tokens:450,model:'old',cost:.12}],history:{}};const preview=await service.dispatch('usage.importPreview',{input});assert.equal(preview.count,1);assert.equal((await service.report({from:day,to:day})).total.calls,0);await service.dispatch('usage.import',{input,expectedDigest:preview.digest});await service.dispatch('usage.import',{input,expectedDigest:preview.digest});const report=await service.report({from:day,to:day,details:true});assert.equal(report.total.calls,1);assert.equal(report.total.tokens,450);assert.equal(report.records[0].partial,true);assert.equal(report.records[0].cost,'0.120000000');
});

test('prices and exchange rates are frozen per call; filtered reports and quota baselines use the same records',async t=>{
  const service=new UsageService(await fixture(t)),cfg=await service.configuration();
  const settings={...cfg.settings,exchangeRates:{CNY:'1',USD:'7'}};
  await service.configure({expectedRevision:0,settings,prices:[{id:'usd',provider:'deepseek',model:'deepseek-flash',currency:'USD',input:'1',output:'4',cacheRead:'0.02',revision:1}]});
  await service.ingest('priced',[event(0,'assistant/message',{turn:0,step:0,message:{source:route},usage:sample})]);
  let c=await service.configuration(),r=await service.report({from:day,to:day,details:true});const old=r.records[0];
  await service.configure({expectedRevision:c.revision,settings:{...settings,exchangeRates:{CNY:'1',USD:'8'}},prices:[{...c.prices[0],input:'2'}],sources:[{...c.sources[0],limit:{total:10000,used:100,automatic:true,reset:'none'}}]});
  await service.ingest('priced',[event(1,'assistant/message',{turn:0,step:0,message:{source:route},usage:sample}),event(2,'assistant/message',{turn:1,step:0,message:{source:route},usage:sample})]);
  r=await service.report({from:day,to:day,details:true,source:'deepseek',model:'flash'});
  assert.equal(r.records.length,2);assert.equal(r.total.calls,2);assert.equal(r.records.find(row=>row.turn===0).reportCost,old.reportCost);assert.equal(r.records.find(row=>row.turn===0).exchangeRate,'7.000000000');assert.equal(r.records.find(row=>row.turn===1).exchangeRate,'8.000000000');
  assert.equal(r.balances[0].quota.used,3200);assert.equal((await service.report({from:day,to:day,model:'no-such-model',details:true})).total.calls,0);
});

test('legacy popup settings cannot open a bubble; pending notices and optional sounds remain available',async t=>{
  const service=new UsageService(await fixture(t)),cfg=await service.configuration();
  const wav=Buffer.alloc(46);wav.write('RIFF');wav.write('WAVE',8);
  await service.asset({expectedRevision:0,name:'合成测试音',kind:'audio',mime:'audio/wav',data:wav.toString('base64')});
  const config=await service.configuration(),sound=config.assets[0].id,settings={...config.settings,bubbleMode:'weighted',bubbles:[{id:'random',name:'轮换',weight:1,lines:[[{id:'choice',kind:'randomText',value:'',choices:['甲','乙'],choiceWeights:[1,1]}]]}],events:{...config.settings.events,question:{on:true,bubble:true,ttl:30,sound}}};
  await service.configure({expectedRevision:config.revision,settings});
  await service.notification({id:'pending',kind:'question',sessionId:'chat',time:Date.now()-86400000,text:'等待',pending:true});
  const a=await service.presentation({index:0}),b=await service.presentation({index:0}),c=await service.presentation({index:1});
  assert.equal(a.showBubble,false);assert.equal(a.ttl,0);assert.equal(a.notification.text,'等待');assert.equal(a.sound.id,'pending');assert.deepEqual(a.lines,b.lines);assert.notDeepEqual(a.lines,c.lines);
  await service.dispatch('usage.delivered',{id:'pending'});assert.equal((await service.presentation()).sound,undefined);assert.equal((await service.presentation()).notification.id,'pending');
  await service.dispatch('usage.ack',{id:'pending'});assert.equal((await service.presentation()).notification,undefined);
});

test('native backup roundtrips assets by use and validates every section before changing the ledger',async t=>{
  const root=await fixture(t),service=new UsageService(root),png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  await service.asset({expectedRevision:0,name:'图',kind:'image',mime:'image/png',data:png});
  await service.asset({expectedRevision:1,name:'角色',kind:'role',mime:'image/png',data:png});
  let config=await service.configuration();assert.notEqual(config.assets[0].id,config.assets[1].id);assert.equal(config.assets[0].file,config.assets[1].file);
  await service.configure({expectedRevision:config.revision,settings:{...config.settings,customRole:config.assets[1].id}});
  await service.ingest('backup',[event(0,'assistant/message',{turn:0,step:0,message:{source:route},usage:sample})]);
  const backup=await service.dispatch('usage.export'),other=new UsageService(join(root,'copy')),preview=await other.dispatch('usage.importPreview',{input:backup});
  assert.equal(preview.native,undefined);await other.dispatch('usage.import',{input:backup,expectedDigest:preview.digest,restoreConfiguration:true});
  assert.equal((await other.configuration()).settings.customRole,config.assets[1].id);assert.equal((await other.report({from:day,to:day})).total.tokens,3100);
  const broken=structuredClone(backup);Object.values(broken.pages[0].records)[0].turn=-1;
  await assert.rejects(other.dispatch('usage.importPreview',{input:broken}),/无效/);
  const badSource=structuredClone(backup);badSource.meta.sources[0].id='__proto__';await assert.rejects(other.dispatch('usage.import',{input:badSource,expectedDigest:'wrong'}),/无效|保留/);
  assert.equal((await other.report({from:day,to:day})).total.tokens,3100);
});

test('failed host replay retries from durable events and never loses live usage or replays old alerts',async t=>{
  const service=new UsageService(await fixture(t)),handlers={},entries=[event(0,'assistant/message',{turn:0,step:0,message:{source:route},usage:sample}),event(1,'turn/end',{turn:0},Date.now())];let fail=true,dispose;
  const ctx={on:(name,fn)=>handlers[name]=fn,get:()=>({open:async()=>{if(fail)throw Error('temporary');return {inheritedEventCount:0,read:async(offset,limit)=>({events:entries.filter(e=>e.seq>=offset).slice(0,limit)}),close:async()=>{}};},list:async()=>[]}),effect:fn=>dispose=fn(),logger:{warn:()=>{}}};
  registerUsage(ctx,service);t.after(()=>dispose());
  handlers['session/event']({id:'replayed'},entries[0]);await handlers['session/flush']({id:'replayed'});assert.match(service.statusError,/重试/);
  fail=false;handlers['session/event']({id:'replayed'},entries[1]);await handlers['session/flush']({id:'replayed'});
  assert.equal((await service.report({from:day,to:day})).total.calls,1);assert.equal(service.statusError,'');
  const state=await service.dispatch('usage.export');assert.equal(state.meta.events.length,1);
});

test('Codex scan reads cumulative deltas and windows, survives partial lines and archive relocation',async t=>{
  const root=await fixture(t),dir=join(root,'codex');await mkdir(dir);
  const row=(total,stamp)=>({type:'event_msg',timestamp:stamp,payload:{type:'token_count',info:{total_token_usage:total},rate_limits:{primary:{used_percent:12,window_minutes:300,resets_at:1800000000}}}});
  const first=[{type:'session_meta',payload:{id:'codex-synthetic'}},{type:'turn_context',payload:{model:'synthetic-model'}},row({input_tokens:1000,cached_input_tokens:200,output_tokens:100,reasoning_output_tokens:50},'2026-10-31T06:00:00Z')];
  const path=join(dir,'log.jsonl');await writeFile(path,first.map(JSON.stringify).join('\n')+'\n');
  const a=await scanCodex(dir),service=new UsageService(join(root,'usage'));await service.ingest(a.sessions[0].id,a.sessions[0].events,'codex');
  await writeFile(path,JSON.stringify(row({input_tokens:1600,cached_input_tokens:300,output_tokens:160,reasoning_output_tokens:80},'2026-10-31T06:01:00Z')).slice(0,40),{flag:'a'});
  const partial=await scanCodex(dir,a.files);assert.equal(partial.sessions.length,0);
  const tail=JSON.stringify(row({input_tokens:1600,cached_input_tokens:300,output_tokens:160,reasoning_output_tokens:80},'2026-10-31T06:01:00Z'));await writeFile(path,tail.slice(40)+'\n',{flag:'a'});
  const b=await scanCodex(dir,partial.files);await service.ingest(b.sessions[0].id,b.sessions[0].events,'codex');
  assert.equal((await service.report({from:day,to:day})).total.tokens,1760);assert.equal(Object.values(b.files)[0].windows.items[0].label,'5 小时');
  const archived=join(root,'archived');await mkdir(archived);await writeFile(join(archived,'moved.jsonl'),await readFile(path));
  const c=await scanCodex(archived);await service.ingest(c.sessions[0].id,c.sessions[0].events,'codex');assert.equal((await service.report({from:day,to:day})).total.tokens,1760);
});

test('host completion reasons and parallel approval decisions preserve the remaining pending items',async t=>{
  const service=new UsageService(await fixture(t));
  const now = Date.now();
  await service.notification({id:'question-still-waiting',kind:'question',sessionId:'pending',time:now,pending:true,text:'问题'});
  await service.ingest('pending',[
    event(0,'approval/asked',{id:'approval-a'},now),
    event(1,'approval/asked',{id:'approval-b'},now),
    event(2,'approval/decided',{id:'approval-a',outcome:'allowed-once'},now),
  ],'dsh',0,true);
  let entries=(await service.dispatch('usage.export')).meta.events;
  assert.equal(entries.find(e=>e.requestId==='approval-a').resolved,true);
  assert.equal(entries.find(e=>e.requestId==='approval-b').pending,true);
  assert.equal(entries.find(e=>e.id==='question-still-waiting').pending,true);
  for(const [i,kind] of ['aborted','error','blocked','completed'].entries())await service.ingest('completion-'+kind,[event(i,'turn/end',{reason:{kind}},now)],'dsh',0,true);
  await service.ingest('pending',[event(3,'turn/end',{reason:{kind:'aborted'}},now)],'dsh',0,true);
  entries=(await service.dispatch('usage.export')).meta.events;
  assert.equal(entries.filter(e=>e.kind==='complete').length,1);assert.equal(entries.some(e=>e.pending),false);
});

test('question observer uses the host session identity and delegates the answer unchanged',async t=>{
  const service=new UsageService(await fixture(t)),handlers={};let dispose,answer;
  const ctx={on:(name,fn)=>handlers[name]=fn,get:()=>({list:async()=>[]}),effect:fn=>dispose=fn(),logger:{warn:()=>{}}};
  registerUsage(ctx,service);t.after(()=>dispose());
  const response=handlers['user-questions/request']({agent:{session:{id:'question-session'}},wait:{callId:'call-a'}},()=>new Promise(resolve=>answer=resolve));
  await service.flush();const waiting=(await service.presentation()).notification;
  assert.equal(waiting.sessionId,'question-session');assert.equal(waiting.pending,true);
  const expected={answers:[{id:'a',selected:['确认']}]};answer(expected);assert.equal(await response,expected);await service.flush();
  assert.equal((await service.presentation()).notification,undefined);
});

test('module drops preserve identities and a rejected image merge leaves the original untouched',()=>{
  const text=id=>({id,kind:'text',value:id}),image={id:'image',kind:'image',value:'asset'};
  const input=[[text('a'),text('b')],[text('c')],[image]],before=structuredClone(input);
  const moved=moveBubbleModule(input,0,1,1,1);assert.deepEqual(moved.map(row=>row.map(m=>m.id)),[['a'],['c','b'],['image']]);
  const split=moveBubbleModule(moved,1,0,3,0);assert.deepEqual(split.map(row=>row.map(m=>m.id)),[['a'],['b'],['image'],['c']]);
  assert.throws(()=>moveBubbleModule(input,2,0,0,1),/独占/);assert.deepEqual(input,before);
});
