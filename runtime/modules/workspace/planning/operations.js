import { z } from "zod";
import { defineOperations, read, write, readerQuery } from "../../../platform/tools/definition.js";
import { id, novel, page, query, optionalId, revision } from "../../../platform/tools/query-fields.js";
const planningOperations = [
  ...defineOperations("planning", [
    readerQuery("planning.pages", "planning", "\u5217\u51FA\u89C4\u5212\u753B\u5E03\uFF0Cquery \u6309\u753B\u5E03\u540D\u79F0\u548C\u6458\u8981\u68C0\u7D22\uFF1B\u4E3B\u7EBF pageId \u4E3A null\u3002", { ...novel, query }),
    write("planning.page.create"),
    write("planning.page.update"),
    write("planning.page.delete"),
    read("planning.decorations"),
    readerQuery("planning.list", "planning", "\u67E5\u8BE2\u5F53\u524D\u89C4\u5212\u8282\u70B9\u6458\u8981\uFF0C\u4FDD\u7559 idea/selected/written/dropped\uFF1B\u89C4\u5212\u662F\u610F\u56FE\uFF0C\u4E0D\u81EA\u52A8\u7B49\u4E8E\u5DF2\u53D1\u751F\u4E8B\u5B9E\u3002", { ...novel, query, pageId: optionalId, groupId: optionalId, parentId: optionalId, status: z.enum(["idea", "selected", "written", "dropped"]).optional(), ...page }),
    readerQuery("planning.search", "planning", "\u6309\u89C4\u5212\u8282\u70B9\u6807\u9898\u548C\u6458\u8981\u68C0\u7D22\uFF0C\u53EF\u9650\u5B9A\u753B\u5E03\u548C\u76EE\u5F55\u3002", { ...novel, query: z.string().min(1).max(2e3), pageId: optionalId, groupId: optionalId, status: z.enum(["idea", "selected", "written", "dropped"]).optional(), ...page }),
    readerQuery("planning.get", "planning", "\u8BFB\u53D6\u89C4\u5212\u8282\u70B9\u6B63\u6587\u3001\u72B6\u6001\u3001\u7236\u5B50\u7ED3\u6784\u3001\u524D\u540E\u90BB\u5C45\u548C\u5173\u8054\u8BBE\u5B9A\u6458\u8981\u3002\u5173\u8054\u8BBE\u5B9A\u5168\u6587\u7528 graph.get \u6309\u9700\u8BFB\u53D6\u3002", { ...novel, nodeId: id, expectedRevision: revision.optional(), resourceOffset: z.number().int().min(0).optional() }),
    read("planning.node.history", { tier: "advanced" }),
    write("planning.node.restore", { tier: "advanced" }),
    write("planning.continue"),
    readerQuery("planning.groups", "planning", "\u8BFB\u53D6\u89C4\u5212\u753B\u5E03\u7684\u6587\u4EF6\u5939\u548C\u8DEF\u5F84\u3002", { ...novel, pageId: optionalId }),
    write("planning.group.create"),
    write("planning.group.update"),
    write("planning.group.delete"),
    read("planning.changes", { tier: "advanced" }),
    read("planning.history", { tier: "advanced" }),
    write("planning.apply"),
    write("planning.layout", { tier: "advanced" }),
    write("planning.revert", { tier: "advanced" })
  ], "cuigengji_plan"),
  ...defineOperations("planning", [
    write("planning.directory.move"),
    read("planning.layout.get")
  ])
];
export {
  planningOperations
};
