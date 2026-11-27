import { z } from "zod";
import { defineOperations, read, write, readerQuery } from "../../../platform/tools/definition.js";
import { id, novel, page, query, optionalId, revision } from "../../../platform/tools/query-fields.js";
const settingOperations = [
  ...defineOperations("settings", [
    write("graph.workspace.ensure", { tier: "compatibility" }),
    read("graph.pages", { tier: "compatibility" }),
    write("graph.page.create", { tier: "compatibility" }),
    write("graph.page.update", { tier: "compatibility" }),
    write("graph.page.delete", { tier: "compatibility" }),
    readerQuery("graph.list", "settings", "\u6309\u540D\u79F0\u3001\u522B\u540D\u3001\u6458\u8981\u6216\u5F53\u524D\u6B63\u6587\u68C0\u7D22\u4EBA\u7269\u4E0E\u4E16\u754C\u8BBE\u5B9A\uFF0C\u53EA\u8FD4\u56DE\u5F53\u524D\u6458\u8981\u548C\u72B6\u6001\u3002groupId \u5305\u542B\u5B50\u5939\uFF0Cnull \u53EA\u67E5\u6839\u76EE\u5F55\u3002", { ...novel, query, type: z.enum(["character_card", "world_entry", "world_book"]).optional(), groupId: optionalId, ...page }),
    readerQuery("graph.get", "settings", "\u8BFB\u53D6\u5F53\u524D\u5B8C\u6574\u8BBE\u5B9A\u53CA\u6765\u6E90\u3001\u72B6\u6001\u3001\u4E8B\u5B9E\u7C7B\u578B\u3001\u77E5\u60C5\u8303\u56F4\u548C\u7248\u672C\uFF1Bstale/unconfirmed \u4E0D\u7B49\u4E8E\u5DF2\u786E\u8BA4\u6B63\u6587\u4E8B\u5B9E\u3002", { ...novel, nodeId: id, expectedRevision: revision.optional() }),
    read("graph.history", { tier: "advanced" }),
    write("graph.restore", { tier: "advanced" }),
    readerQuery("graph.groups", "settings", "\u8BFB\u53D6\u8BBE\u5B9A\u6587\u4EF6\u5939\u53CA\u5B8C\u6574\u8DEF\u5F84\u3002", novel),
    write("graph.group.create"),
    write("graph.group.update"),
    write("graph.group.delete"),
    write("graph.move"),
    write("graph.layout", { tier: "advanced" }),
    write("graph.arrange", { tier: "advanced" }),
    write("graph.continue"),
    write("graph.duplicate", { tier: "advanced" }),
    write("graph.remove", { tier: "advanced" }),
    write("graph.create"),
    write("graph.update"),
    write("graph.updateMany"),
    write("graph.delete"),
    readerQuery("edge.list", "settings", "\u8BFB\u53D6\u4EBA\u7269\u3001\u7EC4\u7EC7\u3001\u89C4\u5219\u7B49\u5BF9\u8C61\u4E4B\u95F4\u7684\u76F4\u63A5\u5173\u7CFB\uFF0CnodeId \u53EF\u9650\u5236\u5230\u4E00\u4E2A\u5BF9\u8C61\u3002", { ...novel, nodeId: id.optional(), ...page }),
    readerQuery("edge.get", "settings", "\u8BFB\u53D6\u4E00\u6761\u5F53\u524D\u5173\u7CFB\u7684\u5B8C\u6574\u8BF4\u660E\u3001\u72B6\u6001\u3001\u6765\u6E90\u53CA\u7248\u672C\u3002", { ...novel, edgeId: id }),
    write("edge.create"),
    write("edge.update"),
    write("edge.delete"),
    write("edge.disconnect")
  ], "cuigengji_memory"),
  ...defineOperations("settings", [
    read("settings.get"),
    write("graph.directory.move"),
    read("graph.layout.get")
  ])
];
const tavernOperations = defineOperations("tavern", [
  write("tavern.preview"),
  write("tavern.import")
]);
export {
  settingOperations,
  tavernOperations
};
