import { z } from "zod";
import { id, revision } from "../../../platform/tools/query-fields.js";
import { queryFail } from "./common.js";
const batchKinds = { chapter: "manuscript", setting: "settings", planning: "planning" };
const kinds = ["chapter", "setting", "planning"];
function readItemsFor(modules) {
  const allowed = kinds.filter((kind) => !modules || modules.includes(batchKinds[kind]));
  return z.array(
    z.object({
      kind: z.enum(allowed),
      id,
      expectedRevision: revision.optional(),
      start: z.number().int().min(0).optional(),
      maxChars: z.number().int().min(1).max(48e3).optional()
    }).strict()
  ).min(1).max(12);
}
const batchItems = readItemsFor();
function parseReadItems(input) {
  const parsed = batchItems.safeParse(input);
  if (!parsed.success)
    return queryFail(
      "INVALID_INPUT",
      parsed.error.issues.map((issue) => `items.${issue.path.join(".")}\uFF1A${issue.message}`).join("\uFF1B")
    );
  return parsed.data;
}
function authorizeReadItems(items, modules) {
  for (const item of items) {
    if (!modules.includes(batchKinds[item.kind]))
      queryFail("CAPABILITY_DENIED", "\u672C\u6B21\u8BF7\u6C42\u5305\u542B\u672A\u6388\u6743\u7C7B\u522B\u7684\u8D44\u6599");
  }
}
export {
  authorizeReadItems,
  batchItems,
  batchKinds,
  parseReadItems,
  readItemsFor
};
