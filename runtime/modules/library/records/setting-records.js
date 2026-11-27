import { isDeepStrictEqual } from "node:util";
import { digest } from "../transactions/file-transaction.js";
import { checkFileNames, corrupt, isRecord, sameJson } from "./book-files.js";
import { fileId, indexMemory, own, storedSettingFile, without } from "./project-layout.js";
import { treeSettingFiles } from "./tree-layout.js";
function initialHistory(node) {
  return {
    revision: node.revision,
    type: node.type,
    groupId: node.groupId ?? null,
    name: node.name,
    summary: node.summary || "",
    content: node.content,
    storyTime: node.storyTime || "",
    status: node.status,
    factType: node.factType,
    sources: structuredClone(node.sources || []),
    aliases: structuredClone(node.aliases || []),
    knownBy: structuredClone(node.knownBy || []),
    dependsOn: structuredClone(node.dependsOn || []),
    deleted: Boolean(node.deleted),
    contentHash: digest(node.content),
    timestamp: node.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
    actor: { kind: "human", sessionId: null },
    reason: "\u542F\u7528\u8BBE\u5B9A\u5386\u53F2"
  };
}
class SettingRecords {
  files;
  index;
  bodies = /* @__PURE__ */ new Set();
  histories = /* @__PURE__ */ new Set();
  generatedHistories = /* @__PURE__ */ new Set();
  constructor(files) {
    this.files = files;
  }
  get loaded() {
    return this.index !== void 0;
  }
  async readIndex(novel) {
    if (this.index) return;
    const index = await this.files.read("settings/index.json");
    if (!isRecord(index)) corrupt("\u8BBE\u5B9A\u7D22\u5F15\u65E0\u6548");
    if (this.files.version >= 4) checkFileNames(Object.values(index).map((row) => row?.file), this.files.version);
    novel.nodes = Object.fromEntries(Object.entries(index).map(([id, entry]) => {
      if (!isRecord(entry) || entry.id !== id) corrupt("\u8BBE\u5B9A\u7D22\u5F15\u6761\u76EE\u65E0\u6548");
      return [id, { ...without(structuredClone(entry), ["file", "versions"]), content: "" }];
    }));
    this.index = index;
  }
  async read(novel, id) {
    if (!own(novel.nodes, id) || this.bodies.has(id)) return;
    const entry = this.index[id];
    const node = await this.files.read("settings/entries/" + storedSettingFile(entry, id, this.files.version));
    if (!isRecord(node) || node.id !== id || typeof node.content !== "string") corrupt("\u8BBE\u5B9A\u6761\u76EE\u65E0\u6548");
    if (!isDeepStrictEqual(indexMemory(node, entry.file), without(entry, ["versions"]))) corrupt("\u8BBE\u5B9A\u7D22\u5F15\u4E0E\u6761\u76EE\u4E0D\u4E00\u81F4");
    novel.nodes[id] = node;
    this.bodies.add(id);
  }
  async readHistory(novel, id, materialize = true) {
    if (!own(novel.nodes, id)) return;
    await this.read(novel, id);
    if (this.histories.has(id)) return;
    const entry = this.index[id];
    let versions = await this.files.read("history/settings/" + fileId(id) + ".json", true);
    if (versions === void 0) {
      if (Array.isArray(entry.versions) && entry.versions.length) corrupt("\u8BBE\u5B9A\u5386\u53F2\u6587\u4EF6\u7F3A\u5931");
      if (!materialize) return;
      const snapshot = initialHistory(novel.nodes[id]);
      versions = [snapshot];
      entry.versions = [without(snapshot, ["content"])];
      this.generatedHistories.add(id);
    }
    if (!Array.isArray(versions) || !versions.length) corrupt("\u8BBE\u5B9A\u5386\u53F2\u65E0\u6548");
    let previous = 0;
    for (const version of versions) {
      if (!isRecord(version) || !Number.isSafeInteger(version.revision) || version.revision <= previous || typeof version.content !== "string" || digest(version.content) !== version.contentHash) corrupt("\u8BBE\u5B9A\u5386\u53F2\u7248\u672C\u6216\u54C8\u5E0C\u65E0\u6548");
      previous = version.revision;
    }
    const summaries = versions.map((version) => without(version, ["content"]));
    if (entry.versions && !isDeepStrictEqual(summaries, entry.versions)) corrupt("\u8BBE\u5B9A\u5386\u53F2\u4E0E\u7248\u672C\u7D22\u5F15\u4E0D\u4E00\u81F4");
    novel.nodes[id].versions = versions;
    entry.versions = summaries;
    this.histories.add(id);
  }
  async stage(novel, occupied, changes) {
    const previous = this.index;
    const index = {};
    const paths = treeSettingFiles(novel, previous, occupied);
    for (const [id, node] of Object.entries(novel.nodes)) {
      const path = paths[id], oldPath = storedSettingFile(previous[id], id, this.files.version);
      const isNew = !own(previous, id);
      index[id] = indexMemory(node, path);
      if (!this.histories.has(id) && previous[id]?.versions) index[id].versions = previous[id].versions;
      if (this.bodies.has(id) || isNew || !sameJson(index[id], previous[id])) {
        const body = !isNew && !this.bodies.has(id) ? { ...await this.files.read("settings/entries/" + oldPath), ...without(node, ["content"]) } : node;
        await changes.put("settings/entries/" + path, without(body, ["versions"]));
      }
      if (!isNew && oldPath !== path) changes.remove("settings/entries/" + oldPath);
      if ((isNew || this.histories.has(id)) && Array.isArray(node.versions) && node.versions.length) {
        await changes.put("history/settings/" + fileId(id) + ".json", node.versions);
      }
    }
    for (const [id, entry] of Object.entries(previous)) {
      if (own(novel.nodes, id)) continue;
      changes.remove("settings/entries/" + storedSettingFile(entry, id, this.files.version));
      changes.remove("history/settings/" + fileId(id) + ".json");
    }
    await changes.put("settings/index.json", index);
  }
}
export {
  SettingRecords
};
