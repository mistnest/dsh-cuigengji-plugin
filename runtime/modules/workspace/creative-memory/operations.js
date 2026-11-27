import { z } from "zod";
import { defineOperations, readerQuery, write } from "../../../platform/tools/definition.js";
import { novel, query } from "../../../platform/tools/query-fields.js";
const creativeMemoryOperations = defineOperations("creativeMemory", [
  readerQuery("creativeMemory.read", "guidance", "\u67E5\u770B\u672C\u4E66\u521B\u4F5C\u8BB0\u5FC6\u7684\u6807\u9898\u3002query \u641C\u7D22\uFF0Csection \u8BFB\u5BF9\u5E94\u6BB5\uFF0Cfull \u8BFB\u5168\u6587\u3002\u53EF\u7528 expectedHash \u56FA\u5B9A\u7248\u672C\u3002", {
    ...novel,
    query,
    section: z.number().int().nonnegative().optional(),
    full: z.boolean().optional(),
    expectedHash: z.string().optional()
  }),
  write("creativeMemory.update")
], "cuigengji_context");
export {
  creativeMemoryOperations
};
