import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { digest, errorCode } from "../transactions/file-transaction.js";
const allowedArchivePath = (path) => path === "activity.json" || /^audit\/[a-f0-9]{64}\.jsonl$/.test(path) || /^before-planning-[a-f0-9]{64}\.json$/.test(path);
async function readArchiveFiles(root, activityContent) {
  const result = [{ path: "activity.json", content: activityContent, sha256: digest(activityContent) }];
  for (const dir of ["", "audit"]) {
    const entries = await readdir(join(root, dir), { withFileTypes: true }).catch((error) => {
      if (errorCode(error) === "ENOENT") return [];
      throw error;
    });
    for (const entry of entries) {
      const path = dir ? dir + "/" + entry.name : entry.name;
      if (!entry.isFile() || !allowedArchivePath(path) || path === "activity.json") continue;
      const content = await readFile(join(root, path), "utf8");
      result.push({ path, content, sha256: digest(content) });
    }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
async function writeImportBackup(root, kind, archive) {
  const dir = join(root, "backups", "before-" + kind + "-" + Date.now() + "-" + randomUUID());
  await mkdir(dir, { recursive: true, mode: 448 });
  await writeFile(join(dir, "workspace.json"), JSON.stringify(archive), { flag: "wx", mode: 384 });
  return dir;
}
async function archiveFileChanges(root, files) {
  const changes = /* @__PURE__ */ new Map();
  for (const file of files) {
    if (!allowedArchivePath(file.path)) throw Object.assign(new Error("\u5907\u4EFD\u6587\u4EF6\u8DEF\u5F84\u65E0\u6548"), { code: "INVALID_WORKSPACE_BACKUP" });
    if (file.path === "activity.json") continue;
    const old = await readFile(join(root, file.path), "utf8").catch((error) => {
      if (errorCode(error) !== "ENOENT") throw error;
    });
    if (old === void 0 || old !== file.content && file.content.startsWith(old)) changes.set(file.path, file.content);
  }
  return changes;
}
export {
  allowedArchivePath,
  archiveFileChanges,
  readArchiveFiles,
  writeImportBackup
};
