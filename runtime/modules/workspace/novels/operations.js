import { z } from "zod";
import { defineOperations, read, write, readerQuery } from "../../../platform/tools/definition.js";
import { novel, page, query } from "../../../platform/tools/query-fields.js";
const novelOperations = [
  ...defineOperations("workspace", [
    readerQuery("novel.list", "workspace", "\u6309\u4E66\u540D\u67E5\u8BE2\u5DF2\u4FDD\u5B58\u4F5C\u54C1\uFF0C\u53D6\u5F97 novelId\uFF1B\u4E0D\u4F1A\u6539\u53D8\u4EFB\u4F55 DSH \u4F1A\u8BDD\u7684\u4F5C\u54C1\u7126\u70B9\u3002", { query, ...page }),
    write("novel.focus", { panel: false }),
    write("novel.create"),
    readerQuery("novel.get", "workspace", "\u8BFB\u53D6\u4F5C\u54C1\u57FA\u672C\u4FE1\u606F\u548C\u6B63\u6587\u3001\u8BBE\u5B9A\u3001\u89C4\u5212\u6570\u91CF\uFF0C\u4E0D\u8BFB\u53D6\u6574\u672C\u6B63\u6587\u3002", novel),
    readerQuery("novel.handoff", "manuscript", "\u8BFB\u53D6\u4F5C\u54C1\u6982\u8981\u548C\u6709\u9650\u7AE0\u8282\u76EE\u5F55\uFF1B\u5B8C\u6574\u76EE\u5F55\u7528 chapter.list\u3002", { ...novel, chapterLimit: z.number().int().min(0).max(30).optional() })
  ], "cuigengji_project"),
  ...defineOperations("workspace", [
    write("novel.import"),
    write("novel.export"),
    write("novel.update"),
    write("novel.archive"),
    write("novel.restore", { tier: "advanced" }),
    write("novel.purge")
  ])
];
const bindingOperations = [
  ...defineOperations("workspace", [
    read("binding.get")
  ], "cuigengji_context"),
  ...defineOperations("workspace", [
    write("binding.set")
  ])
];
export {
  bindingOperations,
  novelOperations
};
