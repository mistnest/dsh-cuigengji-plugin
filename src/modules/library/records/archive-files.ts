import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {digest, errorCode} from '../transactions/file-transaction.ts';

export interface ArchiveFile {path: string; content: string; sha256: string}
export const allowedArchivePath = (path: string) => path==='activity.json'||/^audit\/[a-f0-9]{64}\.jsonl$/.test(path)||/^before-planning-[a-f0-9]{64}\.json$/.test(path);

export async function readArchiveFiles(root: string, activityContent: string): Promise<ArchiveFile[]> {
  const result = [{path: 'activity.json', content: activityContent, sha256: digest(activityContent)}];
  for (const dir of ['', 'audit']) {
    const entries = await readdir(join(root, dir), {withFileTypes: true}).catch(error => {
      if (errorCode(error) === 'ENOENT') return [];
      throw error;
    });
    for (const entry of entries) {
      const path = dir ? dir + '/' + entry.name : entry.name;
      if (!entry.isFile() || !allowedArchivePath(path) || path === 'activity.json') continue;
      const content = await readFile(join(root, path), 'utf8');
      result.push({path, content, sha256: digest(content)});
    }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

export async function writeImportBackup(root: string, kind: 'import' | 'transfer', archive: unknown) {
  const dir = join(root, 'backups', 'before-' + kind + '-' + Date.now() + '-' + randomUUID());
  await mkdir(dir, {recursive: true, mode: 0o700});
  await writeFile(join(dir, 'workspace.json'), JSON.stringify(archive), {flag: 'wx', mode: 0o600});
  return dir;
}

/** Merge already validated portable attachments. Daily activity is committed through its annual records. */
export async function archiveFileChanges(root: string, files: ArchiveFile[]) {
  const changes = new Map<string, string | null>();
  for (const file of files) {
    if (!allowedArchivePath(file.path)) throw Object.assign(new Error('备份文件路径无效'), {code: 'INVALID_WORKSPACE_BACKUP'});
    if (file.path === 'activity.json') continue;
    const old = await readFile(join(root, file.path), 'utf8').catch(error => {
      if (errorCode(error) !== 'ENOENT') throw error;
    });
    if (old === undefined || (old !== file.content && file.content.startsWith(old))) changes.set(file.path, file.content);
  }
  return changes;
}
