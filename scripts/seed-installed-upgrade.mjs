// Create synthetic data using the OLD installed Store, not the current writer.
// Its actual split files are then upgraded by check-release-install.mjs.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [packagePath,dataRoot,expectationPath]=process.argv.slice(2);
const manifest=JSON.parse(await readFile(join(packagePath,'package.json'),'utf8'));
const fixture=JSON.parse(await readFile(new URL('../tests/fixtures/public-0.3.13/store.json',import.meta.url),'utf8'));
const storePath=join(packagePath,'runtime/core/store.js');
// The pre-split package has no compiled Store export. Its canonical aggregate
// fixture remains useful, but must not be reported as an old-version write.
if(!existsSync(storePath)){
  await writeFile(join(dataRoot,'store.json'),JSON.stringify(fixture));
  await writeFile(expectationPath,JSON.stringify(fixture));
  console.log(JSON.stringify({ok:true,oldVersion:manifest.version,storageVersion:1,seed:'legacy-aggregate-fixture'}));
  process.exit(0);
}
const {Store}=await import(pathToFileURL(storePath));
const store=new Store(resolve(dataRoot)),actor={kind:'human',sessionId:'synthetic-upgrade-author'};
for(const novel of Object.values(fixture.novels))await store.dispatch('novel.import',{backup:{format:'cuigengji',schemaVersion:1,novel}},actor);
const current=Object.values(fixture.novels).find(n=>!n.archived);
assert.ok(current);await store.dispatch('binding.set',{novelId:current.id},actor);
// An ordinary edit verifies old-version writes and history are preserved too.
const first=Object.values(current.chapters).find(c=>!c.deleted);
await store.dispatch('chapter.update',{novelId:current.id,chapterId:first.id,expectedRevision:first.revision,append:'\n旧版本保存的升级验收内容。',requestId:'old-installed-save'},actor);
await writeFile(expectationPath,JSON.stringify(await store.load()));
const storageVersion=existsSync(join(dataRoot,'library.json'))?JSON.parse(await readFile(join(dataRoot,'library.json'),'utf8')).storageVersion:1;
console.log(JSON.stringify({ok:true,oldVersion:manifest.version,storageVersion,seed:'old-installed-store'}));
