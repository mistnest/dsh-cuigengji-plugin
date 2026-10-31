import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/application/store.js';
import {createSessionPolicy} from '../src/application/bindings/session.js';
import {registerPrompt} from '../src/adapters/dsh/prompt.js';
import {WorkData} from '../src/application/backup/workspace.js';
import {readGuidance} from '../src/adapters/dsh/guidance.js';

test('guidance is independent of focus, durable, per-session and removable from assembly',async t=>{
 const root=await mkdtemp(join(tmpdir(),'cg-guidance-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const store=new Store(root),human={kind:'human',sessionId:'one'},agent={kind:'agent',sessionId:'one'};
 const policy=createSessionPolicy({store,audit:async()=>{}});
 assert.deepEqual(await store.dispatch('guidance.get',{},human),{enabled:true},'a fresh installation is on before a work is created or selected');
 let assemble;registerPrompt({on:(_,fn)=>assemble=fn},{store});
 const base={sections:[{name:'host',text:'宿主'}],contexts:[],tools:['shell']};
 const prompt=previous=>assemble({}, {agent:{id:'one'}},async()=>previous||base);
 assert.ok((await prompt()).sections.some(s=>s.name==='cuigengji:writing'),'the default really injects core guidance into a fresh conversation');
 assert.ok(!(await prompt()).sections.some(s=>s.name==='cuigengji:preset'),'no work means no unrelated preset');
 const book=await store.dispatch('novel.create',{title:'测试'},human);
 assert.deepEqual(await store.dispatch('guidance.get',{},human),{enabled:true});
 await policy.dispatch('chapter.create',{novelId:book.id,title:'无绑定写作',content:'正文'},agent);
 assert.equal(await policy.resolveBinding('one'),null);
 await assert.rejects(policy.dispatch('chapter.list',{},agent),/选择当前作品/);
 await policy.dispatch('novel.focus',{novelId:book.id},agent);
 assert.deepEqual(await store.dispatch('guidance.get',{},human),{enabled:true});
 await store.dispatch('preset.set',{expectedRevision:0,preset:{name:'要求',enabled:true,blocks:[{identifier:'style',name:'文风',enabled:true,content:'短句'}]}},human);
 assert.ok((await prompt()).sections.some(s=>s.name==='cuigengji:writing'));
 await store.dispatch('guidance.set',{enabled:true},human);
 const on=await prompt();assert.ok(on.sections.some(s=>s.name==='cuigengji:preset'));
 assert.deepEqual(await store.dispatch('guidance.get',{}, {...human,sessionId:'two'}),{enabled:true});
 await store.dispatch('guidance.set',{enabled:false},human);
 assert.deepEqual(await prompt(on),base);
 assert.deepEqual(await new Store(root).dispatch('guidance.get',{},human),{enabled:false});
 await assert.rejects(store.dispatch('guidance.set',{enabled:true},agent),{code:'HUMAN_REQUIRED'});
 const archive=await new WorkData(store).export();
 const restoredRoot=await mkdtemp(join(tmpdir(),'cg-guidance-restore-'));t.after(()=>rm(restoredRoot,{recursive:true,force:true}));
 const restored=new Store(restoredRoot);await new WorkData(restored).import(archive);
 assert.deepEqual(await restored.dispatch('guidance.get',{},human),{enabled:false});
 // Pre-switch installations keep their existing writing behavior.
 const release=await store.acquire();try{const state=await store.load();delete state.guidance;await store.save(state);}finally{await release();}
 assert.deepEqual(await store.dispatch('guidance.get',{},human),{enabled:true});
});

test('on-demand guidance returns the requested rule module and only the selected work preset', async t => {
 const root=await mkdtemp(join(tmpdir(),'cg-guidance-mcp-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const store=new Store(root), human={kind:'human',sessionId:'author'}, agent={kind:'agent',sessionId:'writer'};
 const policy=createSessionPolicy({store,audit:async()=>{}});
 const core=await readGuidance({store,actor:agent,resolveBinding:policy.resolveBinding,section:'core'});
 assert.equal(core.novelId,null);
 assert.equal(core.modules.length,1);
 assert.match(core.modules[0].content,/小说/);
 const book=await store.dispatch('novel.create',{title:'按需指引测试'},human);
 await store.dispatch('preset.set',{novelId:book.id,expectedRevision:0,preset:{name:'本书预设',enabled:true,blocks:[{identifier:'voice',name:'文风',enabled:true,content:'短句、少形容词。'}]}},human);
 await policy.dispatch('novel.focus',{novelId:book.id},agent);
 const preset=await readGuidance({store,actor:agent,resolveBinding:policy.resolveBinding,section:'preset'});
 assert.equal(preset.novelId,book.id);
 assert.equal(preset.modules.length,0);
 assert.equal(preset.preset.content,'短句、少形容词。');
 const plan=await readGuidance({store,actor:agent,resolveBinding:policy.resolveBinding,section:'plan'});
 assert.equal(plan.modules.length,1);
 assert.equal(plan.preset,undefined);
});
