import { ensurePlanning } from "../planning/rules/index.js";
import { portableNovel, retainSharedPlans, validateSharedPlans } from "./legacy/legacy.js";
import { createHandoff } from "../queries/handoff.js";
import { chapterMetadata } from "../queries/common.js";
import { cas, fail, now, record, text, touch } from "../operations/records.js";
import { applyNovelLifecycle, novelLifecycleActions } from "./lifecycle.js";
import { importNovel } from "./import.js";
function libraryNovelAction(state, action, a) {
  if (action === "novel.list")
    return Object.values(state.novels).filter((n) => a.includeArchived || !n.archived).map((n) => ({
      id: n.id,
      title: n.title,
      revision: n.revision,
      archived: n.archived,
      ...n.archivedAt ? { archivedAt: n.archivedAt } : {},
      updatedAt: n.updatedAt
    }));
  if (action === "novel.create") {
    const n = record({
      title: text(a.title, "title"),
      description: text(a.description ?? "", "description", true),
      archived: false,
      volumes: {},
      chapters: {},
      nodes: {},
      edges: {},
      plan: null
    });
    state.novels[n.id] = n;
    return { id: n.id, title: n.title, revision: n.revision };
  }
  if (action === "novel.import") {
    validateSharedPlans({ novels: { [a.backup?.novel?.id]: a.backup?.novel || {} } });
    return importNovel(state, a);
  }
  fail("UNKNOWN_ACTION", `\u672A\u77E5\u64CD\u4F5C\uFF1A${action}`);
}
function novelAction(state, n, action, a, binding) {
  if (novelLifecycleActions.includes(action)) {
    cas(n, a);
    if (action === "novel.purge" && n.archived && a.confirm === true) retainSharedPlans(state, n);
    applyNovelLifecycle(state, n, action, a);
    if (action === "novel.purge") return { id: n.id, purged: true };
    touch(n);
    return {
      id: n.id,
      title: n.title,
      revision: n.revision,
      archived: n.archived,
      ...n.archivedAt ? { archivedAt: n.archivedAt } : {}
    };
  }
  if (action === "novel.get")
    return {
      ...n,
      creativeMemory: void 0,
      cardImages: void 0,
      tavernSources: void 0,
      planning: void 0,
      plan: void 0,
      volumes: Object.values(n.volumes),
      chapters: Object.values(n.chapters).map(chapterMetadata),
      nodes: Object.values(n.nodes).map(({ content, versions, ...v }) => v),
      edges: Object.values(n.edges).map(({ content, ...v }) => v)
    };
  if (action === "novel.handoff") return createHandoff(n, binding, a);
  if (action === "novel.export") {
    ensurePlanning(n);
    return { format: "cuigengji", schemaVersion: 2, exportedAt: now(), novel: portableNovel(state, n) };
  }
  if (action === "novel.update") {
    cas(n, a);
    if (a.title !== void 0) n.title = text(a.title, "title");
    if (a.description !== void 0) n.description = text(a.description, "description", true);
    touch(n);
    return { id: n.id, title: n.title, revision: n.revision, archived: n.archived };
  }
  fail("UNKNOWN_ACTION", `\u672A\u77E5\u64CD\u4F5C\uFF1A${action}`);
}
export {
  libraryNovelAction,
  novelAction
};
