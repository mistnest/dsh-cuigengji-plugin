import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Store} from '../src/core/store.js';
import {WorkData} from '../src/application/backup/workspace.js';
import {bookPath, fileId, pageKey, splitWorkspace, readableFileName, validManagedFileName, namedChapterFiles, managedFileKey} from '../src/infrastructure/persistence/project-layout.ts';
import {validManagedPath,treeChapterFiles,treePlanningFiles} from '../src/infrastructure/persistence/tree-layout.ts';
import {directorySnapshot} from '../src/domain/chapters/order.ts';
import {storageSnapshot} from './helpers/storage-snapshot.js';

const json = async path => JSON.parse(await readFile(path, 'utf8'));
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-file-names-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const store = new Store(root), actor = {kind:'human', sessionId:'file-name-author'};
  const novel = await store.dispatch('novel.create', {title:'神人 · 合成测试'}, actor);
  const run = (action, args={}) => store.dispatch(action, {novelId:novel.id, ...args}, actor);
  const chapter = await run('chapter.create', {title:'第1章 雨夜来信', content:'正文、换行和版本需要完整保留。\n\n她收到一封信。', requestId:'create-chapter'});
  await run('chapter.update', {chapterId:chapter.id, expectedRevision:1, content:'第二版正文。\n\n她打开了信。'});
  const duplicate = await run('chapter.create', {title:chapter.title, content:'同名章节不能覆盖原文。'});
  const character = await run('graph.create', {type:'character_card', name:'林序', content:'人物全文。', sources:[{chapterId:chapter.id, revision:2}]});
  const setting = await run('graph.create', {type:'world_entry', name:'雾港/码头', content:'世界设定全文。'});
  await run('edge.create', {from:character.id, to:setting.id, name:'居住', content:'人物与地点的关系。'});
  await run('binding.set', {chapterId:chapter.id});
  const plan = await run('planning.apply', {requestId:'create-plan', operations:[
    {op:'page.create', ref:'page', value:{name:'码头决战推演'}},
    {op:'node.create', ref:'main', value:{title:'等待回信', content:'主线全文。'}},
    {op:'node.create', ref:'scene', value:{pageId:'page', title:'收到警报', content:'规划全文。', chapterRefs:[{chapterId:chapter.id, revision:2}], memoryRefs:[character.id], status:'written'}},
    {op:'decoration.create', ref:'note', value:{pageId:'page', title:'未决问题', content:'是谁发出的警报？'}},
  ]});
  return {root, store, actor, novel, run, chapter, duplicate, character, setting, plan};
}
async function indexes(root, id) {
  const library = await json(join(root, 'library.json')), base = bookPath(id, library.directories);
  return {library, base, chapters:await json(join(root, base, 'chapters/index.json')), settings:await json(join(root, base, 'settings/index.json')), planning:await json(join(root, base, 'planning/index.json'))};
}
async function versionThree(root, state, directories) {
  const files = splitWorkspace(state, directories, 3);
  for (const [path, content] of files) {await mkdir(dirname(join(root, path)), {recursive:true}); await writeFile(join(root, path), content);}
  return files;
}

test('readable filenames are Windows-safe, distinct, bounded and retain collision suffixes with long Unicode titles', () => {
  const titles = ['CON', 'NUL.txt', 'LPT¹', '码头/决战:第?一*部. ', '..', '😀'.repeat(200), 'ABC', 'abc'];
  const names = titles.map((title, i) => readableFileName(title, 'id-' + i));
  assert.ok(names.every(validManagedPath)); assert.ok(names.every(name => name.length <= 120));
  assert.ok(names.every(name => !name.includes('\ufffd'))); assert.ok(names[0].startsWith('条目_CON--'));
  assert.ok(names[3].startsWith('码头_决战_第_一_部--')); assert.ok(names[4].startsWith('未命名--'));
  assert.equal(new Set(names.map(managedFileKey)).size, titles.length);
  const title = '😀'.repeat(200), original = readableFileName(title, 'long-id', '未命名章节');
  const duplicate = namedChapterFiles({'long-id':{title}}, {}, [original])['long-id'];
  assert.ok(duplicate.includes('（2）--')); assert.ok(duplicate.length <= 120); assert.notEqual(duplicate, original);
  assert.equal(validManagedFileName('../章节--12345678.json'), false);
  assert.equal(validManagedFileName('index.json'), false);
  const chapter={chapters:{'long-id':{title}}},first=treeChapterFiles(chapter)['long-id'];
  const collided=treeChapterFiles(chapter,{},[first])['long-id'];
  assert.ok(validManagedPath(collided));assert.ok(collided.includes('（2）--'));assert.ok(!collided.includes('\ufffd'));
});

test('v3 migration changes managed names and indexes only, preserving all record bytes, IDs, references and extra files', async t => {
  const {root, store, novel, actor, chapter, character, plan} = await fixture(t), expected = await store.load();
  const directories = (await indexes(root, novel.id)).library.directories, legacy = join(root, 'v3');
  const original = await versionThree(legacy, expected, directories), base = bookPath(novel.id, directories);
  const occupied = treeChapterFiles(expected.novels[novel.id])[chapter.id];
  await mkdir(dirname(join(legacy, base, 'chapters', occupied)),{recursive:true});
  await writeFile(join(legacy, base, 'chapters', occupied), '作者自己的同名文件');
  await writeFile(join(legacy, base, 'notes.txt'), '作者额外摘录');
  const migrated = new Store(legacy); assert.deepEqual(await migrated.load(), expected);
  const index = await indexes(legacy, novel.id); assert.equal(index.library.storageVersion, 5);
  assert.ok(index.chapters[chapter.id].file.includes('（2）--'));
  for (const [path, content] of original) {
    if (path === 'library.json' || /\/(chapters|settings|planning)\/index\.json$/.test(path)) continue;
    let destination = path;
    for (const id of Object.keys(index.chapters)) if (path === `${base}/chapters/${fileId(id)}.json`) destination = `${base}/chapters/${index.chapters[id].file}`;
    for (const id of Object.keys(index.settings)) if (path === `${base}/settings/entries/${fileId(id)}.json`) destination = `${base}/settings/entries/${index.settings[id].file}`;
    let splitPage=false;
    for (const id of index.planning.pageIds) if (path === `${base}/planning/${pageKey(id)}.json`) {
      const old=JSON.parse(content),manifest=await json(join(legacy,base,'planning',index.planning.pageFiles[pageKey(id)]));
      assert.deepEqual(manifest.nodeIds,Object.keys(old.nodes));assert.deepEqual(manifest.decorationIds,Object.keys(old.decorations));assert.deepEqual(manifest.edges,old.edges);
      for(const [key,row] of Object.entries(old.nodes))assert.deepEqual(await json(join(legacy,base,'planning',index.planning.nodeFiles[key])),row);
      for(const [key,row] of Object.entries(old.decorations))assert.deepEqual(await json(join(legacy,base,'planning',index.planning.decorationFiles[key])),row);
      splitPage=true;
    }
    if(splitPage){await assert.rejects(stat(join(legacy,path)),{code:'ENOENT'});continue;}
    assert.equal(await readFile(join(legacy, destination), 'utf8'), content, destination);
    if (destination !== path) await assert.rejects(stat(join(legacy, path)), {code:'ENOENT'});
  }
  assert.equal(await readFile(join(legacy, base, 'chapters', occupied), 'utf8'), '作者自己的同名文件');
  assert.equal(await readFile(join(legacy, base, 'notes.txt'), 'utf8'), '作者额外摘录');
  const checkpoints = (await readdir(join(legacy, 'backups'))).filter(name => name.startsWith('before-readable-files-'));
  assert.equal(checkpoints.length, 1);
  assert.deepEqual(await json(join(legacy, 'backups', checkpoints[0], 'store.json')), expected);
  assert.equal(await readFile(join(legacy, 'backups', checkpoints[0], 'library.json'), 'utf8'), original.get('library.json'));
  assert.equal((await migrated.dispatch('chapter.create', {novelId:novel.id, title:chapter.title, content:'正文、换行和版本需要完整保留。\n\n她收到一封信。', requestId:'create-chapter'}, actor)).id, chapter.id);
  assert.equal((await migrated.dispatch('planning.get', {novelId:novel.id, nodeId:plan.mapping.scene})).node.memoryRefs[0], character.id);
  const portable = await new WorkData(migrated).export(), restored = new Store(join(root, 'restored'));
  await new WorkData(restored).import(portable); assert.deepEqual(await restored.load(), expected);
  assert.equal((await new WorkData(migrated).status()).storageVersion, 5);
});

test('chapter and setting renames remove old managed files, preserve historical references, and restore the original chapter title', async t => {
  const {root, store, novel, run, chapter, duplicate, character, plan} = await fixture(t), before = await indexes(root, novel.id);
  const originalHistory = await readFile(join(root, before.base, 'history/chapters', `${fileId(chapter.id)}.json`), 'utf8');
  const occupied = treeChapterFiles({chapters:{[chapter.id]:{...chapter,title:'第2章 新标题'}}})[chapter.id];
  await mkdir(dirname(join(root,before.base,'chapters',occupied)),{recursive:true});
  await writeFile(join(root, before.base, 'chapters', occupied), '请勿覆盖的文件');
  await run('chapter.update', {chapterId:chapter.id, expectedRevision:2, title:'第2章 新标题', requestId:'rename-chapter'});
  await run('graph.update', {nodeId:character.id, expectedRevision:(await run('graph.get', {nodeId:character.id})).revision, name:'林序:船长'});
  const after = await indexes(root, novel.id);
  assert.ok(after.chapters[chapter.id].file.includes('（2）--')); assert.ok(after.settings[character.id].file.includes('/林序_船长--'));
  assert.equal(await readFile(join(root, after.base, 'chapters', occupied), 'utf8'), '请勿覆盖的文件');
  await assert.rejects(stat(join(root, before.base, 'chapters', before.chapters[chapter.id].file)), {code:'ENOENT'});
  await assert.rejects(stat(join(root, before.base, 'settings/entries', before.settings[character.id].file)), {code:'ENOENT'});
  assert.equal(after.chapters[duplicate.id].file, before.chapters[duplicate.id].file);
  assert.equal((await run('graph.get', {nodeId:character.id})).content, '人物全文。');
  assert.equal((await run('planning.get', {nodeId:plan.mapping.scene})).node.chapterRefs[0].revision, 2);
  const history = await json(join(root, before.base, 'history/chapters', `${fileId(chapter.id)}.json`)); assert.deepEqual(history.slice(0, 2), JSON.parse(originalHistory));
  await run('chapter.restore', {chapterId:chapter.id, expectedRevision:3, targetRevision:2});
  assert.equal((await run('chapter.get', {chapterId:chapter.id})).title, chapter.title);
  const restored = await indexes(root, novel.id); assert.equal(restored.chapters[chapter.id].file, before.chapters[chapter.id].file);
  await assert.rejects(stat(join(root, after.base, 'chapters', after.chapters[chapter.id].file)), {code:'ENOENT'});
  const state = await store.load(), filesBeforeMove = {...restored.chapters};
  await run('chapter.move', {chapterId:duplicate.id, beforeChapterId:chapter.id, expectedDirectory:directorySnapshot(Object.values(state.novels[novel.id].chapters), Object.values(state.novels[novel.id].volumes || {})), requestId:'move-chapter'});
  const moved = await indexes(root, novel.id);
  for (const id of Object.keys(filesBeforeMove)) assert.equal(moved.chapters[id].file, filesBeforeMove[id].file, 'reordering does not rename chapters');
});

test('renaming an unread planning page preserves every node and annotation body and reserves unowned destinations', async t => {
  const {root,store,novel,run,plan} = await fixture(t), before = await indexes(root, novel.id), pageId = plan.mapping.page;
  const oldFile = before.planning.pageFiles[pageKey(pageId)], mainFile = before.planning.pageFiles[pageKey(null)];
  const mainBytes = await readFile(join(root, before.base, 'planning', mainFile), 'utf8');
  const board=(await store.load()).novels[novel.id].planning;
  board.pages[pageId].name='决战沙盘';
  const occupied=treePlanningFiles(board).pageFiles[pageKey(pageId)];
  await mkdir(dirname(join(root,before.base,'planning',occupied)),{recursive:true});
  await writeFile(join(root, before.base, 'planning', occupied), '自存推演');
  const renamed = await run('planning.page.update', {pageId, expectedRevision:1, name:'决战沙盘', requestId:'rename-page'});
  assert.equal(renamed.id, pageId); const after = await indexes(root, novel.id);
  assert.ok(after.planning.pageFiles[pageKey(pageId)].includes('（2）--'));
  await assert.rejects(stat(join(root, before.base, 'planning', oldFile)), {code:'ENOENT'});
  assert.equal(await readFile(join(root, before.base, 'planning', occupied), 'utf8'), '自存推演');
  assert.equal((await run('planning.get', {nodeId:plan.mapping.scene})).node.content, '规划全文。');
  assert.equal((await run('planning.decorations', {pageId})).items[0].content, '是谁发出的警报？');
  assert.equal(await readFile(join(root, before.base, 'planning', mainFile), 'utf8'), mainBytes);
});

test('interrupted migration after deleting a legacy filename resumes with the complete workspace and exactly one checkpoint', async t => {
  const {root, store, novel} = await fixture(t), expected = await store.load(), legacy = join(root, 'interrupted-v3');
  await versionThree(legacy, expected, (await indexes(root, novel.id)).library.directories);
  const migrating = new Store(legacy), apply = migrating.transaction.applyEntry.bind(migrating.transaction);
  migrating.transaction.applyEntry = async (entry, content) => {await apply(entry, content); if (content === null) throw new Error('删除旧文件后中断');};
  await assert.rejects(migrating.dispatch('novel.list'), /中断/);
  assert.equal((await json(join(legacy, 'library.json'))).storageVersion, 3);
  assert.ok(await stat(join(legacy, 'transaction.pending.json')));
  const recovered = new Store(legacy); assert.deepEqual(await recovered.load(), expected);
  assert.equal((await json(join(legacy, 'library.json'))).storageVersion, 5);
  await assert.rejects(stat(join(legacy, 'transaction.pending.json')), {code:'ENOENT'});
  assert.equal((await readdir(join(legacy, 'backups'))).filter(name => name.startsWith('before-readable-files-')).length, 1);
});

test('interrupted chapter rename recovers the new name, content, history and cached result together', async t => {
  const {root, store, novel, actor, chapter} = await fixture(t), before = await indexes(root, novel.id);
  const args = {novelId:novel.id, chapterId:chapter.id, title:'改名后的章节', content:'改名同时更新的正文。', expectedRevision:2, requestId:'interrupted-rename'};
  const apply = store.transaction.applyEntry.bind(store.transaction);
  store.transaction.applyEntry = async (entry, content) => {await apply(entry, content); if (content === null) throw new Error('改名提交中断');};
  await assert.rejects(store.dispatch('chapter.update', args, actor), /中断/);
  const recovered = new Store(root), result = await recovered.dispatch('chapter.update', args, actor);
  assert.equal(result.revision, 3); assert.equal(result.id, chapter.id);
  const body = await recovered.dispatch('chapter.get', {novelId:novel.id, chapterId:chapter.id}); assert.equal(body.content, args.content);
  assert.equal((await recovered.dispatch('chapter.history', {novelId:novel.id, chapterId:chapter.id})).length, 3);
  await assert.rejects(stat(join(root, before.base, 'chapters', before.chapters[chapter.id].file)), {code:'ENOENT'});
});

test('invalid or duplicate readable mappings and corrupt v3 records fail before writing any novel file', async t => {
  const {root, store, novel, chapter, duplicate} = await fixture(t), index = await indexes(root, novel.id), legacy = join(root, 'bad-v3');
  const expected = await store.load(); await versionThree(legacy, expected, index.library.directories);
  await writeFile(join(legacy, index.base, 'chapters', `${fileId(chapter.id)}.json`), '{}');
  const beforeLegacy = await storageSnapshot(legacy);
  await assert.rejects(new Store(legacy).dispatch('novel.list'), {code:'CORRUPT_STORE'});
  assert.equal(await storageSnapshot(legacy), beforeLegacy); await assert.rejects(stat(join(legacy, 'backups')), {code:'ENOENT'});
  const path = join(root, index.base, 'chapters/index.json');
  for (const file of ['../outside--12345678.json', 'index.json', index.chapters[duplicate.id].file]) {
    index.chapters[chapter.id].file = file; await writeFile(path, JSON.stringify(index.chapters));
    const before = await storageSnapshot(root);
    await assert.rejects(new Store(root).dispatch('chapter.list', {novelId:novel.id}), {code:'CORRUPT_STORE'});
    assert.equal(await storageSnapshot(root), before);
  }
});

test('single-book exports omit physical filenames and imports regenerate readable paths without changing IDs', async t => {
  const {root, store, novel, run, chapter, character, plan} = await fixture(t), backup = await run('novel.export');
  assert.ok(!Object.hasOwn(backup.novel.chapters[chapter.id], 'file')); assert.ok(!Object.hasOwn(backup.novel.nodes[character.id], 'file'));
  assert.ok(!Object.hasOwn(backup.novel.planning, 'pageFiles'));
  const target = join(root, 'imported'), restored = new Store(target); await restored.dispatch('novel.import', {backup});
  assert.deepEqual((await restored.load()).novels[novel.id], (await store.load()).novels[novel.id]);
  const index = await indexes(target, novel.id);
  assert.ok(index.chapters[chapter.id].file.includes('/第1章 雨夜来信--'));
  assert.ok(index.settings[character.id].file.includes('/林序--'));
  assert.ok(index.planning.pageFiles[pageKey(plan.mapping.page)].startsWith('码头决战推演--'));
  assert.ok(index.planning.pageFiles[pageKey(null)].startsWith('主线总览--main/画布--'));
});

test('case and sanitized-equivalent renames keep valid filenames and repeated metadata saves do not rename collision paths again', async t => {
  const {root, novel, run, chapter, character, plan} = await fixture(t);
  let c = await run('chapter.update', {chapterId:chapter.id, expectedRevision:2, title:'A/B'});
  c = await run('chapter.update', {chapterId:chapter.id, expectedRevision:c.revision, title:'a:b'});
  let n = await run('graph.update', {nodeId:character.id, expectedRevision:(await run('graph.get', {nodeId:character.id})).revision, name:'A/B'});
  n = await run('graph.update', {nodeId:character.id, expectedRevision:n.revision, name:'a:b'});
  let p = await run('planning.page.update', {pageId:plan.mapping.page, expectedRevision:1, name:'A/B', requestId:'case-page-first'});
  p = await run('planning.page.update', {pageId:p.id, expectedRevision:p.revision, name:'a:b', requestId:'case-page-second'});
  const before = await indexes(root, novel.id);
  assert.ok(Object.values(before.chapters).every(row => validManagedPath(row.file)));
  assert.ok(Object.values(before.settings).every(row => validManagedPath(row.file)));
  assert.ok(Object.values(before.planning.pageFiles).every(validManagedPath));
  await run('chapter.update', {chapterId:chapter.id, expectedRevision:c.revision, content:'改名后的正文继续写。'});
  await run('graph.update', {nodeId:character.id, expectedRevision:n.revision, summary:'摘要更新'});
  await run('planning.page.update', {pageId:p.id, expectedRevision:p.revision, summary:'页面摘要更新', requestId:'case-page-summary'});
  const after = await indexes(root, novel.id);
  assert.equal(after.chapters[chapter.id].file, before.chapters[chapter.id].file);
  assert.equal(after.settings[character.id].file, before.settings[character.id].file);
  assert.deepEqual(after.planning.pageFiles, before.planning.pageFiles);
  assert.equal((await run('graph.get', {nodeId:character.id})).content, '人物全文。');
  assert.equal((await run('planning.get', {nodeId:plan.mapping.scene})).node.content, '规划全文。');
});

test('legacy deleted planning records retain their body when their historical page metadata is absent', async t => {
  const {root, store, novel, plan} = await fixture(t), expected = await store.load();
  const board = expected.novels[novel.id].planning;
  delete board.pages[plan.mapping.page];
  board.nodes[plan.mapping.scene].deleted = true; board.decorations[plan.mapping.note].deleted = true;
  const legacy = join(root, 'deleted-legacy-page');
  await versionThree(legacy, expected, (await indexes(root, novel.id)).library.directories);
  const migrated = new Store(legacy); assert.deepEqual(await migrated.load(), expected);
  const index = await indexes(legacy, novel.id);
  assert.ok(validManagedPath(index.planning.pageFiles[pageKey(plan.mapping.page)]));
  assert.equal((await migrated.dispatch('planning.get', {novelId:novel.id, nodeId:plan.mapping.scene})).node.content, '规划全文。');
  assert.deepEqual((await new WorkData(migrated).export()).payload.state, expected);
});

test('volume and group renames relocate their nested files without dropping unread content or history', async t => {
  const {root,novel,run,chapter,character,plan}=await fixture(t);
  const volume=await run('volume.create',{title:'旧卷名'});
  await run('chapter.update',{chapterId:chapter.id,expectedRevision:2,volumeId:volume.id});
  const memoryGroup=await run('graph.group.create',{name:'旧人物组'}),card=await run('graph.get',{nodeId:character.id});
  await run('graph.move',{groupId:memoryGroup.id,members:[{id:card.id,expectedRevision:card.revision}]});
  const planningGroup=await run('planning.group.create',{name:'旧情节组',pageId:plan.mapping.page,requestId:'new-group'}),scene=(await run('planning.get',{nodeId:plan.mapping.scene})).node;
  await run('planning.apply',{requestId:'move-to-group',operations:[{op:'node.update',id:scene.id,expectedRevision:scene.revision,value:{groupId:planningGroup.id}}]});
  const before=await indexes(root,novel.id);
  const bodyPaths=[`chapters/${before.chapters[chapter.id].file}`,`settings/entries/${before.settings[character.id].file}`,`planning/${before.planning.nodeFiles[scene.id]}`];
  const originalBytes=Object.fromEntries(await Promise.all(bodyPaths.map(async path=>[path,await readFile(join(root,before.base,path),'utf8')])));
  await run('volume.update',{volumeId:volume.id,expectedRevision:volume.revision,title:'新卷名'});
  await run('graph.group.update',{groupId:memoryGroup.id,expectedRevision:memoryGroup.revision,name:'新人物组'});
  await run('planning.group.update',{groupId:planningGroup.id,expectedRevision:planningGroup.revision,name:'新情节组',requestId:'rename-group'});
  const after=await indexes(root,novel.id);
  for(const [oldFile,newFile,label] of [
    [`chapters/${before.chapters[chapter.id].file}`,`chapters/${after.chapters[chapter.id].file}`,'新卷名'],
    [`settings/entries/${before.settings[character.id].file}`,`settings/entries/${after.settings[character.id].file}`,'新人物组'],
    [`planning/${before.planning.nodeFiles[scene.id]}`,`planning/${after.planning.nodeFiles[scene.id]}`,'新情节组'],
  ]){assert.ok(newFile.includes(label));assert.equal(await readFile(join(root,after.base,newFile),'utf8'),originalBytes[oldFile]);await assert.rejects(stat(join(root,before.base,oldFile)),{code:'ENOENT'});}
  assert.equal((await run('chapter.get',{chapterId:chapter.id})).content,'第二版正文。\n\n她打开了信。');
  assert.equal((await run('graph.get',{nodeId:character.id})).content,'人物全文。');
  assert.equal((await run('planning.get',{nodeId:scene.id})).node.content,'规划全文。');
  assert.ok((await run('chapter.history',{chapterId:chapter.id})).length>=2);
});

test('v4 tree migration recovers after a deleted source file and audit verifies old layouts without changing the source', async t => {
  const {root,store,novel}=await fixture(t),expected=await store.load(),directories=(await indexes(root,novel.id)).library.directories;
  for(const version of [3,4,5]){
    const source=join(root,`audit-v${version}`);
    for(const [path,content] of splitWorkspace(expected,directories,version)){await mkdir(dirname(join(source,path)),{recursive:true});await writeFile(join(source,path),content);}
    await writeFile(join(source,bookPath(novel.id,directories),'作者笔记.txt'),'额外资料保持原样');
    const before=await storageSnapshot(source);
    const {stdout}=await promisify(execFile)(process.execPath,['scripts/check-project-names-migration.mjs',source],{cwd:join(import.meta.dirname,'..'),timeout:60000});
    const report=JSON.parse(stdout);assert.equal(report.storageVersion,5);assert.equal(report.logicalDataUnchanged,true);assert.equal(report.backupRoundtrip,true);
    assert.equal(await storageSnapshot(source),before,'Rehearsal must not migrate the source');
    assert.equal(await readFile(join(source,bookPath(novel.id,directories),'作者笔记.txt'),'utf8'),'额外资料保持原样');
  }
  const source=join(root,'interrupted-v4');
  for(const [path,content] of splitWorkspace(expected,directories,4)){await mkdir(dirname(join(source,path)),{recursive:true});await writeFile(join(source,path),content);}
  const migrating=new Store(source),apply=migrating.transaction.applyEntry.bind(migrating.transaction);
  migrating.transaction.applyEntry=async(entry,content)=>{await apply(entry,content);if(content===null)throw Error('目录迁移中断');};
  await assert.rejects(migrating.dispatch('novel.list'),/目录迁移中断/);
  const recovered=new Store(source);assert.deepEqual(await recovered.load(),expected);assert.deepEqual((await recovered.load()).activity,expected.activity);
  assert.equal((await readdir(join(source,'backups'))).filter(name=>name.startsWith('before-content-tree-')).length,1);
  await assert.rejects(stat(join(source,'transaction.pending.json')),{code:'ENOENT'});
});
