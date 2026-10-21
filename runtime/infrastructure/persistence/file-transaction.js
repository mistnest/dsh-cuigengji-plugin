import { mkdir, readFile, rename, unlink, rm, open, readdir, lstat } from "node:fs/promises";
import { resolve, join, dirname, basename, sep } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { directoryKey, validProjectDirectory } from "./project-directories.js";
const digest = (text) => createHash("sha256").update(text).digest("hex");
const errorCode = (error) => error && typeof error === "object" && "code" in error ? String(error.code) : "";
const corrupt = (message) => {
  throw Object.assign(new Error(message), { code: "CORRUPT_STORE" });
};
class FileTransaction {
  root;
  journal;
  constructor(root) {
    this.root = resolve(root);
    this.journal = join(this.root, "transaction.pending.json");
  }
  path(relative) {
    if (!relative || relative.includes("\\") || relative.split("/").some((part) => !part || part === "." || part === ".." || part.includes(":"))) corrupt("\u4E8B\u52A1\u6587\u4EF6\u8DEF\u5F84\u65E0\u6548");
    const target = resolve(this.root, relative);
    if (!target.startsWith(this.root + sep)) corrupt("\u4E8B\u52A1\u8DEF\u5F84\u8D85\u51FA\u5C0F\u8BF4\u6570\u636E\u76EE\u5F55");
    return target;
  }
  async barrier(directory) {
    try {
      const handle = await open(directory, "r");
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (process.platform === "win32" && ["EBADF", "EISDIR", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"].includes(errorCode(error))) return;
      throw error;
    }
  }
  async write(target, content) {
    await mkdir(dirname(target), { recursive: true, mode: 448 });
    const temporary = join(dirname(target), `.${basename(target)}.stage-${randomUUID()}`);
    const handle = await open(temporary, "wx", 384);
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, target);
    await this.barrier(dirname(target));
  }
  async applyEntry(entry, content) {
    const target = this.path(entry.path);
    if (content === null) {
      await unlink(target).catch((error) => {
        if (errorCode(error) !== "ENOENT") throw error;
      });
      await this.barrier(dirname(target));
      return;
    }
    try {
      if (digest(await readFile(target, "utf8")) === entry.sha256) return;
    } catch (error) {
      if (errorCode(error) !== "ENOENT") throw error;
    }
    await this.write(target, content);
  }
  async directoryExists(relative, novelId) {
    try {
      const info = await lstat(this.path(relative));
      if (!info.isDirectory() || info.isSymbolicLink()) corrupt("\u4F5C\u54C1\u76EE\u5F55\u4E0D\u80FD\u662F\u6587\u4EF6\u6216\u7B26\u53F7\u94FE\u63A5");
      const project = JSON.parse(await readFile(join(this.path(relative), "project.json"), "utf8"));
      if (project?.novel?.id !== novelId) corrupt("\u4F5C\u54C1\u76EE\u5F55\u4E0E\u5185\u90E8 ID \u4E0D\u5339\u914D");
      return true;
    } catch (error) {
      if (errorCode(error) === "ENOENT") {
        try {
          await lstat(this.path(relative));
        } catch (missing) {
          if (errorCode(missing) === "ENOENT") return false;
          throw missing;
        }
        corrupt("\u4F5C\u54C1\u76EE\u5F55\u7F3A\u5C11 project.json");
      }
      throw error;
    }
  }
  async preflightMoves(moves, recovering) {
    const from = /* @__PURE__ */ new Set(), to = /* @__PURE__ */ new Set();
    for (const move of moves) {
      if (!move || typeof move.novelId !== "string" || !move.novelId || ![move.from, move.to].every((path) => typeof path === "string" && path.startsWith("novels/") && validProjectDirectory(path.slice(7)))) corrupt("\u4F5C\u54C1\u76EE\u5F55\u8FC1\u79FB\u8DEF\u5F84\u65E0\u6548");
      this.path(move.from);
      this.path(move.to);
      const source = directoryKey(move.from), destination = directoryKey(move.to);
      if (source === destination || from.has(source) || to.has(destination)) corrupt("\u4F5C\u54C1\u76EE\u5F55\u8FC1\u79FB\u76EE\u6807\u91CD\u590D");
      from.add(source);
      to.add(destination);
    }
    if ([...from].some((path) => to.has(path))) corrupt("\u4F5C\u54C1\u76EE\u5F55\u8FC1\u79FB\u4E0D\u80FD\u8986\u76D6\u5176\u4ED6\u6E90\u76EE\u5F55");
    for (const move of moves) {
      const source = await this.directoryExists(move.from, move.novelId), destination = await this.directoryExists(move.to, move.novelId);
      if (source && destination || !source && !destination || !recovering && !source) corrupt("\u4F5C\u54C1\u76EE\u5F55\u8FC1\u79FB\u7684\u6E90\u6216\u76EE\u6807\u5DF2\u53D8\u5316\uFF0C\u539F\u6587\u4EF6\u5DF2\u4FDD\u7559");
    }
  }
  async applyMove(move) {
    if (!await this.directoryExists(move.from, move.novelId)) return;
    await rename(this.path(move.from), this.path(move.to));
    await this.barrier(join(this.root, "novels"));
  }
  removalStage(id, index) {
    return `runtime/transactions/${id}/removed-books/${index}`;
  }
  async preflightRemovals(removals, moves, id, recovering) {
    const paths = /* @__PURE__ */ new Set(), ids = /* @__PURE__ */ new Set();
    for (const [index, removal] of removals.entries()) {
      if (!removal || typeof removal.novelId !== "string" || !removal.novelId || typeof removal.path !== "string" || !removal.path.startsWith("novels/") || !validProjectDirectory(removal.path.slice(7))) corrupt("\u4F5C\u54C1\u5220\u9664\u8DEF\u5F84\u65E0\u6548");
      this.path(removal.path);
      const key = directoryKey(removal.path);
      if (paths.has(key) || ids.has(removal.novelId) || moves.some((move) => [move.from, move.to].some((path) => directoryKey(path) === key))) corrupt("\u4F5C\u54C1\u5220\u9664\u76EE\u6807\u91CD\u590D\u6216\u4E0E\u8FC1\u79FB\u51B2\u7A81");
      paths.add(key);
      ids.add(removal.novelId);
      const source = await this.directoryExists(removal.path, removal.novelId);
      const stage = await this.directoryExists(this.removalStage(id, index), removal.novelId);
      if (source && stage || !source && !stage || !recovering && !source) corrupt("\u5F85\u5220\u9664\u4F5C\u54C1\u7684\u76EE\u5F55\u6216\u5185\u90E8 ID \u5DF2\u53D8\u5316\uFF0C\u539F\u6587\u4EF6\u5DF2\u4FDD\u7559");
    }
  }
  /** Keep the complete directory in the transaction until the index and binding
   * changes are durable. Recovery can finish after either side of the rename. */
  async applyRemoval(removal, id, index) {
    if (!await this.directoryExists(removal.path, removal.novelId)) return;
    const stage = this.path(this.removalStage(id, index));
    await mkdir(dirname(stage), { recursive: true, mode: 448 });
    await rename(this.path(removal.path), stage);
    await this.barrier(join(this.root, "novels"));
    await this.barrier(dirname(stage));
  }
  async recover() {
    let journal;
    try {
      journal = JSON.parse(await readFile(this.journal, "utf8"));
    } catch (error) {
      if (errorCode(error) === "ENOENT") return;
      throw error;
    }
    if (![1, 2, 3].includes(journal?.version) || typeof journal.id !== "string" || !/^[a-f0-9-]{36}$/.test(journal.id) || !Array.isArray(journal.entries) || !journal.entries.length || journal.version >= 2 && !Array.isArray(journal.moves) || journal.version === 3 && !Array.isArray(journal.removals)) corrupt("\u5B58\u50A8\u4E8B\u52A1\u65E5\u5FD7\u65E0\u6548");
    const moves = journal.version >= 2 ? journal.moves : [];
    const removals = journal.version === 3 ? journal.removals : [];
    const paths = /* @__PURE__ */ new Set();
    const contents = [];
    for (const entry of journal.entries) {
      if (!entry || typeof entry.path !== "string" || paths.has(entry.path) || !/^(library\.json|activity\.json|activity\/(index|[0-9]{4})\.json|backups\/before-content-tree-[0-9]+-[a-f0-9-]{36}\/(store|library|migration)\.json|backups\/before-writing-records-[a-f0-9]{16}\/activity\.json|backups\/before-session-focus-[a-f0-9]{16}\/bindings\.json|runtime\/(bindings\.json|requests\/[^/]+\.json)|novels\/[^/]+\/.+\.json|audit\/[a-f0-9]{64}\.jsonl|before-planning-[a-f0-9]{64}\.json)$/.test(entry.path)) corrupt("\u4E8B\u52A1\u76EE\u6807\u6587\u4EF6\u65E0\u6548");
      this.path(entry.path);
      paths.add(entry.path);
      if (entry.stage === null && entry.sha256 === null) {
        contents.push(null);
        continue;
      }
      if (typeof entry.stage !== "string" || !entry.stage.startsWith(`runtime/transactions/${journal.id}/`) || !/^\d+\.part$/.test(entry.stage.split("/").at(-1) || "") || typeof entry.sha256 !== "string") corrupt("\u4E8B\u52A1\u6682\u5B58\u6587\u4EF6\u65E0\u6548");
      const content = await readFile(this.path(entry.stage), "utf8");
      if (digest(content) !== entry.sha256) corrupt("\u5B58\u50A8\u4E8B\u52A1\u6821\u9A8C\u5931\u8D25\uFF0C\u4FDD\u7559\u539F\u6587\u4EF6\u4E0E\u4E8B\u52A1\u4F9B\u6062\u590D");
      if (!entry.path.startsWith("audit/")) JSON.parse(content);
      contents.push(content);
    }
    await this.preflightMoves(moves, true);
    await this.preflightRemovals(removals, moves, journal.id, true);
    if (journal.entries.some((entry) => moves.some((move) => entry.path.startsWith(move.from + "/")))) corrupt("\u4E8B\u52A1\u4E0D\u80FD\u91CD\u65B0\u5199\u5165\u8FC1\u79FB\u524D\u7684\u76EE\u5F55");
    if (journal.entries.some((entry) => removals.some((removal) => entry.path.startsWith(removal.path + "/")))) corrupt("\u4E8B\u52A1\u4E0D\u80FD\u5199\u5165\u5F85\u5220\u9664\u7684\u4F5C\u54C1\u76EE\u5F55");
    if (moves.length) {
      const libraryIndex = journal.entries.findIndex((entry) => entry.path === "library.json");
      const library = libraryIndex >= 0 && contents[libraryIndex] ? JSON.parse(contents[libraryIndex]) : null;
      if (!([3, 4, 5].includes(library?.storageVersion) && moves.every((move) => library.directories?.[move.novelId] === move.to.slice(7)))) corrupt("\u76EE\u5F55\u8FC1\u79FB\u4E0E\u6682\u5B58\u7684\u4F5C\u54C1\u7D22\u5F15\u4E0D\u4E00\u81F4");
    }
    if (removals.length) {
      const libraryIndex = journal.entries.findIndex((entry) => entry.path === "library.json");
      const library = libraryIndex >= 0 && contents[libraryIndex] ? JSON.parse(contents[libraryIndex]) : null;
      if (!([4, 5].includes(library?.storageVersion) && removals.every((removal) => !Object.hasOwn(library.novels || {}, removal.novelId) && !Object.hasOwn(library.directories || {}, removal.novelId)))) corrupt("\u4F5C\u54C1\u5220\u9664\u4E0E\u6682\u5B58\u7D22\u5F15\u4E0D\u4E00\u81F4");
    }
    for (const move of moves) await this.applyMove(move);
    for (const [index, removal] of removals.entries()) await this.applyRemoval(removal, journal.id, index);
    for (let index = 0; index < journal.entries.length; index++) if (contents[index] === null) await this.applyEntry(journal.entries[index], contents[index]);
    for (let index = 0; index < journal.entries.length; index++) if (contents[index] !== null) await this.applyEntry(journal.entries[index], contents[index]);
    await unlink(this.journal);
    await this.barrier(this.root);
    await rm(this.path(`runtime/transactions/${journal.id}`), { recursive: true, force: true });
  }
  async commit(changes, moves = [], removals = []) {
    if (!changes.size) return;
    await this.recover();
    await this.preflightMoves(moves, false);
    const id = randomUUID(), entries = [];
    await this.preflightRemovals(removals, moves, id, false);
    for (const [path, content] of changes) {
      this.path(path);
      if (content === null) {
        entries.push({ path, stage: null, sha256: null });
        continue;
      }
      const stage = `runtime/transactions/${id}/${entries.length}.part`;
      await this.write(this.path(stage), content);
      entries.push({ path, stage, sha256: digest(content) });
    }
    await this.barrier(join(this.root, "runtime", "transactions"));
    await this.write(this.journal, JSON.stringify({
      version: removals.length ? 3 : moves.length ? 2 : 1,
      id,
      entries,
      ...moves.length || removals.length ? { moves } : {},
      ...removals.length ? { removals } : {}
    }));
    await this.recover();
  }
  async cleanOrphans() {
    const directory = join(this.root, "runtime", "transactions");
    for (const entry of await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (errorCode(error) === "ENOENT") return [];
      throw error;
    })) {
      if (entry.isDirectory() && /^[a-f0-9-]{36}$/.test(entry.name)) await rm(this.path(`runtime/transactions/${entry.name}`), { recursive: true, force: true });
    }
  }
}
export {
  FileTransaction,
  digest,
  errorCode
};
