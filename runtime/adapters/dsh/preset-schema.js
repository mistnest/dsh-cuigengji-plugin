const presetArgsSchema = { type: "object", additionalProperties: true, properties: {
  novelId: { type: "string", description: "\u76EE\u6807\u4F5C\u54C1\uFF1B\u7701\u7565\u4F7F\u7528\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1" },
  identifier: { type: "string", description: "preset.get \u53EF\u6307\u5B9A\u5355\u6761\u6807\u8BC6\uFF0C\u8FD4\u56DE\u8BE5\u6761\u539F\u6587\u53CA\u6574\u5957 revision\uFF1B\u7701\u7565\u8FD4\u56DE\u53EF\u7F16\u8F91\u7ED3\u6784\uFF08\u542B\u505C\u7528\u6761\u76EE\uFF09" },
  input: { type: "json", description: "preset.preview/import \u7684\u539F\u59CB JSON \u5BF9\u8C61\u6216\u6587\u4EF6\u6587\u672C\uFF1B\u76F4\u63A5\u4F20\u5185\u5BB9\uFF0C\u4E0D\u4F20\u5B58\u50A8\u8DEF\u5F84" },
  fileName: { type: "string", description: "\u8F93\u5165\u662F\u6587\u4EF6\u6587\u672C\u65F6\u63D0\u4F9B\u539F\u6587\u4EF6\u540D\uFF1B.txt/.md \u59CB\u7EC8\u4F5C\u4E3A\u63D0\u793A\u8BCD\uFF0C\u4E0D\u62C6\u6210\u7AE0\u8282" },
  orderId: { type: "string", description: "\u5BFC\u5165\u591A\u4E2A\u6392\u5217\u65B9\u6848\u65F6\u9009\u62E9\u5176 character_id" },
  sourceNovelId: { type: "string", description: "\u4ECE\u591A\u90E8\u4F5C\u54C1\u7684\u5907\u4EFD\u63D0\u53D6\u9884\u8BBE\u65F6\u9009\u62E9\u6765\u6E90\u4F5C\u54C1\uFF1BnovelId \u4ECD\u662F\u5199\u5165\u76EE\u6807" },
  policy: { type: "string", enum: ["append", "replace"], description: "preset.import \u5FC5\u987B\u660E\u786E\uFF1Aappend \u8FFD\u52A0\uFF0Creplace \u66FF\u6362" },
  expectedRevision: { type: "integer", description: "\u7EF4\u62A4\u524D\u4ECE preset.get/preview \u53D6\u5F97\u7684\u6574\u5957\u7248\u672C\uFF1B\u65E0\u9884\u8BBE\u4E3A 0\u3002\u51B2\u7A81\u540E\u91CD\u8BFB\u5408\u5E76" },
  name: { type: "string", description: "preset.update \u4FEE\u6539\u6574\u5957\u9884\u8BBE\u540D\u79F0\uFF1B\u6761\u76EE\u540D\u79F0\u653E operations \u5185" },
  enabled: { type: "boolean", description: "\u6574\u5957\u9884\u8BBE\u542F\u505C\u3002\u7701\u7565\u65F6\uFF0C\u8FFD\u52A0\u4E0E\u4FEE\u6539\u4FDD\u7559\u539F\u5F00\u5173\uFF0C\u9996\u6B21\u5BFC\u5165\u6216\u66FF\u6362\u9ED8\u8BA4\u505C\u7528" },
  operations: { type: "array", description: "preset.update \u7684 1\u2014200 \u9879\u6761\u76EE\u64CD\u4F5C\uFF0C\u4E00\u8D77\u63D0\u4EA4\uFF1B\u4EC5\u5728\u4F5C\u8005\u8981\u6C42\u7EF4\u62A4\u9884\u8BBE\u65F6\u8C03\u7528", items: {
    type: "object",
    additionalProperties: false,
    properties: {
      op: { type: "string", enum: ["create", "update", "delete", "move"] },
      identifier: { type: "string", description: "\u8BFB\u53D6\u5230\u7684\u6761\u76EE\u6807\u8BC6\uFF1Bcreate \u53EF\u7701\u7565\u7531\u5DE5\u5177\u751F\u6210" },
      name: { type: "string" },
      content: { type: "string", description: "\u6761\u76EE\u5B8C\u6574\u539F\u6587\uFF1B\u5C40\u90E8\u4FEE\u6539\u53EF\u4F7F\u7528 patch" },
      enabled: { type: "boolean" },
      before: { oneOf: [{ type: "string" }, { type: "null" }], description: "create/move \u63D2\u5230\u8BE5\u6761\u76EE\u524D\uFF0Cnull \u4E3A\u672B\u5C3E\uFF1Bmove \u5FC5\u586B" },
      patch: { type: "object", additionalProperties: false, properties: { oldText: { type: "string" }, newText: { type: "string" } }, description: "\u552F\u4E00\u539F\u6587\u66FF\u6362\uFF1BnewText \u4E3A\u7A7A\u5220\u9664\u8BE5\u6BB5" }
    }
  } },
  requestId: { type: "string", description: "\u5199\u5165\u7684\u552F\u4E00\u8BF7\u6C42\u6807\u8BC6\uFF1B\u4EC5\u539F\u6837\u91CD\u8BD5\u590D\u7528" },
  reason: { type: "string" },
  chapterId: { type: "string" },
  chapterRevision: { type: "integer" },
  position: { type: "string", enum: ["start", "end"] },
  includeChapters: { type: "boolean" },
  nodeIds: { type: "array", items: { type: "string" } },
  povNodeId: { type: "string" }
} };
const jsonSchema = (value) => Array.isArray(value) ? value.map(jsonSchema) : value && typeof value === "object" ? value.type === "json" ? {} : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSchema(item)])) : value;
const presetJsonSchema = jsonSchema(presetArgsSchema);
const presetActionDescription = (action) => ({
  "preset.get": "\u7EF4\u62A4\u9884\u8BBE\u524D\u8BFB\u53D6\u53EF\u7F16\u8F91\u7ED3\u6784\u53CA revision\uFF0C\u542B\u505C\u7528\u6761\u76EE\uFF1Bidentifier \u53EF\u53EA\u53D6\u4E00\u6761\u3002\u4E0D\u8FD4\u56DE\u5BFC\u5165\u539F\u4EF6\u3002\u6B63\u5E38\u5199\u4F5C\u4F7F\u7528\u81EA\u52A8\u6CE8\u5165\uFF0C\u65E0\u987B\u989D\u5916\u8BFB\u53D6\u3002",
  "preset.read": "\u8BFB\u53D6\u672C\u4F1A\u8BDD\u9996\u6B21\u63A5\u624B\u76EE\u6807\u4F5C\u54C1\u65F6\u4F7F\u7528\u7684\u6709\u6548\u9884\u8BBE\u3002\u7EF4\u62A4\u6700\u65B0\u9884\u8BBE\u7528 preset.get\u3002",
  "preset.preview": "\u9884\u89C8\u63D0\u793A\u8BCD\u5BFC\u5165\u5E76\u8FD4\u56DE\u76EE\u6807\u9884\u8BBE revision\uFF1B\u4E0D\u4FDD\u5B58\u3002input \u662F JSON \u5BF9\u8C61\u6216\u6587\u4EF6\u6587\u672C\uFF0CTXT/Markdown \u63D0\u4F9B fileName\u3002",
  "preset.import": "\u6309\u4F5C\u8005\u8981\u6C42\u5BFC\u5165\u76EE\u6807\u4F5C\u54C1\u9884\u8BBE\uFF1Ainput\u3001policy:append/replace\u3001expectedRevision\u3001requestId\uFF1B\u53EF\u5E26 fileName/orderId/enabled\u3002\u8FFD\u52A0\u4FDD\u7559\u539F\u5F00\u5173\uFF0C\u9996\u6B21\u5BFC\u5165\u6216\u66FF\u6362\u9ED8\u8BA4\u505C\u7528\u3002",
  "preset.update": "\u6309\u4F5C\u8005\u8981\u6C42\u7EF4\u62A4\u9884\u8BBE\uFF1AexpectedRevision\u3001requestId\uFF0C\u9876\u5C42 name/enabled\uFF1Boperations \u7684 create/update/delete/move \u7BA1\u6761\u76EE\uFF0C\u7528 identifier \u5B9A\u4F4D\u3002\u4FDD\u7559\u672A\u6D89\u53CA\u6761\u76EE\u548C\u539F\u5BFC\u5165\u5143\u6570\u636E\uFF1B\u6B63\u5E38\u5199\u4F5C\u7684\u4E34\u65F6\u8981\u6C42\u4E0D\u81EA\u52A8\u4FDD\u5B58\u4E3A\u9884\u8BBE\u3002"
})[action] || action;
export {
  presetActionDescription,
  presetArgsSchema,
  presetJsonSchema
};
