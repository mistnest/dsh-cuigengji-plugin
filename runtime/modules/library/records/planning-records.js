import { isDeepStrictEqual } from "node:util";
import { checkFileNames, corrupt, isRecord, sameJson } from "./book-files.js";
import { fileId, own, pageKey, planningIndex, planningPage, storedPageFile, without } from "./project-layout.js";
import { pageManifest, treePlanningFiles } from "./tree-layout.js";
function indexedPage(index, pageId) {
  return index ? planningPage(index, pageId) : null;
}
class PlanningRecords {
  files;
  stored;
  index;
  pages = /* @__PURE__ */ new Set();
  transactions = /* @__PURE__ */ new Set();
  legacyLoaded = false;
  indexLoaded = false;
  constructor(files, stored) {
    this.files = files;
    this.stored = stored;
  }
  get loaded() {
    return this.indexLoaded;
  }
  get pageIds() {
    return this.index?.pageIds ?? [];
  }
  async readIndex(novel) {
    if (this.loaded) return;
    if (!this.stored) {
      delete novel.planning;
    } else {
      const index = await this.files.read("planning/index.json");
      if (index) {
        if (!isRecord(index.board) || !isRecord(index.nodes) || !isRecord(index.edges) || !isRecord(index.decorations) || !Array.isArray(index.pageIds) || !Array.isArray(index.transactions)) corrupt("\u89C4\u5212\u7D22\u5F15\u65E0\u6548");
        if (this.files.version >= 4) {
          if (!isRecord(index.pageFiles)) corrupt("\u89C4\u5212\u9875\u9762\u6587\u4EF6\u7D22\u5F15\u65E0\u6548");
          const pageNames = index.pageIds.map((id) => index.pageFiles[pageKey(id)]);
          checkFileNames(pageNames, this.files.version);
          if (this.files.version >= 5) {
            if (!isRecord(index.nodeFiles) || !isRecord(index.decorationFiles) || Object.keys(index.nodeFiles).length !== Object.keys(index.nodes).length || Object.keys(index.decorationFiles).length !== Object.keys(index.decorations).length) corrupt("\u89C4\u5212\u6761\u76EE\u6587\u4EF6\u7D22\u5F15\u65E0\u6548");
            checkFileNames([
              ...pageNames,
              ...Object.keys(index.nodes).map((id) => index.nodeFiles[id]),
              ...Object.keys(index.decorations).map((id) => index.decorationFiles[id])
            ], this.files.version);
          }
        }
        const summaries = (rows) => Object.fromEntries(
          Object.entries(rows).map(([id, row]) => [id, { ...structuredClone(row), content: "" }])
        );
        novel.planning = {
          ...structuredClone(index.board),
          nodes: summaries(index.nodes),
          edges: structuredClone(index.edges),
          transactions: structuredClone(index.transactions)
        };
        if (index.hasDecorations) novel.planning.decorations = summaries(index.decorations);
        if (index.hasLegacy) novel.planning.legacy = index.legacyPreview ? { ...structuredClone(index.legacyPreview), content: "" } : null;
      } else novel.planning = null;
      this.index = index;
    }
    this.indexLoaded = true;
  }
  async readPage(novel, pageId, preserveDraft = false) {
    const index = this.index;
    if (this.pages.has(pageId) || !index?.pageIds.includes(pageId)) return;
    const expected = planningPage(index, pageId);
    let page = await this.files.read("planning/" + storedPageFile(index, pageId, this.files.version));
    if (this.files.version >= 5) {
      if (!isDeepStrictEqual(page, pageManifest(expected))) corrupt("\u89C4\u5212\u9875\u9762\u76EE\u5F55\u4E0E\u7D22\u5F15\u4E0D\u4E00\u81F4");
      const load = async (ids, paths) => Object.fromEntries(
        await Promise.all(ids.map(async (id) => [id, await this.files.read("planning/" + paths[id])]))
      );
      page = { ...expected, nodes: await load(page.nodeIds, index.nodeFiles), decorations: await load(page.decorationIds, index.decorationFiles) };
    }
    if (!isRecord(page) || page.pageId !== pageId || !isRecord(page.nodes) || !isRecord(page.edges) || !isRecord(page.decorations)) corrupt("\u89C4\u5212\u9875\u9762\u65E0\u6548");
    const summaries = (rows) => Object.fromEntries(Object.entries(rows).map(([id, row]) => [id, without(row, ["content"])]));
    const actual = { pageId, nodes: summaries(page.nodes), edges: page.edges, decorations: summaries(page.decorations) };
    if (!isDeepStrictEqual(actual, expected) || [...Object.values(page.nodes), ...Object.values(page.decorations)].some((row) => typeof row.content !== "string")) corrupt("\u89C4\u5212\u7D22\u5F15\u4E0E\u9875\u9762\u5185\u5BB9\u4E0D\u4E00\u81F4");
    for (const collection of ["nodes", "decorations"]) {
      for (const [id, row] of Object.entries(page[collection])) {
        const target = novel.planning[collection] ??= {};
        if (!preserveDraft) target[id] = row;
        else if (target[id]) target[id] = { ...row, ...target[id], content: row.content };
      }
    }
    this.pages.add(pageId);
  }
  async readTransaction(novel, id) {
    const at = novel.planning?.transactions.findIndex((transaction) => transaction.id === id) ?? -1;
    if (at < 0 || this.transactions.has(id)) return;
    novel.planning.transactions[at] = await this.files.read("history/planning/" + fileId(id) + ".json");
    this.transactions.add(id);
  }
  async readAll(novel) {
    await this.readIndex(novel);
    if (!this.index) return;
    if (this.index.hasLegacy) {
      novel.planning.legacy = await this.files.read("history/planning-legacy.json");
      this.legacyLoaded = true;
    }
    for (const id of this.pageIds) await this.readPage(novel, id);
    for (const transaction of novel.planning.transactions) await this.readTransaction(novel, transaction.id);
  }
  async stage(novel, occupied, changes) {
    const board = novel.planning;
    if (!board) return changes.put("planning/index.json", null);
    const previous = this.index;
    const tree = treePlanningFiles(board, previous, occupied);
    for (const pageId of this.pageIds) {
      const pageFile = tree.pageFiles[pageKey(pageId)];
      if (!pageFile) continue;
      const moved = (rows, paths, oldPaths) => Object.values(rows).some((row) => (row.pageId ?? null) === pageId && paths[row.id] !== oldPaths?.[row.id]);
      if (pageFile !== storedPageFile(previous, pageId, this.files.version) || moved(board.nodes, tree.nodeFiles, previous?.nodeFiles) || moved(board.decorations ?? {}, tree.decorationFiles, previous?.decorationFiles)) {
        await this.readPage(novel, pageId, true);
      }
    }
    const index = planningIndex(board, tree.pageFiles, tree);
    if (own(board, "legacy") && (this.legacyLoaded || !previous?.hasLegacy)) await changes.put("history/planning-legacy.json", board.legacy);
    for (const pageId of index.pageIds) {
      const file = storedPageFile(index, pageId, this.files.version), oldFile = storedPageFile(previous, pageId, this.files.version);
      const existed = previous?.pageIds.includes(pageId);
      if (this.pages.has(pageId) || file !== oldFile || !existed || !sameJson(indexedPage(index, pageId), indexedPage(previous, pageId))) {
        const page = planningPage(board, pageId);
        await changes.put("planning/" + file, pageManifest(page));
        for (const [id, row] of Object.entries(page.nodes)) await changes.put("planning/" + tree.nodeFiles[id], row);
        for (const [id, row] of Object.entries(page.decorations)) await changes.put("planning/" + tree.decorationFiles[id], row);
      }
      if (existed && file !== oldFile) changes.remove("planning/" + oldFile);
    }
    for (const id of this.pageIds) {
      if (!index.pageIds.includes(id)) changes.remove("planning/" + storedPageFile(previous, id, this.files.version));
    }
    for (const [oldPaths, paths] of [[previous?.nodeFiles, tree.nodeFiles], [previous?.decorationFiles, tree.decorationFiles]]) {
      for (const [id, path] of Object.entries(oldPaths ?? {})) if (paths[id] !== path) changes.remove("planning/" + path);
    }
    for (const transaction of board.transactions) {
      if (this.transactions.has(transaction.id) || !previous?.transactions.some((row) => row.id === transaction.id)) {
        await changes.put("history/planning/" + fileId(transaction.id) + ".json", transaction);
      }
    }
    await changes.put("planning/index.json", index);
  }
}
export {
  PlanningRecords
};
