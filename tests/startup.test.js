import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {Store} from '../src/application/store.js';
import {apply} from '../src/index.js';
import {ordinaryBindings} from '../src/application/bindings/state.ts';
import {Context} from '@deepseek-ai/cordis';
import * as plugin from '../src/index.js';

for(const optionalServices of [false,true])test(`native Cordis activates the backend with optional capabilities ${optionalServices?'available':'absent'}`,async()=>{
  const parent=await mkdtemp(join(tmpdir(),'cuigengji-native-startup-')),root=join(parent,'data'),ctx=new Context(),routes=[],tools=[],skills=[];
  try{
    ctx.provide('tools',{register:tool=>tools.push(tool)});
    ctx.provide('skills',{register:skill=>skills.push(skill)});
    ctx.provide('systemPrompt',{});
    ctx.provide('connection',{fetch:{register:route=>routes.push(route)}});
    const edits=[],entry={options:{name:'dsh-cuigengji-plugin'}};
    if(optionalServices){
      ctx.provide('configEditor',{entries:()=>[entry],edit:async(_entry,change)=>edits.push(change({dataRoot:root}))});
      ctx.provide('directoryPicker',{capability:()=>({kind:'native',pick:async()=>join(parent,'selected')})});
    }
    const boot=ctx.plugin(plugin,{dataRoot:root,usageRoot:join(parent,'usage')});
    await Promise.race([Promise.resolve(boot),delay(2500).then(()=>{throw new Error('Backend never activated through the native dependency resolver');})]);
    const service=ctx.get('cuigengji');assert.ok(service,'the real service must be available after activation');
    assert.equal(routes.length,1);assert.ok(tools.some(tool=>tool.name==='cuigengji_project'));assert.ok(tools.some(tool=>tool.name==='cuigengji_variables'));assert.ok(tools.some(tool=>tool.name==='cuigengji_story'));assert.equal(skills.length,8);
    const call=async(action,args={})=>{
      const response=await routes[0].fetch(new Request('http://localhost/api/cuigengji/dispatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',method:'cuigengji/dispatch',rpcId:action,payload:{action,args}})}));
      assert.equal(response.status,200);const result=(await response.json()).result;assert.equal(result.ok,true,JSON.stringify(result));return result.value;
    };
    assert.equal((await call('settings.get')).dataRoot,root);
    assert.deepEqual(await call('novel.list'),[]);
    assert.equal((await call('library.status')).canChange,optionalServices);
    assert.deepEqual(await call('library.pick'),optionalServices?{path:join(parent,'selected'),manual:false}:{path:null,manual:true});
    if(optionalServices){
      const target=join(parent,'new-library');await call('library.change',{mode:'create',path:target,confirm:true});
      assert.equal(edits.length,1);assert.equal(edits[0].dataRoot,target);assert.equal((await call('settings.get')).dataRoot,target);
    }
  }finally{await ctx.fiber.dispose();await rm(parent,{recursive:true,force:true});}
});

test('RPC is available during startup; project reads wait for the verified migration', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'cuigengji-startup-'));
  const root = join(parent, 'data');
  await mkdir(root);
  const original = await readFile(new URL('./fixtures/public-0.3.13/store.json', import.meta.url), 'utf8');
  await writeFile(join(root, 'store.json'), original);
  const expected = JSON.parse(original), effects = [], routes = [];
  const ctx = {
    tools: {register() {}}, skills: {register() {}},
    connection: {fetch: {register: route => routes.push(route)}},
    on() {}, effect: fn => effects.push(fn()), provide: (key, value) => {ctx[key] = value;},
  };
  // Hold a real Store lock to reproduce a slow backup/migration without
  // slowing the filesystem or writing anything to an actual user profile.
  let release = await new Store(root).acquire();
  const boot = apply(ctx, {dataRoot: root,usageRoot:join(parent,'usage')});
  try {
    assert.equal(routes.length, 1, 'the frontend can open before migration finishes; its route must already exist');
    const call = async (action, args = {}) => {
      const response = await routes[0].fetch(new Request('http://localhost/api/cuigengji/dispatch', {
        method: 'POST', headers: {'content-type': 'application/json'},
        body: JSON.stringify({type: 'client-request', method: 'cuigengji/dispatch', rpcId: action, payload: {action, args}}),
      }));
      assert.equal(response.status, 200);
      return (await response.json()).result;
    };
    assert.equal((await call('settings.get')).ok, true);
    assert.ok(['pending', 'running'].includes((await call('maintenance.status')).value.status));
    let answered = false;
    const books = call('novel.list', {includeArchived: true}).then(result => {answered = true; return result;});
    await delay(30);
    assert.equal(answered, false, 'reads must not publish an empty library before migration');
    assert.equal(await readFile(join(root, 'store.json'), 'utf8'), original);
    await release(); release = null;
    await boot;
    const result = await books;
    assert.equal(result.ok, true);
    assert.deepEqual(result.value.map(book => book.id).sort(), Object.keys(expected.novels).sort());
    assert.equal((await call('maintenance.status')).value.status, 'ready');
    assert.deepEqual(await new Store(root).readStoredWorkspace(), {...expected,bindings:ordinaryBindings(expected.bindings)});
  } finally {
    if (release) await release();
    await boot;
    for (const dispose of effects.reverse()) await dispose();
    await rm(parent, {recursive: true, force: true});
  }
});
