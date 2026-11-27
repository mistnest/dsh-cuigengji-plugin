import { z } from "zod";
import { id, revision } from "../../../platform/tools/query-fields.js";
const text = z.string(), opt = text.optional(), patch = z.strictObject({ oldText: text.min(1), newText: text });
const common = { novelId: id, requestId: id, reason: opt };
const setting = {
  name: opt,
  summary: opt,
  content: opt,
  storyTime: opt,
  aliases: z.array(text).optional(),
  status: z.enum(["active", "stale", "unconfirmed", "retired"]).optional(),
  factType: z.enum(["fact", "belief", "misunderstanding", "unconfirmed", "plan"]).optional(),
  knownBy: z.array(text).optional(),
  dependsOn: z.array(id).optional(),
  sources: z.array(z.strictObject({ chapterId: id, revision })).optional()
};
const cardEdit = z.strictObject({ ...setting, nodeId: id, expectedRevision: revision, patch: patch.optional() });
const planFields = z.strictObject({
  title: opt,
  summary: opt,
  content: opt,
  status: z.enum(["idea", "selected", "written", "dropped"]).optional(),
  pageId: id.nullable().optional(),
  parentId: id.nullable().optional(),
  chapterRefs: z.array(id).optional(),
  memoryRefs: z.array(id).optional()
});
function command(action, module, description, fields) {
  return { action, module, description, input: z.strictObject({ ...common, ...fields }) };
}
const grantWrites = [
  command("chapter.create", "manuscript", "\u65B0\u5EFA\u6B63\u6587\uFF0C\u586B\u6807\u9898\u3001\u6B63\u6587\u53CA requestId\u3002", {
    title: text.min(1),
    content: opt,
    volumeId: id.optional()
  }),
  command(
    "chapter.update",
    "manuscript",
    "\u4FEE\u6539\u5DF2\u4FDD\u5B58\u7AE0\u8282\u3002\u5148\u8BFB\u53D6 revision\uFF0C\u7528 content\u3001append \u6216\u7CBE\u786E patch \u66F4\u65B0\u3002",
    { chapterId: id, expectedRevision: revision, title: opt, content: opt, append: opt, patch: patch.optional() }
  ),
  command("graph.create", "settings", "\u65B0\u5EFA\u4EBA\u7269\u6216\u4E16\u754C\u8BBE\u5B9A\u5361\u3002", {
    ...setting,
    name: text.min(1),
    type: z.enum(["character_card", "world_entry"])
  }),
  command("graph.update", "settings", "\u7528\u5F53\u524D\u7248\u672C\u4FEE\u6539\u539F\u5361\uFF0C\u5C40\u90E8\u4FEE\u6539\u53EF\u7528 patch\u3002", cardEdit.shape),
  command("graph.updateMany", "settings", "\u4E00\u6B21\u63D0\u4EA4\u591A\u5F20\u8BBE\u5B9A\u5361\u7684\u4FEE\u6539\u3002\u4EFB\u4E00\u7248\u672C\u51B2\u7A81\u4F1A\u53D6\u6D88\u6574\u6279\u3002", {
    updates: z.array(cardEdit).min(1).max(20)
  }),
  command("planning.apply", "planning", "\u65B0\u5EFA\u6216\u4FEE\u6539\u60C5\u8282\u5361\u3002\u4FEE\u6539\u65F6\u9010\u5361\u63D0\u4F9B expectedRevision\u3002", {
    operations: z.array(
      z.discriminatedUnion("op", [
        z.strictObject({
          op: z.literal("node.create"),
          ref: id.optional(),
          value: planFields.extend({ title: text.min(1) })
        }),
        z.strictObject({ op: z.literal("node.update"), id, expectedRevision: revision, value: planFields })
      ])
    ).min(1).max(100)
  }),
  command("creativeMemory.update", "guidance", "\u6839\u636E\u5DF2\u8BFB\u7248\u672C\u548C contentHash \u4FEE\u6539\u672C\u4E66\u521B\u4F5C\u8BB0\u5FC6\u3002", {
    expectedRevision: z.number().int().nonnegative(),
    expectedHash: id,
    content: opt,
    append: opt,
    patch: patch.optional()
  })
];
export {
  grantWrites
};
