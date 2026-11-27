/** Offline, one-time installation rename. It never opens a novel data root. */
import {createHash, randomUUID} from 'node:crypto';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {withFileLock, writeFileAtomic} from '@deepseek-ai/dsh-atomic-write';
import {PACKAGE_NAME, LEGACY_PACKAGE_NAME, renamedBundles, renamedPatch} from './package-identity.ts';
import {queryDesktopProcesses} from './desktop-processes.ts';

type FileChange = {path: string; before: string; after: string};
export interface RenameOptions {profile: string; home?: string; apply?: boolean; desktopExe?: string}
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

async function regularFile(path: string, optional = false) {
  const stat = await lstat(path).catch(error => {
    if (optional && error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return null;
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected an ordinary file: ${path}`);
  return readFile(path, 'utf8');
}

function requireStoppedDesktop(desktopExe?: string) {
  if (process.platform !== 'win32' || !desktopExe || !isAbsolute(desktopExe)) {
    throw new Error('--apply requires Windows and --desktop-exe with its absolute path');
  }
  if (queryDesktopProcesses(desktopExe).Desktop.length) {
    throw Object.assign(new Error('Save edits and exit DSH including its tray process before applying the rename'), {code: 'DSH_RUNNING'});
  }
}

export async function renameInstallation(options: RenameOptions, assertStopped = requireStoppedDesktop) {
  if (!isAbsolute(options.profile)) throw new Error('--profile must be an absolute path to the existing DSH profile');
  const profile = resolve(options.profile), manifestPath = join(profile, 'package.json');
  const stat = await lstat(profile);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Profile must be an ordinary existing directory');
  if (options.home && !isAbsolute(options.home)) throw new Error('--home must be an absolute DSH home path');
  if (options.apply) assertStopped(options.desktopExe);
  return withFileLock(manifestPath, async () => {
    if (options.apply) assertStopped(options.desktopExe);
    const before = (await regularFile(manifestPath))!;
    const manifest = JSON.parse(before);
    const bundles: unknown = manifest.dsh?.profile?.bundles;
    if (!Array.isArray(bundles) || bundles.some(name => typeof name !== 'string')) throw new Error('Existing dsh.profile.bundles is required');
    // A failed install must never turn the old working bundle off.
    const installed = JSON.parse((await regularFile(join(profile, 'node_modules', PACKAGE_NAME, 'package.json')))!);
    if (installed.name !== PACKAGE_NAME || !installed.dsh?.bundle?.patch) throw new Error('Install the verified new package with enabled:false first');
    const files: FileChange[] = [];
    const home = options.home ? resolve(options.home) : dirname(dirname(profile));
    let patchChanges = 0;
    // Profile overrides and home overrides both have priority over bundle rows.
    for (const path of [...new Set([join(profile, 'cordis.patch.yml'), join(home, 'cordis.patch.yml')])]) {
      const text = await regularFile(path, true);
      if (text === null) continue;
      const next = renamedPatch(text);
      patchChanges += next.changed;
      if (next.changed) files.push({path, before: text, after: next.text});
    }
    const nextBundles = renamedBundles(bundles);
    if (JSON.stringify(nextBundles) !== JSON.stringify(bundles)) {
      manifest.dsh.profile.bundles = nextBundles;
      // Keep dependencies and their lockfile untouched. Native removal comes
      // only after the new runtime and original data have been verified.
      files.push({path: manifestPath, before, after: JSON.stringify(manifest, null, 2) + '\n'});
    }
    const result = {ok: true, mode: options.apply ? 'apply' : 'preview', packageName: PACKAGE_NAME,
      installedVersion: installed.version, legacySelected: bundles.includes(LEGACY_PACKAGE_NAME),
      bundles: nextBundles, changedFiles: files.map(file => file.path), patchChanges, backupPath: null as string | null};
    if (!options.apply || !files.length) return result;
    const backup = join(profile, '.cuigengji-package-rename', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID());
    await mkdir(backup, {recursive: true, mode: 0o700});
    for (let index = 0; index < files.length; index++) {
      await writeFile(join(backup, `${index}.original`), files[index].before, {flag: 'wx', mode: 0o600});
    }
    await writeFile(join(backup, 'manifest.json'), JSON.stringify({version: 1, profile,
      files: files.map((file, index) => ({path: file.path, original: `${index}.original`, sha256: hash(file.before), nextSha256: hash(file.after)}))}, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    result.backupPath = backup;
    // Check every captured input before any mutation, then commit YAML first.
    // Overrides without a module-name qualifier work with either old or new
    // bundle. An interruption is recoverable by rerunning the same tool.
    for (const file of files) {
      if (await regularFile(file.path) !== file.before) throw new Error(`Configuration changed during preparation: ${file.path}`);
    }
    assertStopped(options.desktopExe);
    for (const file of files) await writeFileAtomic(file.path, file.after, {mode: 0o600});
    return result;
  }, {waitMs: 15000});
}

// pnpm's node_modules entry is a link to its virtual store. Node resolves the
// module URL to the real file, while argv retains the linked installation path.
const invokedFile = process.argv[1] ? await realpath(resolve(process.argv[1])).catch(() => null) : null;
const legacyEntry = fileURLToPath(new URL('../../../../runtime/adapters/dsh/rename-installation.js', import.meta.url));
if (invokedFile && (invokedFile === fileURLToPath(import.meta.url) || invokedFile === legacyEntry)) {
  const args = process.argv.slice(2);
  const arg = (name: string) => {const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1];};
  try {
    const profile = arg('--profile');
    if (!profile) throw new Error('Usage: rename-installation.js --profile <absolute path> [--home <DSH home>] [--apply --desktop-exe <absolute exe>]');
    const wait = Number(arg('--wait-for-exit') || 0);
    if (!Number.isFinite(wait) || wait < 0 || wait > 1800) throw new Error('--wait-for-exit must be between 0 and 1800 seconds');
    if (wait && !args.includes('--apply')) throw new Error('--wait-for-exit requires --apply');
    const deadline = Date.now() + wait * 1000;
    while (wait) {
      try {requireStoppedDesktop(arg('--desktop-exe')); break;}
      catch (error) {
        if ((error as {code?: string}).code !== 'DSH_RUNNING' || Date.now() >= deadline) throw error;
        await delay(1000);
      }
    }
    console.log(JSON.stringify(await renameInstallation({profile, home: arg('--home'), apply: args.includes('--apply'), desktopExe: arg('--desktop-exe')})));
  } catch (error) {console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;}
}
