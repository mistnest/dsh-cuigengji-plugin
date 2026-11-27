import { cas, fail, get } from "../operations/records.js";
import { errorInfo } from "../../../platform/errors.js";
import { validateMemoryMutation } from "./rules/edit.js";
const editableCardFields = [
  "name",
  "summary",
  "content",
  "patch",
  "storyTime",
  "status",
  "factType",
  "aliases",
  "knownBy",
  "sources",
  "dependsOn"
];
function settingEdits(args) {
  if (typeof args.requestId !== "string" || !args.requestId.trim())
    fail("REQUEST_ID_REQUIRED", "\u6279\u91CF\u4FEE\u6539\u9700\u8981 requestId");
  if (!Array.isArray(args.updates) || !args.updates.length || args.updates.length > 20)
    fail("INVALID_INPUT", "updates \u9700\u8981 1\u201320 \u5F20\u4E0D\u540C\u7684\u8BBE\u5B9A\u5361");
  if (Object.keys(args).some((key) => !["novelId", "requestId", "reason", "updates"].includes(key)) || args.reason !== void 0 && typeof args.reason !== "string")
    fail("INVALID_INPUT", "\u6279\u91CF\u4FEE\u6539\u53EA\u63A5\u53D7 novelId\u3001requestId\u3001reason \u548C updates");
  const seen = /* @__PURE__ */ new Set();
  for (const edit of args.updates) {
    if (!edit || typeof edit.nodeId !== "string" || !edit.nodeId.trim() || seen.has(edit.nodeId))
      fail("INVALID_INPUT", "\u6BCF\u4E00\u9879\u9700\u8981\u4E0D\u540C\u7684 nodeId");
    if (!Number.isSafeInteger(edit.expectedRevision) || edit.expectedRevision < 1)
      fail("REVISION_REQUIRED", `\u8BBE\u5B9A ${edit.nodeId} \u9700\u8981\u521A\u8BFB\u53D6\u7684 expectedRevision`);
    if (!editableCardFields.some((field) => edit[field] !== void 0) || Object.keys(edit).some(
      (key) => key !== "nodeId" && key !== "expectedRevision" && !editableCardFields.some((field) => field === key)
    )) {
      fail("INVALID_INPUT", `\u8BBE\u5B9A ${edit.nodeId} \u9700\u8981\u53D7\u652F\u6301\u7684\u4FEE\u6539\u5B57\u6BB5\uFF0C\u5982 patch\u3001content \u6216 summary`);
    }
    validateMemoryMutation("graph.update", edit);
    seen.add(edit.nodeId);
  }
  return args.updates;
}
function updateCards(novel, args, update) {
  const edits = settingEdits(args);
  const draft = { ...novel, nodes: { ...novel.nodes } };
  const items = edits.map((edit, index) => {
    const nodeId = edit.nodeId;
    try {
      const node = get(novel.nodes, nodeId, "\u8BBE\u5B9A");
      cas(node, edit);
      draft.nodes[nodeId] = structuredClone(node);
      const { id, changed, changedFields, previousRevision, revision } = update(draft, {
        ...edit,
        reason: args.reason
      });
      return { id, changed, changedFields, previousRevision, revision };
    } catch (error) {
      const { code, message, details } = errorInfo(error);
      throw Object.assign(new Error(`\u7B2C ${index + 1} \u9879\u8BBE\u5B9A ${nodeId}\uFF1A${message}\u3002\u672C\u6279\u672A\u4FDD\u5B58`), {
        code,
        details: {
          ...details,
          index,
          nodeId,
          expectedRevision: edit.expectedRevision,
          ...Object.hasOwn(novel.nodes, nodeId) ? { currentRevision: novel.nodes[nodeId].revision } : {}
        }
      });
    }
  });
  Object.assign(novel, { nodes: draft.nodes, revision: draft.revision, updatedAt: draft.updatedAt });
  return { novelId: novel.id, items };
}
export {
  editableCardFields,
  settingEdits,
  updateCards
};
