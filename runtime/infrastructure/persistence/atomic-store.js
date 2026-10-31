import { mkdir, readFile, writeFile, rename, unlink, rmdir, open } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { parseJsonFile } from "./json-file.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const errorCode = (error) => error !== null && typeof error === "object" && "code" in error ? String(error.code) : "";
class AtomicStore {
  root;
  file;
  pending;
  lockTimeoutMs;
  empty;
  validate;
  constructor(root, empty, validate, options = {}) {
    this.root = resolve(root);
    this.file = join(this.root, "store.json");
    this.pending = join(this.root, "store.pending.json");
    this.lockTimeoutMs = options.lockTimeoutMs ?? 1e4;
    this.empty = empty;
    this.validate = validate;
  }
  async acquire() {
    await mkdir(this.root, { recursive: true, mode: 448 });
    const lock = join(this.root, ".lock");
    const started = Date.now();
    let deniedSince;
    for (; ; ) {
      let created = false;
      try {
        await mkdir(lock);
        created = true;
        try {
          await writeFile(join(lock, "owner"), String(process.pid), { flag: "wx", mode: 384 });
        } catch (error) {
          await rmdir(lock).catch(() => {
          });
          throw error;
        }
        return async () => {
          await unlink(join(lock, "owner"));
          await rmdir(lock);
        };
      } catch (error) {
        if (!created && process.platform === "win32" && ["EPERM", "EACCES"].includes(errorCode(error))) {
          deniedSince ??= Date.now();
          if (Date.now() - started >= this.lockTimeoutMs) fail("STORE_BUSY", "\u5C0F\u8BF4\u6570\u636E\u6B63\u5728\u88AB\u53E6\u4E00\u64CD\u4F5C\u4F7F\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
          if (Date.now() - deniedSince < Math.min(this.lockTimeoutMs, 2e3)) {
            await new Promise((r) => setTimeout(r, 20));
            continue;
          }
        } else deniedSince = void 0;
        if (errorCode(error) !== "EEXIST") throw error;
        try {
          const pid = Number(await readFile(join(lock, "owner"), "utf8"));
          if (Number.isSafeInteger(pid) && pid > 0) {
            try {
              process.kill(pid, 0);
            } catch (e) {
              if (errorCode(e) === "ESRCH") {
                const claim = join(lock, "reclaim");
                try {
                  await mkdir(claim);
                  const latest = Number(await readFile(join(lock, "owner"), "utf8"));
                  if (latest === pid) {
                    const abandoned = join(this.root, `.dead-lock-${randomUUID()}`);
                    await rename(lock, abandoned);
                    await unlink(join(abandoned, "owner"));
                    await rmdir(join(abandoned, "reclaim"));
                    await rmdir(abandoned);
                  } else await rmdir(claim);
                } catch {
                }
              }
            }
          }
        } catch {
        }
        if (Date.now() - started >= this.lockTimeoutMs) fail("STORE_BUSY", "\u5C0F\u8BF4\u6570\u636E\u6B63\u5728\u88AB\u53E6\u4E00\u64CD\u4F5C\u4F7F\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
        await new Promise((r) => setTimeout(r, 20));
      }
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
