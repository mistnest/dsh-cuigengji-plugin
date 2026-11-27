import { isDeepStrictEqual } from "node:util";
import { digest } from "../transactions/file-transaction.js";
import { checkFileNames, corrupt, isRecord, sameJson } from "./book-files.js";
import { fileId, indexChapter, indexedChapter, own, storedChapterFile, without } from "./project-layout.js";
import { treeChapterFiles } from "./tree-layout.js";
class ChapterRecords {
  files;
  index;
  bodies = /* @__PURE__ */ new Set();
  histories = /* @__PURE__ */ new Set();
  constructor(files) {
    this.files = files;
  }
  get loaded() {
    return this.index !== void 0;
  }
  async readIndex(novel) {
    if (this.index) return;
    const index = await this.files.read("chapters/index.json");
    if (!isRecord(index)) corrupt("\u7AE0\u8282\u7D22\u5F15\u65E0\u6548");
    if (this.files.version >= 4) checkFileNames(Object.values(index).map((row) => row?.file), this.files.version);
    novel.chapters = Object.fromEntries(Object.entries(index).map(([id, entry]) => {
      if (!isRecord(entry?.metadata) || entry.metadata.id !== id || !Array.isArray(entry.versions) || !Number.isSafeInteger(entry.charCount) || !Number.isSafeInteger(entry.textCount)) corrupt("\u7AE0\u8282\u7D22\u5F15\u6761\u76EE\u65E0\u6548");
      return [id, indexedChapter(structuredClone(entry))];
    }));
    this.index = index;
  }
  async read(novel, id, history = false) {
    if (!own(novel.chapters, id)) return;
    const entry = this.index[id];
    if (!this.bodies.has(id)) {
      const body = await this.files.read("chapters/" + storedChapterFile(entry, id, this.files.version));
      if (!isRecord(body) || body.id !== id || typeof body.content !== "string" || body.contentHash !== digest(body.content)) corrupt("\u7AE0\u8282\u6B63\u6587\u6216\u54C8\u5E0C\u65E0\u6548");
      if (!isDeepStrictEqual(without(body, ["content", "versions"]), entry.metadata) || body.content.length !== entry.charCount) corrupt("\u7AE0\u8282\u7D22\u5F15\u4E0E\u6B63\u6587\u4E0D\u4E00\u81F4");
      novel.chapters[id] = { ...body, versions: novel.chapters[id].versions };
      this.bodies.add(id);
    }
    if (history && !this.histories.has(id)) {
      const versions = await this.files.read("history/chapters/" + fileId(id) + ".json");
      if (!Array.isArray(versions)) corrupt("\u7AE0\u8282\u5386\u53F2\u65E0\u6548");
      const summary = versions.map((version) => ({ revision: version.revision, contentHash: version.contentHash }));
      if (!isDeepStrictEqual(summary, entry.versions) || versions.some((version) => typeof version.content !== "string" || digest(version.content) !== version.contentHash)) corrupt("\u7AE0\u8282\u5386\u53F2\u4E0E\u7248\u672C\u7D22\u5F15\u4E0D\u4E00\u81F4");
      novel.chapters[id].versions = versions;
      this.histories.add(id);
    }
  }
  async stage(novel, occupied, changes) {
    const previous = this.index;
    const index = {};
    const paths = treeChapterFiles(novel, previous, occupied);
    for (const [id, chapter] of Object.entries(novel.chapters)) {
      const path = paths[id], oldPath = storedChapterFile(previous[id], id, this.files.version);
      const isNew = !own(previous, id);
      index[id] = indexChapter(chapter, path);
      if (this.bodies.has(id) || isNew || !sameJson(index[id], previous[id])) {
        const body = !isNew && !this.bodies.has(id) ? { ...await this.files.read("chapters/" + oldPath), ...without(chapter, ["content", "versions"]) } : chapter;
        await changes.put("chapters/" + path, without(body, ["versions"]));
      }
      if (!isNew && oldPath !== path) changes.remove("chapters/" + oldPath);
      if (isNew || this.histories.has(id)) await changes.put("history/chapters/" + fileId(id) + ".json", chapter.versions);
    }
    for (const [id, entry] of Object.entries(previous)) {
      if (own(novel.chapters, id)) continue;
      changes.remove("chapters/" + storedChapterFile(entry, id, this.files.version));
      changes.remove("history/chapters/" + fileId(id) + ".json");
    }
    await changes.put("chapters/index.json", index);
  }
}
export {
  ChapterRecords
};
