import { mkdir, readFile, writeFile, rename, unlink, rmdir, open } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
const errorCode=(error:unknown):string=>error!==null&&typeof error==='object'&&'code' in error?String(error.code):'';
/** Durable JSON snapshots and process-owned locking, independent of novel business rules. */
export class AtomicStore<T> {
  readonly root:string;
  readonly file:string;
  readonly pending:string;
  readonly lockTimeoutMs:number;
  private readonly empty:()=>T;
  private readonly validate:(value:unknown)=>asserts value is T;
  constructor(root:string, empty:()=>T, validate:(value:unknown)=>asserts value is T, options:{lockTimeoutMs?:number}={}) {
    this.root=resolve(root);this.file=join(this.root,'store.json');this.pending=join(this.root,'store.pending.json');
    this.lockTimeoutMs=options.lockTimeoutMs??10000;this.empty=empty;this.validate=validate;
  }
  async acquire() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const lock = join(this.root, '.lock'); const started = Date.now();
    for (;;) {
      try {
        await mkdir(lock);
        try { await writeFile(join(lock, 'owner'), String(process.pid), { flag: 'wx', mode: 0o600 }); }
        catch (error) { await rmdir(lock).catch(() => {}); throw error; }
        return async () => { await unlink(join(lock, 'owner')); await rmdir(lock); };
      } catch (error) {
        if (errorCode(error) !== 'EEXIST') throw error;
        // Never reclaim by age: a slow live writer must retain exclusive ownership.
        try {
          const pid = Number(await readFile(join(lock, 'owner'), 'utf8'));
          if (Number.isSafeInteger(pid) && pid > 0) {
            try { process.kill(pid, 0); } catch (e) {
              if (errorCode(e) === 'ESRCH') {
                // Only one contender may reclaim a dead writer. Re-read ownership after
                // acquiring the claim, then move that directory before cleaning it up.
                const claim = join(lock, 'reclaim');
                try {
                  await mkdir(claim);
                  const latest = Number(await readFile(join(lock, 'owner'), 'utf8'));
                  if (latest === pid) {
                    const abandoned = join(this.root, `.dead-lock-${randomUUID()}`);
                    await rename(lock, abandoned);
                    await unlink(join(abandoned, 'owner'));
                    await rmdir(join(abandoned, 'reclaim'));
                    await rmdir(abandoned);
                  } else await rmdir(claim);
                } catch { /* Another contender reclaimed the same dead writer. */ }
              }
            }
          }
        } catch { /* A writer may still be creating its owner file. */ }
        if (Date.now() - started >= this.lockTimeoutMs) fail('STORE_BUSY', '小说数据正在被另一操作使用，请稍后重试');
        await new Promise(r => setTimeout(r, 20));
      }
    }
  }

  async load(): Promise<T> {
    try {
      const pending = JSON.parse(await readFile(this.pending, 'utf8'));
      this.validate(pending);
      await rename(this.pending, this.file);
    } catch (e) { if (errorCode(e) !== 'ENOENT') throw e; }
    try {
      const state = JSON.parse(await readFile(this.file, 'utf8'));
      this.validate(state);
      return state;
    } catch (e) { if (errorCode(e) === 'ENOENT') return this.empty(); throw e; }
  }

  async save(state: T) {
    // A crash during staging leaves the last committed snapshot untouched.
    const staging = join(this.root, `store.stage-${randomUUID()}.json`);
    const handle = await open(staging, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(state)); await handle.sync(); } finally { await handle.close(); }
    await rename(staging, this.pending);
    await this.syncDirectory();
    await rename(this.pending, this.file);
    await this.syncDirectory();
  }
  async syncDirectory() {
    // Directory handles are syncable on POSIX, but Windows commonly returns
    // EPERM/EISDIR/ENOTSUP for fsync even when the rename itself succeeded.
    // The staged file is still fsynced before each atomic promotion above, so
    // treat an unsupported directory barrier as best-effort on Windows while
    // surfacing real I/O failures everywhere else.
    try {
      const handle = await open(this.root, 'r');
      try { await handle.sync(); } finally { await handle.close(); }
    } catch (error) {
      const unsupported = new Set(['EBADF', 'EISDIR', 'EINVAL', 'ENOSYS', 'ENOTSUP', 'EPERM']);
      if (process.platform === 'win32' && unsupported.has(errorCode(error))) return;
      throw error;
    }
  }

}
