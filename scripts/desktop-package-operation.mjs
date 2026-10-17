// Runs inside Electron's Node mode, using this desktop's own package manager.
// Both generations are supported; no global CLI or compatibility exemptions.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const {context,args,options}=JSON.parse(process.argv[2]);
const resources=join(dirname(process.execPath),'resources');
const anchor=join(resources,'app.asar/dsh/node_modules/@deepseek-ai/dsh/package.json');
const requireDesktop=createRequire(anchor);
const {runPluginCommand}=await import(pathToFileURL(requireDesktop.resolve('@deepseek-ai/dsh-plugin-manager/operations')));
const candidates=['runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs','runtime/pnpm/bin/pnpm.mjs'];
const pnpm=candidates.map(path=>join(resources,path)).find(existsSync);
assert.ok(pnpm,'Desktop package manager was not found');
const runtimeVersion=JSON.parse(readFileSync(anchor,'utf8')).version;
const result=await runPluginCommand({...context,installAnchor:anchor},args,{
  ...options,command:process.execPath,args:['--expose-internals',pnpm],env:process.env,
});
console.log(JSON.stringify({...result,runtimeVersion}));
