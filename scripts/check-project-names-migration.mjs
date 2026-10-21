import {mkdtemp, readFile, writeFile, mkdir, cp, readdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Store} from '../src/core/store.js';
import {WorkData} from '../src/application/backup/workspace.js';
import {fileId, bookPath, storedChapterFile, storedSettingFile, storedPageFile, STORAGE_VERSION, planningPage} from '../src/infrastructure/persistence/project-layout.ts';
import {pageManifest} from '../src/infrastructure/persistence/tree-layout.ts';

const source = process.argv[2] && resolve(process.argv[2]), apply = process.argv.includes('--apply');
const output = process.argv[3] && !process.argv[3].startsWith('--') ? resolve(process.argv[3]) : null;
if (!source) throw new Error('Usage: node scripts/check-project-names-migration.mjs <data-root> [report-directory] [--apply]');
const scratch = await mkdtemp(join(tmpdir(), 'cuigengji-project-names-'));
const sourceStore = new Store(source); let release = await sourceStore.acquire();
let target = source;
try {
  if (!apply) {
    target = join(scratch, 'copy'); await mkdir(target);
    // Copy under the source lock. Never load/migrate the live source in rehearsal mode.
    for (const entry of await readdir(source, {withFileTypes:true})) {
      if (entry.name === '.lock' || entry.name === 'backups' || entry.name.startsWith('.dead-lock-')) continue;
      await cp(join(source, entry.name), join(target, entry.name), {recursive:true, errorOnExist:true, force:false});
    }
  }
} finally {await release();}

const json = async (root, path) => JSON.parse(await readFile(join(root, path), 'utf8'));
async function fileHashes(root) {
  const files = {};
  async function walk(relative='') {
    for (const entry of await readdir(join(root, relative), {withFileTypes:true})) {
      if (!relative && (entry.name === '.lock' || entry.name === 'backups' || entry.name.startsWith('.dead-lock-'))) continue;
      if (relative === 'runtime' && entry.name === 'transactions') continue;
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files[path] = createHash('sha256').update(await readFile(join(root, path))).digest('hex');
    }
  }
  await walk(); return files;
}
const stripFiles = index => Object.fromEntries(Object.entries(index).map(([id, row]) => {
  const {file, ...value} = row; return [id, value];
}));
const store = new Store(target); release = await store.acquire();
let state, previous, current, originalRecords, renamedFiles = 0, checkpoints, indexes;
try {
  assert.ok(!(await readdir(target)).includes('transaction.pending.json'), 'Finish pending storage recovery before auditing a published layout');
  previous = await json(target, 'library.json');
  assert.ok([2, 3, 4, 5].includes(previous.storageVersion), 'Expected a partitioned project layout');
  const expected = await store.readStoredWorkspace();
  const before = await fileHashes(target);
  const oldCheckpoints = new Set(await readdir(join(target, 'backups')).catch(error => {if (error.code === 'ENOENT') return []; throw error;}));
  indexes = {};
  for (const id of Object.keys(previous.novels)) {
    const base = previous.storageVersion === 2 ? `novels/${fileId(id)}` : bookPath(id, previous.directories);
    indexes[id] = {base, chapters:await json(target, `${base}/chapters/index.json`), settings:await json(target, `${base}/settings/index.json`)};
    if ((await json(target, `${base}/project.json`)).sections.includes('planning')) indexes[id].planning = await json(target, `${base}/planning/index.json`);
  }
  state = await store.load(); current = await json(target, 'library.json');
  assert.equal(current.storageVersion, STORAGE_VERSION);
  assert.deepEqual(state, expected, 'Every logical entity and reference must survive migration');
  assert.deepEqual(state.activity, expected.activity, 'All writing records must survive migration');
  assert.deepEqual(current.novels, previous.novels); assert.deepEqual(current.metadata, previous.metadata);
  const remap = new Map(), rewritten = new Set(['library.json']), generated = new Set();
  for (const id of Object.keys(current.novels)) {
    const old = indexes[id], base = bookPath(id, current.directories);
    const chapters = await json(target, `${base}/chapters/index.json`), settings = await json(target, `${base}/settings/index.json`);
    assert.deepEqual(stripFiles(chapters), stripFiles(old.chapters));
    assert.deepEqual(stripFiles(settings), stripFiles(old.settings));
    rewritten.add(`${old.base}/chapters/index.json`); rewritten.add(`${old.base}/settings/index.json`);
    const remember = (oldPath, nextPath) => {remap.set(`${base}/${nextPath}`, `${old.base}/${oldPath}`); if (oldPath !== nextPath) renamedFiles++;};
    for (const chapterId of Object.keys(chapters)) remember(`chapters/${storedChapterFile(old.chapters[chapterId], chapterId, previous.storageVersion)}`, `chapters/${storedChapterFile(chapters[chapterId], chapterId, STORAGE_VERSION)}`);
    for (const nodeId of Object.keys(settings)) remember(`settings/entries/${storedSettingFile(old.settings[nodeId], nodeId, previous.storageVersion)}`, `settings/entries/${storedSettingFile(settings[nodeId], nodeId, STORAGE_VERSION)}`);
    if (Object.hasOwn(old, 'planning')) {
      const planning = await json(target, `${base}/planning/index.json`);
      const {pageFiles:beforeFiles,nodeFiles:beforeNodes,decorationFiles:beforeDecorations, ...beforeIndex} = old.planning || {}, {pageFiles:afterFiles,nodeFiles:afterNodes,decorationFiles:afterDecorations, ...afterIndex} = planning || {};
      assert.deepEqual(afterIndex, beforeIndex); rewritten.add(`${old.base}/planning/index.json`);
      for (const pageId of planning?.pageIds || []) {
        const oldPage = `planning/${storedPageFile(old.planning, pageId, previous.storageVersion)}`, nextPage = `planning/${storedPageFile(planning, pageId, STORAGE_VERSION)}`;
        if (previous.storageVersion >= 5) {remember(oldPage,nextPage);continue;}
        const logicalPage = planningPage(expected.novels[id].planning,pageId);
        rewritten.add(`${old.base}/${oldPage}`);generated.add(`${base}/${nextPage}`);
        assert.deepEqual(await json(target,`${base}/${nextPage}`),pageManifest(logicalPage),'Page manifests preserve edge IDs and membership');
        for (const [collection,files] of [['nodes',planning.nodeFiles],['decorations',planning.decorationFiles]]) {
          for (const [key,value] of Object.entries(logicalPage[collection])) {
            const path = `${base}/planning/${files[key]}`;generated.add(path);
            assert.deepEqual(await json(target,path),value,'Split planning bodies preserve the complete original data');
          }
        }
      }
    }
  }
  const normalized = {};
  for (let [path, hash] of Object.entries(await fileHashes(target))) {
    if (generated.has(path)) continue;
    const managed = remap.get(path);
    if (managed) path = managed;
    else for (const [id, directory] of Object.entries(current.directories)) {
      const prefix = `novels/${directory}/`;
      if (path.startsWith(prefix)) {path = indexes[id].base + '/' + path.slice(prefix.length); break;}
    }
    if (!rewritten.has(path)) normalized[path] = hash;
  }
  const original = Object.fromEntries(Object.entries(before).filter(([path]) => !rewritten.has(path)));
  assert.deepEqual(normalized, original, 'All managed bodies, histories, runtime records and extra files must keep identical bytes');
  originalRecords = Object.keys(original).length;
  const existingCheckpoints = await readdir(join(target, 'backups')).catch(error => {if (error.code === 'ENOENT') return []; throw error;});
  checkpoints = existingCheckpoints.filter(name => name.startsWith('before-project-names-') || name.startsWith('before-readable-files-') || name.startsWith('before-content-tree-'));
  // Old backups can predate later edits. Only this run's migration snapshots are compared.
  if (previous.storageVersion < STORAGE_VERSION) {
    const checkpoint = checkpoints.find(name => !oldCheckpoints.has(name) && name.startsWith('before-content-tree-'));
    assert.ok(checkpoint); assert.deepEqual(await json(target, `backups/${checkpoint}/store.json`), state);
  }
  assert.deepEqual(await store.load(), state);
} finally {await release();}
const backup = await new WorkData(store).export(), restored = new Store(join(scratch, 'restored'));
await new WorkData(restored).import(backup); const restoredState=await restored.load();assert.deepEqual(restoredState, state);assert.deepEqual(restoredState.activity,state.activity);
const report = {mode:apply ? 'applied' : 'isolated-rehearsal', source, target, fromStorageVersion:previous.storageVersion, storageVersion:STORAGE_VERSION,
  byteIdenticalOriginalRecords:originalRecords, renamedFiles, logicalDataUnchanged:true, backupRoundtrip:true,
  directories:Object.entries(current.novels).map(([id, novel]) => ({id, title:novel.title, directory:current.directories[id]})),
  beforeMigrationBackups:checkpoints.map(name => join(target, 'backups', name))};
if (output) {await mkdir(output, {recursive:true}); await writeFile(join(output, apply ? 'applied.json' : 'rehearsal.json'), JSON.stringify(report, null, 2));}
console.log(JSON.stringify(report, null, 2));
