import { z } from "zod";
import { workspaceOperations } from "../operations/catalog.js";
import { batchKinds, readItemsFor } from "./batch-input.js";
import { READER_MODULES, readerModuleNames } from "./reader-modules.js";
const QUERY_CAPABILITIES = Object.freeze(workspaceOperations.flatMap(({ id, effect, dshTool, query }) => {
  if (effect !== "read" || !query) return [];
  return [{ ...query, id, tool: query.tool ?? dshTool }];
}));
const byId = new Map(QUERY_CAPABILITIES.map((query) => [query.id, query]));
const queryCapability = (action) => byId.get(action);
const queryAllowed = (capability, modules) => capability.id === "context.readMany" ? Object.values(batchKinds).some((module) => modules.includes(module)) : capability.module === "workspace" || modules.includes(capability.module);
function parseQuery(action, input) {
  const capability = queryCapability(action);
  if (!capability) throw Object.assign(new Error("\u5916\u90E8\u8FDE\u63A5\u53EA\u5141\u8BB8\u5DF2\u5F00\u653E\u7684\u67E5\u8BE2\u64CD\u4F5C"), { code: "READ_ONLY" });
  const parsed = capability.input.safeParse(input);
  if (!parsed.success) throw Object.assign(new Error(parsed.error.issues.map((issue) => `${issue.path.join(".") || "args"}\uFF1A${issue.message}`).join("\uFF1B")), { code: "INVALID_INPUT" });
  return { capability, args: parsed.data };
}
function queryInputSchema(capability, modules) {
  const schema = capability.id === "context.readMany" && modules ? capability.input.extend({ items: readItemsFor(modules) }) : capability.input;
  const { $schema, ...value } = z.toJSONSchema(schema);
  return value;
}
export {
  QUERY_CAPABILITIES,
  READER_MODULES,
  parseQuery,
  queryAllowed,
  queryCapability,
  queryInputSchema,
  readerModuleNames
};
