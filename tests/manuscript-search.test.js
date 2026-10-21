import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/application/store.js';
import {findProse,replaceLiteral} from '../src/domain/chapters/find.ts';
import {storageSnapshot} from './helpers/storage-snapshot.js';
import {HUMAN_ACTIONS,TOOL_ACTIONS,changesProse,isReadAction} from '../src/contracts/actions.js';

async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'cuigengji-find-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),actor={kind:'human',sessionId:'find-author'};
  const novelId=(await store.dispatch('novel.create',{title:'查找验收'},actor)).id;
  const call=(action,args={})=>store.dispatch(action,{novelId,...args},actor);
  const a=await call('chapter.create',{title:'雨夜',content:'雨声。雨声。Cat CAT cat\n下一行。'});
  const b=await call('chapter.create',{title:'远行',content:'雨声之后，她离开了。'});
  const trash=await call('chapter.create',{title:'旧稿',content:'雨声不应参与替换'});
  await call('chapter.delete',{chapterId:trash.id,expectedRevision:trash.revision,confirm:true});
  const read=id=>call('chapter.get',{chapterId:id,maxChars:200000});
  return {root,store,actor,novelId,call,a,b,trash,read};
}
test('literal matching treats regex/$ syntax literally, handles Unicode/CRLF, and paginates without losing counts',()=>{
  assert.deepEqual(replaceLiteral('[a]. [a]. $&','[a].','$&'),{content:'$& $& $&',count:2});
  assert.deepEqual(replaceLiteral('CAT Cat cat','cat','猫'),{content:'猫 猫 猫',count:3});
  assert.equal(replaceLiteral('CAT Cat cat','cat','猫',true).count,1);
  assert.deepEqual(replaceLiteral('猫猫','猫','猫'),{content:'猫猫',count:0});
  assert.deepEqual(replaceLiteral('abc','', '猫'),{content:'abc',count:0});
  const chapter={id:'c',title:'一',revision:2,contentHash:'hash',content:'🙂雨\r\n雨'+ '雨'.repeat(70),order:0};
  const result=findProse([chapter],'雨',false,60,10);
  assert.equal(result.total,72);assert.equal(result.matches.length,10);assert.equal(result.chapters[0].count,72);
  assert.equal(findProse([chapter],'🙂').matches[0].end,2);
  assert.equal(findProse([chapter],'雨').matches[1].start,5);
});
test('find searches live prose only in directory order; chapter/offset/case scopes are read-only',async t=>{
  const {root,call,a,b,trash}=await fixture(t);
  const before=await storageSnapshot(root);
  const result=await call('chapter.find',{query:'雨声',limit:2,offset:1});
  assert.equal(result.total,3);assert.deepEqual(result.matches.map(m=>m.chapterId),[a.id,b.id]);
  assert.deepEqual(result.snapshot.map(c=>c.chapterId),[a.id,b.id]);
  assert.equal((await call('chapter.find',{chapterId:trash.id,query:'雨声'})).total,0);
  assert.equal((await call('chapter.find',{chapterId:a.id,query:'cat'})).total,3);
  assert.equal((await call('chapter.find',{chapterId:a.id,query:'cat',matchCase:true})).total,1);
  assert.equal(await storageSnapshot(root),before);
});
test('whole book replace is durable/idempotent, retains histories and invalidates referenced settings',async t=>{
  const {root,novelId,call,a,b,trash,read}=await fixture(t);
  const setting=await call('graph.create',{type:'world_entry',name:'雨城',content:'依据正文',factType:'fact',sources:[{chapterId:a.id,revision:1}]});
  const preview=await call('chapter.find',{query:'雨声'});
  const args={query:'雨声',replacement:'风声',expectedSnapshot:preview.snapshot,confirm:true,requestId:'replace-once'};
  const result=await call('chapter.replace',args);
  assert.equal(result.count,3);assert.equal(result.chapters.length,2);
  assert.equal((await read(a.id)).content,'风声。风声。Cat CAT cat\n下一行。');
  assert.equal((await read(trash.id)).content,'雨声不应参与替换');
  assert.equal((await call('chapter.history',{chapterId:b.id,includeContent:true}))[0].content,'雨声之后，她离开了。');
  assert.equal((await call('graph.get',{nodeId:setting.id})).status,'stale');
  const history=await call('graph.history',{nodeId:setting.id});assert.ok(history.length>=2);
  const bytes=await storageSnapshot(root);
  assert.deepEqual(await call('chapter.replace',args),result);assert.equal(await storageSnapshot(root),bytes);
  assert.equal((await new Store(root).dispatch('chapter.get',{novelId,chapterId:b.id})).content,'风声之后，她离开了。');
  const stats=await call('activity.today');assert.ok(stats);
});
test('concurrent edits/new chapters reject the entire replacement and retain every chapter unchanged',async t=>{
  const {root,call,a,b,read}=await fixture(t);
  const preview=await call('chapter.find',{query:'雨声'});
  await call('chapter.update',{chapterId:b.id,expectedRevision:b.revision,append:'AI续写。'});
  const before=await storageSnapshot(root);
  await assert.rejects(()=>call('chapter.replace',{query:'雨声',replacement:'风声',expectedSnapshot:preview.snapshot,confirm:true}),{code:'CONFLICT'});
  assert.equal(await storageSnapshot(root),before);assert.ok((await read(a.id)).content.startsWith('雨声'));
  const fresh=await call('chapter.find',{query:'雨声'});
  await call('chapter.create',{title:'新章',content:'雨声也是新的。'});
  await assert.rejects(()=>call('chapter.replace',{query:'雨声',replacement:'风声',expectedSnapshot:fresh.snapshot,confirm:true}),{code:'CONFLICT'});
});
test('current-chapter replacement does not affect other chapters and empty replacement deletes literal text',async t=>{
  const {call,a,b,read}=await fixture(t);
  const preview=await call('chapter.find',{chapterId:a.id,query:'雨声'});
  const result=await call('chapter.replace',{chapterId:a.id,query:'雨声',replacement:'',expectedSnapshot:preview.snapshot,confirm:true});
  assert.equal(result.count,2);assert.ok((await read(a.id)).content.startsWith('。。'));
  assert.equal((await read(b.id)).revision,1);
});
test('no-op replacement adds no versions; invalid input/automation cannot trigger a broad replacement',async t=>{
  const {root,store,call,novelId,actor}=await fixture(t);
  const preview=await call('chapter.find',{query:'雨声'}),before=await storageSnapshot(root);
  assert.equal((await call('chapter.replace',{query:'雨声',replacement:'雨声',expectedSnapshot:preview.snapshot,confirm:true})).count,0);
  assert.equal(await storageSnapshot(root),before);
  await assert.rejects(()=>call('chapter.find',{query:''}),{code:'INVALID_INPUT'});
  await assert.rejects(()=>call('chapter.find',{query:'雨',matchCase:'no'}),{code:'INVALID_INPUT'});
  await assert.rejects(()=>call('chapter.replace',{query:'雨',replacement:'',expectedSnapshot:[]}),{code:'CONFIRM_REQUIRED'});
  await assert.rejects(()=>store.dispatch('chapter.replace',{novelId},{...actor,kind:'agent'}),{code:'HUMAN_REQUIRED'});
  assert.ok(HUMAN_ACTIONS.includes('chapter.find'));assert.ok(HUMAN_ACTIONS.includes('chapter.replace'));
  assert.equal(Object.values(TOOL_ACTIONS).flat().includes('chapter.replace'),false);
  assert.equal(changesProse('chapter.replace',{}),true);assert.equal(isReadAction('chapter.find'),true);
});
