import {isDeepStrictEqual} from 'node:util';
import {digest} from '../transactions/file-transaction.ts';
import {checkFileNames, corrupt, isRecord, sameJson, type BookRecordChanges, type BookRecordSource} from './book-files.ts';
import {fileId, indexMemory, own, storedSettingFile, without, type Row} from './project-layout.ts';
import {treeSettingFiles} from './tree-layout.ts';

function initialHistory(node: Row) {
  return {
    revision: node.revision, type: node.type, groupId: node.groupId ?? null, name: node.name,
    summary: node.summary || '', content: node.content, storyTime: node.storyTime || '',
    status: node.status, factType: node.factType, sources: structuredClone(node.sources || []),
    aliases: structuredClone(node.aliases || []), knownBy: structuredClone(node.knownBy || []),
    dependsOn: structuredClone(node.dependsOn || []), deleted: Boolean(node.deleted),
    contentHash: digest(node.content), timestamp: node.updatedAt || new Date().toISOString(),
    actor: {kind: 'human', sessionId: null}, reason: '启用设定历史',
  };
}

export class SettingRecords {
  private readonly files: BookRecordSource;
  private index?: Record<string, Row>;
  private readonly bodies = new Set<string>();
  private readonly histories = new Set<string>();
  readonly generatedHistories = new Set<string>();

  constructor(files: BookRecordSource) { this.files = files; }
  get loaded() { return this.index !== undefined; }

  async readIndex(novel: Row) {
    if (this.index) return;
    const index: Record<string, Row> = await this.files.read('settings/index.json');
    if (!isRecord(index)) corrupt('设定索引无效');
    if (this.files.version >= 4) checkFileNames(Object.values(index).map(row => row?.file), this.files.version);
    novel.nodes = Object.fromEntries(Object.entries(index).map(([id, entry]) => {
      if (!isRecord(entry) || entry.id !== id) corrupt('设定索引条目无效');
      return [id, {...without(structuredClone(entry), ['file', 'versions']), content: ''}];
    }));
    this.index = index;
  }

  async read(novel: Row, id: string) {
    if (!own(novel.nodes, id) || this.bodies.has(id)) return;
    const entry = this.index![id];
    const node = await this.files.read('settings/entries/' + storedSettingFile(entry, id, this.files.version));
    if (!isRecord(node) || node.id !== id || typeof node.content !== 'string') corrupt('设定条目无效');
    if (!isDeepStrictEqual(indexMemory(node, entry.file), without(entry, ['versions']))) corrupt('设定索引与条目不一致');
    novel.nodes[id] = node;
    this.bodies.add(id);
  }

  async readHistory(novel: Row, id: string, materialize = true) {
    if (!own(novel.nodes, id)) return;
    await this.read(novel, id);
    if (this.histories.has(id)) return;
    const entry = this.index![id];
    let versions = await this.files.read('history/settings/' + fileId(id) + '.json', true);
    if (versions === undefined) {
      if (Array.isArray(entry.versions) && entry.versions.length) corrupt('设定历史文件缺失');
      if (!materialize) return;
      const snapshot = initialHistory(novel.nodes[id]);
      versions = [snapshot];
      entry.versions = [without(snapshot, ['content'])];
      this.generatedHistories.add(id);
    }
    if (!Array.isArray(versions) || !versions.length) corrupt('设定历史无效');
    let previous = 0;
    for (const version of versions) {
      if (!isRecord(version) || !Number.isSafeInteger(version.revision) || version.revision <= previous ||
          typeof version.content !== 'string' || digest(version.content) !== version.contentHash) corrupt('设定历史版本或哈希无效');
      previous = version.revision;
    }
    const summaries = versions.map(version => without(version, ['content']));
    if (entry.versions && !isDeepStrictEqual(summaries, entry.versions)) corrupt('设定历史与版本索引不一致');
    novel.nodes[id].versions = versions;
    entry.versions = summaries;
    this.histories.add(id);
  }

  async stage(novel: Row, occupied: string[], changes: BookRecordChanges) {
    const previous = this.index!;
    const index: Record<string, Row> = {};
    const paths = treeSettingFiles(novel, previous, occupied);
    for (const [id, node] of Object.entries(novel.nodes) as [string, Row][]) {
      const path = paths[id], oldPath = storedSettingFile(previous[id], id, this.files.version);
      const isNew = !own(previous, id);
      index[id] = indexMemory(node, path);
      // An index-only edit must preserve the separately stored revision history.
      if (!this.histories.has(id) && previous[id]?.versions) index[id].versions = previous[id].versions;
      if (this.bodies.has(id) || isNew || !sameJson(index[id], previous[id])) {
        const body = !isNew && !this.bodies.has(id)
          ? {...await this.files.read('settings/entries/' + oldPath), ...without(node, ['content'])}
          : node;
        await changes.put('settings/entries/' + path, without(body, ['versions']));
      }
      if (!isNew && oldPath !== path) changes.remove('settings/entries/' + oldPath);
      if ((isNew || this.histories.has(id)) && Array.isArray(node.versions) && node.versions.length) {
        await changes.put('history/settings/' + fileId(id) + '.json', node.versions);
      }
    }
    for (const [id, entry] of Object.entries(previous)) {
      if (own(novel.nodes, id)) continue;
      changes.remove('settings/entries/' + storedSettingFile(entry, id, this.files.version));
      changes.remove('history/settings/' + fileId(id) + '.json');
    }
    await changes.put('settings/index.json', index);
  }
}
