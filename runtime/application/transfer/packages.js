import { ensurePlanning } from "../../domain/planning/model.js";
import { previewTavern } from "../../infrastructure/migrations/tavern.js";
import { active, copy, fail, hash, checkSelection, own } from "./model.js";
import { portableNovel } from "../../domain/collaboration/legacy.js";
import { directoryKey } from "../../domain/directory/order.js";
import { groupDescendants, groupTrail } from "../../domain/directory/groups.js";
import { readStory } from "../../domain/story/model.js";
import { chapterStory } from "../../domain/story/transfer.js";
const pick = (map, ids) => Object.fromEntries([...ids].map((id) => [id, copy(map[id])]));
const required = (map, ids, label) => {
  for (const id of ids) if (id !== null && !own(map, id)) fail(`${label}\u5DF2\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9`);
};
function selectProjects(source, selection) {
  checkSelection(selection);
  if (selection.kind === "workspace") fail("\u5B8C\u6574\u5DE5\u4F5C\u5E93\u4E0D\u80FD\u4F5C\u4E3A\u5C40\u90E8\u5185\u5BB9\u9009\u62E9");
  if (selection.kind === "works") {
    const ids = selection.novelIds ?? source.map((n2) => n2.id);
    if (!ids.length) fail("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u90E8\u4F5C\u54C1");
    const state = { novels: Object.fromEntries(source.map((n2) => [n2.id, n2])) };
    const projects = ids.map((id) => portableNovel(state, source.find((n2) => n2.id === id) ?? fail("\u6240\u9009\u4F5C\u54C1\u5DF2\u4E0D\u5B58\u5728")));
    return { projects, warnings: [], dependencies: [] };
  }
  const original = source.find((n2) => n2.id === selection.novelId) ?? fail("\u8BF7\u9009\u62E9\u4E00\u90E8\u4F5C\u54C1");
  const n = copy(original), board = ensurePlanning(n);
  const chapters = /* @__PURE__ */ new Set(), nodes = /* @__PURE__ */ new Set(), beats = /* @__PURE__ */ new Set();
  const pages = /* @__PURE__ */ new Set(), decorations = /* @__PURE__ */ new Set();
  if (selection.kind === "chapters") {
    if (selection.chapterIds !== void 0) {
      required(n.chapters, selection.chapterIds, "\u7AE0\u8282");
      for (const id of selection.chapterIds) if (!n.chapters[id].deleted) chapters.add(id);
    }
    if (selection.volumeIds !== void 0) {
      required(n.volumes, selection.volumeIds, "\u5377");
      for (const c of active(n.chapters)) if (c.volumeId && selection.volumeIds.includes(c.volumeId)) chapters.add(c.id);
    }
    if (selection.chapterIds === void 0 && selection.volumeIds === void 0) for (const c of active(n.chapters)) chapters.add(c.id);
  } else if (selection.kind === "memory") {
    if (selection.pageIds !== void 0) {
      required(n.memoryPages || {}, selection.pageIds, "\u8BBE\u5B9A\u753B\u5E03");
      for (const m of active(n.nodes)) if (selection.pageIds.includes(m.pageId ?? null)) nodes.add(m.id);
    }
    if (selection.nodeIds !== void 0) {
      required(n.nodes, selection.nodeIds, "\u8BBE\u5B9A");
      for (const id of selection.nodeIds) if (!n.nodes[id].deleted) nodes.add(id);
    }
    if (selection.groupIds !== void 0) {
      required(n.memoryGroups || {}, selection.groupIds, "\u8BBE\u5B9A\u5206\u7EC4");
      const ids = new Set(selection.groupIds.flatMap((id) => id ? [...groupDescendants(Object.values(n.memoryGroups || {}), id)] : [null]));
      for (const m of active(n.nodes)) if (ids.has(m.groupId ?? null)) nodes.add(m.id);
    }
    if (selection.nodeIds === void 0 && selection.groupIds === void 0 && selection.pageIds === void 0) for (const m of active(n.nodes)) nodes.add(m.id);
    if (selection.memoryType) {
      for (const id of nodes) if (selection.memoryType === "world_entry" ? n.nodes[id].type === "character_card" : n.nodes[id].type !== "character_card") nodes.delete(id);
    }
  } else if (selection.kind === "planning") {
    const ids = selection.pageIds ?? [...n.transferScope?.mainPage === false ? [] : [null], ...active(board.pages).map((p) => p.id)];
    if (n.transferScope?.mainPage === false && ids.includes(null)) fail("\u8FD9\u4E2A\u6570\u636E\u5305\u6CA1\u6709\u5305\u542B\u4E3B\u7EBF\u89C4\u5212\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");
    required(board.pages || {}, ids, "\u89C4\u5212\u9875");
    for (const id of ids) {
      if (id !== null && board.pages[id].deleted) fail("\u6240\u9009\u89C4\u5212\u9875\u5DF2\u5220\u9664");
      pages.add(id);
    }
    for (const b of active(board.nodes)) if (pages.has(b.pageId ?? null)) beats.add(b.id);
    for (const d of active(board.decorations)) if (pages.has(d.pageId ?? null)) decorations.add(d.id);
  } else if (!n.preset) fail("\u8FD9\u90E8\u4F5C\u54C1\u8FD8\u6CA1\u6709\u5199\u4F5C\u9884\u8BBE");
  if (selection.kind === "chapters" && !chapters.size || selection.kind === "memory" && !nodes.size && !selection.pageIds?.length && !selection.groupIds?.length || selection.kind === "planning" && !pages.size) fail("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u9879\u5185\u5BB9");
  const initialChapters = new Set(chapters), initialNodes = new Set(nodes);
  if (selection.includeDependencies) {
    if (selection.kind === "chapters" && n.story !== void 0) {
      for (const item of Object.values(readStory(n).tracking)) if (chapters.has(item.chapterId)) for (const id of item.activeCharacterIds) nodes.add(id);
    }
    for (const id of beats) {
      for (const ref of board.nodes[id].chapterRefs) chapters.add(ref.chapterId);
      for (const ref of board.nodes[id].memoryRefs) nodes.add(ref);
    }
    let changed = true;
    while (changed) {
      const before = nodes.size + chapters.size;
      const relations2 = active(n.edges).filter((e) => nodes.has(e.from) && nodes.has(e.to));
      for (const m of [...[...nodes].map((id) => n.nodes[id]), ...relations2]) {
        for (const ref of m.sources) chapters.add(ref.chapterId);
        for (const id of m.dependsOn) nodes.add(id);
        for (const id of m.knownBy) if (own(n.nodes, id)) nodes.add(id);
      }
      changed = before !== nodes.size + chapters.size;
    }
  }
  const warnings = [], dependencies = [];
  for (const id of chapters) if (!initialChapters.has(id)) dependencies.push({ kind: "\u6B63\u6587", title: n.chapters[id].title });
  for (const id of nodes) if (!initialNodes.has(id)) dependencies.push({ kind: "\u8BBE\u5B9A", title: n.nodes[id].name });
  const result = { ...copy(n), volumes: {}, chapters: pick(n.chapters, chapters), nodes: pick(n.nodes, nodes), edges: {}, memoryGroups: {}, memoryPages: {}, plan: null };
  delete result.planning;
  delete result.preset;
  delete result.tavernSources;
  delete result.collaboration;
  delete result.collaborationProgress;
  delete result.story;
  const volumes = /* @__PURE__ */ new Set();
  for (const ch of Object.values(result.chapters)) {
    if (ch.volumeId) volumes.add(ch.volumeId);
    for (const v of ch.versions) if (v.volumeId && own(n.volumes, v.volumeId)) volumes.add(v.volumeId);
  }
  result.volumes = pick(n.volumes, volumes);
  const relations = active(n.edges).filter((e) => nodes.has(e.from) && nodes.has(e.to));
  result.edges = Object.fromEntries(relations.map((e) => [e.id, copy(e)]));
  let detached = 0;
  for (const m of [...Object.values(result.nodes), ...Object.values(result.edges)]) {
    const missing = m.sources.filter((s) => !chapters.has(s.chapterId)).length + m.dependsOn.filter((id) => !nodes.has(id)).length + m.knownBy.filter((id) => own(n.nodes, id) && !nodes.has(id)).length;
    m.sources = m.sources.filter((s) => chapters.has(s.chapterId));
    m.dependsOn = m.dependsOn.filter((id) => nodes.has(id));
    m.knownBy = m.knownBy.filter((id) => !own(n.nodes, id) || nodes.has(id));
    if (missing) {
      detached += missing;
      m.status = "unconfirmed";
      m.factType = "unconfirmed";
    }
    if ("groupId" in m && m.groupId && n.memoryGroups?.[m.groupId]) result.memoryGroups[m.groupId] = copy(n.memoryGroups[m.groupId]);
  }
  for (const m of Object.values(result.nodes)) for (const v of m.versions || []) {
    const missing = v.sources.some((ref) => !chapters.has(ref.chapterId)) || v.dependsOn.some((id) => !nodes.has(id)) || v.knownBy.some((id) => own(n.nodes, id) && !nodes.has(id));
    v.sources = v.sources.filter((ref) => chapters.has(ref.chapterId));
    v.dependsOn = v.dependsOn.filter((id) => nodes.has(id));
    v.knownBy = v.knownBy.filter((id) => !own(n.nodes, id) || nodes.has(id));
    if (v.groupId && n.memoryGroups?.[v.groupId]) result.memoryGroups[v.groupId] = copy(n.memoryGroups[v.groupId]);
    else v.groupId = null;
    if (missing) {
      v.status = "unconfirmed";
      v.factType = "unconfirmed";
    }
  }
  const retainedSources = /* @__PURE__ */ new Set();
  for (const [fingerprint, original2] of Object.entries(n.tavernSources || {})) {
    const members = Object.values(result.nodes).filter((m) => m.tavern?.fingerprint === fingerprint);
    if (!members.length) continue;
    let complete = false;
    try {
      complete = previewTavern({ json: original2.raw }).nodes.every((entry) => members.some((m) => m.tavern?.index === entry.sourceIndex));
    } catch {
    }
    if (complete) {
      result.tavernSources ??= {};
      result.tavernSources[fingerprint] = copy(original2);
      retainedSources.add(fingerprint);
    }
  }
  for (const m of Object.values(result.nodes)) if (m.tavern && !retainedSources.has(m.tavern.fingerprint)) delete m.tavern;
  if (selection.kind === "memory") {
    for (const id of selection.groupIds || []) if (id) {
      for (const child of groupDescendants(Object.values(n.memoryGroups || {}), id)) if (n.memoryGroups?.[child]) result.memoryGroups[child] = copy(n.memoryGroups[child]);
    }
  }
  if (selection.kind === "memory" && selection.nodeIds === void 0 && selection.groupIds === void 0 && selection.pageIds === void 0) result.memoryGroups = copy(n.memoryGroups || {});
  if (selection.kind === "memory" && selection.pageIds) {
    for (const id of selection.pageIds) if (id && n.memoryPages?.[id]) result.memoryPages[id] = copy(n.memoryPages[id]);
  }
  if (selection.kind === "memory" && selection.pageIds) {
    for (const group of Object.values(n.memoryGroups || {})) if (selection.pageIds.includes(group.pageId ?? null)) result.memoryGroups[group.id] = copy(group);
  }
  for (const group of Object.values(result.memoryGroups || {})) for (const ancestor of groupTrail(Object.values(n.memoryGroups || {}), group.id)) result.memoryGroups[ancestor.id] = copy(ancestor);
  for (const item of [...Object.values(result.nodes), ...Object.values(result.memoryGroups || {}), ...Object.values(result.nodes).flatMap((m) => m.versions || [])]) if (item.pageId && n.memoryPages?.[item.pageId]) result.memoryPages[item.pageId] = copy(n.memoryPages[item.pageId]);
  if (result.memoryPageFolders) result.memoryPageFolders = Object.fromEntries(Object.entries(result.memoryPageFolders).filter(([, groupId]) => own(result.memoryGroups, groupId)));
  if (selection.kind === "planning") {
    result.transferScope = { mainPage: pages.has(null) };
    result.planning = {
      formatVersion: 2,
      sequence: 0,
      transactions: [],
      nodes: pick(board.nodes, beats),
      edges: {},
      pages: pick(board.pages || {}, new Set([...pages].filter((id) => id !== null))),
      groups: Object.fromEntries(Object.values(board.groups).filter((g) => !g.deleted && pages.has(g.pageId ?? null)).map((g) => [g.id, copy(g)])),
      decorations: pick(board.decorations || {}, decorations)
    };
    for (const e of active(board.edges)) if (beats.has(e.from) && beats.has(e.to)) result.planning.edges[e.id] = copy(e);
    for (const b of Object.values(result.planning.nodes)) {
      const before = b.chapterRefs.length + b.memoryRefs.length;
      b.chapterRefs = b.chapterRefs.filter((ref) => chapters.has(ref.chapterId));
      b.memoryRefs = b.memoryRefs.filter((id) => nodes.has(id));
      detached += before - b.chapterRefs.length - b.memoryRefs.length;
      if (b.status === "written" && !b.chapterRefs.length) {
        b.status = "selected";
        warnings.push(`\u201C${b.title}\u201D\u672A\u643A\u5E26\u6B63\u6587\u8BC1\u636E\uFF0C\u5BFC\u5165\u65F6\u6539\u4E3A\u201C\u51C6\u5907\u91C7\u7528\u201D\u3002`);
      }
      if (b.parentId && !beats.has(b.parentId)) b.parentId = null;
      if (b.groupId && board.groups[b.groupId]) result.planning.groups[b.groupId] = copy(board.groups[b.groupId]);
      delete b.lastSequence;
    }
    for (const group of Object.values(result.planning.groups)) for (const ancestor of groupTrail(Object.values(board.groups), group.id)) result.planning.groups[ancestor.id] = copy(ancestor);
  }
  if (selection.kind === "preset") result.preset = copy(n.preset);
  if (result.directoryOrder) {
    result.directoryOrder = Object.fromEntries(Object.entries(result.directoryOrder).flatMap(([key, order]) => {
      if (key === "graph" || key.startsWith("graph:")) return [[key, order.filter((id) => own(result.nodes, id))]];
      const pageId = key.slice("planning:".length) || null;
      if (!result.planning || pageId && !own(result.planning.pages, pageId) || !pageId && result.transferScope?.mainPage === false) return [];
      return [[directoryKey("planning", pageId), order.filter((id) => own(result.planning.nodes, id))]];
    }));
  }
  if (selection.kind === "chapters") {
    const partial = chapterStory(n, chapters, nodes);
    if (partial.story) result.story = partial.story;
    detached += partial.detached;
  }
  if (detached) warnings.push(`\u672A\u643A\u5E26\u7684 ${detached} \u9879\u6B63\u6587\u6216\u8BBE\u5B9A\u5F15\u7528\u4F1A\u79FB\u9664\uFF1B\u76F8\u5173\u8BBE\u5B9A\u9700\u91CD\u65B0\u786E\u8BA4\u3002`);
  return { projects: [result], warnings, dependencies };
}
function dataPackage(slice, kind) {
  const payload = { kind, projects: slice.projects, warnings: slice.warnings };
  return { format: "cuigengji-package", version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), sha256: hash(JSON.stringify(payload)), payload };
}
function readPackage(value) {
  const pkg = value;
  if (!pkg || pkg.format !== "cuigengji-package" || pkg.version !== 1 || !pkg.payload || !Array.isArray(pkg.payload.projects) || !pkg.payload.projects.length || pkg.payload.projects.length > 200 || !["works", "chapters", "memory", "planning", "preset"].includes(pkg.payload.kind) || !Array.isArray(pkg.payload.warnings) || pkg.payload.warnings.some((v) => typeof v !== "string")) fail("\u4E0D\u652F\u6301\u7684\u6570\u636E\u5305\u683C\u5F0F");
  if (pkg.sha256 !== hash(JSON.stringify(pkg.payload))) fail("\u6570\u636E\u5305\u6821\u9A8C\u5931\u8D25\uFF1A\u6587\u4EF6\u4E0D\u5B8C\u6574\u6216\u5DF2\u88AB\u4FEE\u6539");
  if (new Set(pkg.payload.projects.map((n) => n.id)).size !== pkg.payload.projects.length) fail("\u6570\u636E\u5305\u6709\u91CD\u590D\u7684\u4F5C\u54C1 ID");
  return copy(pkg.payload);
}
export {
  dataPackage,
  readPackage,
  selectProjects
};
