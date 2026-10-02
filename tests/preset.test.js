import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importPreset,compilePreset,presetImportOrders } from '../src/core/preset.js';
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
test('preset import preserves text and order while ignoring Tavern execution rules',()=>{
  const p=importPreset(raw);assert.equal(p.enabled,false);assert.equal(compilePreset(p),'');
  assert.deepEqual(p.blocks.map(b=>b.identifier),['b','a','c','d','e','f']);
  assert.deepEqual(p.blocks.map(b=>b.enabled),[true,true,true,true,true,false]);
  assert.deepEqual(p.raw,raw);p.enabled=true;assert.equal(compilePreset(p),'保持人物视角\n\n短句\n\n{{char}}\n\n尾部\n\n示例');
  assert.throws(()=>importPreset({temperature:1}),/prompts/);
  assert.throws(()=>importPreset({...raw,prompt_order:[{character_id:1,order:[]},{character_id:2,order:[]}]}),/选择排列/);
});
test('Prompt Manager flat orders allow omitted built-ins and preserve disabled custom text',()=>{
  const input={version:1,type:'full',data:{prompts:[{identifier:'a',content:'内容 A',role:'user',injection_trigger:['continue']},{identifier:'b',content:'内容 B'}],prompt_order:[{identifier:'chatHistory',enabled:true},{identifier:'b',enabled:false},{identifier:'a',enabled:true}]}};
  assert.equal(presetImportOrders(input)[0].character_id,'flat');
  const p=importPreset(input,'flat');assert.deepEqual(p.blocks.map(b=>b.identifier),['b','a']);
  assert.equal(compilePreset({...p,enabled:true}),'内容 A');assert.deepEqual(p.raw,input);
  assert.ok(p.warnings.some(w=>w.includes('1 项未随文件导出')));
});
test('standalone system prompts and unordered text import without inventing template instructions',()=>{
  const p=importPreset({name:'写作',content:'主要要求',post_history:'补充要求'});
  assert.equal(compilePreset({...p,enabled:true}),'主要要求\n\n补充要求');
  const q=importPreset({prompts:[{identifier:'a',content:'{{user}}',role:'assistant',injection_position:1},{identifier:'b',content:'停用内容',enabled:false},{identifier:'c',marker:true,content:'非空占位条目正文'}]});
  assert.equal(compilePreset({...q,enabled:true}),'{{user}}\n\n非空占位条目正文');
  assert.throws(()=>importPreset({story_string:'{{system}}'}),/没有独立提示词正文/);
  assert.throws(()=>importPreset({input_sequence:'### Input'}),/没有独立提示词正文/);
  assert.throws(()=>importPreset({content:'a',post_history:123}),/必须是文本/);
});
test('preset order selection and malformed imports fail without silently dropping supplied text',()=>{
  const input={prompts:[{identifier:'a',content:'A'},{identifier:'b',content:'B'}],prompt_order:[{character_id:2,order:[{identifier:'b',enabled:true}]},{character_id:'100001',order:[{identifier:'a',enabled:true}]}]};
  assert.equal(compilePreset({...importPreset(input),enabled:true}),'A');
  assert.equal(compilePreset({...importPreset(input,2),enabled:true}),'B');
  assert.throws(()=>importPreset({...input,prompt_order:[{character_id:1,order:[{identifier:'missing'}]}]}),/不存在/);
  assert.throws(()=>importPreset({prompts:[{identifier:'a',content:42}]}),/必须是文本/);
  assert.throws(()=>importPreset({prompts:[{identifier:'a',content:'A'},{identifier:'a',content:'B'}]}),/重复/);
  assert.throws(()=>importPreset({prompts:[{identifier:'a',content:'A'}],prompt_order:[null]}),/排列结构/);
  assert.throws(()=>importPreset({prompts:[{identifier:'a',content:'x'.repeat(100001)}]}),/100000/);
});
test('preset persistence enforces human authorship and CAS; enabled requirements join the system prompt',async t=>{
  const root=await mkdtemp(join(tmpdir(),'preset-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),human={kind:'human',sessionId:'author'};
  const novel=await store.dispatch('novel.create',{title:'预设验收'},human);
  await store.dispatch('binding.set',{novelId:novel.id},human);
  const preset={...importPreset(raw),enabled:true};
  await assert.rejects(store.dispatch('preset.set',{novelId:novel.id,expectedRevision:0,preset},{kind:'agent'}),{code:'HUMAN_REQUIRED'});
  const saved=await store.dispatch('preset.set',{expectedRevision:0,preset},human);assert.equal(saved.revision,1);
  assert.equal(saved.importFormat,'chat-completion');
  await assert.rejects(store.dispatch('preset.set',{expectedRevision:0,preset},human),{code:'CONFLICT'});
  const handlers={},audit=[];registerPrompt({on:(name,fn)=>handlers[name]=fn},{store,contextChars:2000,audit:async(...v)=>audit.push(v)});
  const base={sections:[{name:'host',text:'DSH'}],contexts:[],tools:[],variables:{}};
  const assemble=id=>handlers['system-prompt/assemble'](base,{agent:{id}},async()=>base);
  assert.equal((await assemble('unbound')).sections.length,2);
  const bound=await assemble('author');
  assert.equal(bound.sections.some(s=>s.name==='cuigengji:handoff'),false);
  assert.ok(bound.sections.some(s=>s.name==='cuigengji:writing'));
  assert.equal(bound.sections.at(-1).name,'cuigengji:preset');
  assert.equal(bound.sections.at(-2).name,'cuigengji:writing');
  assert.equal(bound.sections.at(-1).text,'作者的写作要求：\n保持人物视角\n\n短句\n\n{{char}}\n\n尾部\n\n示例');
  assert.equal(bound.sections.at(-1).interpolate,false);
  assert.deepEqual(await assemble('author'),bound);
  assert.deepEqual(bound.contexts,[]);
  assert.equal(JSON.stringify(bound.sections).includes('{{char}}'),true);
  const effective=await store.dispatch('preset.read',{}, {kind:'agent',sessionId:'author'});
  assert.equal(effective.content,'保持人物视角\n\n短句\n\n{{char}}\n\n尾部\n\n示例');
  assert.equal(Object.hasOwn(effective,'raw'),false);
  assert.equal(base.sections.length,1);assert.deepEqual(audit,[]);
  const backup=await store.dispatch('novel.export',{},human);assert.deepEqual(backup.novel.preset.raw,raw);
  const root2=await mkdtemp(join(tmpdir(),'preset-restore-'));t.after(()=>rm(root2,{recursive:true,force:true}));
  const restored=new Store(root2);await restored.dispatch('novel.import',{backup},human);
  assert.deepEqual(await restored.dispatch('preset.get',{novelId:novel.id},human),saved);
  await store.dispatch('preset.set',{expectedRevision:1,preset:{...saved,enabled:false}},human);
  assert.equal((await store.dispatch('preset.read',{},human)).content,'');
  assert.equal((await assemble('author')).sections.some(s=>s.name==='cuigengji:preset'),false);
  const other=await store.dispatch('novel.create',{title:'另一本'},human);
  await store.dispatch('preset.set',{novelId:other.id,expectedRevision:0,preset:{...preset,blocks:[{...preset.blocks[0],content:'另一部作品的要求'}]}},human);
  await store.dispatch('binding.set',{novelId:other.id},human);
  const switched=await handlers['system-prompt/assemble'](bound,{agent:{id:'author'}},async()=>bound);
  assert.equal(switched.sections.filter(s=>s.name==='cuigengji:preset').length,1);
  assert.equal(switched.sections.at(-1).text,'作者的写作要求：\n另一部作品的要求');
  assert.doesNotMatch(JSON.stringify(switched),/保持人物视角/);
});
