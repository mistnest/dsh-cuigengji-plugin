import test from 'node:test';
import assert from 'node:assert/strict';
import {ChapterSync,mergeText} from '../src/client/features/chapters/sync.ts';
import {groupHistory} from '../src/client/features/chapters/history.ts';
import {draftKey,draftScope} from '../src/client/shared/drafts.js';
const initial={id:'one',revision:1,contentHash:'h1',deleted:false,title:'第一章',content:'甲段。\n\n乙段。',volumeId:null,order:0};
const cache=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function setup(t,custom={}){
 let server={...initial},writes=[];
 const sync=new ChapterSync({key:'chapter',initial:server,storage:cache(),read:async()=>server,write:async(value,base,id)=>{writes.push({value,base,id});if(base.revision!==server.revision)throw Object.assign(new Error('conflict'),{code:'CONFLICT'});server={...value,revision:server.revision+1,contentHash:'h'+(server.revision+1)};return server;},onSaved:()=>{},delay:60000,...custom});
 t.after(()=>sync.dispose());return{sync,writes,get:()=>server,set:v=>server=v};
}

test('same-ID chapters in two libraries keep separate queues and drafts; legacy drafts recover in only their original library',t=>{
 const storage=cache(),entity='book:chapter:one',session='same-session';
 const legacy={base:initial,value:{...initial,content:'旧作品库尚未保存的正文'}};
 storage.setItem(draftKey(session,entity),JSON.stringify(legacy));
 const keyA=draftKey(draftScope('D:/library-a',session),entity),keyB=draftKey(draftScope('D:/library-b',session),entity);
 const a=setup(t,{key:keyA,storage}),b=setup(t,{key:keyB,storage});
 assert.equal(a.sync.state.value.content,legacy.value.content);
 assert.equal(b.sync.state.value.content,initial.content);
 b.sync.change(v=>({...v,content:'第二个库独立的草稿'}));
 assert.equal(a.sync.state.value.content,legacy.value.content);
 assert.equal(JSON.parse(storage.getItem(keyB)).value.content,'第二个库独立的草稿');
 const reopened=setup(t,{key:keyA,storage});
 assert.equal(reopened.sync.state.value.content,legacy.value.content);
 assert.equal(storage.getItem(draftKey(session,entity)),JSON.stringify(legacy));
});
test('clean editor follows remote updates without a confirmation',async t=>{
 const s=setup(t);s.set({...initial,content:'AI 新正文',revision:2});await s.sync.refresh();assert.equal(s.sync.state.value.content,'AI 新正文');assert.equal(s.sync.dirty,false);
});
test('removal waits for the in-flight receipt and flushes keystrokes added after that snapshot',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve),submitted=[];
 const {sync}=setup(t,{write:async(value,base)=>{submitted.push({...value});if(submitted.length===1)await gate;return {...value,revision:base.revision+1};}});
 sync.change(v=>({...v,content:'先输入的正文'}));const saving=sync.flush();
 sync.change(v=>({...v,content:'先输入的正文，继续输入的正文'}));
 let completed=false;const removal=sync.prepareRemoval().then(value=>{completed=true;return value;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,false);
 release();await saving;const snapshot=await removal;
 assert.equal(snapshot.content,'先输入的正文，继续输入的正文');assert.equal(snapshot.revision,3);
 assert.equal(submitted.length,2);assert.equal(sync.dirty,false);
});
test('failed saves and unresolved conflicts prevent removal while retaining the local prose',async t=>{
 const failed=setup(t,{write:async()=>{throw new Error('disk failure');}});
 failed.sync.change(v=>({...v,content:'仍未保存的正文'}));
 await assert.rejects(()=>failed.sync.prepareRemoval(),/草稿已保留/);
 assert.equal(failed.sync.state.value.content,'仍未保存的正文');assert.equal(failed.sync.dirty,true);
 const conflict=setup(t);conflict.sync.change(v=>({...v,content:'作者版本'}));conflict.set({...initial,revision:2,content:'AI 版本'});
 await assert.rejects(()=>conflict.sync.prepareRemoval(),/版本冲突/);
 assert.equal(conflict.sync.state.value.content,'作者版本');assert.equal(conflict.sync.state.remote.content,'AI 版本');
});
test('safe disjoint edits merge; overlapping edits and competing insertions stop',()=>{
 assert.equal(mergeText('甲段。\n\n乙段。','甲段改。\n\n乙段。','甲段。\n\n乙段改。'),'甲段改。\n\n乙段改。');
 assert.equal(mergeText('甲','作者甲','AI甲'),null);
 assert.equal(mergeText('甲段','乙段','丙段'),null);
});
test('saving never replaces keystrokes entered during an in-flight request',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 const {sync}=setup(t,{write:async value=>{await gate;return {...value,revision:2};}});
 sync.change(v=>({...v,content:'第一批输入'}));const saving=sync.flush();sync.change(v=>({...v,content:'第一批输入，继续输入'}));release();await saving;
 assert.equal(sync.state.base.content,'第一批输入');assert.equal(sync.state.value.content,'第一批输入，继续输入');assert.equal(sync.dirty,true);
});
test('version conflict merges different locations and saves against the new revision',async t=>{
 const s=setup(t);s.sync.change(v=>({...v,content:'甲段改。\n\n乙段。'}));s.set({...initial,revision:2,content:'甲段。\n\n乙段改。'});
 await s.sync.flush();assert.equal(s.sync.state.phase,'waiting');await s.sync.flush();assert.equal(s.get().content,'甲段改。\n\n乙段改。');assert.equal(s.get().revision,3);
});
test('true conflicts preserve both sides until explicitly merged',async t=>{
 const s=setup(t);s.sync.change(v=>({...v,content:'作者版本'}));s.set({...initial,revision:2,content:'AI 版本'});await s.sync.flush();
 assert.equal(s.sync.state.phase,'conflict');assert.equal(s.sync.state.value.content,'作者版本');assert.equal(s.sync.state.remote.content,'AI 版本');
 await s.sync.flush();assert.equal(s.get().content,'AI 版本');s.sync.change(v=>({...v,content:'双方合并'}));s.sync.rebase(s.sync.state.remote);await s.sync.flush();assert.equal(s.get().content,'双方合并');
});
test('composition is never submitted halfway, and no-op edits do not create versions',async t=>{
 const {sync,writes}=setup(t);sync.composition(true);sync.change(v=>({...v,content:'中文输入中'}));await sync.flush();assert.equal(writes.length,0);
 sync.composition(false);await sync.flush();assert.equal(writes.length,1);sync.change(v=>({...v}));await sync.flush();assert.equal(writes.length,1);
});

test('an in-flight conflict waits for final IME input before merging and saving',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve),writes=[];
 const remote={...initial,revision:2,content:'甲段。\n\n乙段新。'};
 const {sync}=setup(t,{read:async()=>remote,write:async(value,base)=>{writes.push(value.content);if(base.revision===1){await gate;throw Object.assign(new Error('conflict'),{code:'CONFLICT'});}return {...value,revision:3};}});
 sync.change(v=>({...v,content:'甲段改。\n\n乙段。'}));const saving=sync.flush();
 sync.composition(true);sync.change(v=>({...v,content:'甲段改写zhong。\n\n乙段。'}));release();await saving;
 assert.equal(sync.state.base.revision,1);assert.equal(sync.state.value.content,'甲段改写zhong。\n\n乙段。');assert.equal(writes.length,1);
 sync.change(v=>({...v,content:'甲段改写中文。\n\n乙段。'}));sync.composition(false);await sync.flush();
 assert.equal(sync.state.value.content,'甲段改写中文。\n\n乙段新。');assert.equal(sync.state.base.revision,3);
 assert.deepEqual(writes,['甲段改。\n\n乙段。','甲段改写中文。\n\n乙段新。']);
});

test('an overlapping remote edit is exposed only after composition, preserving the final author text',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve),remote={...initial,revision:2,content:'AI 的走向'};
 const {sync}=setup(t,{read:async()=>remote,write:async()=>{await gate;throw Object.assign(new Error('conflict'),{code:'CONFLICT'});}});
 sync.change(v=>({...v,content:'作者的走向'}));const saving=sync.flush();sync.composition(true);sync.change(v=>({...v,content:'作者的zhong文'}));release();await saving;
 assert.equal(sync.state.remote,null);assert.equal(sync.state.base.revision,1);
 sync.change(v=>({...v,content:'作者的中文定稿'}));sync.composition(false);await sync.flush();
 assert.equal(sync.state.phase,'conflict');assert.equal(sync.state.value.content,'作者的中文定稿');assert.equal(sync.state.remote.content,'AI 的走向');
});
test('failed writes retain the draft and retry the same request identity',async t=>{
 let fail=true;const ids=[];const {sync}=setup(t,{write:async(value,base,id)=>{ids.push(id);if(fail)throw new Error('offline');return {...value,revision:2};}});
 sync.change(v=>({...v,content:'离线草稿'}));await sync.flush();assert.equal(sync.state.phase,'error');assert.equal(sync.state.value.content,'离线草稿');assert.ok(sync.options.storage.getItem('chapter'));
 fail=false;await sync.flush();assert.equal(ids[0],ids[1]);assert.equal(sync.state.phase,'saved');assert.equal(sync.options.storage.getItem('chapter'),null);
});
test('remote deletion never destroys an unsaved local draft',async t=>{
 const s=setup(t);s.sync.change(v=>({...v,content:'还在写'}));s.set({...initial,revision:2,deleted:true});await s.sync.flush();assert.equal(s.sync.state.phase,'conflict');assert.equal(s.sync.state.value.content,'还在写');
});
test('history folds nearby human autosaves, keeping every source revision',()=>{
 const versions=[1,2,3].map(revision=>({revision,timestamp:`2026-09-29T10:00:0${revision}Z`,reason:'作者自动保存',actor:{kind:'human',sessionId:'one'}}));
 versions.push({revision:4,timestamp:'2026-09-29T10:00:04Z',actor:{kind:'agent'}});
 const groups=groupHistory(versions);assert.deepEqual(groups.map(g=>g.map(v=>v.revision)),[[4],[3,2,1]]);
});
