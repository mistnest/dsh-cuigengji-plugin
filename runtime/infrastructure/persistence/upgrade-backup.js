import { createReadStream } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, open, readdir, readFile, readlink, rename, symlink } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { errorCode } from "./file-transaction.js";
import { parseJsonFile } from "./json-file.js";
const fail = (message) => {
  throw Object.assign(new Error(message), { code: "UPGRADE_BACKUP_INVALID" });
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
async function optionalJson(path) {
  try {
    return parseJsonFile(await readFile(path, "utf8"), path);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return void 0;
    throw error;
  }
}
async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (errorCode(error) === "ENOENT") return false;
    throw error;
  }
}
async function barrier(path) {
  try {
    const h = await open(path, "r");
    try {
      await h.sync();
    } finally {
      await h.close();
    }
  } catch (error) {
    if (process.platform === "win32" && ["EBADF", "EISDIR", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"].includes(errorCode(error))) return;
    throw error;
  }
}
async function durableJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 448 });
  const temporary = `${path}.tmp-${randomUUID()}`, handle = await open(temporary, "wx", 384);
  try {
    await handle.writeFile(JSON.stringify(value, null, 2));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, path);
  await barrier(dirname(path));
}
function backupParent(root) {
  return resolve(dirname(root), ".cuigengji-upgrade-backups", hash(resolve(root)).slice(0, 16));
}
function validBackupPath(root, path) {
  if (typeof path !== "string") return false;
  const parent = backupParent(root), candidate = resolve(path), name = candidate.slice(parent.length + 1);
  return candidate.startsWith(parent + sep) && /^\d+-[a-f0-9-]{36}$/.test(name);
}
function childPath(root, path) {
  if (!path || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === ".." || part.includes(":"))) return fail("\u5907\u4EFD\u8DEF\u5F84\u65E0\u6548");
  const target = resolve(root, path);
  if (!target.startsWith(resolve(root) + sep)) return fail("\u5907\u4EFD\u8DEF\u5F84\u8D85\u51FA\u76EE\u5F55");
  return target;
}
async function fileHash(path) {
  const sha = createHash("sha256");
  for await (const chunk of createReadStream(path)) sha.update(chunk);
  return sha.digest("hex");
}
function excluded(path) {
  return path === ".lock" || /^\.dead-lock-/.test(path) || path === "runtime/upgrade.json" || /^runtime\/upgrade\.json\.tmp-/.test(path);
}
async function copyTree(source, target, entries, path = "") {
  const stat = await lstat(source);
  if (stat.isSymbolicLink()) {
    const link = await readlink(source);
    await symlink(link, target);
    entries.push({ path, kind: "link", target: link });
    return;
  }
  if (stat.isDirectory()) {
    await mkdir(target, { recursive: true, mode: 448 });
    if (path) entries.push({ path, kind: "directory" });
    for (const name of (await readdir(source)).sort()) {
      const child = path ? `${path}/${name}` : name;
      if (!excluded(child)) await copyTree(join(source, name), join(target, name), entries, child);
    }
    await barrier(target);
    return;
  }
  if (!stat.isFile()) return fail(`\u4E0D\u80FD\u5907\u4EFD\u7279\u6B8A\u6587\u4EF6\uFF1A${path}`);
  const before = await fileHash(source);
  await copyFile(source, target);
  const h = await open(target, "r+");
  try {
    await h.sync();
  } finally {
    await h.close();
  }
  if (before !== await fileHash(target) || before !== await fileHash(source)) return fail(`\u5907\u4EFD\u671F\u95F4\u6587\u4EF6\u53D1\u751F\u53D8\u5316\uFF1A${path}`);
  entries.push({ path, kind: "file", bytes: stat.size, sha256: before });
}
async function createUpgradeBackup(root, path) {
  if (!validBackupPath(root, path)) return fail("\u5347\u7EA7\u5907\u4EFD\u76EE\u6807\u65E0\u6548");
  if ((await lstat(root)).isSymbolicLink()) return fail("\u6570\u636E\u6839\u662F\u94FE\u63A5\u76EE\u5F55\uFF0C\u8BF7\u786E\u8BA4\u5B9E\u9645\u6570\u636E\u76EE\u5F55\u540E\u5347\u7EA7");
  await mkdir(path, { recursive: true, mode: 448 });
  const entries = [];
  await copyTree(root, join(path, "data"), entries);
  const manifest = { format: "cuigengji-upgrade-backup", version: 1, dataRoot: resolve(root), createdAt: (/* @__PURE__ */ new Date()).toISOString(), entries };
  await durableJson(join(path, "manifest.json"), manifest);
  return manifest;
}
async function verifyUpgradeBackup(root, path) {
  if (!validBackupPath(root, path)) return fail("\u5347\u7EA7\u5907\u4EFD\u8DEF\u5F84\u65E0\u6548");
  const manifest = await optionalJson(join(path, "manifest.json"));
  if (manifest?.format !== "cuigengji-upgrade-backup" || manifest.version !== 1 || manifest.dataRoot !== resolve(root) || !Array.isArray(manifest.entries)) return fail("\u5347\u7EA7\u5907\u4EFD\u6CA1\u6709\u5B8C\u6574\u6E05\u5355");
  const used = /* @__PURE__ */ new Set();
  for (const entry of manifest.entries) {
    if (!entry || used.has(entry.path)) return fail("\u5347\u7EA7\u5907\u4EFD\u6761\u76EE\u91CD\u590D");
    used.add(entry.path);
    const target = childPath(join(path, "data"), entry.path), stat = await lstat(target);
    if (entry.kind === "file") {
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.bytes || await fileHash(target) !== entry.sha256) return fail(`\u5347\u7EA7\u5907\u4EFD\u6821\u9A8C\u5931\u8D25\uFF1A${entry.path}`);
    } else if (entry.kind === "link") {
      if (!stat.isSymbolicLink() || await readlink(target) !== entry.target) return fail(`\u5347\u7EA7\u5907\u4EFD\u94FE\u63A5\u5DF2\u53D8\u5316\uFF1A${entry.path}`);
    } else if (entry.kind === "directory") {
      if (!stat.isDirectory() || stat.isSymbolicLink()) return fail(`\u5347\u7EA7\u5907\u4EFD\u76EE\u5F55\u65E0\u6548\uFF1A${entry.path}`);
    } else return fail("\u5347\u7EA7\u5907\u4EFD\u6761\u76EE\u7C7B\u578B\u65E0\u6548");
  }
  return manifest;
}
export {
  backupParent,
  createUpgradeBackup,
  durableJson,
  exists,
  optionalJson,
  validBackupPath,
  verifyUpgradeBackup
};
