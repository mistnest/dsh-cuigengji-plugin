import { mkdir, open, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { digest } from "../transactions/file-transaction.js";
import { planProjectDirectories } from "../records/project-directories.js";
import { bookPath, fileId, splitWorkspace } from "../records/project-layout.js";
function readableLayout(library) {
  if (library.storageVersion !== 2) return library;
  const directories = Object.fromEntries(Object.keys(library.novels).map((id) => [id, fileId(id)]));
  return { ...library, storageVersion: 3, directories };
}
function checkpointName(label) {
  return "backups/before-" + label + "-" + Date.now() + "-" + randomUUID();
}
async function checkpointFiles(root, state, from, to, details = {}) {
  const snapshot = JSON.stringify(state);
  const manifest = { from, to, sourceSha256: digest(snapshot), ...details, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  return /* @__PURE__ */ new Map([
    ["store.json", snapshot],
    ["library.json", await readFile(join(root, "library.json"), "utf8")],
    ["migration.json", JSON.stringify(manifest)]
  ]);
}
async function writeCheckpoint(directory, files) {
  await mkdir(directory, { recursive: true, mode: 448 });
  for (const [name, content] of files) {
    const handle = await open(join(directory, name), "wx", 384);
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
}
async function occupiedPaths(access, library) {
  const paths = {};
  for (const id of Object.keys(library.novels)) paths[id] = await access.occupiedFiles(bookPath(id, library.directories));
  return paths;
}
async function migrateIndexedLayout(stored, access) {
  let library = readableLayout(stored);
  if (stored.storageVersion === 2) {
    const { state } = await access.read(library);
    const { directories, moves } = planProjectDirectories(state.novels, library.directories, {}, await access.directoryNames());
    await writeCheckpoint(join(access.root, checkpointName("project-names")), await checkpointFiles(access.root, state, 2, 3, { directories, moves }));
    library = { ...stored, storageVersion: 3, directories };
    await access.transaction.commit(/* @__PURE__ */ new Map([["library.json", JSON.stringify(library)]]), moves);
  }
  if (library.storageVersion === 3) {
    const { state } = await access.read(library);
    const occupied = await occupiedPaths(access, library);
    const before = splitWorkspace(state, library.directories, 3);
    const after = splitWorkspace(state, library.directories, 4, occupied);
    await writeCheckpoint(join(access.root, checkpointName("readable-files")), await checkpointFiles(access.root, state, 3, 4));
    const changes = new Map(after);
    for (const path of before.keys()) if (!after.has(path) && path !== "library.json") changes.set(path, null);
    await access.transaction.commit(changes);
    library = { ...library, storageVersion: 4 };
  }
  if (library.storageVersion === 4) {
    const { state, pathsRead, legacyActivity } = await access.read(library);
    const after = splitWorkspace(state, library.directories, 5, await occupiedPaths(access, library));
    const changes = new Map(after);
    if (!legacyActivity) changes.delete("activity.json");
    const checkpoint = checkpointName("content-tree");
    for (const [name, text] of await checkpointFiles(access.root, state, 4, 5)) changes.set(checkpoint + "/" + name, text);
    for (const path of pathsRead) if (path.startsWith("novels/") && !after.has(path)) changes.set(path, null);
    await access.transaction.commit(changes);
    library = { ...library, storageVersion: 5 };
  }
  return library;
}
export {
  migrateIndexedLayout,
  readableLayout
};
