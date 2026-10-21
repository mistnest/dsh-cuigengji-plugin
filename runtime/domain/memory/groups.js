import { randomUUID } from "node:crypto";
import { assertGroupHierarchy, groupTrail } from "../directory/groups.js";
import { memoryPageId, validateMemoryPages } from "./pages.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value, empty = false) => typeof value === "string" && (empty || !!value.trim()) ? value : fail("INVALID_INPUT", "\u5206\u7EC4\u540D\u79F0\u4E0E\u63CF\u8FF0\u5FC5\u987B\u662F\u6587\u672C\uFF0C\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
const touch = (value) => {
  value.revision++;
  value.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
};
const check = (value, revision) => {
  if (!Number.isSafeInteger(revision)) fail("REVISION_REQUIRED", "\u8BF7\u63D0\u4F9B\u8BFB\u53D6\u5230\u7684 expectedRevision");
  if (value.revision !== revision) fail("CONFLICT", "\u8D44\u6599\u6216\u5206\u7EC4\u5DF2\u7ECF\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6");
};
function groupId(novel, value) {
  if (value === null || value === void 0) return null;
  if (typeof value !== "string" || !Object.hasOwn(novel.memoryGroups || {}, value)) return fail("INVALID_INPUT", "\u8D44\u6599\u5206\u7EC4\u4E0D\u5B58\u5728");
  return value;
}
function validateMemoryGroups(novel) {
  validateMemoryPages(novel);
  if (novel.memoryGroups !== void 0 && !isRecord(novel.memoryGroups)) fail("INVALID_BACKUP", "\u8D44\u6599\u5206\u7EC4\u683C\u5F0F\u65E0\u6548");
  for (const [id, value] of Object.entries(novel.memoryGroups || {})) {
    if (!isRecord(value) || id !== value.id || !Number.isSafeInteger(value.revision) || value.revision < 1 || typeof value.name !== "string" || !value.name.trim() || typeof value.summary !== "string") fail("INVALID_BACKUP", "\u8D44\u6599\u5206\u7EC4\u65E0\u6548");
  }
  assertGroupHierarchy(Object.values(novel.memoryGroups || {}), "INVALID_BACKUP");
  for (const group of Object.values(novel.memoryGroups || {})) {
    memoryPageId(novel, group.pageId);
    if (group.parentId && (novel.memoryGroups[group.parentId].pageId ?? null) !== (group.pageId ?? null)) fail("INVALID_BACKUP", "\u6587\u4EF6\u5939\u4E0E\u7236\u6587\u4EF6\u5939\u987B\u5728\u540C\u4E00\u753B\u5E03");
    if (group.position != null && (!isRecord(group.position) || !Number.isFinite(group.position.x) || !Number.isFinite(group.position.y))) fail("INVALID_BACKUP", "\u6587\u4EF6\u5939\u4F4D\u7F6E\u65E0\u6548");
  }
  for (const member of Object.values(novel.nodes)) {
    groupId(novel, member.groupId);
    if (!member.deleted && member.groupId && (novel.memoryGroups[member.groupId].pageId ?? null) !== (member.pageId ?? null)) fail("INVALID_BACKUP", "\u8BBE\u5B9A\u4E0E\u6587\u4EF6\u5939\u987B\u5728\u540C\u4E00\u753B\u5E03");
  }
}
function memoryGroupAction(novel, action, args) {
  const groups = novel.memoryGroups || {};
  if (action === "graph.groups") return Object.values(groups).filter((group2) => args.pageId === void 0 || (group2.pageId ?? null) === memoryPageId(novel, args.pageId)).map((group2) => ({ ...group2, pageId: group2.pageId ?? null, parentId: group2.parentId ?? null, path: groupTrail(Object.values(groups), group2.id).map((g) => g.name) }));
  if (action === "graph.move") {
    const target = groupId(novel, args.groupId);
    const page = args.pageId === void 0 ? target ? groups[target].pageId ?? null : void 0 : memoryPageId(novel, args.pageId);
    if (target && page !== (groups[target].pageId ?? null)) fail("INVALID_INPUT", "\u76EE\u6807\u6587\u4EF6\u5939\u4E0D\u5C5E\u4E8E\u6240\u9009\u753B\u5E03");
    if (!Array.isArray(args.members) || !args.members.length || args.members.length > 200) return fail("INVALID_INPUT", "\u8BF7\u9009\u62E9 1\u2013200 \u6761\u8D44\u6599");
    const members = args.members.map((input) => {
      if (!isRecord(input) || typeof input.id !== "string" || !Object.hasOwn(novel.nodes, input.id)) return fail("NOT_FOUND", "\u8D44\u6599\u4E0D\u5B58\u5728");
      const member = novel.nodes[input.id];
      if (member.deleted) fail("DELETED", "\u8D44\u6599\u5DF2\u5220\u9664");
      check(member, input.expectedRevision);
      return member;
    });
    if (new Set(members.map((m) => m.id)).size !== members.length) fail("INVALID_INPUT", "\u79FB\u52A8\u5217\u8868\u4E2D\u6709\u91CD\u590D\u8D44\u6599");
    for (const member of members) {
      member.groupId = target;
      if (page !== void 0) member.pageId = page;
      touch(member);
    }
    touch(novel);
    return members.map(({ id, revision, updatedAt, groupId: groupId2, pageId }) => ({ id, revision, updatedAt, groupId: groupId2, pageId }));
  }
  if (action === "graph.group.create") {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const parentId = groupId(novel, args.parentId), pageId = args.pageId === void 0 ? parentId ? groups[parentId].pageId ?? null : null : memoryPageId(novel, args.pageId);
    if (parentId && (groups[parentId].pageId ?? null) !== pageId) fail("INVALID_INPUT", "\u7236\u6587\u4EF6\u5939\u4E0D\u5C5E\u4E8E\u6240\u9009\u753B\u5E03");
    const position = args.position;
    if (position != null && (!isRecord(position) || !Number.isFinite(position.x) || !Number.isFinite(position.y))) fail("INVALID_INPUT", "\u6587\u4EF6\u5939\u4F4D\u7F6E\u65E0\u6548");
    const members = args.members === void 0 ? [] : args.members;
    if (!Array.isArray(members) || members.length > 200 || new Set(members.map((m) => m?.id)).size !== members.length) fail("INVALID_INPUT", "\u6587\u4EF6\u5939\u6210\u5458\u987B\u4E3A\u4E0D\u91CD\u590D\u7684\u8BBE\u5B9A\uFF0C\u6700\u591A 200 \u9879");
    const selected = members.map((m) => {
      if (!isRecord(m) || typeof m.id !== "string" || !Object.hasOwn(novel.nodes, m.id)) return fail("NOT_FOUND", "\u8BBE\u5B9A\u4E0D\u5B58\u5728");
      const node = novel.nodes[m.id];
      if (node.deleted || (node.pageId ?? null) !== pageId) fail("INVALID_INPUT", "\u53EA\u80FD\u6536\u7EB3\u5F53\u524D\u753B\u5E03\u7684\u8BBE\u5B9A");
      check(node, m.expectedRevision);
      return node;
    });
    const group2 = { id: randomUUID(), revision: 1, name: text(args.name), summary: text(args.summary ?? "", true), parentId, pageId, ...position ? { position } : {}, createdAt: timestamp, updatedAt: timestamp };
    for (const node of selected) {
      node.groupId = group2.id;
      touch(node);
    }
    novel.memoryGroups = groups;
    groups[group2.id] = group2;
    touch(novel);
    return group2;
  }
  if (typeof args.groupId !== "string" || !Object.hasOwn(groups, args.groupId)) return fail("NOT_FOUND", "\u5206\u7EC4\u4E0D\u5B58\u5728");
  const group = groups[args.groupId];
  check(group, args.expectedRevision);
  if (action === "graph.group.update") {
    const name = args.name === void 0 ? group.name : text(args.name);
    const summary = args.summary === void 0 ? group.summary : text(args.summary, true);
    const position = args.position === void 0 ? group.position : args.position;
    if (position != null && (!isRecord(position) || !Number.isFinite(position.x) || !Number.isFinite(position.y))) fail("INVALID_INPUT", "\u6587\u4EF6\u5939\u4F4D\u7F6E\u65E0\u6548");
    const parentId = args.parentId === void 0 ? group.parentId ?? null : groupId(novel, args.parentId);
    if (parentId && (groups[parentId].pageId ?? null) !== (group.pageId ?? null)) fail("INVALID_INPUT", "\u6587\u4EF6\u5939\u53EA\u80FD\u79FB\u52A8\u5230\u540C\u4E00\u753B\u5E03\u7684\u76EE\u5F55");
    assertGroupHierarchy(Object.values(groups).map((g) => g.id === group.id ? { ...g, parentId } : g), "INVALID_INPUT");
    Object.assign(group, { name, summary, parentId, ...position === void 0 ? {} : { position } });
    touch(group);
    touch(novel);
    return group;
  }
  if (action === "graph.group.delete") {
    if (args.confirm !== true) fail("CONFIRM_REQUIRED", "\u5220\u9664\u5206\u7EC4\u9700\u8981\u786E\u8BA4\uFF1B\u8D44\u6599\u548C\u5B50\u5206\u7EC4\u5C06\u4E0A\u79FB\u4E00\u7EA7");
    for (const member of Object.values(novel.nodes)) if (member.groupId === group.id) {
      member.groupId = group.parentId ?? null;
      touch(member);
    }
    for (const child of Object.values(groups)) if (child.parentId === group.id) {
      child.parentId = group.parentId ?? null;
      touch(child);
    }
    delete groups[group.id];
    touch(novel);
    return group;
  }
  return fail("UNKNOWN_ACTION", action);
}
export {
  groupId,
  memoryGroupAction,
  validateMemoryGroups
};
