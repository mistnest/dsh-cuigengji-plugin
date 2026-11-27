import { mkdir, readFile, writeFile, rename, unlink, rmdir, rm, open, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {parseJsonFile} from './json-file.ts';
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
const errorCode=(error:unknown):string=>error!==null&&typeof error==='object'&&'code' in error?String(error.code):'';
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
/** Durable JSON snapshots and process-owned locking, independent of novel business rules. */
export class AtomicStore<T> {
  readonly root:string;
  readonly file:string;
  readonly pending:string;
  readonly lockTimeoutMs:number;
  protected allowCreate:boolean;
  private readonly empty:()=>T;
  private readonly validate:(value:unknown)=>asserts value is T;
  constructor(root:string, empty:()=>T, validate:(value:unknown)=>asserts value is T, options:{lockTimeoutMs?:number;allowCreate?:boolean}={}) {
    this.root=resolve(root);this.file=join(this.root,'store.json');this.pending=join(this.root,'store.pending.json');
    this.lockTimeoutMs=options.lockTimeoutMs??10000;this.allowCreate=options.allowCreate??true;this.empty=empty;this.validate=validate;
  }
  async withLock<Result>(operation: () => Result | Promise<Result>): Promise<Result> {
    const release = await this.acquire();
    try {
      return await operation();
    } finally {
      await release();
    }
  }

  async acquire() {
    try { await stat(this.root); }
    catch (error) {
      if(errorCode(error)!=='ENOENT') throw error;
      if(!this.allowCreate) fail('DATA_ROOT_MISSING','作品库目录不存在，请重新定位原作品库或选择新目录');
      await mkdir(this.root, { recursive: true, mode: 0o700 });
    }
    const lock = join(this.root, '.lock');
    const candidate = join(this.root, `.dead-lock-${randomUUID()}`);
    const started = Date.now();
    await mkdir(candidate);
    try {
      await writeFile(join(candidate,'owner'), String(process.pid), {flag:'wx',mode:0o600});
      for (;;) {
        try {
          // Publish an already nonempty directory. An empty-directory removal
          // cannot take ownership away from a writer, even across retries.
          await rename(candidate,lock);
          break;
        } catch (error) {
          if (!['EEXIST','ENOTEMPTY','EPERM','EACCES','EBUSY'].includes(errorCode(error))) throw error;
          let pid = 0;
          try { pid = Number(await readFile(join(lock,'owner'),'utf8')); }
          catch (ownerError) {
            if (errorCode(ownerError)==='ENOENT') {
              // A legacy writer may be publishing its owner. rmdir checks
              // emptiness at removal and protects a concurrently created owner.
              await rmdir(lock).catch(() => {});
            } else if (!['EPERM','EACCES','EBUSY'].includes(errorCode(ownerError))) throw ownerError;
          }
          if (Number.isSafeInteger(pid) && pid > 0) {
            try { process.kill(pid,0); } catch (probe) {
              if (errorCode(probe)==='ESRCH') await this.reclaimDead(lock,pid);
            }
          }
          if (Date.now()-started >= this.lockTimeoutMs) {
            throw Object.assign(new Error('作品库正被占用，请稍后重试'),{code:'STORE_BUSY',details:{ownerPid:Number.isSafeInteger(pid)&&pid>0?pid:null}});
          }
          await delay(20 + Math.floor(Math.random()*10));
        }
      }
    } finally {
      await rm(candidate,{recursive:true,force:true});
    }
    return async () => {
      // Removing owner ends the protected operation. A newer acquisition
      // always makes the directory nonempty before it can enter.
      for (let attempt=0;;attempt++) {
        try { await unlink(join(lock,'owner')); break; }
        catch (error) {
          if (process.platform!=='win32' || attempt>=100 || !['EPERM','EACCES','EBUSY'].includes(errorCode(error))) throw error;
          await delay(20);
        }
      }
      try { await rmdir(lock); }
      catch (error) {
        if (!['ENOENT','ENOTEMPTY','EEXIST','EPERM','EACCES','EBUSY'].includes(errorCode(error))) throw error;
      }
    };
  }

  private async reclaimDead(lock:string,pid:number) {
    const claim=join(lock,'reclaim');
    try { await mkdir(claim); } catch { return; }
    let moved=false;
    try {
      if (Number(await readFile(join(lock,'owner'),'utf8')) !== pid) return;
      const retired=join(this.root,`.dead-lock-${randomUUID()}`);
      await rename(lock,retired);
      moved=true;
      await rm(retired,{recursive:true,force:true});
    } catch (error) {
      if (!['ENOENT','EPERM','EACCES','EBUSY'].includes(errorCode(error))) throw error;
    } finally {
      if (!moved) await rmdir(claim).catch(() => {});
    }
  }

  async load(): Promise<T> {
    try {
      const pending = parseJsonFile(await readFile(this.pending, 'utf8'), 'store.pending.json');
      this.validate(pending);
      await rename(this.pending, this.file);
    } catch (e) { if (errorCode(e) !== 'ENOENT') throw e; }
    try {
      const state = parseJsonFile(await readFile(this.file, 'utf8'), 'store.json');
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
