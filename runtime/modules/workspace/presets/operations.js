import { defineOperations, read, write, readerQuery } from "../../../platform/tools/definition.js";
import { novel } from "../../../platform/tools/query-fields.js";
const presetOperations = [
  ...defineOperations("preset", [
    readerQuery("preset.read", "guidance", "\u8BFB\u53D6\u8FD9\u4E2A\u5916\u90E8\u9605\u8BFB\u4F1A\u8BDD\u9996\u6B21\u91C7\u7528\u7684\u542F\u7528\u9884\u8BBE\uFF1B\u540E\u7EED\u6CBF\u7528\u8BE5\u7248\u672C\uFF0C\u65B0\u9605\u8BFB\u4F1A\u8BDD\u91C7\u7528\u65B0\u914D\u7F6E\u3002", novel, { loadAction: "preset.get", tool: "cuigengji_guidance" }),
    read("preset.get"),
    read("preset.preview"),
    write("preset.import"),
    write("preset.update")
  ], "cuigengji_context"),
  ...defineOperations("preset", [
    write("preset.set")
  ])
];
export {
  presetOperations
};
