import {isDeepStrictEqual} from 'node:util';
import {digest} from '../transactions/file-transaction.ts';
import {checkFileNames, corrupt, isRecord, sameJson, type BookRecordChanges, type BookRecordSource} from './book-files.ts';
import {fileId, indexChapter, indexedChapter, own, storedChapterFile, without, type ChapterIndex, type Row} from './project-layout.ts';
import {treeChapterFiles} from './tree-layout.ts';

export class ChapterRecords {
  private readonly files: BookRecordSource;
  private index?: Record<string, ChapterIndex>;
  private readonly bodies = new Set<string>();
  private readonly histories = new Set<string>();

  constructor(files: BookRecordSource) { this.files = files; }
  get loaded() { return this.index !== undefined; }

  async readIndex(novel: Row) {
    if (this.index) return;
    const index: Record<string, ChapterIndex> = await this.files.read('chapters/index.json');
    if (!isRecord(index)) corrupt('章节索引无效');
    if (this.files.version >= 4) checkFileNames(Object.values(index).map(row => row?.file), this.files.version);
    novel.chapters = Object.fromEntries(Object.entries(index).map(([id, entry]) => {
      if (!isRecord(entry?.metadata) || entry.metadata.id !== id || !Array.isArray(entry.versions) ||
          !Number.isSafeInteger(entry.charCount) || !Number.isSafeInteger(entry.textCount)) corrupt('章节索引条目无效');
      return [id, indexedChapter(structuredClone(entry))];
    }));
    this.index = index;
  }

  async read(novel: Row, id: string, history = false) {
    if (!own(novel.chapters, id)) return;
    const entry = this.index![id];
    if (!this.bodies.has(id)) {
      const body = await this.files.read('chapters/' + storedChapterFile(entry, id, this.files.version));
      if (!isRecord(body) || body.id !== id || typeof body.content !== 'string' || body.contentHash !== digest(body.content)) corrupt('章节正文或哈希无效');
      if (!isDeepStrictEqual(without(body, ['content', 'versions']), entry.metadata) || body.content.length !== entry.charCount) corrupt('章节索引与正文不一致');
      novel.chapters[id] = {...body, versions: novel.chapters[id].versions};
      this.bodies.add(id);
    }
    if (history && !this.histories.has(id)) {
      const versions = await this.files.read('history/chapters/' + fileId(id) + '.json');
      if (!Array.isArray(versions)) corrupt('章节历史无效');
      const summary = versions.map(version => ({revision: version.revision, contentHash: version.contentHash}));
      if (!isDeepStrictEqual(summary, entry.versions) || versions.some(version => typeof version.content !== 'string' || digest(version.content) !== version.contentHash)) corrupt('章节历史与版本索引不一致');
      novel.chapters[id].versions = versions;
      this.histories.add(id);
    }
  }

  async stage(novel: Row, occupied: string[], changes: BookRecordChanges) {
    const previous = this.index!;
    const index: Record<string, ChapterIndex> = {};
    const paths = treeChapterFiles(novel, previous, occupied);
    for (const [id, chapter] of Object.entries(novel.chapters) as [string, Row][]) {
      const path = paths[id], oldPath = storedChapterFile(previous[id], id, this.files.version);
      const isNew = !own(previous, id);
      index[id] = indexChapter(chapter, path);
      if (this.bodies.has(id) || isNew || !sameJson(index[id], previous[id])) {
        // A directory edit may have loaded only the index. Keep the saved prose.
        const body = !isNew && !this.bodies.has(id)
          ? {...await this.files.read('chapters/' + oldPath), ...without(chapter, ['content', 'versions'])}
          : chapter;
        await changes.put('chapters/' + path, without(body, ['versions']));
      }
      if (!isNew && oldPath !== path) changes.remove('chapters/' + oldPath);
      if (isNew || this.histories.has(id)) await changes.put('history/chapters/' + fileId(id) + '.json', chapter.versions);
    }
    for (const [id, entry] of Object.entries(previous)) {
      if (own(novel.chapters, id)) continue;
      changes.remove('chapters/' + storedChapterFile(entry, id, this.files.version));
      changes.remove('history/chapters/' + fileId(id) + '.json');
    }
    await changes.put('chapters/index.json', index);
  }
}
