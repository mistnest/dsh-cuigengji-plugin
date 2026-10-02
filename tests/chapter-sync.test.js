import test from 'node:test';
import assert from 'node:assert/strict';
import {ChapterSync,mergeText} from '../src/client/features/chapters/sync.ts';
import {groupHistory} from '../src/client/features/chapters/history.ts';
const initial={id:'one',revision:1,contentHash:'h1',deleted:false,title:'第一章',content:'甲段。\n\n乙段。',volumeId:null,order:0};
const cache=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function setup(t,custom={}){
 let server={...initial},writes=[];
 const sync=new ChapterSync({key:'chapter',initial:server,storage:cache(),read:async()=>server,write:async(value,base,id)=>{writes.push({value,base,id});if(base.revision!==server.revision)throw Object.assign(new Error('conflict'),{code:'CONFLICT'});server={...value,revision:server.revision+1,contentHash:'h'+(server.revision+1)};return server;},onSaved:()=>{},delay:60000,...custom});
 t.after(()=>sync.dispose());return{sync,writes,get:()=>server,set:v=>server=v};
}
test('clean editor follows remote updates without a confirmation',async t=>{
 const s=setup(t);s.set({...initial,content:'AI 新正文',revision:2});await s.sync.refresh();assert.equal(s.sync.state.value.content,'AI 新正文');assert.equal(s.sync.dirty,false);
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
