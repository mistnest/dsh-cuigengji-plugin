// Audit npm's exact package file list before uploading a Release asset.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {packEntry} from './release-support.mjs';
const input = JSON.parse((await readFile(process.argv[2] || '.test-runtime/pack-files.json','utf8')).replace(/^\uFEFF/,''));
const manifest = JSON.parse(await readFile(process.argv[3] || new URL('../package.json',import.meta.url),'utf8'));
const entry = packEntry(input); assert.equal(entry.name,manifest.name); assert.equal(entry.version,manifest.version);
const allowed = /^(?:src\/|runtime\/|lib\/|skills\/|docs\/|README\.md$|LICENSE$|package\.json$|cordis\.patch\.yml$)/;
const blocked = /(?:^|\/)(?:\.env(?:\..*)?|node_modules|\.git|\.dsh|novel-data|test-data|backups|releases|migration|\.cuigengji-upgrade-backups)(?:\/|$)|(?:^|\/)store(?:\.pending)?\.json$|\.cuigengji\.json$/;
const files = new Set(entry.files.map(file => file.path));
for (const path of files) {assert.ok(allowed.test(path),`unapproved package path: ${path}`); assert.ok(!blocked.test(path),`private/runtime data: ${path}`); assert.ok(!/^runtime\/.*\.ts$/.test(path),`uncompiled runtime: ${path}`);}
for (const path of ['runtime/index.js','runtime/application/maintenance/upgrade.js','runtime/infrastructure/persistence/upgrade-backup.js','runtime/adapters/dsh/rename-installation.js','runtime/modules/access/dsh/desktop-processes.js','lib/client.js','skills/cuigengji-maintenance/SKILL.md','docs/agent-installation.md','docs/upgrade.md','LICENSE']) assert.ok(files.has(path),`missing release capability: ${path}`);
console.log(JSON.stringify({ok:true,version:entry.version,files:files.size,unpackedBytes:entry.unpackedSize,privateData:false,compiledRuntime:true}));
