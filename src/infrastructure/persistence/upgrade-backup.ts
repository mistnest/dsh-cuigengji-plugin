import {createReadStream} from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';
import {copyFile, lstat, mkdir, open, readdir, readFile, readlink, rename, symlink} from 'node:fs/promises';
import {dirname, join, resolve, sep} from 'node:path';
import {errorCode} from './file-transaction.ts';
import {parseJsonFile} from './json-file.ts';

export type BackupEntry = {path: string; kind: 'file'; bytes: number; sha256: string} | {path: string; kind: 'link'; target: string} | {path: string; kind: 'directory'};
export type BackupManifest = {format: 'cuigengji-upgrade-backup'; version: 1; dataRoot: string; createdAt: string; entries: BackupEntry[]};
const fail = (message: string): never => {throw Object.assign(new Error(message), {code: 'UPGRADE_BACKUP_INVALID'});};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export async function optionalJson(path: string): Promise<any> {
  try {return parseJsonFile(await readFile(path, 'utf8'), path);} catch (error) {if (errorCode(error) === 'ENOENT') return undefined; throw error;}
}
export async function exists(path: string) {
  try {await lstat(path); return true;} catch (error) {if (errorCode(error) === 'ENOENT') return false; throw error;}
}
async function barrier(path: string) {
  try {const h = await open(path, 'r'); try {await h.sync();} finally {await h.close();}}
  catch (error) {if (process.platform === 'win32' && ['EBADF','EISDIR','EINVAL','ENOSYS','ENOTSUP','EPERM'].includes(errorCode(error))) return; throw error;}
}
export async function durableJson(path: string, value: unknown) {
  await mkdir(dirname(path), {recursive: true, mode: 0o700});
  const temporary = `${path}.tmp-${randomUUID()}`, handle = await open(temporary, 'wx', 0o600);
  try {await handle.writeFile(JSON.stringify(value, null, 2)); await handle.sync();} finally {await handle.close();}
  await rename(temporary, path); await barrier(dirname(path));
}
export function backupParent(root: string) {return resolve(dirname(root), '.cuigengji-upgrade-backups', hash(resolve(root)).slice(0,16));}
export function validBackupPath(root: string, path: unknown): path is string {
  if (typeof path !== 'string') return false;
  const parent = backupParent(root), candidate = resolve(path), name = candidate.slice(parent.length + 1);
  return candidate.startsWith(parent + sep) && /^\d+-[a-f0-9-]{36}$/.test(name);
}
function childPath(root: string, path: string) {
  if (!path || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..' || part.includes(':'))) return fail('备份路径无效');
  const target = resolve(root, path); if (!target.startsWith(resolve(root) + sep)) return fail('备份路径超出目录'); return target;
}
async function fileHash(path: string) {
  const sha = createHash('sha256'); for await (const chunk of createReadStream(path)) sha.update(chunk); return sha.digest('hex');
}
function excluded(path: string) {
  return path === '.lock' || /^\.dead-lock-/.test(path) || path === 'runtime/upgrade.json' || /^runtime\/upgrade\.json\.tmp-/.test(path);
}
async function copyTree(source: string, target: string, entries: BackupEntry[], path = '') {
  const stat = await lstat(source);
  if (stat.isSymbolicLink()) {
    const link = await readlink(source); await symlink(link, target);
    entries.push({path, kind: 'link', target: link}); return;
  }
  if (stat.isDirectory()) {
    await mkdir(target, {recursive: true, mode: 0o700});
    if (path) entries.push({path, kind: 'directory'});
    for (const name of (await readdir(source)).sort()) {
      const child = path ? `${path}/${name}` : name;
      if (!excluded(child)) await copyTree(join(source, name), join(target, name), entries, child);
    }
    await barrier(target); return;
  }
  if (!stat.isFile()) return fail(`不能备份特殊文件：${path}`);
  const before = await fileHash(source); await copyFile(source, target);
  const h = await open(target, 'r+'); try {await h.sync();} finally {await h.close();}
  if (before !== await fileHash(target) || before !== await fileHash(source)) return fail(`备份期间文件发生变化：${path}`);
  entries.push({path, kind: 'file', bytes: stat.size, sha256: before});
}

/** Raw backup is outside the data root, so it cannot recursively copy itself.
 * The final manifest is published only after every payload is durable. */
export async function createUpgradeBackup(root: string, path: string): Promise<BackupManifest> {
  if (!validBackupPath(root, path)) return fail('升级备份目标无效');
  if ((await lstat(root)).isSymbolicLink()) return fail('数据根是链接目录，请确认实际数据目录后升级');
  await mkdir(path, {recursive: true, mode: 0o700});
  const entries: BackupEntry[] = [];
  await copyTree(root, join(path, 'data'), entries);
  const manifest: BackupManifest = {format: 'cuigengji-upgrade-backup', version: 1, dataRoot: resolve(root), createdAt: new Date().toISOString(), entries};
  await durableJson(join(path, 'manifest.json'), manifest);
  return manifest;
}
export async function verifyUpgradeBackup(root: string, path: string): Promise<BackupManifest> {
  if (!validBackupPath(root, path)) return fail('升级备份路径无效');
  const manifest = await optionalJson(join(path, 'manifest.json')) as BackupManifest;
  if (manifest?.format !== 'cuigengji-upgrade-backup' || manifest.version !== 1 || manifest.dataRoot !== resolve(root) || !Array.isArray(manifest.entries)) return fail('升级备份没有完整清单');
  const used = new Set<string>();
  for (const entry of manifest.entries) {
    if (!entry || used.has(entry.path)) return fail('升级备份条目重复'); used.add(entry.path);
    const target = childPath(join(path, 'data'), entry.path), stat = await lstat(target);
    if (entry.kind === 'file') {
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.bytes || await fileHash(target) !== entry.sha256) return fail(`升级备份校验失败：${entry.path}`);
    } else if (entry.kind === 'link') {
      if (!stat.isSymbolicLink() || await readlink(target) !== entry.target) return fail(`升级备份链接已变化：${entry.path}`);
    } else if (entry.kind === 'directory') {
      if (!stat.isDirectory() || stat.isSymbolicLink()) return fail(`升级备份目录无效：${entry.path}`);
    } else return fail('升级备份条目类型无效');
  }
  return manifest;
}
