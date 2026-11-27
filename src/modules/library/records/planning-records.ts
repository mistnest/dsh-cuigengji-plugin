import {isDeepStrictEqual} from 'node:util';
import {checkFileNames, corrupt, isRecord, sameJson, type BookRecordChanges, type BookRecordSource} from './book-files.ts';
import {fileId, own, pageKey, planningIndex, planningPage, storedPageFile, without, type PlanningIndex, type Row} from './project-layout.ts';
import {pageManifest, treePlanningFiles} from './tree-layout.ts';

function indexedPage(index: PlanningIndex | null | undefined, pageId: string | null) {
  return index ? planningPage(index, pageId) : null;
}

export class PlanningRecords {
  private readonly files: BookRecordSource;
  private readonly stored: boolean;
  private index?: PlanningIndex | null;
  private readonly pages = new Set<string | null>();
  private readonly transactions = new Set<string>();
  private legacyLoaded = false;
  private indexLoaded = false;

  constructor(files: BookRecordSource, stored: boolean) {
    this.files = files;
    this.stored = stored;
  }

  get loaded() { return this.indexLoaded; }
  get pageIds() { return this.index?.pageIds ?? []; }

  async readIndex(novel: Row) {
    if (this.loaded) return;
    if (!this.stored) {
      delete novel.planning;
    } else {
      const index: PlanningIndex | null = await this.files.read('planning/index.json');
      if (index) {
        if (!isRecord(index.board) || !isRecord(index.nodes) || !isRecord(index.edges) || !isRecord(index.decorations) ||
            !Array.isArray(index.pageIds) || !Array.isArray(index.transactions)) corrupt('规划索引无效');
        if (this.files.version >= 4) {
          if (!isRecord(index.pageFiles)) corrupt('规划页面文件索引无效');
          const pageNames = index.pageIds.map(id => index.pageFiles![pageKey(id)]);
          checkFileNames(pageNames, this.files.version);
          if (this.files.version >= 5) {
            if (!isRecord(index.nodeFiles) || !isRecord(index.decorationFiles) ||
                Object.keys(index.nodeFiles).length !== Object.keys(index.nodes).length ||
                Object.keys(index.decorationFiles).length !== Object.keys(index.decorations).length) corrupt('规划条目文件索引无效');
            checkFileNames([
              ...pageNames,
              ...Object.keys(index.nodes).map(id => index.nodeFiles![id]),
              ...Object.keys(index.decorations).map(id => index.decorationFiles![id]),
            ], this.files.version);
          }
        }
        const summaries = (rows: Record<string, Row>) => Object.fromEntries(
          Object.entries(rows).map(([id, row]) => [id, {...structuredClone(row), content: ''}]),
        );
        novel.planning = {...structuredClone(index.board), nodes: summaries(index.nodes),
          edges: structuredClone(index.edges), transactions: structuredClone(index.transactions)};
        if (index.hasDecorations) novel.planning.decorations = summaries(index.decorations);
        if (index.hasLegacy) novel.planning.legacy = index.legacyPreview ? {...structuredClone(index.legacyPreview), content: ''} : null;
      } else novel.planning = null;
      this.index = index;
    }
    this.indexLoaded = true;
  }

  async readPage(novel: Row, pageId: string | null, preserveDraft = false) {
    const index = this.index;
    if (this.pages.has(pageId) || !index?.pageIds.includes(pageId)) return;
    const expected = planningPage(index, pageId);
    let page = await this.files.read('planning/' + storedPageFile(index, pageId, this.files.version));
    if (this.files.version >= 5) {
      if (!isDeepStrictEqual(page, pageManifest(expected))) corrupt('规划页面目录与索引不一致');
      const load = async (ids: string[], paths: Record<string, string>) => Object.fromEntries(
        await Promise.all(ids.map(async id => [id, await this.files.read('planning/' + paths[id])])),
      );
      page = {...expected, nodes: await load(page.nodeIds, index.nodeFiles!), decorations: await load(page.decorationIds, index.decorationFiles!)};
    }
    if (!isRecord(page) || page.pageId !== pageId || !isRecord(page.nodes) || !isRecord(page.edges) || !isRecord(page.decorations)) corrupt('规划页面无效');
    const summaries = (rows: Record<string, Row>) => Object.fromEntries(Object.entries(rows).map(([id, row]) => [id, without(row, ['content'])]));
    const actual = {pageId, nodes: summaries(page.nodes), edges: page.edges, decorations: summaries(page.decorations)};
    if (!isDeepStrictEqual(actual, expected) || [...Object.values(page.nodes), ...Object.values(page.decorations)].some(row => typeof row.content !== 'string')) corrupt('规划索引与页面内容不一致');
    for (const collection of ['nodes', 'decorations'] as const) {
      for (const [id, row] of Object.entries(page[collection]) as [string, Row][]) {
        const target = novel.planning[collection] ??= {};
        if (!preserveDraft) target[id] = row;
        else if (target[id]) target[id] = {...row, ...target[id], content: row.content};
      }
    }
    this.pages.add(pageId);
  }

  async readTransaction(novel: Row, id: string) {
    const at = novel.planning?.transactions.findIndex((transaction: Row) => transaction.id === id) ?? -1;
    if (at < 0 || this.transactions.has(id)) return;
    novel.planning.transactions[at] = await this.files.read('history/planning/' + fileId(id) + '.json');
    this.transactions.add(id);
  }

  async readAll(novel: Row) {
    await this.readIndex(novel);
    if (!this.index) return;
    if (this.index.hasLegacy) {
      novel.planning.legacy = await this.files.read('history/planning-legacy.json');
      this.legacyLoaded = true;
    }
    for (const id of this.pageIds) await this.readPage(novel, id);
    for (const transaction of novel.planning.transactions) await this.readTransaction(novel, transaction.id);
  }

  async stage(novel: Row, occupied: string[], changes: BookRecordChanges) {
    const board = novel.planning;
    if (!board) return changes.put('planning/index.json', null);
    const previous = this.index;
    const tree = treePlanningFiles(board, previous, occupied);
    for (const pageId of this.pageIds) {
      const pageFile = tree.pageFiles[pageKey(pageId)];
      if (!pageFile) continue;
      const moved = (rows: Record<string, Row>, paths: Record<string, string>, oldPaths?: Record<string, string>) =>
        Object.values(rows).some(row => (row.pageId ?? null) === pageId && paths[row.id] !== oldPaths?.[row.id]);
      // A rename can be index-only. Load the original bodies before writing their new paths.
      if (pageFile !== storedPageFile(previous, pageId, this.files.version) ||
          moved(board.nodes, tree.nodeFiles, previous?.nodeFiles) ||
          moved(board.decorations ?? {}, tree.decorationFiles, previous?.decorationFiles)) {
        await this.readPage(novel, pageId, true);
      }
    }
    const index = planningIndex(board, tree.pageFiles, tree);
    if (own(board, 'legacy') && (this.legacyLoaded || !previous?.hasLegacy)) await changes.put('history/planning-legacy.json', board.legacy);
    for (const pageId of index.pageIds) {
      const file = storedPageFile(index, pageId, this.files.version), oldFile = storedPageFile(previous, pageId, this.files.version);
      const existed = previous?.pageIds.includes(pageId);
      if (this.pages.has(pageId) || file !== oldFile || !existed || !sameJson(indexedPage(index, pageId), indexedPage(previous, pageId))) {
        const page = planningPage(board, pageId);
        await changes.put('planning/' + file, pageManifest(page));
        for (const [id, row] of Object.entries(page.nodes)) await changes.put('planning/' + tree.nodeFiles[id], row);
        for (const [id, row] of Object.entries(page.decorations)) await changes.put('planning/' + tree.decorationFiles[id], row);
      }
      if (existed && file !== oldFile) changes.remove('planning/' + oldFile);
    }
    for (const id of this.pageIds) {
      if (!index.pageIds.includes(id)) changes.remove('planning/' + storedPageFile(previous, id, this.files.version));
    }
    for (const [oldPaths, paths] of [[previous?.nodeFiles, tree.nodeFiles], [previous?.decorationFiles, tree.decorationFiles]] as const) {
      for (const [id, path] of Object.entries(oldPaths ?? {})) if (paths[id] !== path) changes.remove('planning/' + path);
    }
    for (const transaction of board.transactions) {
      if (this.transactions.has(transaction.id) || !previous?.transactions.some(row => row.id === transaction.id)) {
        await changes.put('history/planning/' + fileId(transaction.id) + '.json', transaction);
      }
    }
    await changes.put('planning/index.json', index);
  }
}
