import { defineOperations, read, readerQuery } from "../../../platform/tools/definition.js";
import { novel } from "../../../platform/tools/query-fields.js";
import { batchItems } from "./batch-input.js";
const contextOperations = defineOperations("context", [
  read("context.get"),
  readerQuery("context.readMany", "workspace", "\u540C\u4E00\u4F5C\u54C1\u5185\u6309\u7ED9\u5B9A\u987A\u5E8F\u8BFB\u53D6 1\u201312 \u4E2A\u5DF2\u77E5\u7AE0\u8282\u3001\u8BBE\u5B9A\u6216\u89C4\u5212 ID\u3002items \u6BCF\u9879\u542B kind\u3001id\uFF0C\u53EF\u5E26 start\u3001maxChars \u548C expectedRevision\u3002\u8FD4\u56DE\u539F\u6587\u3001\u72B6\u6001\u3001\u7248\u672C\u4E0E nextStart\uFF0C\u6309\u5DE5\u5177\u6388\u6743\u8BBF\u95EE\u3002", { ...novel, items: batchItems })
], "cuigengji_context");
export {
  contextOperations
};
