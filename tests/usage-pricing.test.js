import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {UsageService} from '../src/application/usage/service.ts';
import {UsageStore} from '../src/infrastructure/persistence/usage-store.ts';
import {charge,validatePrice} from '../src/domain/usage/pricing.ts';
import {peakPrice,peakStatus,defaultPriceSchedule,priceScheduleIssue} from '../src/domain/usage/calendar.ts';
import {usageDay} from '../src/domain/usage/settings.ts';

const off=Date.parse('2026-11-01T10:00:00+08:00'),peak=Date.parse('2026-11-02T10:00:00+08:00');
const usage={inputTokens:1000,outputTokens:100,cacheReadTokens:2000,cacheWriteTokens:0,totalTokens:3100};
const base={id:'sample',source:'dsh',sessionId:'synthetic',turn:0,step:0,attempt:0,time:off,provider:'deepseek-official',model:'deepseek-flash',tokens:{input:1000,output:100,cacheRead:2000,cacheWrite:0,total:3100},partial:false};
const custom={id:'custom',provider:'*',model:'other-model',currency:'USD',input:'5',output:'10',cacheRead:'1',revision:1};
const event=(seq,provider='deepseek-official',model='deepseek-flash',time=off,sample=usage,turn=0)=>({seq,time,type:'assistant/message',data:{turn,step:0,usage:sample,message:{source:{provider,model}}}});
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'cuigengji-price-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}

test('current DSH official/account routes and compatible DeepSeek model names select both tariffs',()=>{
  for(const provider of ['deepseek','deepseek-official','deepseek-account'])for(const model of ['deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp']){
    const valley=charge({...base,provider,model},[]),busy=charge({...base,provider,model,time:peak},[]);
    assert.equal(valley.cost,'0.001440000');assert.equal(busy.cost,'0.002880000');
    assert.equal(valley.price.period,'off-peak');assert.equal(busy.price.period,'peak');assert.equal(busy.price.referencePrice,false);
  }
  assert.equal(charge({...base,model:'deepseek-v4-pro'},[]).cost,'0.006150000');
  assert.equal(charge({...base,model:'deepseek-v4-pro',time:peak},[]).cost,'0.012300000');
});

test('Beijing tariff boundaries, weekends, public holidays and countdown use one calendar',()=>{
  for(const [stamp,expected] of [['08:59:59',false],['09:00:00',true],['11:59:59',true],['12:00:00',false],['14:00:00',true],['17:59:59',true],['18:00:00',false]]){
    const time=Date.parse(`2026-11-02T${stamp}+08:00`),status=peakStatus(time);
    assert.equal(peakPrice(time),expected);assert.equal(status.peak,expected);assert.equal(peakPrice(status.nextChangeAt),!expected);
  }
  assert.equal(peakPrice(off),false);assert.equal(peakPrice(Date.parse('2026-10-01T10:00:00+08:00')),false);
  assert.equal(peakStatus(Date.parse('2026-10-01T10:00:00+08:00')).nextChangeAt,Date.parse('2026-10-08T09:00:00+08:00'));
  assert.equal(peakStatus(Date.parse('2026-11-02T08:30:00+08:00')).countdown,'0小时30分后转高峰');
  assert.match(peakStatus(Date.parse('2027-01-04T10:00:00+08:00')).calendarNote,/待更新/);
});

test('reasoning is included in output and only reported optional cache buckets are estimated',async t=>{
  const service=new UsageService(await fixture(t));
  await service.ingest('partial',[event(0,'deepseek-official','deepseek-flash',off,{inputTokens:1000,outputTokens:100,cacheReadTokens:2000,reasoningTokens:80})]);
  const r=await service.report({from:usageDay(off),to:usageDay(off),details:true});
  assert.equal(r.total.tokens,3100);assert.equal(r.total.costs.CNY,'0.001440000');assert.equal(r.total.partial,1);
  assert.equal(r.records[0].tokens.total,undefined);assert.equal(r.records[0].price.usageEstimated,true);
  assert.equal(charge({...base,tokens:{...base.tokens,reasoning:80}},[]).cost,'0.001440000');
});

test('unknown models, missing usage, contradictory totals and unconfigured cache writes stay unpriced',()=>{
  for(const [patch,reason] of [[{model:'unknown'},'unknown_price'],[{model:null},'missing_model'],[{tokens:null},'missing_usage'],[{tokens:{...base.tokens,total:4000}},'incomplete_usage'],[{tokens:{...base.tokens,cacheWrite:200,total:3300}},'cache_write_price']]){
    const r=charge({...base,...patch},[]);assert.equal(r.cost,null);assert.equal(r.pricingIssue,reason);assert.equal(r.price,null);
  }
  assert.equal(charge({...base,provider:'gateway'},[]).price.referencePrice,true);
  assert.equal(charge({...base,provider:null},[]).cost,'0.001440000');
});

test('custom exact, official alias and wildcard prices override references without becoming reference estimates',()=>{
  const wildcard={...custom,model:'deepseek-flash'},family={...wildcard,id:'family',provider:'deepseek',input:'6'},exact={...wildcard,id:'exact',provider:'deepseek-official',input:'7'};
  assert.equal(charge(base,[wildcard,family,exact]).cost,'0.010000000');
  assert.equal(charge(base,[wildcard,family]).cost,'0.009000000');
  const r=charge({...base,provider:'gateway'},[wildcard]);assert.equal(r.cost,'0.008000000');assert.equal(r.price.referencePrice,false);assert.equal(r.price.period,'fixed');
  assert.equal(charge({...base,provider:' Router ',model:' OTHER-MODEL '},[{...custom,provider:' * '}]).cost,'0.008000000');
});

test('cache-write rates, custom currencies and optional custom peak prices are calculated separately',()=>{
  const record={...base,model:'other-model',provider:'router',tokens:{...base.tokens,cacheWrite:100,total:3200}},rule={...custom,cacheWrite:'2',peak:{input:'10',output:'20',cacheRead:'2',cacheWrite:'4'}};
  validatePrice(rule);assert.equal(charge(record,[rule]).cost,'0.008200000');
  const r=charge({...record,time:peak},[rule]);assert.equal(r.cost,'0.016400000');assert.equal(r.currency,'USD');assert.equal(r.price.period,'peak');
  assert.throws(()=>validatePrice({...custom,model:' '}),/模型/);assert.throws(()=>validatePrice({...custom,output:'-1'}),/金额/);
});

test('a frozen call keeps its tariff and custom override after settlement',()=>{
  const first=charge({...base,time:peak},[]);
  const settled=charge({...base,time:peak,tokens:{...base.tokens,output:200,total:3200}},[{...custom,model:base.model,provider:base.provider}],first.price);
  assert.equal(settled.cost,'0.003680000');assert.equal(settled.price.period,'peak');assert.equal(settled.price.revision,first.price.revision);
});

test('custom schedules select weekdays, offsets, holidays and overnight boundaries',()=>{
  const schedule={...defaultPriceSchedule(),windows:[{start:'22:00',end:'02:00'}]},rule={...custom,peak:{input:'10',output:'20',cacheRead:'2'},schedule};
  const call=stamp=>charge({...base,provider:'router',model:'other-model',time:Date.parse(stamp)},[rule]);
  for(const [stamp,busy] of [['2026-11-02T21:59:59+08:00',false],['2026-11-02T22:00:00+08:00',true],['2026-11-03T01:59:59+08:00',true],['2026-11-03T02:00:00+08:00',false],['2026-11-07T01:00:00+08:00',true],['2026-11-08T01:00:00+08:00',false]])assert.equal(call(stamp).price.period,busy?'peak':'off-peak');
  assert.equal(peakPrice(Date.parse('2026-10-01T01:00:00+08:00'),schedule),false);
  assert.equal(peakPrice(Date.parse('2026-10-01T01:00:00+08:00'),{...schedule,excludeChinaHolidays:false}),true);
  assert.equal(peakPrice(Date.parse('2026-11-02T22:00:00Z'),{...schedule,utcOffsetMinutes:0}),true);
  assert.equal(peakPrice(Date.parse('2026-11-02T22:00:00Z'),schedule),false);
  assert.equal(peakPrice(Date.parse('2026-11-07T22:00:00+08:00'),{...schedule,weekdays:[6]}),true);
  assert.equal(peakPrice(Date.parse('2026-11-08T01:00:00+08:00'),{...schedule,weekdays:[6]}),true);
  assert.equal(peakPrice(Date.parse('2026-11-08T22:00:00+08:00'),{...schedule,weekdays:[6]}),false);
});

test('invalid, overlapping and week-wrapping schedules cannot be persisted',()=>{
  for(const patch of [{weekdays:[]},{weekdays:[1,1]},{weekdays:[7]},{windows:[]},{windows:[{start:'09:00',end:'09:00'}]},{windows:[{start:'9:00',end:'12:00'}]},{windows:[{start:'09:00',end:'15:00'},{start:'14:00',end:'18:00'}]},{windows:[{start:'22:00',end:'02:00'},{start:'01:00',end:'03:00'}]},{utcOffsetMinutes:2000},{excludeChinaHolidays:'yes'}]){
    const schedule={...defaultPriceSchedule(),...patch};assert.ok(priceScheduleIssue(schedule));assert.throws(()=>validatePrice({...custom,schedule}));
  }
  assert.equal(priceScheduleIssue({...defaultPriceSchedule(),windows:[{start:'09:00',end:'12:00'},{start:'12:00',end:'18:00'}]}),'');
});

test('saved schedule changes only affect new calls and survive reopening',async t=>{
  const root=await fixture(t),service=new UsageService(root),schedule={...defaultPriceSchedule(),windows:[{start:'11:00',end:'12:00'}]},rule={...custom,peak:{input:'10',output:'20',cacheRead:'2'},schedule};
  await service.configure({expectedRevision:0,prices:[rule]});
  await service.ingest('scheduled',[event(0,'router','other-model',peak)]);
  let report=await service.report({all:true,details:true}),before=report.records[0];assert.equal(before.price.period,'off-peak');
  const config=await service.configuration();await service.configure({expectedRevision:config.revision,prices:[{...rule,schedule:defaultPriceSchedule()}]});
  await service.ingest('scheduled',[event(1,'router','other-model',peak)]);
  await service.ingest('scheduled-new',[event(0,'router','other-model',peak)]);
  const reopened=new UsageService(root);report=await reopened.report({all:true,details:true});
  assert.deepEqual(report.records.find(r=>r.id===before.id),before);
  assert.equal(report.records.find(r=>r.sessionId==='scheduled-new').price.period,'peak');
  assert.deepEqual((await reopened.configuration()).prices[0].schedule,defaultPriceSchedule());
});

test('custom date filters, complete history, hourly bins and pages share the same calls',async t=>{
  const service=new UsageService(await fixture(t)),stamps=['2026-10-28T00:01:00','2026-10-28T23:59:59','2026-10-29T10:00:00','2026-10-30T10:00:00'];
  for(const [index,stamp] of stamps.entries())await service.ingest('range-'+index,[event(0,index===1?'router':'deepseek',index===1?'other-model':'deepseek-flash',new Date(stamp).getTime())]);
  const filtered=await service.report({from:'2026-10-28',to:'2026-10-29',details:true,limit:1});assert.equal(filtered.total.calls,3);assert.equal(filtered.count,3);assert.equal(filtered.records.length,1);assert.equal(filtered.nextOffset,1);
  const page=await service.report({from:'2026-10-28',to:'2026-10-29',details:true,limit:1,offset:1});assert.equal(page.offset,1);assert.deepEqual(page.total,filtered.total);assert.notEqual(page.records[0].id,filtered.records[0].id);
  const single=await service.report({from:'2026-10-28',to:'2026-10-28',hourly:true});assert.equal(single.hourly.length,12);assert.equal(single.hourly[0].calls,1);assert.equal(single.hourly[11].calls,1);assert.equal(single.hourly.reduce((n,h)=>n+h.tokens,0),single.total.tokens);
  const model=await service.report({from:'2026-10-28',to:'2026-10-28',model:'other',hourly:true});assert.equal(model.total.calls,1);assert.equal(model.hourly[0].calls,0);assert.equal(model.hourly[11].calls,1);
  const all=await service.report({all:true,details:true});assert.equal(all.from,'2026-10-28');assert.equal(all.to,'2026-10-30');assert.equal(all.total.calls,4);
  const empty=await service.report({from:'2026-12-01',to:'2026-12-01',hourly:true,details:true});assert.equal(empty.total.calls,0);assert.equal(empty.records.length,0);assert.equal(empty.hourly.reduce((n,h)=>n+h.calls,0),0);
  await assert.rejects(service.report({from:'2026-10-30',to:'2026-10-28'}),/日期/);
});

test('adding another model price backfills missing estimates, exposes observed models and freezes currency conversion',async t=>{
  const service=new UsageService(await fixture(t)),date=usageDay(off);
  await service.ingest('other',[event(0,'router','other-model')]);
  let cfg=await service.configuration();assert.ok(cfg.observedModels.some(m=>m.provider==='router'&&m.model==='other-model'));
  assert.equal((await service.report({from:date,to:date})).total.unpriced,1);
  await service.configure({expectedRevision:cfg.revision,settings:{...cfg.settings,exchangeRates:{CNY:'1',USD:'7'}},prices:[custom]});
  let r=await service.report({from:date,to:date,details:true});assert.equal(r.total.unpriced,0);assert.equal(r.total.costs.USD,'0.008000000');assert.equal(r.total.reportCosts.CNY,'0.056000000');
  const old=r.records[0];cfg=await service.configuration();
  await service.configure({expectedRevision:cfg.revision,settings:{...cfg.settings,exchangeRates:{CNY:'1',USD:'8'}},prices:[{...custom,input:'50'}]});
  await service.ingest('other',[event(1,'router','other-model')]);r=await service.report({from:date,to:date,details:true});assert.deepEqual(r.records[0],old);
  await service.ingest('other',[event(2,'router','other-model',off,usage,1)]);r=await service.report({from:date,to:date,details:true});
  assert.equal(r.records.find(r=>r.turn===1).reportCost,'0.424000000');
});

test('upgrading an unpriced ledger repairs once without changing paid records, cursors, balances or notifications',async t=>{
  const root=await fixture(t),service=new UsageService(root),date=usageDay(off);
  await service.ingest('legacy',[event(0),event(1,'deepseek-account','deepseek-v4-pro',off,usage,1)]);
  const store=new UsageStore(root);let before;
  await store.run(async(meta,load)=>{
    const page=await load(date),record=Object.values(page.records).find(r=>r.turn===0);
    Object.assign(record,{cost:null,price:null,reportCost:null});delete record.pricingIssue;delete meta.pricingVersion;
    meta.turns.repair={turn:0,records:{[record.id]:structuredClone(record)}};
    meta.summaries[date].unpriced=1;meta.balances.deepseek={balance:20};meta.balanceBooks.deepseek={synthetic:true};
    meta.cursors.extra={seq:8,turn:1,step:0,attempt:0};
    meta.events.push({id:'saved',sessionId:'legacy',time:off,text:'saved',kind:'complete',pending:false});
    before=structuredClone({cursors:meta.cursors,balances:meta.balances,books:meta.balanceBooks,events:meta.events,config:meta.configRevision,paid:Object.values(page.records).find(r=>r.turn===1)});
  },true);
  const reopened=new UsageService(root),r=await reopened.report({from:date,to:date,details:true});
  assert.equal(r.total.unpriced,0);assert.equal(r.total.calls,2);assert.equal(r.total.tokens,6200);assert.equal(r.total.costs.CNY,'0.007590000');
  assert.deepEqual(r.records.find(r=>r.turn===1),before.paid);
  const after=await store.run(meta=>structuredClone(meta));
  assert.equal(Object.values(after.turns.repair.records)[0].cost,'0.001440000');
  assert.deepEqual(after.cursors,before.cursors);assert.deepEqual(after.balances,before.balances);assert.deepEqual(after.balanceBooks,before.books);assert.deepEqual(after.events,before.events);assert.equal(after.configRevision,before.config);
  await new UsageService(root).report({from:date,to:date});assert.equal((await store.run(meta=>meta.revision)),after.revision);
});
