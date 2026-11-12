import test from 'node:test';
import assert from 'node:assert/strict';
import {compilePresentation} from '../src/domain/usage/presentation.ts';
import {emptyUsage} from '../src/domain/usage/settings.ts';

const total={tokens:286420,calls:12,input:48210,cacheRead:192810,cacheWrite:0,output:45400,unpriced:0,costs:{CNY:'0.801873000',USD:'1.235600000'},reportCosts:{CNY:'9.451073000'}};
const account=(id,currency,balance,extra={})=>({id,name:id,currency,enabled:true,snapshot:{balance,at:1,...extra}});
const report=(balances=[])=>({to:'2026-11-02',total,balances});
const compile=(meta,report)=>compilePresentation(meta,report,{},1,'isolated-assets');

test('pet summary carries raw totals and separate currency balances without rounding each account',()=>{
  const result=compile(emptyUsage(),report([account('a','CNY','0.004'),account('b','CNY','0.004'),account('usd','USD','4.23456789'),account('negative','USD','-0.001'),account('missing','CNY',undefined),{...account('disabled','CNY','999'),enabled:false}]));
  assert.equal(result.summary.tokens,286420);
  assert.equal(result.summary.input+result.summary.cacheRead+result.summary.output,286420);
  assert.deepEqual(result.summary.costs,total.costs);
  assert.deepEqual(result.summary.balanceTotals,{CNY:'0.008000000',USD:'4.233567890'});
  assert.equal(result.summary.balances.find(a=>a.id==='missing').balance,null);
  assert.equal(result.summary.balances.length,5);
  assert.equal(result.customContent,false);
  assert.equal(result.lines.at(-1).segments[0].text,'账户余额 0.00 CNY');
});

test('unknown balances remain unknown and a failed refresh keeps the last known observation',()=>{
  const result=compile(emptyUsage(),report([account('failed','CNY','12.3456',{error:'连接失败'}),account('unset','CNY','not-a-number')]));
  assert.equal(result.summary.balanceTotals.CNY,'12.345600000');
  assert.equal(result.summary.balances[0].error,'连接失败');
  assert.equal(result.summary.balances[1].balance,null);
  const noBalance=compile(emptyUsage(),report());
  assert.deepEqual(noBalance.summary.balanceTotals,{});
  const meta=emptyUsage();meta.settings.bubbles[0].lines[0][0].value='我的自定义内容';
  assert.equal(compile(meta,report()).customContent,true);
});

test('pet account preview stays bounded while its totals include every enabled account',()=>{
  const result=compile(emptyUsage(),report(Array.from({length:60},(_,i)=>account(String(i),'CNY','0.001'))));
  assert.equal(result.summary.balanceCount,60);
  assert.equal(result.summary.balances.length,8);
  assert.equal(result.summary.balanceTotals.CNY,'0.060000000');
  assert.ok(JSON.stringify(result).length<12000);
});
