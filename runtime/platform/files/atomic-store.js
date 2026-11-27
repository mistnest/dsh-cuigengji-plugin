import { mkdir, readFile, writeFile, rename, unlink, rmdir, rm, open, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { parseJsonFile } from "./json-file.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const errorCode = (error) => error !== null && typeof error === "object" && "code" in error ? String(error.code) : "";
const delay = (ms) => new Promise((resolve2) => setTimeout(resolve2, ms));
class AtomicStore {
  root;
  file;
  pending;
  lockTimeoutMs;
  allowCreate;
  empty;
  validate;
  constructor(root, empty, validate, options = {}) {
    this.root = resolve(root);
    this.file = join(this.root, "store.json");
    this.pending = join(this.root, "store.pending.json");
    this.lockTimeoutMs = options.lockTimeoutMs ?? 1e4;
    this.allowCreate = options.allowCreate ?? true;
    this.empty = empty;
    this.validate = validate;
  }
  async withLock(operation) {
    const release = await this.acquire();
    try {
      return await operation();
    } finally {
      await release();
    }
  }
  async acquire() {
    try {
      await stat(this.root);
    } catch (error) {
      if (errorCode(error) !== "ENOENT") throw error;
      if (!this.allowCreate) fail("DATA_ROOT_MISSING", "\u4F5C\u54C1\u5E93\u76EE\u5F55\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u5B9A\u4F4D\u539F\u4F5C\u54C1\u5E93\u6216\u9009\u62E9\u65B0\u76EE\u5F55");
      await mkdir(this.root, { recursive: true, mode: 448 });
    }
    const lock = join(this.root, ".lock");
    const candidate = join(this.root, `.dead-lock-${randomUUID()}`);
    const started = Date.now();
    await mkdir(candidate);
    try {
      await writeFile(join(candidate, "owner"), String(process.pid), { flag: "wx", mode: 384 });
      for (; ; ) {
        try {
          await rename(candidate, lock);
          break;
        } catch (error) {
          if (!["EEXIST", "ENOTEMPTY", "EPERM", "EACCES", "EBUSY"].includes(errorCode(error))) throw error;
          let pid = 0;
          try {
            pid = Number(await readFile(join(lock, "owner"), "utf8"));
          } catch (ownerError) {
            if (errorCode(ownerError) === "ENOENT") {
              await rmdir(lock).catch(() => {
              });
            } else if (!["EPERM", "EACCES", "EBUSY"].includes(errorCode(ownerError))) throw ownerError;
          }
          if (Number.isSafeInteger(pid) && pid > 0) {
            try {
              process.kill(pid, 0);
            } catch (probe) {
              if (errorCode(probe) === "ESRCH") await this.reclaimDead(lock, pid);
            }
          }
          if (Date.now() - started >= this.lockTimeoutMs) {
            throw Object.assign(new Error("\u4F5C\u54C1\u5E93\u6B63\u88AB\u5360\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"), { code: "STORE_BUSY", details: { ownerPid: Number.isSafeInteger(pid) && pid > 0 ? pid : null } });
          }
          await delay(20 + Math.floor(Math.random() * 10));
        }
      }
    } finally {
      await rm(candidate, { recursive: true, force: true });
    }
    return async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          await unlink(join(lock, "owner"));
          break;
        } catch (error) {
          if (process.platform !== "win32" || attempt >= 100 || !["EPERM", "EACCES", "EBUSY"].includes(errorCode(error))) throw error;
          await delay(20);
        }
      }
      try {
        await rmdir(lock);
      } catch (error) {
        if (!["ENOENT", "ENOTEMPTY", "EEXIST", "EPERM", "EACCES", "EBUSY"].includes(errorCode(error))) throw error;
      }
    };
  }
  async reclaimDead(lock, pid) {
    const claim = join(lock, "reclaim");
    try {
      await mkdir(claim);
    } catch {
      return;
    }
    let moved = false;
    try {
      if (Number(await readFile(join(lock, "owner"), "utf8")) !== pid) return;
      const retired = join(this.root, `.dead-lock-${randomUUID()}`);
      await rename(lock, retired);
      moved = true;
      await rm(retired, { recursive: true, force: true });
    } catch (error) {
      if (!["ENOENT", "EPERM", "EACCES", "EBUSY"].includes(errorCode(error))) throw error;
    } finally {
      if (!moved) await rmdir(claim).catch(() => {
      });
    }
  }
  async load() {
    try {
      const pending = parseJsonFile(await readFile(this.pending, "utf8"), "store.pending.json");
      this.validate(pending);
      await rename(this.pending, this.file);
    } catch (e) {
      if (errorCode(e) !== "ENOENT") throw e;
    }
    try {
      const state = parseJsonFile(await readFile(this.file, "utf8"), "store.json");
      this.validate(state);
      return state;
    } catch (e) {
      if (errorCode(e) === "ENOENT") return this.empty();
      throw e;
    }
  }
  async save(state) {
    const staging = join(this.root, `store.stage-${randomUUID()}.json`);
    const handle = await open(staging, "wx", 384);
    try {
      await handle.writeFile(JSON.stringify(state));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(staging, this.pending);
    await this.syncDirectory();
    await rename(this.pending, this.file);
    await this.syncDirectory();
  }
  async syncDirectory() {
    try {
      const handle = await open(this.root, "r");
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch (error) {
      const unsupported = /* @__PURE__ */ new Set(["EBADF", "EISDIR", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"]);
      if (process.platform === "win32" && unsupported.has(errorCode(error))) return;
      throw error;
    }
  }
}
export {
  AtomicStore
};
