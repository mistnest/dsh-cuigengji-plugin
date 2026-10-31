// Invoked through the desktop's Node runtime. Exercise the official metadata
// reader against an installed package, including the raw-icon size policy.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const profile=resolve(process.argv[2]),name='dsh-cuigengji-plugin';
const anchor=process.argv[3] || join(dirname(process.execPath),'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh/package.json');
const requireDesktop=createRequire(anchor);
const {readPluginMeta,evaluatePluginCompatibility}=await import(pathToFileURL(requireDesktop.resolve('@deepseek-ai/dsh-app-boot')));
const parentURL=pathToFileURL(join(profile,'package.json')).href;
const manifest=JSON.parse(readFileSync(join(profile,'node_modules',name,'package.json'),'utf8'));
const runtime=JSON.parse(readFileSync(anchor,'utf8')).version;
const metadata=readPluginMeta(name,parentURL),bytes=readFileSync(join(profile,'node_modules',name,manifest.icon));
assert.equal(metadata?.error,undefined,metadata?.error);
assert.equal(metadata?.icon,'data:image/png;base64,'+bytes.toString('base64'));
assert.ok(bytes.length<=256*1024);
assert.equal(evaluatePluginCompatibility(manifest,{},runtime),undefined);
console.log(JSON.stringify({ok:true,version:manifest.version,host:runtime,iconBytes:bytes.length,iconFromInstalledPackage:true}));
