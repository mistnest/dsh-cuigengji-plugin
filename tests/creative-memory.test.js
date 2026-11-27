import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Store} from '../src/composition/store.ts';
import {QueryService} from '../src/modules/workspace/queries/service.ts';
import {selectProjects} from '../src/modules/workspace/transfer/packages.ts';
import {copyWork} from '../src/modules/workspace/transfer/copy.ts';
import {WorkData} from '../src/modules/library/archives/workspace-archive.ts';

async function library(t) {
  const root = await mkdtemp(join(tmpdir(), 'cg-creative-memory-'));
  t.after(()=>rm(root, {recursive:true, force:true}));
  return new Store(root);
}

test('legacy preview, one Markdown file, independent edits, rename, export and clear', async t => {
  const store = await library(t), author = {kind:'human',sessionId:'editor'};
  const {id:novelId} = await store.dispatch('novel.create',{title:'试写'},author);
  const call = (action, args={}) => store.dispatch(action,{...args,novelId},author);
  const read = () => call('creativeMemory.read',{full:true});
  const edit = (base, args) => ({requestId:crypto.randomUUID(),expectedRevision:base.revision,expectedHash:base.contentHash,...args});
  await call('preset.set',{expectedRevision:0,preset:{name:'旧规则',enabled:true,blocks:[
    {identifier:'voice',name:'视角',enabled:true,content:'跟着徒弟看。'},
    {identifier:'hidden',name:'停用',enabled:false,content:'不采用。'}]}});
  const selected = await read(), path = join(store.root,'novels','试写','memory.md');
  assert.equal(selected.content,'## 视角\n\n跟着徒弟看。');
  await assert.rejects(readFile(path),{code:'ENOENT'});
  const body = selected.content + '\n\n## 时间\n\n暂时不跳时。';
  const command = edit(selected,{content:body});
  const saved = await call('creativeMemory.update', command);
  assert.deepEqual(await call('creativeMemory.update', command),saved);
  assert.equal(await readFile(path,'utf8'),body);
  assert.equal((await call('preset.read')).enabled,false);
  await assert.rejects(call('creativeMemory.update',edit(selected,{content:''})),{code:'CONFLICT'});
  const outline = await call('novel.handoff');
  assert.equal(outline.creativeMemory.total,2);
  assert.ok(!JSON.stringify(outline).includes('暂时不跳时'));
  const match = await call('creativeMemory.read',{query:'不跳时'});
  assert.deepEqual(match.headings,[{section:1,title:'时间'}]);
  assert.equal((await call('creativeMemory.read',{section:1,expectedHash:match.contentHash})).content,'## 时间\n\n暂时不跳时。');
  await writeFile(path,body+'\n手动改动。');
  await assert.rejects(call('creativeMemory.update',edit(saved,{append:'旧草稿'})),{code:'CONFLICT'});
  await call('novel.update',{expectedRevision:(await call('novel.get')).revision,title:'新书名'});
  const after = await read();
  assert.match(after.content,/手动改动/);
  await call('chapter.create',{title:'第一章',content:'合成正文。'});
  const backup = (await call('novel.export')).novel;
  assert.equal(copyWork(backup,{}).creativeMemory,after.content);
  assert.ok(!Object.hasOwn(selectProjects([backup],{kind:'chapters',novelId}).projects[0],'creativeMemory'));
  const restored = await library(t);
  await new WorkData(restored).import(await new WorkData(store).export());
  assert.equal((await restored.dispatch('creativeMemory.read',{novelId,full:true},author)).content,after.content);
  await call('creativeMemory.update',edit(after,{content:''}));
  await assert.rejects(readFile(join(store.root,'novels','新书名','memory.md')),{code:'ENOENT'});
  assert.equal((await new Store(store.root).dispatch('creativeMemory.read',{novelId,full:true},author)).content,'');
  assert.equal((await call('preset.get')).blocks.length,2);
});

test('reader grants keep memory current, book-scoped, and out of manuscript-only handoffs', async t => {
  const store=await library(t), actor={kind:'agent',sessionId:'writer'};
  const {id:novelId}=await store.dispatch('novel.create',{title:'第一本'},actor);
  const other=await store.dispatch('novel.create',{title:'第二本'},actor);
  const service=new QueryService(store), reader={id:'reader',presets:{}};
  const query=(modules,action,args={})=>service.query(action,{novelId,...args},reader,modules);
  const empty=await query(['guidance'],'creativeMemory.read');
  const update=(base,args)=>store.dispatch('creativeMemory.update',{novelId,requestId:crypto.randomUUID(),expectedRevision:base.revision,expectedHash:base.contentHash,...args},actor);
  const first=await update(empty,{append:'## 视角\n这一卷跟着徒弟。'});
  const next=await update(first,{patch:{oldText:'这一卷',newText:'从第二章起'}});
  assert.equal((await query(['guidance'],'creativeMemory.read',{full:true})).revision,next.revision);
  assert.deepEqual((await query(['guidance'],'creativeMemory.read',{novelId:other.id})).headings,[]);
  assert.equal((await query(['manuscript'],'novel.handoff')).creativeMemory,undefined);
  await assert.rejects(query(['manuscript'],'creativeMemory.read'),{code:'CAPABILITY_DENIED'});
  await assert.rejects(query(['guidance'],'creativeMemory.update'),{code:'READ_ONLY'});
  await assert.rejects(query(['guidance'],'creativeMemory.read',{section:0,expectedHash:first.contentHash}),{code:'CONFLICT'});
});
