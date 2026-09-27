import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { previewTavern, parseTavernFile, crc32 } from '../src/core/import-tavern.js';
import { Store } from '../src/core/store.js';

const card = { spec:'chara_card_v2',spec_version:'2.0',data:{name:'林素',description:'守夜人',personality:'沉静',scenario:'雨夜',first_mes:'谁？',mes_example:'示例',system_prompt:'保留但不注入',extensions:{unknown:{a:1}},character_book:{name:'雨城',entries:[{keys:['雨城'],content:'终年下雨',enabled:true},{keys:['旧城'],content:'废弃设定',enabled:false}]}} };
function chunk(type, data) {
  const buffer=Buffer.alloc(12+data.length);buffer.writeUInt32BE(data.length);buffer.write(type,4);data.copy(buffer,8);buffer.writeUInt32BE(crc32(buffer.subarray(4,-4)),buffer.length-4);return buffer;
}
function png(chunks) {
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),...chunks,chunk('IEND',Buffer.alloc(0))]);
}
const textChunk = (key,data) => chunk('tEXt',Buffer.from(`${key}\0${Buffer.from(JSON.stringify(data)).toString('base64')}`));

test('Tavern V1/V2 and world info preserve prose, disabled entries and raw extensions',()=>{
  const p=previewTavern({json:card});assert.equal(p.nodes.length,4);
  assert.match(p.nodes[0].content,/性格\n\n沉静/);assert.doesNotMatch(p.nodes[0].content,/保留但不注入/);
  assert.equal(p.nodes[3].status,'retired');assert.deepEqual(p.raw,card);
  assert.equal(previewTavern({json:{name:'甲',description:'乙'}}).format,'chara_card_v1');
  const w=previewTavern({json:{entries:{'0':{key:['城'],comment:'城池',content:'城市',disable:true,keysecondary:['雨'],extensions:{custom:true}}}},fileName:'城市.json'});
  assert.equal(w.nodes[0].name,'城市');assert.equal(w.nodes[1].name,'城池');assert.equal(w.nodes[1].status,'retired');
  assert.deepEqual(w.nodes[1].aliases,['城']);
  assert.equal(previewTavern({json:{name:'书',description:'简介',entries:[]}}).format,'world_info');
});
test('PNG reads Unicode card data and prefers ccv3; corrupt and plain PNG fail clearly',()=>{
  const v3={...card,spec:'chara_card_v3',spec_version:'3.0'};
  const image=png([textChunk('chara',card),textChunk('ccv3',v3)]);
  assert.equal(previewTavern({pngBase64:image.toString('base64')}).format,'chara_card_v3');
  image[22]^=1;assert.throws(()=>parseTavernFile({pngBase64:image.toString('base64')}),/校验/);
  assert.throws(()=>parseTavernFile({pngBase64:png([]).toString('base64')}),/普通 PNG/);
  assert.throws(()=>parseTavernFile({pngBase64:png([]).subarray(0,15).toString('base64')}),/截断/);
});
test('Invalid exports are rejected rather than silently losing entries',()=>{
  assert.throws(()=>previewTavern({json:{name:'not a card'}}),/entries/);
  assert.throws(()=>previewTavern({json:{entries:[{content:23}]}}),/content/);
  assert.throws(()=>previewTavern({json:{spec:'future',data:{}}}),/不支持/);
});
test('Import is human-only, confirmed, atomic, selected and idempotent; backup preserves original JSON',async t=>{
  const root=await mkdtemp(join(tmpdir(),'tavern-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root), human={kind:'human',sessionId:'author'};
  const novel=await store.dispatch('novel.create',{title:'测试'},human);
  const args={novelId:novel.id,json:card};
  const preview=await store.dispatch('tavern.preview',args,human);
  assert.equal((await store.dispatch('graph.list',{novelId:novel.id},human)).length,0);
  await assert.rejects(store.dispatch('tavern.import',args,human),{code:'CONFIRM_REQUIRED'});
  const confirmed={...args,confirm:true,fingerprint:preview.fingerprint};
  await assert.rejects(store.dispatch('tavern.import',confirmed,{kind:'agent'}),{code:'HUMAN_REQUIRED'});
  await assert.rejects(store.dispatch('tavern.import',{...confirmed,selected:[0,999]},human),{code:'INVALID_INPUT'});
  assert.equal((await store.dispatch('graph.list',{novelId:novel.id},human)).length,0);
  await assert.rejects(store.dispatch('tavern.import',{...confirmed,fingerprint:'wrong'},human),{code:'CONFLICT'});
  const first=await store.dispatch('tavern.import',{...confirmed,selected:[0,2]},human);assert.equal(first.imported,2);
  const second=await store.dispatch('tavern.import',confirmed,human);assert.equal(second.imported,2);assert.equal(second.skipped,2);
  const backup=await store.dispatch('novel.export',{novelId:novel.id},human);
  assert.deepEqual(backup.novel.tavernSources[preview.fingerprint].raw,card);
  const otherRoot=await mkdtemp(join(tmpdir(),'tavern-backup-'));t.after(()=>rm(otherRoot,{recursive:true,force:true}));
  const other=new Store(otherRoot);await other.dispatch('novel.import',{backup},human);
  assert.deepEqual((await other.dispatch('novel.export',{novelId:novel.id},human)).novel.tavernSources,backup.novel.tavernSources);
});
