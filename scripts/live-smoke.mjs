import { readFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

// Read-only installation check. RPC connectivity is checked by test:rpc.
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const home = process.env.DSH_HOME || join(homedir(), '.dsh');
const profile = join(home, 'profiles', 'desktop');
const config = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'));
assert.ok(config.dsh?.profile?.bundles?.includes('dsh-cuigengji'), 'desktop bundle is not enabled');
const installedRoot = join(profile, 'node_modules', 'dsh-cuigengji');
const installed = JSON.parse(await readFile(join(installedRoot, 'package.json'), 'utf8'));
assert.equal(installed.version, manifest.version, 'installed package needs updating');
assert.equal(installed.engines.dsh, manifest.engines.dsh, 'DSH compatibility target differs');
await access(join(installedRoot, installed.main));
await access(join(installedRoot, 'lib', 'client.js'));
console.log(JSON.stringify({ ok: true, check: 'installed-files', pluginVersion: installed.version,
  supportedDsh: installed.engines.dsh, profile: 'desktop', dshHome: home }));
