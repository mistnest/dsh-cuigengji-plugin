import { readFile, writeFile, mkdir, mkdtemp, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Store } from '../src/composition/store.ts';
import { WorkData } from '../src/modules/library/archives/workspace-archive.ts';

const source = resolve(process.argv[2] || ''), reportDirectory = process.argv[3] && resolve(process.argv[3]);
if (!process.argv[2]) throw new Error('Usage: node scripts/check-storage-migration.mjs <legacy-store.json> [report-directory]');
const raw = await readFile(source, 'utf8'), expected = JSON.parse(raw);
// Rehearsal never opens the user's live directory through the new Store.
const isolated = await mkdtemp(join(tmpdir(), 'cuigengji-migration-rehearsal-'));
await writeFile(join(isolated, 'store.json'), raw);
const migrated = new Store(isolated);
await migrated.dispatch('novel.list');
assert.deepEqual(await migrated.load(), expected);
assert.equal(await readFile(join(isolated, 'store.json'), 'utf8'), raw);
const backup = await new WorkData(migrated).export(), restored = new Store(join(isolated, 'restored'));
await new WorkData(restored).import(backup);
assert.deepEqual(await restored.load(), expected);
const library = JSON.parse(await readFile(join(isolated, 'library.json'), 'utf8'));
const report = { source, sourceSha256:createHash('sha256').update(raw).digest('hex'), isolated,
  storageVersion:library.storageVersion, exactLogicalMatch:true, backupRoundtrip:true,
  books:Object.values(expected.novels).map(novel=>({id:novel.id,title:novel.title,chapters:Object.keys(novel.chapters).length,
    chapterVersions:Object.values(novel.chapters).reduce((sum,chapter)=>sum+chapter.versions.length,0),
    settings:Object.keys(novel.nodes).length,relations:Object.keys(novel.edges).length,
    planningPages:Object.keys(novel.planning?.pages||{}).length+1,planningNodes:Object.keys(novel.planning?.nodes||{}).length,
    planningTransactions:novel.planning?.transactions?.length||0,preset:!!novel.preset})),
  bindings:Object.keys(expected.bindings).length,requests:Object.keys(expected.requests).length,
  migrationBackups:await readdir(join(isolated,'backups')) };
if (reportDirectory) {await mkdir(reportDirectory,{recursive:true});await writeFile(join(reportDirectory,'rehearsal.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
