import { randomUUID } from "node:crypto";
import { importPreset, validatePreset, presetBlockNotice } from "./index.js";
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const fail = (message, code = "INVALID_PRESET") => {
  throw Object.assign(new Error(message), { code });
};
const copy = (value) => structuredClone(value);
const empty = () => ({ name: "\u5199\u4F5C\u9884\u8BBE", enabled: false, blocks: [], revision: 0 });
function keys(value, allowed, label) {
  if (!object(value)) fail(`${label} \u5FC5\u987B\u662F\u5BF9\u8C61`);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) fail(`${label} \u4E0D\u652F\u6301\u53C2\u6570\uFF1A${unknown.join("\u3001")}`);
}
function presetDocument(preset, identifier) {
  const { raw, ...value } = preset || empty();
  if (identifier === void 0) return copy(value);
  if (typeof identifier !== "string" || !identifier) fail("identifier \u5FC5\u987B\u662F\u975E\u7A7A\u6761\u76EE\u6807\u8BC6");
  const block = value.blocks.find((item) => item.identifier === identifier);
  if (!block) fail(`\u9884\u8BBE\u6761\u76EE\u4E0D\u5B58\u5728\uFF1A${identifier}`, "NOT_FOUND");
  return { name: value.name, enabled: value.enabled, revision: value.revision, block: copy(block) };
}
function previewPresetImport({ input, fileName, orderId }) {
  if (fileName !== void 0 && (typeof fileName !== "string" || fileName.length > 512)) fail("fileName \u5FC5\u987B\u662F\u6587\u4EF6\u540D");
  let value = input;
  if (typeof value === "string") {
    value = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    if (!value.trim()) fail("\u9884\u8BBE\u6587\u4EF6\u4E3A\u7A7A");
    if (value.length > 2e6) fail("\u9884\u8BBE\u6587\u4EF6\u8D85\u8FC7 2 MB");
    const plain = /\.(txt|md)$/i.test(fileName || "");
    if (!plain && (/\.json$/i.test(fileName || "") || /^[\s]*[\[{]/.test(value))) {
      try {
        value = JSON.parse(value);
      } catch {
        fail("\u9884\u8BBE\u6587\u4EF6\u4E0D\u662F\u6709\u6548 JSON\uFF1B\u7EAF\u6587\u672C\u6216 Markdown \u8BF7\u63D0\u4F9B .txt / .md \u7684 fileName");
      }
    } else {
      value = { name: fileName?.replace(/^.*[\\/]/, "").replace(/\.(txt|md)$/i, "") || "\u5BFC\u5165\u7684\u5199\u4F5C\u9884\u8BBE", content: value };
    }
  }
  if (object(value) && Array.isArray(value.blocks)) {
    const preset = { ...copy(validatePreset(value)), enabled: false, raw: copy(value) };
    return validatePreset(preset);
  }
  return importPreset(value, orderId);
}
function validatePresetCommand(action, args) {
  keys(args, ["novelId", "expectedRevision", "requestId", "reason", ...action === "preset.import" ? ["input", "fileName", "orderId", "sourceNovelId", "policy", "enabled"] : ["name", "enabled", "operations"]], action);
  if (typeof args.requestId !== "string" || !args.requestId.trim()) fail("\u9884\u8BBE\u5199\u5165\u9700\u8981\u552F\u4E00 requestId\uFF1B\u53EA\u6709\u539F\u6837\u91CD\u8BD5\u590D\u7528", "REQUEST_ID_REQUIRED");
  if (args.reason !== void 0 && typeof args.reason !== "string") fail("reason \u5FC5\u987B\u662F\u6587\u672C");
  if (args.enabled !== void 0 && typeof args.enabled !== "boolean") fail("enabled \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
}
function importPresetDocument(previous, args, imported = previewPresetImport(args)) {
  if (!["append", "replace"].includes(args.policy)) fail("policy \u5FC5\u987B\u660E\u786E\u4E3A append\uFF08\u8FFD\u52A0\uFF09\u6216 replace\uFF08\u66FF\u6362\uFF09");
  const value = copy(imported), mapping = /* @__PURE__ */ Object.create(null);
  const append = args.policy === "append" && previous;
  const used = new Set(append ? previous.blocks.map((block) => block.identifier) : []);
  for (const block of value.blocks) {
    if (used.has(block.identifier)) {
      const original = block.identifier;
      block.identifier = randomUUID();
      mapping[original] = block.identifier;
    }
    used.add(block.identifier);
  }
  const preset = {
    ...value,
    name: append ? previous.name : value.name,
    enabled: args.enabled ?? (append ? previous.enabled : false),
    blocks: append ? [...copy(previous.blocks), ...value.blocks] : value.blocks,
    ...append && previous.raw !== void 0 ? { raw: { previous: copy(previous.raw), imported: copy(value.raw ?? null) } } : {},
    warnings: [.../* @__PURE__ */ new Set([...append ? previous.warnings || [] : [], ...value.warnings || []])]
  };
  validatePreset(preset);
  return { preset, mapping };
}
function patchContent(content, patch) {
  keys(patch, ["oldText", "newText"], "patch");
  if (typeof patch.oldText !== "string" || !patch.oldText || typeof patch.newText !== "string") fail("patch \u9700\u8981\u975E\u7A7A oldText \u548C\u6587\u672C newText\uFF1B\u7A7A newText \u5220\u9664\u8BE5\u6BB5");
  const offset = content.indexOf(patch.oldText);
  if (offset < 0 || content.indexOf(patch.oldText, offset + 1) >= 0) fail("\u9884\u8BBE\u539F\u6587\u4E0D\u5B58\u5728\u6216\u5339\u914D\u591A\u5904\uFF0C\u8BF7\u91CD\u8BFB\u5F53\u524D\u6761\u76EE\u5E76\u552F\u4E00\u5B9A\u4F4D", "PATCH_CONFLICT");
  return content.slice(0, offset) + patch.newText + content.slice(offset + patch.oldText.length);
}
function updatePresetDocument(previous, args) {
  const preset = copy(previous || empty());
  for (const field of ["name", "enabled"]) if (args[field] !== void 0) preset[field] = args[field];
  if (args.operations !== void 0 && (!Array.isArray(args.operations) || !args.operations.length || args.operations.length > 200)) fail("operations \u5FC5\u987B\u5305\u542B 1\u2014200 \u9879\u64CD\u4F5C");
  if (args.name === void 0 && args.enabled === void 0 && args.operations === void 0) fail("\u8BF7\u63D0\u4F9B name\u3001enabled \u6216 operations");
  for (const operation of args.operations || []) {
    if (!object(operation) || !["create", "update", "delete", "move"].includes(operation.op)) fail("\u9884\u8BBE\u6761\u76EE op \u5FC5\u987B\u4E3A create/update/delete/move");
    const { op } = operation;
    keys(operation, ["op", "identifier", ...op === "create" ? ["name", "content", "enabled", "before"] : op === "update" ? ["name", "content", "enabled", "patch"] : op === "move" ? ["before"] : []], `operations.${op}`);
    if (op !== "create" && (typeof operation.identifier !== "string" || !operation.identifier)) fail(`${op} \u9700\u8981\u6761\u76EE identifier`);
    if (operation.name !== void 0 && typeof operation.name !== "string") fail("\u6761\u76EE name \u5FC5\u987B\u662F\u6587\u672C");
    if (operation.content !== void 0 && typeof operation.content !== "string") fail("\u6761\u76EE content \u5FC5\u987B\u662F\u6587\u672C");
    if (operation.enabled !== void 0 && typeof operation.enabled !== "boolean") fail("\u6761\u76EE enabled \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
    const index = preset.blocks.findIndex((block2) => block2.identifier === operation.identifier);
    if (op !== "create" && index < 0) fail(`\u9884\u8BBE\u6761\u76EE\u4E0D\u5B58\u5728\uFF1A${operation.identifier}`, "NOT_FOUND");
    if (op === "delete") {
      preset.blocks.splice(index, 1);
      continue;
    }
    if (op === "create" || op === "move") {
      if (op === "move" && operation.before === void 0) fail("move \u9700\u8981 before\uFF1A\u6761\u76EE\u6807\u8BC6\u6216 null\uFF08\u79FB\u5230\u672B\u5C3E\uFF09");
      if (operation.before !== void 0 && operation.before !== null && (typeof operation.before !== "string" || !preset.blocks.some((block3) => block3.identifier === operation.before))) fail("before \u5FC5\u987B\u662F\u73B0\u6709\u6761\u76EE\u6807\u8BC6\u6216 null");
      if (op === "move" && operation.before === operation.identifier) continue;
      if (op === "create" && operation.identifier !== void 0 && (typeof operation.identifier !== "string" || !operation.identifier || index >= 0)) fail("\u65B0\u6761\u76EE\u7684 identifier \u5FC5\u987B\u662F\u672A\u4F7F\u7528\u7684\u975E\u7A7A\u6807\u8BC6");
      const block2 = op === "move" ? preset.blocks.splice(index, 1)[0] : {
        identifier: operation.identifier ?? randomUUID(),
        name: operation.name,
        content: operation.content,
        enabled: operation.enabled ?? true
      };
      const before = operation.before == null ? preset.blocks.length : preset.blocks.findIndex((item) => item.identifier === operation.before);
      preset.blocks.splice(before, 0, block2);
      continue;
    }
    if (operation.content !== void 0 && operation.patch !== void 0) fail("content \u4E0E patch \u53EA\u80FD\u9009\u4E00\u4E2A");
    if (["name", "content", "enabled", "patch"].every((key) => operation[key] === void 0)) fail("update \u9700\u8981 name\u3001content\u3001enabled \u6216 patch");
    const block = preset.blocks[index];
    const previousContent = block.content;
    for (const field of ["name", "content", "enabled"]) if (operation[field] !== void 0) block[field] = operation[field];
    if (operation.patch !== void 0) block.content = patchContent(block.content, operation.patch);
    if (block.content !== previousContent) {
      const notice = presetBlockNotice(block);
      if (block.importWarning !== void 0 || notice) block.importWarning = notice;
    }
  }
  return validatePreset(preset);
}
export {
  importPresetDocument,
  presetDocument,
  previewPresetImport,
  updatePresetDocument,
  validatePresetCommand
};
