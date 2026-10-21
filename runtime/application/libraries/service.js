import { mkdir, readdir, lstat, realpath, cp } from "node:fs/promises";
import { resolve, relative, isAbsolute, join, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { Store } from "../store.js";
import { WorkData } from "../backup/workspace.js";
import { TransferService } from "../transfer/service.js";
import { UpgradeCoordinator, workspaceDigest } from "../maintenance/upgrade.js";
import { createUpgradeBackup, backupParent, verifyUpgradeBackup } from "../../infrastructure/persistence/upgrade-backup.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const within = (root, path) => {
  const rel = relative(resolve(root), resolve(path));
  return !rel || rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel);
};
function createLibraryRuntime(root) {
  const store = new Store(root), workData = new WorkData(store), maintenance = new UpgradeCoordinator(store);
  return { store, workData, maintenance, transfer: new TransferService(store, workData) };
}
class LibraryService {
  current;
  readers = 0;
  changing = false;
  generation = 0;
  recent;
  busy = () => false;
  changed = async () => {
  };
  options;
  constructor(root, options = {}) {
    this.options = options;
    this.current = createLibraryRuntime(root);
    this.recent = [.../* @__PURE__ */ new Set([resolve(root), ...options.recent || []])].slice(0, 8);
  }
  configure({ busy, changed }) {
    this.busy = busy;
    this.changed = changed;
  }
  async use(fn) {
    if (this.changing) fail("LIBRARY_CHANGING", "\u4F5C\u54C1\u5E93\u6B63\u5728\u5207\u6362\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
    this.readers++;
    try {
      return await fn();
    } finally {
      this.readers--;
    }
  }
  proxy(key) {
    return new Proxy({}, { get: (_target, name) => {
      const service = this.current[key], value = service[name];
      return typeof value === "function" ? value.bind(service) : value;
    } });
  }
  async status() {
    return { ...await this.current.workData.status(), recent: this.recent, changing: this.changing, generation: this.generation, canChange: Boolean(this.options.persist) };
  }
  async inspect(input) {
    if (typeof input !== "string" || !input.trim() || !isAbsolute(input)) return fail("INVALID_INPUT", "\u8BF7\u9009\u62E9\u7EDD\u5BF9\u8DEF\u5F84\u7684\u6587\u4EF6\u5939");
    const path = resolve(input);
    let names;
    try {
      const stat = await lstat(path);
      if (!stat.isDirectory() || stat.isSymbolicLink()) return fail("INVALID_PATH", "\u8BF7\u9009\u62E9\u5B9E\u9645\u6587\u4EF6\u5939\uFF0C\u4E0D\u80FD\u4F7F\u7528\u6587\u4EF6\u6216\u94FE\u63A5\u76EE\u5F55");
      names = await readdir(path);
    } catch (error) {
      if (error.code === "ENOENT") return { path, kind: "empty", exists: false };
      throw error;
    }
    if (!names.length) return { path, kind: "empty", exists: true };
    if (!names.includes("library.json") && !names.includes("store.json") && !names.includes("store.pending.json")) return fail("INVALID_LIBRARY", "\u8FD9\u4E2A\u6587\u4EF6\u5939\u4E0D\u662F\u4F5C\u54C1\u5E93\uFF0C\u4E5F\u4E0D\u662F\u7A7A\u6587\u4EF6\u5939");
    const store = new Store(path), release = await store.acquire();
    try {
      if ((await readdir(path)).includes("transaction.pending.json")) return { path, kind: "existing", exists: true, recoveryPending: true };
      const state = await store.readStoredWorkspace();
      return { path, kind: "existing", exists: true, books: Object.values(state.novels).map((row) => ({ id: row.id, title: row.title, archived: Boolean(row.archived) })) };
    } finally {
      await release();
    }
  }
  async change(args) {
    if (!["switch", "create", "migrate"].includes(args.mode) || args.confirm !== true) return fail("INVALID_INPUT", "\u8BF7\u5148\u68C0\u67E5\u76EE\u6807\u76EE\u5F55\u5E76\u786E\u8BA4\u64CD\u4F5C");
    if (!this.options.persist) return fail("CONFIG_UNAVAILABLE", "\u5F53\u524D DSH \u672A\u63D0\u4F9B\u63D2\u4EF6\u914D\u7F6E\u4FDD\u5B58\u80FD\u529B\uFF0C\u8BF7\u66F4\u65B0 DSH \u540E\u91CD\u8BD5");
    if (this.changing || this.readers || this.busy()) return fail("LIBRARY_BUSY", "\u8BF7\u5148\u4FDD\u5B58\u7F16\u8F91\uFF0C\u7B49\u5F85\u6B63\u5728\u8FDB\u884C\u7684\u5199\u4F5C\u6216\u6570\u636E\u64CD\u4F5C\u7ED3\u675F\u540E\u518D\u5207\u6362\u4F5C\u54C1\u5E93");
    this.changing = true;
    try {
      const old = this.current;
      await old.maintenance.ensureReady();
      const source = await realpath(old.store.root), target = await this.inspect(args.path);
      await mkdir(target.path, { recursive: true });
      const destination = await realpath(target.path);
      if (within(source, destination) || within(destination, source)) return fail("INVALID_PATH", "\u65B0\u65E7\u4F5C\u54C1\u5E93\u4E0D\u80FD\u662F\u76F8\u540C\u76EE\u5F55\u6216\u4E92\u76F8\u5D4C\u5957\u7684\u76EE\u5F55");
      if (args.mode === "switch" && target.kind !== "existing") return fail("INVALID_LIBRARY", "\u5207\u6362\u4F5C\u54C1\u5E93\u9700\u8981\u9009\u62E9\u5DF2\u6709\u4F5C\u54C1\u5E93");
      if (args.mode !== "switch" && target.kind !== "empty") return fail("DIRECTORY_NOT_EMPTY", "\u65B0\u5EFA\u6216\u8FC1\u79FB\u9700\u8981\u7A7A\u6587\u4EF6\u5939\uFF0C\u5DF2\u6709\u5185\u5BB9\u4F1A\u4FDD\u7559");
      let expected, activity;
      if (args.mode === "migrate") {
        const release = await old.store.acquire();
        try {
          await old.store.transaction.recover();
          const state = await old.store.load();
          expected = workspaceDigest(state);
          activity = JSON.stringify(state.activity);
          const backup = join(backupParent(source), `${Date.now()}-${randomUUID()}`);
          const manifest = await createUpgradeBackup(source, backup);
          await verifyUpgradeBackup(source, backup);
          if (manifest.entries.some((entry) => entry.kind === "link")) return fail("LINKED_LIBRARY", "\u4F5C\u54C1\u5E93\u4E2D\u542B\u94FE\u63A5\u6587\u4EF6\uFF0C\u8BF7\u5148\u5C06\u5176\u6574\u7406\u4E3A\u5B9E\u9645\u6587\u4EF6\u540E\u8FC1\u79FB");
          if ((await readdir(destination)).length) return fail("DIRECTORY_NOT_EMPTY", "\u76EE\u6807\u6587\u4EF6\u5939\u5DF2\u6709\u5185\u5BB9\uFF0C\u8FC1\u79FB\u5DF2\u505C\u6B62\uFF1B\u539F\u4F5C\u54C1\u5E93\u548C\u5907\u4EFD\u4FDD\u7559");
          for (const name of await readdir(join(backup, "data"))) await cp(join(backup, "data", name), join(destination, name), { recursive: true, errorOnExist: true, force: false });
        } finally {
          await release();
        }
      }
      const next = createLibraryRuntime(destination);
      await next.maintenance.ensureReady();
      if (expected) {
        const release = await next.store.acquire();
        try {
          const state = await next.store.load();
          if (workspaceDigest(state) !== expected || JSON.stringify(state.activity) !== activity) return fail("MIGRATION_MISMATCH", "\u8FC1\u79FB\u6821\u9A8C\u672A\u901A\u8FC7\uFF0C\u7EE7\u7EED\u4F7F\u7528\u539F\u4F5C\u54C1\u5E93\uFF1B\u65B0\u76EE\u5F55\u548C\u5907\u4EFD\u5747\u5DF2\u4FDD\u7559");
        } finally {
          await release();
        }
      }
      const recent = [.../* @__PURE__ */ new Set([destination, ...this.recent])].slice(0, 8);
      await this.options.persist(destination, recent);
      this.current = next;
      this.recent = recent;
      this.generation++;
      let warning;
      try {
        await this.changed();
      } catch {
        warning = "\u4F5C\u54C1\u5E93\u5DF2\u5207\u6362\uFF0C\u90E8\u5206\u8FDE\u63A5\u9700\u8981\u5237\u65B0\u540E\u91CD\u65B0\u8FDE\u63A5\u3002";
      }
      return { ...await this.status(), changing: false, ...warning ? { warning } : {} };
    } finally {
      this.changing = false;
    }
  }
}
export {
  LibraryService,
  createLibraryRuntime,
  within
};
