import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importPreset,compilePreset } from '../src/core/preset.js';
import { Store } from '../src/core/store.js';
import { registerPrompt } from '../src/assistant/prompt.js';

const raw={name:'写作',temperature:0.8,prompts:[
  {identifier:'a',name:'文风',role:'system',content:'短句'},
  {identifier:'b',name:'叙事',role:'system',content:'保持人物视角'},
  {identifier:'c',name:'宏',role:'system',content:'{{char}}'},
  {identifier:'d',name:'深度',role:'system',content:'尾部',injection_position:1},
  {identifier:'e',name:'角色模拟',role:'assistant',content:'示例'},
  {identifier:'f',name:'聊天',marker:true},
],prompt_order:[{character_id:100001,order:['b','a','c','d','e','f'].map(identifier=>({identifier,enabled:true}))}]};
test('preset import preserves order, disables unsupported semantics, archives all fields',()=>{
  const p=importPreset(raw);assert.equal(p.enabled,false);assert.equal(compilePreset(p),'');
  assert.deepEqual(p.blocks.map(b=>b.identifier),['b','a','c','d','e','f']);
  assert.deepEqual(p.blocks.map(b=>b.enabled),[true,true,false,false,false,false]);
  assert.deepEqual(p.raw,raw);p.enabled=true;assert.equal(compilePreset(p),'保持人物视角\n\n短句');
  p.blocks[2].enabled=true;assert.throws(()=>compilePreset(p),/酒馆宏/);
  assert.throws(()=>importPreset({temperature:1}),/prompts/);
  assert.throws(()=>importPreset({...raw,prompt_order:[{character_id:1,order:[]},{character_id:2,order:[]}]}),/选择排列/);
});
test('preset persistence enforces human authorship and CAS, and prompt assembly is scoped and actually injects text',async t=>{
  const root=await mkdtemp(join(tmpdir(),'preset-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),human={kind:'human',sessionId:'author'};
  const novel=await store.dispatch('novel.create',{title:'预设验收'},human);
  await store.dispatch('binding.set',{novelId:novel.id},human);
  const preset={...importPreset(raw),enabled:true};
  await assert.rejects(store.dispatch('preset.set',{novelId:novel.id,expectedRevision:0,preset},{kind:'agent'}),{code:'HUMAN_REQUIRED'});
  const saved=await store.dispatch('preset.set',{expectedRevision:0,preset},human);assert.equal(saved.revision,1);
  await assert.rejects(store.dispatch('preset.set',{expectedRevision:0,preset},human),{code:'CONFLICT'});
  const handlers={},audit=[];registerPrompt({on:(name,fn)=>handlers[name]=fn},{store,contextChars:2000,audit:async(...v)=>audit.push(v)});
  const base={sections:[{name:'host',text:'DSH'}],contexts:[],tools:[],variables:{}};
  const assemble=id=>handlers['system-prompt/assemble'](base,{agent:{id}},async()=>base);
  assert.equal((await assemble('unbound')).sections.length,1);
  const bound=await assemble('author');assert.equal(bound.sections.find(s=>s.name==='cuigengji:preset').text,'保持人物视角\n\n短句');
  assert.equal(base.sections.length,1);assert.equal(audit[0][1].preset.revision,1);
  const backup=await store.dispatch('novel.export',{},human);assert.deepEqual(backup.novel.preset.raw,raw);
  const root2=await mkdtemp(join(tmpdir(),'preset-restore-'));t.after(()=>rm(root2,{recursive:true,force:true}));
  const restored=new Store(root2);await restored.dispatch('novel.import',{backup},human);
  assert.deepEqual(await restored.dispatch('preset.get',{novelId:novel.id},human),saved);
  await store.dispatch('preset.set',{expectedRevision:1,preset:{...saved,enabled:false}},human);
  assert.equal((await assemble('author')).sections.some(s=>s.name==='cuigengji:preset'),false);
});
