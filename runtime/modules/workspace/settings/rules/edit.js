import { isDeepStrictEqual } from "node:util";
const fields = ["type", "name", "summary", "content", "storyTime", "status", "factType", "sources", "aliases", "knownBy", "dependsOn", "groupId", "pageId", "position"];
const error = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
function validateMemoryMutation(action, args) {
  const allowed = /* @__PURE__ */ new Set([
    "novelId",
    "nodeId",
    "expectedRevision",
    "expectedHash",
    "requestId",
    "reason",
    ...action === "graph.update" ? [...fields, "patch"] : ["confirm"]
  ]);
  const unknown = Object.keys(args).filter((key) => !allowed.has(key));
  if (unknown.length) error("INVALID_INPUT", `${action} \u4E0D\u652F\u6301\u53C2\u6570\uFF1A${unknown.join("\u3001")}\u3002${action === "graph.update" ? "\u5C40\u90E8\u4FEE\u6539\u7528 patch:{oldText,newText}\uFF0C\u6574\u6BB5\u91CD\u5199\u7528 content\u3002" : "graph.delete \u5220\u9664\u6574\u5F20\u8BBE\u5B9A\u5361\uFF1B\u4EC5\u5220\u9664\u5361\u5185\u63CF\u8FF0\u8BF7\u7528 graph.update \u7684 patch\uFF0CnewText \u4E3A\u7A7A\u5B57\u7B26\u4E32\u3002"}`);
  if (args.reason !== void 0 && typeof args.reason !== "string") error("INVALID_INPUT", "reason \u5FC5\u987B\u662F\u6587\u672C");
  if (action === "graph.update" && args.content !== void 0 && args.patch !== void 0) error("INVALID_INPUT", "content \u548C patch \u53EA\u80FD\u9009\u4E00\u4E2A\uFF1Bsummary \u7B49\u5176\u4ED6\u5B57\u6BB5\u53EF\u4EE5\u540C\u65F6\u66F4\u65B0");
}
function patchMemoryContent(content, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) error("INVALID_INPUT", "patch \u5FC5\u987B\u4E3A {oldText,newText} \u5BF9\u8C61");
  const value = patch, unknown = Object.keys(value).filter((key) => !["oldText", "newText"].includes(key));
  if (unknown.length) error("INVALID_INPUT", `patch \u4E0D\u652F\u6301\u53C2\u6570\uFF1A${unknown.join("\u3001")}\uFF1B\u4F7F\u7528 oldText \u548C newText`);
  if (typeof value.oldText !== "string" || !value.oldText.length) error("INVALID_INPUT", "patch.oldText \u5FC5\u987B\u662F\u4ECE\u5F53\u524D content \u8BFB\u53D6\u7684\u975E\u7A7A\u539F\u6587");
  if (typeof value.newText !== "string") error("INVALID_INPUT", "patch.newText \u5FC5\u987B\u662F\u6587\u672C\uFF1B\u5220\u9664\u8BE5\u6BB5\u65F6\u586B\u5199\u7A7A\u5B57\u7B26\u4E32");
  const offset = content.indexOf(value.oldText);
  if (offset === -1) error("PATCH_CONFLICT", "\u5F85\u66FF\u6362\u539F\u6587\u4E0D\u5B58\u5728\uFF1B\u8BF7\u91CD\u8BFB graph.get \u7684\u5F53\u524D content \u540E\u91CD\u65B0\u5B9A\u4F4D\uFF0C\u4E0D\u4F7F\u7528\u6458\u8981\u6216 renderedContent");
  if (content.indexOf(value.oldText, offset + 1) !== -1) error("PATCH_CONFLICT", "\u5F85\u66FF\u6362\u539F\u6587\u5339\u914D\u591A\u5904\uFF1B\u8BF7\u6269\u5145 oldText \u4E0A\u4E0B\u6587\uFF0C\u552F\u4E00\u5B9A\u4F4D\u540E\u518D\u4FEE\u6539");
  return content.slice(0, offset) + value.newText + content.slice(offset + value.oldText.length);
}
function memoryChangedFields(before, after) {
  return [...fields, "deleted"].filter((field) => !isDeepStrictEqual(before[field], after[field]));
}
export {
  memoryChangedFields,
  patchMemoryContent,
  validateMemoryMutation
};
