import { QUERY_CAPABILITIES, queryInputSchema } from "../../workspace/queries/catalog.js";
const projectToolDescription = "\u7BA1\u7406\u4F5C\u54C1\u5E93\u548C\u5377\u3001\u7AE0\u3001\u6B63\u6587\u3002\u6240\u6709\u4F1A\u8BDD\u5305\u62EC DSH \u539F\u751F\u5B50 Agent \u4F7F\u7528\u540C\u4E00\u5957\u4F5C\u54C1\u9009\u62E9\u89C4\u5219\uFF1Anovel.list \u67E5\u770B\u4F5C\u54C1\uFF0Cnovel.focus {novelId} \u8BB0\u4F4F\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1\uFF0C\u6216\u5728\u5355\u6B21\u64CD\u4F5C\u663E\u5F0F\u63D0\u4F9B novelId\uFF1B\u4E92\u4E0D\u5207\u6362\u5176\u4ED6\u4F1A\u8BDD\u7684\u7126\u70B9\u3002novel.create {title,description?,requestId} \u521B\u5EFA\u7A7A\u767D\u4F5C\u54C1\uFF0C\u4E0D\u6539\u53D8\u7126\u70B9\u3002novel.handoff \u8FD4\u56DE\u4F5C\u54C1\u7D22\u5F15\u548C\u6709\u9650\u76EE\u5F55\uFF0C\u4E0D\u542B\u6B63\u6587\u3002chapter.get \u6309 start/maxChars \u8BFB\u53D6\u3002\u4FEE\u6539\u9700 expectedRevision\uFF0Cchapter.update \u7684 content/append/patch:{oldText,newText} \u4E09\u9009\u4E00\u3002\u5220\u9664 confirm:true\uFF1B\u975E\u7A7A\u5377\u8FD8\u9700 chapterPolicy:detach/delete\u3002";
function dshSchema(input) {
  if (input.anyOf) return { oneOf: input.anyOf.map(dshSchema) };
  const output = {};
  for (const key of ["type", "description", "enum", "const"]) if (input[key] !== void 0) output[key] = input[key];
  if (input.properties) {
    output.properties = Object.fromEntries(Object.entries(input.properties).map(([key, value]) => [key, { ...dshSchema(value), ...input.required?.includes(key) ? { required: true } : {} }]));
    output.additionalProperties = input.additionalProperties === true;
  }
  if (input.items) output.items = dshSchema(input.items);
  return output;
}
function projectArgsSchema() {
  const properties = Object.fromEntries(Object.entries(Object.assign({}, ...QUERY_CAPABILITIES.filter((query) => query.tool === "cuigengji_project").map((query) => queryInputSchema(query).properties))).map(([key, value]) => [key, dshSchema(value)]));
  return { type: "object", additionalProperties: true, properties: { ...properties, title: { type: "string" }, description: { type: "string" }, volumeId: { oneOf: [{ type: "string" }, { type: "null" }] }, chapterId: { type: "string" }, order: { type: "number" }, content: { type: "string" }, append: { type: "string" }, patch: { type: "object", properties: { oldText: { type: "string" }, newText: { type: "string" } }, additionalProperties: false }, expectedRevision: { type: "integer" }, targetRevision: { type: "integer" }, requestId: { type: "string" }, confirm: { type: "boolean" }, chapterPolicy: { type: "string", enum: ["detach", "delete"] }, includeContent: { type: "boolean" }, revision: { type: "integer" }, reason: { type: "string" } } };
}
export {
  projectArgsSchema,
  projectToolDescription
};
