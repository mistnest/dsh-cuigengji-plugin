import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicStore} from '../src/infrastructure/persistence/atomic-store.ts';

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
