import type { Novel } from '../novels/records.ts';
import type { Row, Workspace } from '../operations/record-reader.ts';
import { ensurePlanning } from '../planning/rules/index.ts';
import { portableNovel, retainSharedPlans, validateSharedPlans } from './legacy/legacy.ts';
import { createHandoff } from '../queries/handoff.ts';
import { chapterMetadata } from '../queries/common.ts';
import { cas, fail, now, record, text, touch } from '../operations/records.ts';
import { applyNovelLifecycle, novelLifecycleActions } from './lifecycle.ts';
import { importNovel } from './import.ts';

export function libraryNovelAction(state: Workspace, action: string, a: Row) {
  if (action === 'novel.list')
    return Object.values(state.novels)
      .filter((n) => a.includeArchived || !n.archived)
      .map((n) => ({
        id: n.id,
        title: n.title,
        revision: n.revision,
        archived: n.archived,
        ...(n.archivedAt ? { archivedAt: n.archivedAt } : {}),
        updatedAt: n.updatedAt,
      }));
  if (action === 'novel.create') {
    const n = record({
      title: text(a.title, 'title'),
      description: text(a.description ?? '', 'description', true),
      archived: false,
      volumes: {},
      chapters: {},
      nodes: {},
      edges: {},
      plan: null,
    });
    state.novels[n.id] = n;
    return { id: n.id, title: n.title, revision: n.revision };
  }
  if (action === 'novel.import') {
    // Whole-book files must remain usable without the source library.
    validateSharedPlans({ novels: { [a.backup?.novel?.id]: a.backup?.novel || {} } });
    return importNovel(state, a);
  }
  fail('UNKNOWN_ACTION', `未知操作：${action}`);
}

export function novelAction(state: Workspace, n: Novel, action: string, a: Row, binding: Row | null) {
  if (novelLifecycleActions.includes(action)) {
    cas(n, a);
    if (action === 'novel.purge' && n.archived && a.confirm === true) retainSharedPlans(state, n);
    applyNovelLifecycle(state, n, action, a);
    if (action === 'novel.purge') return { id: n.id, purged: true };
    touch(n);
    return {
      id: n.id,
      title: n.title,
      revision: n.revision,
      archived: n.archived,
      ...(n.archivedAt ? { archivedAt: n.archivedAt } : {}),
    };
  }
  if (action === 'novel.get')
    return {
      ...n,
      creativeMemory: undefined,
      cardImages: undefined,
      tavernSources: undefined,
      planning: undefined,
      plan: undefined,
      volumes: Object.values(n.volumes),
      chapters: Object.values(n.chapters).map(chapterMetadata),
      nodes: Object.values(n.nodes).map(({ content, versions, ...v }) => v),
      edges: Object.values(n.edges).map(({ content, ...v }) => v),
    };
  if (action === 'novel.handoff') return createHandoff(n, binding, a);
  if (action === 'novel.export') {
    ensurePlanning(n);
    return { format: 'cuigengji', schemaVersion: 2, exportedAt: now(), novel: portableNovel(state, n) };
  }
  if (action === 'novel.update') {
    cas(n, a);
    if (a.title !== undefined) n.title = text(a.title, 'title');
    if (a.description !== undefined) n.description = text(a.description, 'description', true);
    touch(n);
    return { id: n.id, title: n.title, revision: n.revision, archived: n.archived };
  }
  fail('UNKNOWN_ACTION', `未知操作：${action}`);
}
