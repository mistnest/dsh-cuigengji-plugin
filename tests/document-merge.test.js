import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeDocument} from '../src/client/shared/document-merge.ts';
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
