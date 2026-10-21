import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,readdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {Store} from '../src/core/store.js';
import {WorkData} from '../src/application/backup/workspace.js';
import {fileId,bookPath,splitWorkspace} from '../src/infrastructure/persistence/project-layout.ts';
import {projectDirectoryName,validProjectDirectory} from '../src/infrastructure/persistence/project-directories.ts';
import {storageSnapshot} from './helpers/storage-snapshot.js';

const library = async root=>JSON.parse(await readFile(join(root,'library.json'),'utf8'));
async function temporary(t) {
  const root=await mkdtemp(join(tmpdir(),'cuigengji-book-names-'));
  t.after(()=>rm(root,{recursive:true,force:true})); return root;
}
async function seed(t) {
  const root=await temporary(t),store=new Store(root),actor={kind:'human',sessionId:'named-book-author'};
  const novel=await store.dispatch('novel.create',{title:'旧书名'},actor);
  const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
  const chapter=await run('chapter.create',{title:'第一章',content:'正文与人物引用必须原样保留。',requestId:'first-chapter'});
  await run('chapter.update',{chapterId:chapter.id,expectedRevision:1,content:'修订后的正文必须原样保留。'});
  const deleted=await run('chapter.create',{title:'回收站章节',content:'可恢复的原文。'});
  await run('chapter.delete',{chapterId:deleted.id,expectedRevision:1,confirm:true});
  await run('binding.set',{chapterId:chapter.id});
  await run('graph.create',{type:'character_card',name:'书中人物',content:'人物完整设定。',sources:[{chapterId:chapter.id,revision:2}]});
  await run('preset.set',{expectedRevision:0,preset:{name:'文风',enabled:true,blocks:[{identifier:'style',name:'叙事',content:'保持人物视角。',enabled:true}],raw:{original:'导入原文'}}});
  const planning=await run('planning.apply',{requestId:'named-plan',operations:[
    {op:'page.create',ref:'page',value:{name:'局部推演'}},
    {op:'node.create',ref:'first',value:{pageId:'page',title:'发现线索',content:'待讨论的剧情全文。',chapterRefs:[{chapterId:chapter.id,revision:2}],status:'written'}},
    {op:'node.create',ref:'second',value:{pageId:'page',title:'追查',content:'另一段构思。'}},
    {op:'edge.create',value:{from:'first',to:'second'}},
    {op:'decoration.create',value:{pageId:'page',kind:'note',title:'未决问题',content:'谁提供线索？'}}
  ]});
  return {root,store,actor,novel,run,chapter,deleted,planning};
}
async function versionTwo(root,state) {
  const directories=Object.fromEntries(Object.keys(state.novels).map(id=>[id,fileId(id)]));
  const files=splitWorkspace(state,directories,3),old=JSON.parse(files.get('library.json'));
  old.storageVersion=2;delete old.directories;
  files.set('library.json',JSON.stringify(old));
  for(const [relative,content] of files) {const path=join(root,relative);await mkdir(dirname(path),{recursive:true});await writeFile(path,content);}
  return {old,raw:files.get('library.json'),files};
}

test('book names are readable and Windows-safe, with stable distinct folders for repeated names',async t=>{
  const root=await temporary(t),store=new Store(root);
  const titles=['神人','神人','ABC','abc','CON','NUL.txt','码头/决战:第?一*部. ','..','😀'.repeat(100)];
  const books=[];for(const title of titles)books.push(await store.dispatch('novel.create',{title}));
  const index=await library(root),folders=books.map(book=>index.directories[book.id]);
  assert.deepEqual(folders.slice(0,6),['神人','神人（2）','ABC','abc（2）','作品_CON','作品_NUL.txt']);
  assert.equal(folders[7],'未命名作品');
  assert.ok(folders.every(validProjectDirectory));assert.ok(folders.every(name=>name.length<=64));
  assert.ok(!folders[8].includes('\ufffd'));
  assert.deepEqual((await new Store(root).dispatch('novel.list')).map(book=>book.title),titles,'display titles remain exact');
});

test('unowned folders and files are reserved rather than overwritten; concurrent names stay distinct',async t=>{
  const root=await temporary(t);await mkdir(join(root,'novels','神人'),{recursive:true});
  await writeFile(join(root,'novels','神人','我的文件.txt'),'用户自己存放的内容');
  await writeFile(join(root,'novels','神人（2）'),'同名文件');
  const books=await Promise.all([new Store(root).dispatch('novel.create',{title:'神人'}),new Store(root).dispatch('novel.create',{title:'神人'})]);
  const index=await library(root);
  assert.deepEqual(books.map(book=>index.directories[book.id]).sort(),['神人（3）','神人（4）']);
  assert.equal(await readFile(join(root,'novels','神人','我的文件.txt'),'utf8'),'用户自己存放的内容');
  assert.equal(await readFile(join(root,'novels','神人（2）'),'utf8'),'同名文件');
});

test('renaming moves all prose, history, planning, settings and extra files while retaining IDs and references',async t=>{
  const {root,store,novel,actor,run,chapter,deleted,planning}=await seed(t);
  const before=await store.load(),oldIndex=await library(root),oldPath=bookPath(novel.id,oldIndex.directories);
  await writeFile(join(root,oldPath,'创作摘录.txt'),'目录中的额外文件也保留。');
  const current=await run('novel.get');await run('novel.update',{expectedRevision:current.revision,title:'神人',requestId:'rename-book'});
  const index=await library(root);assert.equal(index.directories[novel.id],'神人');
  await assert.rejects(stat(join(root,oldPath)),{code:'ENOENT'});
  assert.equal(await readFile(join(root,'novels','神人','创作摘录.txt'),'utf8'),'目录中的额外文件也保留。');
  const after=await new Store(root).load(),expected=structuredClone(before);
  for(const field of ['title','revision','updatedAt'])expected.novels[novel.id][field]=after.novels[novel.id][field];
  assert.deepEqual(after, {...expected,requests:after.requests});
  assert.deepEqual(await run('binding.get'),await new Store(root).dispatch('binding.get',{},actor));
  assert.equal((await run('planning.get',{nodeId:planning.mapping.first})).node.chapterRefs[0].chapterId,chapter.id);
  await run('chapter.restore',{chapterId:deleted.id,targetRevision:1,expectedRevision:2});
  assert.equal((await run('chapter.get',{chapterId:deleted.id})).content,'可恢复的原文。');
  const backup=await new WorkData(store).export(),restored=new Store(join(root,'restore'));
  await new WorkData(restored).import(backup);assert.deepEqual(await restored.load(),await store.load());
  const second=await new Store(root).dispatch('novel.update',{novelId:novel.id,expectedRevision:current.revision,title:'神人',requestId:'rename-book'},actor);
  assert.equal(second.title,'神人','same request survives a directory rename');
});

test('renaming to an existing book name retains the other book; case-only and sanitized-equivalent edits keep stable folders',async t=>{
  const root=await temporary(t),store=new Store(root),first=await store.dispatch('novel.create',{title:'ABC'}),second=await store.dispatch('novel.create',{title:'神人'});
  await store.dispatch('chapter.create',{novelId:second.id,title:'原文',content:'不能被另一部小说覆盖。'});
  const before=await store.dispatch('novel.export',{novelId:second.id});
  const renamed=await store.dispatch('novel.update',{novelId:first.id,title:'神人',expectedRevision:first.revision});
  assert.equal((await library(root)).directories[first.id],'神人（2）');
  assert.deepEqual((await store.dispatch('novel.export',{novelId:second.id})).novel,before.novel);
  await store.dispatch('novel.update',{novelId:first.id,title:'abc',expectedRevision:renamed.revision});
  const current=await store.dispatch('novel.get',{novelId:first.id});
  const upper=await store.dispatch('novel.update',{novelId:first.id,title:'ABC',expectedRevision:current.revision});
  assert.equal((await library(root)).directories[first.id],'abc');
  const slash=await store.dispatch('novel.update',{novelId:first.id,title:'a/b',expectedRevision:upper.revision});
  await store.dispatch('novel.update',{novelId:first.id,title:'a:b',expectedRevision:slash.revision});
  assert.equal((await library(root)).directories[first.id],'a_b');
  assert.equal(projectDirectoryName('a/b'),projectDirectoryName('a:b'));
});

test('version 2 migration preserves every project file byte, IDs, cached requests and portable backups',async t=>{
  const {root,store,novel,actor}=await seed(t),expected=await store.load(),legacy=join(root,'v2');
  const source=await versionTwo(legacy,expected),migrated=new Store(legacy);
  assert.deepEqual(await migrated.load(),expected);
  const index=await library(legacy);assert.equal(index.storageVersion,5);assert.equal(index.directories[novel.id],'旧书名');
  const readableFiles=splitWorkspace(expected,index.directories,5);
  for(const [path,content] of readableFiles) if(path!=='library.json') assert.equal(await readFile(join(legacy,path),'utf8'),content,path);
  assert.ok(!(await readdir(join(legacy,'novels'))).includes(fileId(novel.id)));
  const checkpoint=(await readdir(join(legacy,'backups'))).find(name=>name.startsWith('before-project-names-'));
  assert.deepEqual(JSON.parse(await readFile(join(legacy,'backups',checkpoint,'store.json'),'utf8')),expected);
  assert.equal(await readFile(join(legacy,'backups',checkpoint,'library.json'),'utf8'),source.raw);
  const result=await migrated.dispatch('chapter.create',{novelId:novel.id,title:'第一章',content:'正文与人物引用必须原样保留。',requestId:'first-chapter'},actor);
  assert.ok(Object.hasOwn(expected.novels[novel.id].chapters,result.id));
  const exported=await new WorkData(migrated).export(),restore=new Store(join(root,'restored-v2'));
  await new WorkData(restore).import(exported);assert.deepEqual(await restore.load(),expected);
});

test('an interrupted version 2 directory migration resumes before reading or writing any book',async t=>{
  const {root,store}=await seed(t);await store.dispatch('novel.create',{title:'另一部书'});
  const expected=await store.load(),legacy=join(root,'interrupted-v2');await versionTwo(legacy,expected);
  const migrating=new Store(legacy),move=migrating.transaction.applyMove.bind(migrating.transaction);let count=0;
  migrating.transaction.applyMove=async operation=>{await move(operation);if(++count===1)throw new Error('目录移动后进程中断');};
  await assert.rejects(migrating.dispatch('novel.list'),/进程中断/);
  assert.equal((await library(legacy)).storageVersion,2);
  assert.ok(await stat(join(legacy,'transaction.pending.json')));
  const recovered=new Store(legacy);assert.deepEqual(await recovered.load(),expected);
  assert.equal((await library(legacy)).storageVersion,5);
  await assert.rejects(stat(join(legacy,'transaction.pending.json')),{code:'ENOENT'});
  assert.equal((await readdir(join(legacy,'backups'))).length,3,'recovery reuses the staged migrations');
});

test('interrupted rename recovers mapping, metadata and request identity as one transaction',async t=>{
  const {root,store,novel,actor,run,chapter}=await seed(t),current=await run('novel.get');
  const args={novelId:novel.id,title:'神人',expectedRevision:current.revision,requestId:'interrupted-rename'};
  store.transaction.applyEntry=async()=>{throw new Error('目录已移动，元数据尚未提交');};
  await assert.rejects(store.dispatch('novel.update',args,actor),/尚未提交/);
  assert.equal((await library(root)).directories[novel.id],'旧书名');
  assert.ok(await stat(join(root,'novels','神人','project.json')));
  const recovered=new Store(root),result=await recovered.dispatch('novel.update',args,actor);
  assert.equal(result.revision,current.revision+1);assert.equal(result.title,'神人');
  assert.equal((await recovered.dispatch('chapter.get',{novelId:novel.id,chapterId:chapter.id})).content,'修订后的正文必须原样保留。');
  assert.equal((await library(root)).directories[novel.id],'神人');
});

test('corrupt legacy records or unsafe mappings fail without moving folders or publishing a new layout',async t=>{
  const {root,store,novel,chapter}=await seed(t),expected=await store.load(),legacy=join(root,'bad-v2');await versionTwo(legacy,expected);
  const body=join(legacy,'novels',fileId(novel.id),'chapters',fileId(chapter.id)+'.json');
  const value=JSON.parse(await readFile(body,'utf8'));value.content='损坏的正文';await writeFile(body,JSON.stringify(value));
  const before=await storageSnapshot(legacy);await assert.rejects(new Store(legacy).dispatch('novel.list'),{code:'CORRUPT_STORE'});
  assert.equal(await storageSnapshot(legacy),before);assert.equal((await library(legacy)).storageVersion,2);
  const index=await library(root);index.directories[novel.id]='../外部';await writeFile(join(root,'library.json'),JSON.stringify(index));
  await assert.rejects(new Store(root).dispatch('novel.list'),{code:'CORRUPT_STORE'});
});

test('whole-workspace import preserves logical IDs and resolves local same-title folders independently',async t=>{
  const {root,store,novel}=await seed(t),backup=await new WorkData(store).export(),targetRoot=join(root,'occupied-target'),target=new Store(targetRoot);
  const local=await target.dispatch('novel.create',{title:'旧书名'});
  await target.dispatch('chapter.create',{novelId:local.id,title:'本机章节',content:'原有正文。'});
  await new WorkData(target).import(backup);
  const index=await library(targetRoot);assert.equal(index.directories[local.id],'旧书名');assert.equal(index.directories[novel.id],'旧书名（2）');
  assert.deepEqual((await target.load()).novels[novel.id],backup.payload.state.novels[novel.id]);
  await new WorkData(target).import(backup);assert.equal((await target.dispatch('novel.list')).length,2);
});
