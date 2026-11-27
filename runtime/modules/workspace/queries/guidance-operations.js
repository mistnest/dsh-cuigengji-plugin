import { z } from "zod";
import { defineOperations, read, write, readerQuery } from "../../../platform/tools/definition.js";
import { id } from "../../../platform/tools/query-fields.js";
const guidanceOperations = [
  ...defineOperations("guidance", [
    read("guidance.get"),
    write("guidance.set")
  ]),
  ...defineOperations("guidance", [
    readerQuery("guidance.read", "guidance", "\u6309\u5F53\u524D\u8FDE\u63A5\u7684\u6388\u6743\u8BFB\u53D6\u5916\u90E8\u5199\u4F5C\u6307\u5F15\uFF1Bsection=preset/all \u53EF\u5E26 novelId\u3002", { novelId: id.optional(), section: z.enum(["core", "project", "write", "plan", "memory", "preset", "all"]).optional() }, { loadAction: null, panel: false })
  ], "cuigengji_guidance")
];
export {
  guidanceOperations
};
