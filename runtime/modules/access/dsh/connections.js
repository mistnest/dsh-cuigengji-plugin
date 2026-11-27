import { z } from "zod";
import { READER_MODULES } from "../../workspace/queries/reader-modules.js";
import { id, revision } from "../../../platform/tools/query-fields.js";
import { fail } from "../../../platform/errors.js";
const levels = z.partialRecord(z.enum(READER_MODULES), z.enum(["none", "read", "write"]));
const books = z.array(id).nonempty().nullable();
const target = { id, expectedRevision: revision };
const commands = {
  "external.status": z.strictObject({}),
  "external.create": z.strictObject({ name: id, novelIds: books, permissions: levels }),
  "external.update": z.strictObject({
    ...target,
    name: id.optional(),
    novelIds: books.optional(),
    permissions: levels.optional(),
    enabled: z.boolean().optional()
  }),
  "external.revoke": z.strictObject(target),
  "external.records": z.strictObject({ id, limit: z.number().int().min(1).max(200).optional() })
};
const connectionsDescription = "\u4E3A\u4F5C\u8005\u7BA1\u7406\u5916\u90E8\u52A9\u624B\u7684\u957F\u671F MCP \u8FDE\u63A5\u3002\u5148 external.status \u8BFB\u5F53\u524D\u914D\u7F6E\u548C revision\uFF0C\u4F5C\u54C1 ID \u4ECE cuigengji_project \u7684 novel.list \u83B7\u53D6\u3002create \u5FC5\u987B\u660E\u786E novelIds\uFF08\u4E66 ID \u6570\u7EC4\uFF0C\u6574\u4E2A\u5E93\u624D\u7528 null\uFF09\u53CA permissions\uFF0C\u6A21\u5757 manuscript/settings/planning/guidance \u6BCF\u9879\u9009 none/read/write\u3002update \u9700 id\u3001expectedRevision\uFF0C\u53EA\u4F20\u8981\u53D8\u7684\u5B57\u6BB5\uFF1B\u6743\u9650\u6309\u6A21\u5757\u5C40\u90E8\u66F4\u65B0\u3002revoke \u7528 id\u3001expectedRevision \u64A4\u9500\uFF1Brecords \u6309 id \u67E5\u8C03\u7528\u3002\u51B2\u7A81\u540E\u5148\u91CD\u8BFB\uFF0C\u4E0D\u80FD\u7528\u65E7\u914D\u7F6E\u8986\u76D6\u4F5C\u8005\u4FEE\u6539\u3002\u6B63\u5F0F\u5199\u4F5C\u5185\u5BB9\u4E0E\u8FDE\u63A5\u7BA1\u7406\u72EC\u7ACB\u3002\u6240\u6709 action \u4F7F\u7528 external. \u524D\u7F00\u3002";
const moduleProperties = Object.fromEntries(
  READER_MODULES.map((m) => [m, { type: "string", enum: ["none", "read", "write"] }])
);
const connectionsArgs = {
  type: "object",
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    enabled: { type: "boolean" },
    expectedRevision: { type: "integer" },
    novelIds: { oneOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
    permissions: { type: "object", additionalProperties: false, properties: moduleProperties },
    limit: { type: "integer" }
  }
};
const summary = ({ id: id2, name, revision: revision2, enabled, permissions, novelIds, active }) => ({
  id: id2,
  name,
  revision: revision2,
  enabled,
  permissions,
  novelIds,
  active
});
async function manageConnections(service, action, input, sessionId) {
  const schema = Object.hasOwn(commands, action) ? commands[action] : void 0;
  if (!schema) return fail("INVALID_INPUT", "\u672A\u77E5\u8FDE\u63A5\u7BA1\u7406\u64CD\u4F5C");
  const { requestId, ...fields } = input;
  const parsed = schema.safeParse(fields);
  if (!parsed.success)
    return fail("INVALID_INPUT", parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("\uFF1B"));
  const args = parsed.data;
  switch (action) {
    case "external.status":
      return { profiles: (await service.status()).profiles.map(summary) };
    case "external.create":
      return summary(await service.create({ ...args, requestId }, "agent:" + sessionId));
    case "external.update":
      return summary(await service.update(args));
    case "external.revoke":
      return service.revoke(args);
    case "external.records":
      return service.records(args);
  }
}
export {
  connectionsArgs,
  connectionsDescription,
  manageConnections
};
