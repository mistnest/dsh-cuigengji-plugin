import test from 'node:test';
import assert from 'node:assert/strict';
import {selectReference,renderReference} from '../src/core/context.js';
const chapter=(id,order,content)=>({id,title:id,order,content,revision:1});
test('complete long sections preserve stable order without a plugin budget',()=>{
  const novel={plan:{id:'plan',revision:2,approved:true,content:'规划'.repeat(10000)},chapters:{a:chapter('a',0,'A'.repeat(10000)),b:chapter('b',1,'B'.repeat(10000)),c:chapter('c',2,'正文'.repeat(20000))}};
  const selected=selectReference(novel,'c');
  assert.deepEqual(selected.items.map(i=>i.id),['plan','a','b','c']);
  assert.deepEqual(selected.items.map(i=>i.content.length),[20000,10000,10000,40000]);
  assert.equal(selected.usedChars,80000);
  assert.equal(selected.items.some(i=>i.truncated),false);
  const text=renderReference({...selected,task:{stage:'write',goal:'继续场景'}});
  assert.ok(text.indexOf('已确认规划')<text.indexOf('前文片段'));
  assert.ok(text.indexOf('前文片段')<text.indexOf('当前参考章节'));
  assert.ok(text.indexOf('当前参考章节')<text.indexOf('当前任务'));
  assert.match(text,/ID: c.*版本: 1/);
  assert.doesNotMatch(text,/usedChars|allocation|staleMemory|已截断/);
});
test('only nearest two preceding chapters are selected, without future or deleted prose',()=>{
  const novel={plan:{id:'p',approved:false,content:'未批准',revision:1},chapters:{old:chapter('old',0,'旧'),a:chapter('a',1,'完整前文一'),b:chapter('b',2,'完整前文二'),c:chapter('c',3,'当前'),future:chapter('f',4,'未来'),deleted:{...chapter('d',2,'删除'),deleted:true}}};
  const selected=selectReference(novel,'c');
  assert.deepEqual(selected.items.map(i=>i.id),['a','b','c']);
  assert.equal(selected.items[0].content,'完整前文一');
});
