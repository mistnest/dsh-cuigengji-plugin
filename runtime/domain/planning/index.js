import { ensurePlanning, validatePlanning } from "./model.js";
import { normalizePlanningOperations } from "./operations.js";
import { ensurePlanning as ensurePlanning2, validatePlanning as validatePlanning2 } from "./model.js";
import { randomUUID } from "node:crypto";
import { directoryKey, orderedDirectory } from "../directory/order.js";
import { groupMatches, groupTrail } from "../directory/groups.js";
import { linkedResources } from "./resources.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const copy = (v) => structuredClone(v);
const own = (map, id) => Object.prototype.hasOwnProperty.call(map, id);
const entity = (map, id) => {
  if (!id || !own(map, id)) fail("NOT_FOUND", "\u89C4\u5212\u5BF9\u8C61\u4E0D\u5B58\u5728");
  return map[id];
};
const check = (item, revision) => {
  if (item.revision !== revision) fail("CONFLICT", `\u89C4\u5212\u7248\u672C\u5DF2\u53D8\u5316\uFF0C\u5F53\u524D\u7248\u672C ${item.revision}`);
};
const page = (values, args) => {
  const offset = args.offset ?? 0, limit = args.limit ?? 50;
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200) fail("INVALID_INPUT", "\u5206\u9875\u53C2\u6570\u65E0\u6548");
  return { items: values.slice(offset, offset + limit), total: values.length, nextOffset: offset + limit < values.length ? offset + limit : null };
};
function planningAction(novel, action, args, actor) {
  const board = ensurePlanning(novel);
  const inPage = (node) => args.pageId === void 0 || (node.pageId ?? null) === args.pageId;
  if (args.pageId !== void 0 && args.pageId !== null && (!own(board.pages || {}, args.pageId) || board.pages[args.pageId].deleted)) fail("NOT_FOUND", "\u89C4\u5212\u9875\u9762\u4E0D\u5B58\u5728");
  if (action === "planning.pages") return [{ id: null, name: "\u4E3B\u7EBF\u89C4\u5212", summary: "\u539F\u6709\u89C4\u5212\u4E0E\u9ED8\u8BA4\u9875\u9762", revision: 0 }, ...Object.values(board.pages || {}).filter((p) => !p.deleted)].map((p) => ({ ...p, nodeCount: Object.values(board.nodes).filter((n) => !n.deleted && (n.pageId ?? null) === p.id).length, decorationCount: Object.values(board.decorations || {}).filter((d) => !d.deleted && d.pageId === p.id).length, groupCount: Object.values(board.groups || {}).filter((g) => !g.deleted && (g.pageId ?? null) === p.id).length }));
  if (action === "planning.decorations") return { ...page(Object.values(board.decorations || {}).filter((d) => (args.includeDeleted || !d.deleted) && inPage(d)), args), sequence: board.sequence };
  if (action.startsWith("planning.page.")) {
    const op = action.slice("planning.".length);
    const result = planningAction(novel, "planning.apply", { ...args, operations: [{ op, id: args.pageId, expectedRevision: args.expectedRevision, confirm: args.confirm, ref: "page", value: { name: args.name, summary: args.summary } }] }, actor);
    return { ...novel.planning.pages[result.mapping.page || args.pageId || ""], sequence: result.sequence, transactionId: result.transactionId };
  }
  if (action === "planning.continue") {
    const source = entity(board.nodes, args.nodeId);
    check(source, args.expectedRevision);
    if (source.deleted) fail("DELETED", "\u8D77\u70B9\u5DF2\u5220\u9664");
    if (args.side !== void 0 && !["in", "out"].includes(args.side)) fail("INVALID_INPUT", "\u8FDE\u63A5\u65B9\u5411\u65E0\u6548");
    if (typeof args.value?.title !== "string" || !args.value.title.trim()) fail("INVALID_INPUT", "\u8BF7\u586B\u5199\u4E0B\u4E00\u6B65\u60C5\u8282\u6807\u9898");
    const result = planningAction(novel, "planning.apply", { ...args, reason: args.reason || `\u4ECE\u300C${source.title}\u300D\u7EE7\u7EED\u63A8\u8FDB`, operations: [
      { op: "node.create", ref: "continuation", value: { ...args.value, pageId: source.pageId ?? null, groupId: args.value?.groupId === void 0 ? source.groupId ?? null : args.value.groupId, parentId: args.value?.parentId === void 0 ? source.parentId : args.value.parentId } },
      { op: "edge.create", value: { from: args.side === "in" ? "continuation" : source.id, to: args.side === "in" ? source.id : "continuation", type: "next" } }
    ] }, actor);
    const { content, ...node } = novel.planning.nodes[result.mapping.continuation];
    return { ...result, node, from: source.id };
  }
  if (action === "planning.groups") return Object.values(board.groups).filter((g) => !g.deleted && inPage(g)).map((group) => ({ ...group, parentId: group.parentId ?? null, path: groupTrail(Object.values(board.groups), group.id).map((g) => g.name) }));
  if (action.startsWith("planning.group.")) {
    const op = action.slice("planning.".length);
    const result = planningAction(novel, "planning.apply", { ...args, operations: [{ op, id: args.groupId, expectedRevision: args.expectedRevision, confirm: args.confirm, ref: "group", value: { name: args.name, summary: args.summary, parentId: args.parentId, ...op === "group.create" ? { pageId: args.pageId } : {} } }] }, actor);
    return { ...novel.planning.groups[result.mapping.group || args.groupId || ""], sequence: result.sequence, transactionId: result.transactionId };
  }
  if (action === "planning.list" || action === "planning.search") {
    const q = (args.query || "").toLowerCase();
    const source = args.pageId === void 0 ? Object.values(board.nodes) : orderedDirectory(Object.values(board.nodes), novel.directoryOrder?.[directoryKey("planning", args.pageId)]);
    const inGroup = groupMatches(Object.values(board.groups), args.groupId);
    const rows = source.filter((n) => inPage(n) && (args.includeDeleted || !n.deleted) && (args.parentId === void 0 || n.parentId === args.parentId) && inGroup(n) && (!args.status || n.status === args.status) && (!args.thread || n.threads.includes(args.thread)) && (!q || `${n.title}
${n.summary}`.toLowerCase().includes(q))).map(({ content, ...n }) => n);
    return { ...page(rows, args), edges: Object.values(board.edges).filter((e) => !e.deleted && inPage(board.nodes[e.from])), sequence: board.sequence };
  }
  if (action === "planning.get") {
    const node = entity(board.nodes, args.nodeId), edges = Object.values(board.edges).filter((e) => !e.deleted && (e.from === node.id || e.to === node.id));
    const neighbors = Object.values(board.nodes).filter((n) => !n.deleted && n.id !== node.id && edges.some((e) => e.from === n.id || e.to === n.id)).map(({ content, ...n }) => n);
    const offset = args.resourceOffset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0) fail("INVALID_INPUT", "\u8D44\u6E90\u6458\u8981\u5206\u9875\u65E0\u6548");
    return { node, edges, neighbors, resources: linkedResources(node.memoryRefs, novel.nodes, offset, 12, novel.id), flow: { previous: neighbors.filter((n) => edges.some((e) => e.from === n.id && e.to === node.id)), next: neighbors.filter((n) => edges.some((e) => e.from === node.id && e.to === n.id)) }, children: Object.values(board.nodes).filter((n) => !n.deleted && n.parentId === node.id).map(({ content, ...n }) => n), sequence: board.sequence };
  }
  if (action === "planning.changes" || action === "planning.history") {
    const values = board.transactions.filter((t) => (args.after === void 0 || t.sequence > args.after) && (!args.nodeId || t.changes.some((c) => c.id === args.nodeId)));
    return { ...page(action === "planning.history" ? values.reverse() : values, args), sequence: board.sequence };
  }
  if (!["planning.apply", "planning.revert"].includes(action)) fail("UNKNOWN_ACTION", action);
  if (typeof args.requestId !== "string" || !args.requestId) fail("INVALID_INPUT", "\u89C4\u5212\u4FEE\u6539\u5FC5\u987B\u63D0\u4F9B requestId");
  if (args.expectedSequence !== void 0 && args.expectedSequence !== board.sequence) fail("CONFLICT", "\u89C4\u5212\u7ED3\u6784\u5728\u786E\u8BA4\u671F\u95F4\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9\u5220\u9664\u8303\u56F4");
  const draft = copy(board), touched = /* @__PURE__ */ new Map(), mapping = {};
  draft.pages ??= {};
  draft.decorations ??= {};
  const remember = (collection, id) => {
    const key = `${collection}:${id}`;
    if (!touched.has(key)) touched.set(key, { collection, id, before: copy(draft[collection][id] ?? null) });
  };
  const stamp = () => ({ lastSequence: board.sequence + 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), actor: { kind: actor.kind === "human" ? "human" : "agent", sessionId: actor.sessionId || null } });
  const update = (collection, id, patch, replace = false) => {
    remember(collection, id);
    const previous = draft[collection][id];
    draft[collection][id] = { ...replace ? {} : previous, ...patch, id, revision: (previous?.revision || 0) + 1, ...stamp() };
  };
  const resolve = (id) => id && (own(mapping, id) ? mapping[id] : id) || "";
  if (action === "planning.revert") {
    const transaction2 = board.transactions.find((t) => t.id === args.transactionId);
    if (!transaction2) fail("NOT_FOUND", "\u53D8\u66F4\u8BB0\u5F55\u4E0D\u5B58\u5728");
    for (const change of transaction2.changes) {
      const current = entity(draft[change.collection], change.id);
      check(current, change.after.revision);
      update(change.collection, change.id, change.before || { ...current, deleted: true }, true);
    }
  } else {
    for (const op of normalizePlanningOperations(args.operations)) {
      if (op.op === "page.create") {
        const id = randomUUID();
        if (op.ref) {
          if (own(mapping, op.ref)) fail("INVALID_INPUT", "\u4E34\u65F6\u5F15\u7528\u91CD\u590D");
          Object.defineProperty(mapping, op.ref, { value: id, enumerable: true });
        }
        update("pages", id, { name: op.value?.name, summary: op.value?.summary ?? "", deleted: false });
      } else if (op.op === "page.update" || op.op === "page.delete") {
        const id = resolve(op.id), p = entity(draft.pages, id);
        check(p, op.expectedRevision);
        if (p.deleted) fail("DELETED", "\u9875\u9762\u5DF2\u5220\u9664");
        if (op.op === "page.delete") {
          if (op.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u9875\u9762\u9700\u8981\u786E\u8BA4");
          if ([...Object.values(draft.nodes), ...Object.values(draft.decorations)].some((n) => !n.deleted && n.pageId === id)) fail("PAGE_NOT_EMPTY", "\u8BF7\u5148\u79FB\u51FA\u60C5\u8282\u5E76\u79FB\u9664\u6279\u6CE8\uFF0C\u518D\u5220\u9664\u7A7A\u9875\u9762");
          if (Object.values(draft.groups).some((g) => !g.deleted && g.pageId === id)) fail("PAGE_NOT_EMPTY", "\u8BF7\u5148\u79FB\u51FA\u6216\u89E3\u6563\u6587\u4EF6\u5939\uFF0C\u518D\u5220\u9664\u7A7A\u753B\u5E03");
          update("pages", id, { deleted: true });
        } else update("pages", id, Object.fromEntries(["name", "summary"].filter((k) => op.value?.[k] !== void 0).map((k) => [k, op.value[k]])));
      } else if (op.op === "decoration.create") {
        const id = randomUUID();
        if (op.ref) {
          if (own(mapping, op.ref)) fail("INVALID_INPUT", "\u4E34\u65F6\u5F15\u7528\u91CD\u590D");
          Object.defineProperty(mapping, op.ref, { value: id, enumerable: true });
        }
        const groupId = resolve(op.value?.groupId) || null;
        update("decorations", id, { kind: "note", title: "", content: "", position: { x: 40, y: 60 }, width: 280, height: 160, color: "sand", fontSize: 18, fontFamily: "sans", ...pickDecoration(op.value), layoutPending: op.value?.position === void 0, pageId: op.value?.pageId === void 0 ? groupId ? draft.groups[groupId]?.pageId ?? null : null : resolve(op.value.pageId) || null, groupId, deleted: false });
      } else if (op.op === "decoration.update" || op.op === "decoration.delete") {
        const id = resolve(op.id), d = entity(draft.decorations, id);
        check(d, op.expectedRevision);
        if (d.deleted) fail("DELETED", "\u6279\u6CE8\u5DF2\u5220\u9664");
        if (op.op === "decoration.delete") {
          if (op.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u6279\u6CE8\u9700\u8981\u786E\u8BA4");
          update("decorations", id, { deleted: true });
        } else {
          const value = pickDecoration(op.value);
          if (value.pageId) value.pageId = resolve(value.pageId);
          if (value.groupId) value.groupId = resolve(value.groupId);
          if (value.position) value.layoutPending = false;
          update("decorations", id, value);
        }
      } else if (op.op === "group.create") {
        const id = randomUUID();
        if (op.ref) {
          if (own(mapping, op.ref)) fail("INVALID_INPUT", "\u4E34\u65F6\u5F15\u7528\u91CD\u590D");
          Object.defineProperty(mapping, op.ref, { value: id, enumerable: true });
        }
        const parentId = resolve(op.value?.parentId) || null, pageId = op.value?.pageId === void 0 ? parentId ? draft.groups[parentId]?.pageId ?? null : null : resolve(op.value.pageId) || null;
        update("groups", id, { name: op.value?.name, summary: op.value?.summary ?? "", parentId, pageId, ...op.value?.position ? { position: op.value.position } : {}, deleted: false });
      } else if (op.op === "group.update" || op.op === "group.delete") {
        const id = resolve(op.id), group = entity(draft.groups, id);
        check(group, op.expectedRevision);
        if (group.deleted) fail("DELETED", "\u5206\u7EC4\u5DF2\u5220\u9664");
        if (op.op === "group.delete") {
          if (op.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u5206\u7EC4\u9700\u8981\u786E\u8BA4");
          for (const node of Object.values(draft.nodes)) if (node.groupId === id) update("nodes", node.id, { groupId: group.parentId ?? null });
          for (const note of Object.values(draft.decorations)) if (note.groupId === id) update("decorations", note.id, { groupId: group.parentId ?? null });
          for (const child of Object.values(draft.groups)) if (child.parentId === id) update("groups", child.id, { parentId: group.parentId ?? null });
          update("groups", id, { deleted: true });
        } else update("groups", id, Object.fromEntries(["name", "summary", "parentId", "position"].filter((k) => op.value?.[k] !== void 0).map((k) => [k, k === "parentId" ? resolve(op.value[k]) || null : op.value[k]])));
      } else if (op.op === "node.create") {
        const id = randomUUID();
        if (op.ref) {
          if (own(mapping, op.ref)) fail("INVALID_INPUT", "\u4E34\u65F6\u5F15\u7528\u91CD\u590D");
          Object.defineProperty(mapping, op.ref, { value: id, enumerable: true });
        }
        const groupId = resolve(op.value?.groupId) || null;
        update("nodes", id, { title: "\u65B0\u89C4\u5212", summary: "", content: "", scope: "unspecified", status: "idea", threads: [], chapterRefs: [], memoryRefs: [], ...pickNode(op.value), pageId: op.value?.pageId === void 0 ? groupId ? draft.groups[groupId]?.pageId ?? null : null : resolve(op.value.pageId) || null, groupId, parentId: resolve(op.value?.parentId) || null, deleted: false });
      } else if (op.op === "node.update") {
        const id = resolve(op.id), node = entity(draft.nodes, id);
        check(node, op.expectedRevision);
        if (node.deleted) fail("DELETED", "\u89C4\u5212\u5DF2\u5220\u9664");
        const value = pickNode(op.value);
        if (value.parentId) value.parentId = resolve(value.parentId);
        if (value.groupId) value.groupId = resolve(value.groupId);
        if (value.pageId) value.pageId = resolve(value.pageId);
        update("nodes", id, value);
      } else if (op.op === "node.delete") {
        const id = resolve(op.id), node = entity(draft.nodes, id);
        check(node, op.expectedRevision);
        if (op.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u9700\u8981\u786E\u8BA4");
        const children = Object.values(draft.nodes).filter((n) => !n.deleted && n.parentId === id);
        if (children.length && !["detach", "subtree"].includes(op.childPolicy || "")) fail("CONFIRM_REQUIRED", "\u8BF7\u9009\u62E9\u79FB\u51FA\u5B50\u8282\u70B9\u6216\u5220\u9664\u5B50\u6811");
        const ids = /* @__PURE__ */ new Set([id]);
        if (op.childPolicy === "subtree") {
          let changed = true;
          while (changed) {
            changed = false;
            for (const n of Object.values(draft.nodes)) if (!n.deleted && n.parentId !== null && ids.has(n.parentId) && !ids.has(n.id)) {
              ids.add(n.id);
              changed = true;
            }
          }
        } else for (const child of children) update("nodes", child.id, { parentId: node.parentId });
        for (const target of ids) update("nodes", target, { deleted: true });
        for (const edge of Object.values(draft.edges)) if (!edge.deleted && (ids.has(edge.from) || ids.has(edge.to))) update("edges", edge.id, { deleted: true });
      } else if (op.op === "edge.create") {
        update("edges", randomUUID(), { from: resolve(op.value?.from), to: resolve(op.value?.to), type: op.value?.type || "next", label: op.value?.label || "", deleted: false });
      } else if (op.op === "edge.update") {
        const id = resolve(op.id), edge = entity(draft.edges, id);
        check(edge, op.expectedRevision);
        if (edge.deleted) fail("DELETED", "\u5173\u7CFB\u5DF2\u5220\u9664");
        update("edges", id, Object.fromEntries(["from", "to", "type", "label"].filter((k) => op.value?.[k] !== void 0).map((k) => [k, k === "from" || k === "to" ? resolve(op.value[k]) : op.value[k]])));
      } else if (op.op === "edge.delete") {
        const id = resolve(op.id);
        check(entity(draft.edges, id), op.expectedRevision);
        if (op.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u5173\u7CFB\u9700\u8981\u786E\u8BA4");
        update("edges", id, { deleted: true });
      } else fail("INVALID_INPUT", `\u4E0D\u652F\u6301\u7684\u89C4\u5212\u64CD\u4F5C`);
    }
  }
  for (const d of Object.values(draft.decorations)) {
    if (d.deleted || d.members === void 0) continue;
    if (!Array.isArray(d.members)) fail("INVALID_PLANNING", "\u8BA8\u8BBA\u6846\u6210\u5458\u5FC5\u987B\u662F ID \u6570\u7EC4");
    const members = d.members.map((id) => resolve(id)).filter((id) => {
      const member = own(draft.nodes, id) ? draft.nodes[id] : own(draft.decorations, id) ? draft.decorations[id] : null;
      if (!member) return true;
      return !member.deleted && (member.pageId ?? null) === (d.pageId ?? null);
    });
    if (JSON.stringify(members) !== JSON.stringify(d.members)) {
      if (touched.has(`decorations:${d.id}`)) d.members = members;
      else update("decorations", d.id, { members });
    }
  }
  validatePlanning(draft, novel);
  const transaction = { id: randomUUID(), sequence: board.sequence + 1, ...stamp(), reason: typeof args.reason === "string" ? args.reason : "\u8C03\u6574\u89C4\u5212", changes: [...touched.values()].map((c) => ({ ...c, after: copy(draft[c.collection][c.id]) })) };
  draft.sequence = transaction.sequence;
  draft.transactions.push(transaction);
  novel.planning = draft;
  return { transactionId: transaction.id, sequence: draft.sequence, mapping, changed: transaction.changes.map((c) => ({ id: c.id, collection: c.collection, revision: c.after.revision })) };
}
function pickNode(value = {}) {
  return Object.fromEntries(["title", "summary", "content", "scope", "status", "parentId", "groupId", "pageId", "position", "threads", "chapterRefs", "memoryRefs"].filter((k) => value[k] !== void 0).map((k) => [k, value[k]]));
}
function pickDecoration(value = {}) {
  return Object.fromEntries(["pageId", "groupId", "kind", "title", "content", "position", "width", "height", "color", "fontSize", "fontFamily", "moveContents", "members"].filter((k) => value[k] !== void 0).map((k) => [k, value[k]]));
}
export {
  ensurePlanning2 as ensurePlanning,
  planningAction,
  validatePlanning2 as validatePlanning
};
