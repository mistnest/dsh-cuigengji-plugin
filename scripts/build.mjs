import {checkModuleBoundaries} from './check-module-boundaries.mjs';
import { compatibilityEntries } from './compat-entries.mjs';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (typeof manifest.name !== 'string' || !manifest.name) throw new Error('package.json must define a non-empty name');
// Git and tarball installs consume the committed JavaScript. They must not
// compile on the user's machine or require pnpm build-script approval.
for (const hook of ['prepare', 'prepack', 'postpack', 'prepublish', 'prepublishOnly', 'publish', 'preinstall', 'install', 'postinstall']) {
  assert.ok(!manifest.scripts?.[hook], `Installation lifecycle hook is not allowed: ${hook}. Use npm run pack:release.`);
}
const loaderId = JSON.stringify(manifest.name);

// Ship JavaScript: Node deliberately does not strip TypeScript inside node_modules.
const serverFiles = (await readdir(join(root, 'src'), {recursive:true})).map(file => file.split(sep).join('/')).filter(file => !file.startsWith('modules/author-ui/workbench/') && /\.[jt]s$/.test(file)).sort();
const server = await build({
  absWorkingDir:root, write:false, metafile:check,
  entryPoints: serverFiles.map(file => `src/${file}`), outbase:'src', outdir:'runtime',
  platform:'node', format:'esm', target:'node24', bundle:false,
  plugins:[{name:'typescript-imports',setup(builder){builder.onLoad({filter:/\.[jt]s$/},async args=>({
    contents:(await readFile(args.path,'utf8')).replace(/(from\s*['"]|import\s*['"]|new URL\(\s*['"])(\.[^'"]+)\.ts(['"])/g,'$1$2.js$3'),loader:args.path.endsWith('.ts')?'ts':'js',
  }));}}],
});

const client = await build({
  absWorkingDir:root, write:false, metafile:check,
  entryPoints: ['src/modules/author-ui/workbench/index.tsx'], outfile: 'lib/client.js', bundle: true,
  platform: 'browser', format: 'cjs', target: 'es2022', jsx: 'automatic',
  loader: {'.png': 'dataurl'},
  external: ['react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/*'],
  banner: { js: `window.__ModuleLoader__.load({id:${loaderId},factory:(require)=>{var module={exports:{}};var exports=module.exports;` },
  footer: { js: 'return module.exports;}});' },
});

const emittedPaths = new Set(server.outputFiles.map(file => resolve(file.path)));
const forwarders = Object.entries(compatibilityEntries).map(([alias, target]) => {
  assert.ok(emittedPaths.has(resolve(root, 'runtime', target)), 'Missing compatibility target: ' + target);
  const destination = './' + posix.relative(posix.dirname(alias), target);
  const lines = [];
  if (alias === 'adapters/mcp/external-server.js') lines.push('#!/usr/bin/env node');
  lines.push(`export * from ${JSON.stringify(destination)};`);
  if (target === 'composition/store.js') lines.push(`export { default } from ${JSON.stringify(destination)};`);
  return {path: resolve(root, 'runtime', alias), contents: Buffer.from(lines.join('\n') + '\n')};
});
const runtimeOutputs = [...server.outputFiles, ...forwarders];
const outputs = [...runtimeOutputs, ...client.outputFiles];
if (check) {
  checkModuleBoundaries(server.metafile, client.metafile);
  for (const output of outputs) {
    const current = await readFile(output.path).catch(() => null);
    assert.ok(current && current.equals(Buffer.from(output.contents)), `Generated file is missing or stale: ${relative(root, output.path)}. Run npm run build and commit the outputs.`);
  }
  const expected = new Set(runtimeOutputs.map(file => resolve(file.path)));
  for (const file of await readdir(join(root, 'runtime'), {recursive:true})) {
    if (/\.js$/.test(file)) assert.ok(expected.has(resolve(root, 'runtime', file)), `Obsolete generated file: runtime/${file}`);
  }
  console.log(`Verified ${outputs.length} committed installation files; no installation build hooks.`);
} else {
  const serverOutput = resolve(root, 'runtime');
  assert.equal(relative(root, serverOutput), 'runtime', 'Only the project runtime output may be replaced');
  await rm(serverOutput, {recursive:true, force:true});
  for (const output of outputs) {
    await mkdir(dirname(output.path), {recursive:true});
    await writeFile(output.path, output.contents);
  }
  console.log(`Built ${outputs.length} installation files in runtime/ and lib/.`);
}
