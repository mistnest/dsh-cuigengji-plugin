import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeDocument, mergeText} from '../src/modules/author-ui/workbench/shared/document-merge.ts';
const fields=['title','summary','content','groupId'];
const base={revision:1,title:'来信',summary:'旧摘要',content:'雨夜里，她收到了信。翌日，他决定出发。',groupId:null,position:{x:0,y:0}};
test('document merge keeps server layout and metadata, merges independent fields',()=>{
  const local={...base,content:'作者补充正文。'},remote={...base,revision:3,summary:'新摘要',position:{x:350,y:-200}};
  const merged=mergeDocument(base,local,remote,fields);
  assert.deepEqual(merged.conflicts,[]);
  assert.deepEqual(merged.patch,{content:local.content});
  assert.equal(merged.value.summary,remote.summary);assert.deepEqual(merged.value.position,remote.position);assert.equal(merged.value.revision,3);
  assert.deepEqual(local.position,{x:0,y:0});
});
test('different parts of one text can merge, including Unicode',()=>{
  const local={...base,content:base.content.replace('雨夜','🌧️深夜')},remote={...base,content:base.content.replace('出发','远行🙂')};
  const merged=mergeDocument(base,local,remote,fields);
  assert.deepEqual(merged.conflicts,[]);assert.equal(merged.value.content,'🌧️深夜里，她收到了信。翌日，他决定远行🙂。');
});
test('overlapping and touching edits require an explicit choice; identical edits do not',()=>{
  const local={...base,content:'作者的走向'},remote={...base,revision:2,content:'AI 的走向'};
  assert.deepEqual(mergeDocument(base,local,remote,fields).conflicts,['content']);
  const same=mergeDocument(base,local,{...remote,content:local.content},fields);
  assert.deepEqual(same.conflicts,[]);assert.deepEqual(same.patch,{});
  const b={content:'ab'},l={content:'a甲b'},r={content:'a乙b'};
  assert.deepEqual(mergeDocument(b,l,r,['content']).conflicts,['content']);
});
test('missing optional fields, clearing content and no-op saves retain remote values',()=>{
  const remote={...base,revision:4,title:'新标题',groupId:'new'};
  const untouched=mergeDocument(base,base,remote,fields);
  assert.deepEqual(untouched.value,remote);assert.deepEqual(untouched.patch,{});
  assert.deepEqual(mergeDocument(base,{...base,summary:''},remote,fields).patch,{summary:''});
});
test('multi-hunk disjoint edits and adjacent character replacements merge without false conflicts',()=>{
  const doc='## 第一节\n\n旧开头。\n\n## 第二节\n\n旧中间。\n\n## 第三节\n\n旧结尾。';
  const local='## 第一节\n\n作者改开头。\n\n## 第二节\n\n旧中间。\n\n## 第三节\n\n作者改结尾。';
  const remote='## 第一节\n\n旧开头。\n\n## 第二节\n\nAI 改中间。\n\n## 第三节\n\n旧结尾。';
  assert.equal(mergeText(doc,local,remote),'## 第一节\n\n作者改开头。\n\n## 第二节\n\nAI 改中间。\n\n## 第三节\n\n作者改结尾。');
  assert.equal(mergeText('甲和乙和丙','甲1和乙和丙1','甲和乙2和丙'),'甲1和乙2和丙1');
  assert.equal(mergeText('ab','甲b','a乙'),'甲乙');
  assert.equal(mergeText('ABC','aBC','AXBC'),'aXBC');
  assert.equal(mergeText('ABC','AXBC','aBC'),'aXBC');
  assert.equal(mergeText('ABC','XABC','aBC'),'XaBC');
  assert.equal(mergeText('ABC\nDEF','aBC\nDEF','AXBC\nDEF'),'aXBC\nDEF');
  assert.equal(mergeText('L1\nL2\nL3','L1改\nL2\nL3','L1\n插入行\nL2\nL3'),'L1改\n插入行\nL2\nL3');
  assert.equal(mergeText('ab','a甲b','a乙b'),null);
  // 150,000-codepoint single line and 1,500-line sparse edits must merge cleanly without RangeError or false conflict.
  const longMid='中'.repeat(150000);
  assert.equal(mergeText(`头${longMid}尾`,`改头${longMid}尾`,`头${longMid}改尾`),`改头${longMid}改尾`);
  const manyLines=Array.from({length:1500},(_,i)=>`第 ${i} 行原文`);
  const manyLocal=[...manyLines];manyLocal[2]='作者改第 2 行';
  const manyRemote=[...manyLines];manyRemote[1490]='AI 改第 1490 行';
  const mergedMany=mergeText(manyLines.join('\n'),manyLocal.join('\n'),manyRemote.join('\n'));
  assert.ok(mergedMany&&mergedMany.includes('作者改第 2 行')&&mergedMany.includes('AI 改第 1490 行'));
});
