import { z } from "zod";
import { defineOperations, read, write, readerQuery } from "../../../platform/tools/definition.js";
import { id, novel, page, query, optionalId, revision } from "../../../platform/tools/query-fields.js";
const manuscriptOperations = [
  ...defineOperations("manuscript", [
    readerQuery("volume.list", "manuscript", "\u8BFB\u53D6\u5377\u76EE\u5F55\u53CA\u987A\u5E8F\u3002", novel),
    write("volume.create"),
    write("volume.update"),
    write("volume.delete"),
    readerQuery("chapter.list", "manuscript", "\u6309\u5377\u548C\u7AE0\u8282\u987A\u5E8F\u8BFB\u53D6\u76EE\u5F55\uFF0C\u652F\u6301\u6807\u9898\u68C0\u7D22\u548C\u5206\u9875\uFF1B\u4E0D\u8FD4\u56DE\u6B63\u6587\u3002", { ...novel, volumeId: optionalId, query, ...page }),
    readerQuery("chapter.search", "manuscript", "\u5728\u5F53\u524D\u5DF2\u4FDD\u5B58\u6B63\u6587\u4E2D\u6309\u539F\u6587\u68C0\u7D22\uFF0C\u8FD4\u56DE\u7AE0\u8282 ID\u3001\u7248\u672C\u3001\u547D\u4E2D\u504F\u79FB\u548C\u7247\u6BB5\uFF1B\u4E0D\u68C0\u7D22\u56DE\u6536\u7AD9\u3002", { ...novel, query: z.string().min(1).max(2e3), chapterId: id.optional(), ...page }),
    write("chapter.create"),
    readerQuery("chapter.get", "manuscript", "\u8BFB\u53D6\u5F53\u524D\u7AE0\u8282\u5168\u6587\u6216\u7247\u6BB5\u3002\u6CBF nextStart \u7EED\u8BFB\u65F6\u5E26\u4E0A expectedRevision\uFF1B\u7248\u672C\u53D8\u5316\u4F1A\u62D2\u7EDD\u62FC\u63A5\u3002offsetUnit \u4E3A UTF-16\u3002", { ...novel, chapterId: id, start: z.number().int().min(0).optional(), maxChars: z.number().int().min(1).max(2e5).optional(), expectedRevision: revision.optional() }),
    write("chapter.update"),
    write("chapter.delete"),
    read("chapter.history", { tier: "advanced" }),
    write("chapter.restore", { tier: "advanced" })
  ], "cuigengji_project"),
  ...defineOperations("manuscript", [
    write("chapter.move"),
    read("chapter.find"),
    write("chapter.replace")
  ])
];
export {
  manuscriptOperations
};
