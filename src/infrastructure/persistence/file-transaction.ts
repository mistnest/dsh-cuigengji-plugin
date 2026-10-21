import { mkdir, readFile, rename, unlink, rm, open, readdir, lstat } from 'node:fs/promises';
import { resolve, join, dirname, basename, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {directoryKey, validProjectDirectory, type ProjectDirectoryMove} from './project-directories.ts';

type Entry = { path: string; stage: string | null; sha256: string | null };
export type ProjectDirectoryRemoval = {path: string; novelId: string};
type Journal = { version: 1 | 2 | 3; id: string; entries: Entry[]; moves?: ProjectDirectoryMove[]; removals?: ProjectDirectoryRemoval[] };
export type FileChanges = Map<string, string | null>;
export const digest = (text: string) => createHash('sha256').update(text).digest('hex');
export const errorCode = (error: unknown) => error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
const corrupt = (message: string): never => { throw Object.assign(new Error(message), { code: 'CORRUPT_STORE' }); };

/** Readers and writers share the Store lock. A durable journal makes a batch
 * recoverable before any reader can observe it, including after a process crash. */
export class FileTransaction {
  readonly root: string;
  readonly journal: string;
  constructor(root: string) {
    this.root = resolve(root);
    this.journal = join(this.root, 'transaction.pending.json');
  }

  private path(relative: string) {
    if (!relative || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..' || part.includes(':'))) corrupt('事务文件路径无效');
    const target = resolve(this.root, relative);
    if (!target.startsWith(this.root + sep)) corrupt('事务路径超出小说数据目录');
    return target;
  }

  private async barrier(directory: string) {
    try {
      const handle = await open(directory, 'r');
      try { await handle.sync(); } finally { await handle.close(); }
    } catch (error) {
      if (process.platform === 'win32' && ['EBADF', 'EISDIR', 'EINVAL', 'ENOSYS', 'ENOTSUP', 'EPERM'].includes(errorCode(error))) return;
      throw error;
    }
  }

  private async write(target: string, content: string) {
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    const temporary = join(dirname(target), `.${basename(target)}.stage-${randomUUID()}`);
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, target);
    await this.barrier(dirname(target));
  }

  protected async applyEntry(entry: Entry, content: string | null) {
    const target = this.path(entry.path);
    if (content === null) {
      await unlink(target).catch(error => { if (errorCode(error) !== 'ENOENT') throw error; });
      await this.barrier(dirname(target));
      return;
    }
    try { if (digest(await readFile(target, 'utf8')) === entry.sha256) return; }
    catch (error) { if (errorCode(error) !== 'ENOENT') throw error; }
    await this.write(target, content);
  }

  private async directoryExists(relative: string, novelId: string) {
    try {
      const info = await lstat(this.path(relative));
      if (!info.isDirectory() || info.isSymbolicLink()) corrupt('作品目录不能是文件或符号链接');
      const project = JSON.parse(await readFile(join(this.path(relative), 'project.json'), 'utf8'));
      if (project?.novel?.id !== novelId) corrupt('作品目录与内部 ID 不匹配');
      return true;
    } catch (error) { if (errorCode(error) === 'ENOENT') {
      // A directory without project.json is an occupied, invalid destination.
      try { await lstat(this.path(relative)); } catch (missing) { if (errorCode(missing) === 'ENOENT') return false; throw missing; }
      corrupt('作品目录缺少 project.json');
    } throw error; }
  }

  private async preflightMoves(moves: ProjectDirectoryMove[], recovering: boolean) {
    const from = new Set<string>(), to = new Set<string>();
    for (const move of moves) {
      if (!move || typeof move.novelId !== 'string' || !move.novelId || ![move.from, move.to].every(path => typeof path === 'string' && path.startsWith('novels/') && validProjectDirectory(path.slice(7)))) corrupt('作品目录迁移路径无效');
      this.path(move.from); this.path(move.to);
      const source = directoryKey(move.from), destination = directoryKey(move.to);
      if (source === destination || from.has(source) || to.has(destination)) corrupt('作品目录迁移目标重复');
      from.add(source); to.add(destination);
    }
    if ([...from].some(path => to.has(path))) corrupt('作品目录迁移不能覆盖其他源目录');
    for (const move of moves) {
      const source = await this.directoryExists(move.from, move.novelId), destination = await this.directoryExists(move.to, move.novelId);
      if ((source && destination) || (!source && !destination) || (!recovering && !source)) corrupt('作品目录迁移的源或目标已变化，原文件已保留');
    }
  }

  protected async applyMove(move: ProjectDirectoryMove) {
    if (!await this.directoryExists(move.from, move.novelId)) return;
    await rename(this.path(move.from), this.path(move.to));
    await this.barrier(join(this.root, 'novels'));
  }

  private removalStage(id: string, index: number) {return `runtime/transactions/${id}/removed-books/${index}`;}

  private async preflightRemovals(removals: ProjectDirectoryRemoval[], moves: ProjectDirectoryMove[], id: string, recovering: boolean) {
    const paths = new Set<string>(), ids = new Set<string>();
    for (const [index, removal] of removals.entries()) {
      if (!removal || typeof removal.novelId !== 'string' || !removal.novelId || typeof removal.path !== 'string' || !removal.path.startsWith('novels/') || !validProjectDirectory(removal.path.slice(7))) corrupt('作品删除路径无效');
      this.path(removal.path);
      const key = directoryKey(removal.path);
      if (paths.has(key) || ids.has(removal.novelId) || moves.some(move => [move.from, move.to].some(path => directoryKey(path) === key))) corrupt('作品删除目标重复或与迁移冲突');
      paths.add(key); ids.add(removal.novelId);
      const source = await this.directoryExists(removal.path, removal.novelId);
      const stage = await this.directoryExists(this.removalStage(id, index), removal.novelId);
      if ((source && stage) || (!source && !stage) || (!recovering && !source)) corrupt('待删除作品的目录或内部 ID 已变化，原文件已保留');
    }
  }

  /** Keep the complete directory in the transaction until the index and binding
   * changes are durable. Recovery can finish after either side of the rename. */
  protected async applyRemoval(removal: ProjectDirectoryRemoval, id: string, index: number) {
    if (!await this.directoryExists(removal.path, removal.novelId)) return;
    const stage = this.path(this.removalStage(id, index));
    await mkdir(dirname(stage), {recursive: true, mode: 0o700});
    await rename(this.path(removal.path), stage);
    await this.barrier(join(this.root, 'novels'));
    await this.barrier(dirname(stage));
  }

  async recover() {
    let journal: Journal;
    try { journal = JSON.parse(await readFile(this.journal, 'utf8')); }
    catch (error) { if (errorCode(error) === 'ENOENT') return; throw error; }
    if (![1, 2, 3].includes(journal?.version) || typeof journal.id !== 'string' || !/^[a-f0-9-]{36}$/.test(journal.id) || !Array.isArray(journal.entries) || !journal.entries.length || (journal.version >= 2 && !Array.isArray(journal.moves)) || (journal.version === 3 && !Array.isArray(journal.removals))) corrupt('存储事务日志无效');
    const moves = journal.version >= 2 ? journal.moves! : [];
    const removals = journal.version === 3 ? journal.removals! : [];
    const paths = new Set<string>();
    // Preflight every payload, before changing any destination. Staging files
    // stay in place until all destinations have been durably promoted.
    const contents: (string | null)[] = [];
    for (const entry of journal.entries) {
      if (!entry || typeof entry.path !== 'string' || paths.has(entry.path) || !/^(library\.json|activity\.json|activity\/(index|[0-9]{4})\.json|backups\/before-content-tree-[0-9]+-[a-f0-9-]{36}\/(store|library|migration)\.json|backups\/before-writing-records-[a-f0-9]{16}\/activity\.json|backups\/before-session-focus-[a-f0-9]{16}\/bindings\.json|runtime\/(bindings\.json|requests\/[^/]+\.json)|novels\/[^/]+\/.+\.json|audit\/[a-f0-9]{64}\.jsonl|before-planning-[a-f0-9]{64}\.json)$/.test(entry.path)) corrupt('事务目标文件无效');
      this.path(entry.path); paths.add(entry.path);
      if (entry.stage === null && entry.sha256 === null) { contents.push(null); continue; }
      if (typeof entry.stage !== 'string' || !entry.stage.startsWith(`runtime/transactions/${journal.id}/`) || !/^\d+\.part$/.test(entry.stage.split('/').at(-1) || '') || typeof entry.sha256 !== 'string') corrupt('事务暂存文件无效');
      const content = await readFile(this.path(entry.stage!), 'utf8');
      if (digest(content) !== entry.sha256) corrupt('存储事务校验失败，保留原文件与事务供恢复');
      if (!entry.path.startsWith('audit/')) JSON.parse(content);
      contents.push(content);
    }
    await this.preflightMoves(moves, true);
    await this.preflightRemovals(removals, moves, journal.id, true);
    if (journal.entries.some(entry => moves.some(move => entry.path.startsWith(move.from + '/')))) corrupt('事务不能重新写入迁移前的目录');
    if (journal.entries.some(entry => removals.some(removal => entry.path.startsWith(removal.path + '/')))) corrupt('事务不能写入待删除的作品目录');
    if (moves.length) {
      const libraryIndex = journal.entries.findIndex(entry => entry.path === 'library.json');
      const library = libraryIndex >= 0 && contents[libraryIndex] ? JSON.parse(contents[libraryIndex]!) : null;
      if (!([3, 4, 5].includes(library?.storageVersion) && moves.every(move => library.directories?.[move.novelId] === move.to.slice(7)))) corrupt('目录迁移与暂存的作品索引不一致');
    }
    if (removals.length) {
      const libraryIndex = journal.entries.findIndex(entry => entry.path === 'library.json');
      const library = libraryIndex >= 0 && contents[libraryIndex] ? JSON.parse(contents[libraryIndex]!) : null;
      if (!([4,5].includes(library?.storageVersion) && removals.every(removal => !Object.hasOwn(library.novels || {}, removal.novelId) && !Object.hasOwn(library.directories || {}, removal.novelId)))) corrupt('作品删除与暂存索引不一致');
    }
    for (const move of moves) await this.applyMove(move);
    for (const [index, removal] of removals.entries()) await this.applyRemoval(removal, journal.id, index);
    // Remove renamed managed files before promoting new names. This also makes
    // a pair of colliding title changes recoverable without overwriting a
    // staged destination from the previous name.
    for (let index = 0; index < journal.entries.length; index++) if (contents[index] === null) await this.applyEntry(journal.entries[index], contents[index]);
    for (let index = 0; index < journal.entries.length; index++) if (contents[index] !== null) await this.applyEntry(journal.entries[index], contents[index]);
    await unlink(this.journal);
    await this.barrier(this.root);
    // The UUID and resolved descendant check prevent cleanup from escaping root.
    await rm(this.path(`runtime/transactions/${journal.id}`), { recursive: true, force: true });
  }

  async commit(changes: FileChanges, moves: ProjectDirectoryMove[] = [], removals: ProjectDirectoryRemoval[] = []) {
    if (!changes.size) return;
    await this.recover();
    await this.preflightMoves(moves, false);
    const id = randomUUID(), entries: Entry[] = [];
    await this.preflightRemovals(removals, moves, id, false);
    for (const [path, content] of changes) {
      this.path(path);
      if (content === null) { entries.push({ path, stage: null, sha256: null }); continue; }
      const stage = `runtime/transactions/${id}/${entries.length}.part`;
      await this.write(this.path(stage), content);
      entries.push({ path, stage, sha256: digest(content) });
    }
    await this.barrier(join(this.root, 'runtime', 'transactions'));
    await this.write(this.journal, JSON.stringify({ version: removals.length ? 3 : moves.length ? 2 : 1, id, entries,
      ...((moves.length || removals.length) ? {moves} : {}), ...(removals.length ? {removals} : {}) } satisfies Journal));
    await this.recover();
  }

  async cleanOrphans() {
    // Called only with the cross-process lock held, after recovery has finished.
    const directory = join(this.root, 'runtime', 'transactions');
    for (const entry of await readdir(directory, { withFileTypes: true }).catch(error => { if (errorCode(error) === 'ENOENT') return []; throw error; })) {
      if (entry.isDirectory() && /^[a-f0-9-]{36}$/.test(entry.name)) await rm(this.path(`runtime/transactions/${entry.name}`), { recursive: true, force: true });
    }
  }
}
