import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkbenchRPC} from '../src/client/shared/rpc.ts';

const unavailable=()=>new Error('transport failure for /api/cuigengji/dispatch: HTTP 404');

test('initial reads recover when the native install makes the backend available later',async()=>{
  const calls=[];
  const rpc=createWorkbenchRPC(async(...args)=>{calls.push(args);if(calls.length<3)throw unavailable();return {ok:true,value:['saved-book']};},{retryDelayMs:1});
  const args={includeArchived:true};
  assert.deepEqual(await rpc('novel.list',args,'author'),['saved-book']);
  assert.equal(calls.length,3);
  assert.ok(calls.every(([action,payload,session])=>action==='novel.list'&&payload===args&&session==='author'));
});

test('writes, application errors, authorization and unrelated transport failures are never retried',async()=>{
  for(const [action,error] of [
    ['chapter.update',unavailable()],['binding.set',unavailable()],['novel.create',unavailable()],
    ['novel.list',new Error('transport failure for /api/other: HTTP 404')],
    ['novel.list',new Error('transport failure for /api/cuigengji/dispatch: HTTP 401')],
    ['novel.list',new Error('transport failure for /api/cuigengji/dispatch: HTTP 500')],
  ]){
    let calls=0;
    const rpc=createWorkbenchRPC(async()=>{calls++;throw error;},{retryDelayMs:1});
    await assert.rejects(rpc(action,{}),error);
    assert.equal(calls,1,action+' '+error.message);
  }
  let calls=0;
  const rpc=createWorkbenchRPC(async()=>{calls++;return {ok:false,error:{code:'UPGRADE_REQUIRED',message:'迁移校验失败，原始数据已保留'}};});
  await assert.rejects(rpc('novel.list',{}),{code:'UPGRADE_REQUIRED',message:'迁移校验失败，原始数据已保留'});
  assert.equal(calls,1);
});

test('permanent route failures are bounded and preserve the underlying diagnostic',async()=>{
  let calls=0;const original=unavailable();
  const rpc=createWorkbenchRPC(async()=>{calls++;throw original;},{retryWindowMs:20,retryDelayMs:5});
  await assert.rejects(rpc('novel.list',{}),error=>error.code==='BACKEND_UNAVAILABLE'&&error.cause===original&&/HTTP 404/.test(error.message));
  assert.ok(calls>1&&calls<10);
});

test('unloading the plugin cancels pending requests and stops startup retries',async()=>{
  const lifetime=new AbortController(),reason=new Error('plugin unloaded');let calls=0;
  const rpc=createWorkbenchRPC(async(_action,_args,_session,signal)=>{calls++;assert.equal(signal,lifetime.signal);throw unavailable();},{signal:lifetime.signal,retryDelayMs:100});
  const pending=rpc('binding.get',{});
  queueMicrotask(()=>lifetime.abort(reason));
  await assert.rejects(pending,reason);
  assert.equal(calls,1);
});
