import { memoryGroupAction, groupId } from "./rules/groups.js";
import { memoryPageAction, memoryPageId } from "./rules/pages.js";
import { organizeMemoryWorkspace } from "./rules/workspace.js";
import { memoryHistory, memoryVersionFields } from "./rules/history.js";
import { memoryChangedFields, patchMemoryContent, validateMemoryMutation } from "./rules/edit.js";
import { variableAction } from "../variables/index.js";
import { authorizeDirectoryMove, moveDirectory } from "../cards/directory-move.js";
import { settingRows } from "./query.js";
import { settingLayout } from "./layout.js";
import { relationAction } from "./relations.js";
import { cas, clone, fail, get, own, record, touch } from "../operations/records.js";
import {
  appendMemoryVersion,
  checkMemorySources,
  ensureMemoryVersions,
  memoryFields,
  memoryResult,
  memorySourcesStale,
  memoryVersion,
  nodePosition,
  settingKinds
} from "./records.js";
import { updateCards } from "./batch.js";
function settingsAction(n, action, a, actor) {
  if (action === "graph.updateMany") return updateCards(n, a, (draft, edit) => settingsAction(draft, "graph.update", edit, actor));
  if (action === "graph.directory.move") {
    authorizeDirectoryMove(actor);
    memoryPageId(n, a.pageId ?? null);
    return moveDirectory(
      n,
      "graph",
      {
        items: n.nodes,
        groups: n.memoryGroups || {},
        moveMember: (node, { groupId: groupId2 }) => settingsAction(
          n,
          "graph.move",
          {
            groupId: groupId2,
            members: [{ id: node.id, expectedRevision: node.revision }]
          },
          actor
        )
      },
      a
    );
  }
  if (action === "graph.workspace.ensure") {
    const revisions = new Map(Object.values(n.nodes).map((node) => [node.id, node.revision]));
    const result = organizeMemoryWorkspace(n);
    for (const node of Object.values(n.nodes))
      if (node.revision !== revisions.get(node.id))
        appendMemoryVersion(node, actor, "\u5C06\u65E7\u8BBE\u5B9A\u753B\u5E03\u6536\u8FDB\u6587\u4EF6\u5939\uFF0C\u6B63\u6587\u4E0E\u5173\u7CFB\u4FDD\u6301\u4E0D\u53D8");
    return result;
  }
  if (action === "graph.pages" || action.startsWith("graph.page.")) return memoryPageAction(n, action, a);
  if (action === "graph.list") return settingRows(n, a);
  if (action === "graph.groups" || action.startsWith("graph.group.") || action === "graph.move") {
    const before = new Map(Object.values(n.nodes).map((node) => [node.id, node.revision]));
    const result = memoryGroupAction(n, action, a);
    if (["graph.move", "graph.group.create", "graph.group.delete"].includes(action)) {
      for (const node of Object.values(n.nodes))
        if (node.revision !== before.get(node.id))
          appendMemoryVersion(
            node,
            actor,
            action === "graph.move" ? "\u8C03\u6574\u8BBE\u5B9A\u5F52\u5C5E" : action === "graph.group.create" ? "\u6536\u7EB3\u5230\u6587\u4EF6\u5939" : "\u5220\u9664\u8BBE\u5B9A\u5206\u7EC4"
          );
    }
    return result;
  }
  if (action === "graph.get") {
    const result = memoryResult(get(n.nodes, a.nodeId, "\u8282\u70B9"));
    if (n.variables?.enabled && (actor.kind === "agent" || a.resolveVariables === true)) {
      const rendered = variableAction(
        n,
        "variables.render",
        {
          text: result.content,
          ...a.chapterId ? { chapterId: a.chapterId, chapterRevision: a.chapterRevision, position: a.position || "start" } : {},
          characterName: result.type === "character_card" ? result.name : a.characterName
        },
        actor
      );
      return {
        ...result,
        renderedContent: rendered.content,
        variableSnapshot: { id: rendered.snapshotId, revision: rendered.revision },
        variableWarnings: rendered.warnings
      };
    }
    return result;
  }
  if (action === "graph.history") {
    if (a.revision !== void 0 && (!Number.isSafeInteger(a.revision) || a.revision < 1))
      fail("INVALID_INPUT", "revision \u5FC5\u987B\u662F\u6709\u6548\u7684\u5386\u53F2\u7248\u672C\u53F7");
    if (a.includeContent === true && a.revision === void 0)
      fail("INVALID_INPUT", "\u8BFB\u53D6\u5386\u53F2\u6B63\u6587\u9700\u6307\u5B9A revision\uFF1B\u5148\u7528 graph.history \u67E5\u770B\u7248\u672C\u6458\u8981");
    const node = get(n.nodes, a.nodeId, "\u8282\u70B9");
    ensureMemoryVersions(node, actor);
    if (a.revision !== void 0 && !node.versions.some((v) => v.revision === a.revision))
      fail("NOT_FOUND", "\u5386\u53F2\u8BBE\u5B9A\u7248\u672C\u4E0D\u5B58\u5728");
    return memoryHistory(node.versions, a);
  }
  if (["graph.layout.get", "graph.layout", "graph.arrange"].includes(action)) {
    return settingLayout(n, action, a, actor);
  }
  if (action === "graph.continue") {
    const source = get(n.nodes, a.nodeId, "\u8282\u70B9");
    cas(source, a);
    if (source.deleted) fail("DELETED", "\u8D77\u70B9\u5DF2\u5220\u9664");
    if (!["in", "out"].includes(a.side ?? "out")) fail("INVALID_INPUT", "\u8FDE\u63A5\u65B9\u5411\u65E0\u6548");
    const node = settingsAction(
      n,
      "graph.create",
      {
        ...a.value,
        novelId: n.id,
        pageId: source.pageId ?? null,
        groupId: a.value?.groupId === void 0 ? source.groupId ?? null : a.value.groupId
      },
      actor
    );
    const edge = relationAction(n, "edge.create", {
      from: a.side === "in" ? node.id : source.id,
      to: a.side === "in" ? source.id : node.id,
      name: "",
      content: ""
    });
    return { node, edge };
  }
  if (action === "graph.create") {
    if (!settingKinds.has(a.type)) fail("INVALID_INPUT", "\u8282\u70B9\u7C7B\u578B\u65E0\u6548");
    const folder = groupId(n, a.groupId), pageId = a.pageId === void 0 ? folder ? n.memoryGroups[folder].pageId ?? null : null : memoryPageId(n, a.pageId);
    if (folder && (n.memoryGroups[folder].pageId ?? null) !== pageId)
      fail("INVALID_INPUT", "\u8BBE\u5B9A\u4E0E\u6587\u4EF6\u5939\u987B\u5728\u540C\u4E00\u753B\u5E03");
    const v = record({
      type: a.type,
      pageId,
      groupId: folder,
      ...memoryFields(a, n, true),
      ...nodePosition(a),
      deleted: false
    });
    checkMemorySources(n, v);
    Object.assign(v, { versions: [memoryVersion(v, actor, a.reason || "\u521B\u5EFA\u8BBE\u5B9A")] });
    n.nodes[v.id] = v;
    touch(n);
    return memoryResult(v);
  }
  if (action === "graph.update" || action === "graph.delete" || action === "graph.restore") {
    const v = get(n.nodes, a.nodeId, "\u8282\u70B9");
    cas(v, a);
    if (action !== "graph.restore") validateMemoryMutation(action, a);
    const previous = clone(v), previousRevision = v.revision, deletedEdgeIds = [];
    if (action === "graph.delete") {
      if (a.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u9700\u8981 confirm:true");
      v.deleted = true;
      for (const e of Object.values(n.edges))
        if (!e.deleted && (e.from === v.id || e.to === v.id)) {
          e.deleted = true;
          touch(e);
          deletedEdgeIds.push(e.id);
        }
    } else if (action === "graph.restore") {
      if (a.restoreScope !== void 0 && !["all", "content"].includes(a.restoreScope))
        fail("INVALID_INPUT", "restoreScope \u5FC5\u987B\u662F all \u6216 content");
      if (a.restoreScope === "content" && v.deleted) fail("DELETED", "\u8BBE\u5B9A\u5DF2\u5220\u9664\uFF0C\u8BF7\u5148\u6062\u590D\u6B64\u8BBE\u5B9A");
      const target = v.versions?.find((item) => item.revision === a.targetRevision);
      if (!target) fail("NOT_FOUND", "\u5386\u53F2\u8BBE\u5B9A\u7248\u672C\u4E0D\u5B58\u5728");
      for (const field of memoryVersionFields)
        if (!(a.restoreScope === "content" && ["groupId", "pageId", "deleted"].includes(field)) && target[field] !== void 0)
          v[field] = clone(target[field]);
      v.deleted = false;
      if (v.groupId && !own(n.memoryGroups || {}, v.groupId)) v.groupId = null;
      if (v.pageId && n.memoryPageFolders?.[v.pageId]) {
        v.groupId = v.groupId && own(n.memoryGroups || {}, v.groupId) ? v.groupId : own(n.memoryGroups || {}, n.memoryPageFolders[v.pageId]) ? n.memoryPageFolders[v.pageId] : null;
        v.pageId = null;
      }
      if (v.pageId && !own(n.memoryPages || {}, v.pageId)) {
        v.pageId = null;
        v.groupId = null;
      }
      if (v.groupId && (n.memoryGroups[v.groupId].pageId ?? null) !== (v.pageId ?? null)) v.groupId = null;
      if (v.status === "active" && memorySourcesStale(n, v)) v.status = "stale";
      checkMemorySources(n, v);
    } else {
      if (v.deleted) fail("DELETED", "\u8282\u70B9\u5DF2\u5220\u9664");
      if (a.type !== void 0) {
        if (!settingKinds.has(a.type)) fail("INVALID_INPUT", "\u8282\u70B9\u7C7B\u578B\u65E0\u6548");
        v.type = a.type;
      }
      const targetGroup = a.groupId === void 0 ? v.groupId ?? null : groupId(n, a.groupId);
      const pageId = a.pageId === void 0 ? a.groupId !== void 0 && targetGroup ? n.memoryGroups[targetGroup].pageId ?? null : v.pageId ?? null : memoryPageId(n, a.pageId);
      if (targetGroup && (n.memoryGroups[targetGroup].pageId ?? null) !== pageId) {
        if (a.groupId !== void 0) fail("INVALID_INPUT", "\u8BBE\u5B9A\u4E0E\u6587\u4EF6\u5939\u987B\u5728\u540C\u4E00\u753B\u5E03");
        v.groupId = null;
      } else v.groupId = targetGroup;
      if (a.pageId !== void 0 || a.groupId !== void 0) v.pageId = pageId;
      const fields = memoryFields(a, n);
      if (a.type !== void 0) {
        if (!settingKinds.has(a.type))
          fail("INVALID_INPUT", "type \u5FC5\u987B\u662F character_card\u3001world_entry \u6216 world_book");
        fields.type = a.type;
      }
      if (a.patch !== void 0) fields.content = patchMemoryContent(v.content, a.patch);
      Object.assign(v, fields, nodePosition(a));
      checkMemorySources(n, v);
    }
    const changedFields = memoryChangedFields(previous, v);
    const changed = action === "graph.restore" || changedFields.length > 0 || deletedEdgeIds.length > 0;
    if (changed) {
      ensureMemoryVersions(previous, actor);
      v.versions = previous.versions;
      touch(v);
      v.versions.push(
        memoryVersion(
          v,
          actor,
          a.reason || (action === "graph.restore" ? `\u6062\u590D\u8BBE\u5B9A v${a.targetRevision}` : action === "graph.delete" ? "\u5220\u9664\u8BBE\u5B9A" : "\u66F4\u65B0\u8BBE\u5B9A")
        )
      );
      touch(n);
    }
    return {
      ...memoryResult(v),
      changed,
      changedFields,
      previousRevision,
      ...action === "graph.delete" ? { deletedEdgeIds } : {}
    };
  }
  if (action === "graph.duplicate") {
    if (!Array.isArray(a.members) || !a.members.length || a.members.length > 200 || new Set(a.members.map((v) => v.id)).size !== a.members.length)
      fail("INVALID_INPUT", "\u8BF7\u9009\u62E9 1\u2013200 \u4E2A\u4E0D\u540C\u7684\u8282\u70B9");
    const sources = a.members.map((item) => {
      const node = get(n.nodes, item.id, "\u8282\u70B9");
      cas(node, item);
      if (node.deleted) fail("DELETED", "\u8282\u70B9\u5DF2\u5220\u9664");
      return { node, position: item.position === void 0 ? node.position : nodePosition(item).position };
    });
    const mapping = {}, nodes = sources.map(({ node, position }, i) => {
      const copy = settingsAction(
        n,
        "graph.create",
        {
          ...clone(node),
          novelId: n.id,
          name: node.name + " \xB7 \u526F\u672C",
          position: { x: (position?.x ?? 40 + i * 332) + 28, y: (position?.y ?? 60) + 28 }
        },
        actor
      );
      mapping[node.id] = copy.id;
      return copy;
    });
    for (const [id, target] of Object.entries(mapping)) {
      const gallery = n.cardImages?.["memory:" + id];
      if (gallery) n.cardImages["memory:" + target] = clone(gallery);
    }
    const edges = Object.values(n.edges).filter((e) => !e.deleted && mapping[e.from] && mapping[e.to]).map(
      (e) => relationAction(n, "edge.create", { ...clone(e), from: mapping[e.from], to: mapping[e.to] })
    );
    return { nodes, edges };
  }
  if (action === "graph.remove") {
    if (a.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u9700\u8981 confirm:true");
    if (!Array.isArray(a.members) || !a.members.length || a.members.length > 200 || new Set(a.members.map((v) => v.id)).size !== a.members.length)
      fail("INVALID_INPUT", "\u8BF7\u9009\u62E9 1\u2013200 \u4E2A\u4E0D\u540C\u7684\u8282\u70B9");
    for (const item of a.members) {
      const node = get(n.nodes, item.id, "\u8282\u70B9");
      cas(node, item);
      if (node.deleted) fail("DELETED", "\u8282\u70B9\u5DF2\u5220\u9664");
    }
    return a.members.map(
      (item) => settingsAction(
        n,
        "graph.delete",
        {
          novelId: n.id,
          nodeId: item.id,
          expectedRevision: item.expectedRevision,
          confirm: true,
          reason: a.reason
        },
        actor
      )
    );
  }
  fail("UNKNOWN_ACTION", `\u672A\u77E5\u64CD\u4F5C\uFF1A${action}`);
}
export {
  settingsAction
};
