import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,stat,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicStore} from '../src/platform/files/atomic-store.ts';

test('contending readers and writers reacquire the process lock without overlapping ownership',async t=>{
  const root=await mkdtemp(join(tmpdir(),'cg-lock-contention-'));t.after(()=>rm(root,{recursive:true,force:true}));
  let inside=0,completed=0;
  await Promise.all(Array.from({length:12},async()=>{
    const store=new AtomicStore(root,()=>({}),()=>{}, {lockTimeoutMs:10000});
    for(let i=0;i<24;i++){
      const release=await store.acquire();
      try{inside++;assert.equal(inside,1);await new Promise(r=>setTimeout(r,1));completed++;}
      finally{inside--;await release();}
    }
  }));
  assert.equal(completed,288);assert.equal(inside,0);
  await assert.rejects(stat(join(root,'.lock')),{code:'ENOENT'});
});

test('an ownerless lock left by an interrupted shutdown is reclaimed',async t=>{
  const root=await mkdtemp(join(tmpdir(),'cg-lock-orphan-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'.lock'));
  const store=new AtomicStore(root,()=>({}),()=>{},{lockTimeoutMs:500});
  const release=await store.acquire();
  assert.deepEqual(await readdir(join(root,'.lock')),['owner']);
  await release();
  await assert.rejects(stat(join(root,'.lock')),{code:'ENOENT'});
});

test('an unknown file inside a lock is never deleted as an orphan',async t=>{
  const root=await mkdtemp(join(tmpdir(),'cg-lock-unknown-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'.lock'));await mkdir(join(root,'.lock','unexpected'));
  const store=new AtomicStore(root,()=>({}),()=>{},{lockTimeoutMs:180});
  await assert.rejects(store.acquire(),{code:'STORE_BUSY'});
  await stat(join(root,'.lock','unexpected'));
});
