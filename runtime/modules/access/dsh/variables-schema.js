import { jsonSchema } from "./schema-format.js";
const variablesToolDescription = "\u53EF\u9009\u7684\u4F5C\u54C1\u5267\u60C5\u53D8\u91CF\u3002\u5148 variables.config/list\uFF1B\u672A\u542F\u7528\u4E0D\u5F3A\u5236\u4F7F\u7528\u3002variables.read {chapterId?,chapterRevision?,position:start/end,path?,scope:story/session} \u6309\u5267\u60C5\u4F4D\u7F6E\u8BFB\u53D6\uFF0C\u7F3A\u7701\u662F\u6700\u65B0\u6709\u6548\u72B6\u6001\uFF1B\u5199\u65E9\u671F\u60C5\u8282\u5FC5\u987B\u660E\u786E chapterId\uFF0C\u4E0D\u80FD\u5077\u7528\u540E\u6587\u72B6\u6001\u3002list \u53EA\u6458\u8981\uFF0C\u5386\u53F2\u7528 history\uFF0C\u6E32\u67D3\u9152\u9986\u53D6\u503C\u5B8F\u7528 render {text,chapterId?}\uFF0C\u5747\u4E0D\u4FEE\u6539\u3002parse {text} \u5C06 JSON Patch/MVU \u5E38\u89C1\u547D\u4EE4\u8F6C\u6362\u4E3A operations\uFF0C\u9700\u518D preview \u6838\u5BF9\u3002patch {baseRevision,requestId,anchor:{kind:initial}\u6216{kind:chapter,chapterId,chapterRevision,position:start/end,label?},scope?,operations,reason} \u63D0\u4EA4\uFF1B\u540C\u4E00\u8BF7\u6C42\u91CD\u8BD5\u590D\u7528 requestId\uFF0C\u4E92\u4E0D\u76F8\u4EA4\u8DEF\u5F84\u53EF\u81EA\u52A8\u5408\u5E76\uFF0C\u540C\u8DEF\u5F84\u51B2\u7A81\u91CD\u8BFB\u8BF7\u4F5C\u8005\u51B3\u7B56\u3002restore \u751F\u6210\u65B0\u5FEB\u7167\uFF1B\u4FEE\u6539\u65E7\u7AE0\u540E stale \u5F85\u6838\u5BF9\uFF0C\u4E0D\u5220\u9664\u65E7\u72B6\u6001\u3002\u5DE5\u5177\u4E0D\u4F1A\u6267\u884C\u4EFB\u610F JS/EJS\uFF0C\u4E5F\u4E0D\u4F1A\u628A\u6D4F\u89C8\u5185\u5BB9\u81EA\u52A8\u585E\u5165\u4F1A\u8BDD\u3002";
const variablesArgsSchema = { type: "object", additionalProperties: true, properties: {
  novelId: { type: "string", description: "\u76EE\u6807\u4F5C\u54C1\uFF1B\u7701\u7565\u4F7F\u7528\u672C\u4F1A\u8BDD\u7126\u70B9" },
  chapterId: { type: "string", description: "\u8BFB\u53D6\u6307\u5B9A\u5267\u60C5\u4F4D\u7F6E\uFF0C\u5199\u524D\u6587\u65F6\u5FC5\u987B\u660E\u786E\uFF0C\u907F\u514D\u8BEF\u7528\u540E\u6587\u72B6\u6001" },
  chapterRevision: { type: "integer", description: "\u5DF2\u8BFB\u53D6\u7684\u7AE0\u8282\u7248\u672C\uFF0C\u81F3\u5C11\u4E3A 1" },
  position: { type: "string", enum: ["start", "end"] },
  scope: { type: "string", enum: ["story", "session"], description: "\u957F\u671F\u4F5C\u54C1\u72B6\u6001\u6216\u5F53\u524D\u4F1A\u8BDD\u8349\u7A3F" },
  path: { type: "string", description: "JSON Pointer \u8DEF\u5F84\uFF0C\u4F8B\u5982 /stat_data/\u4E3B\u89D2/\u7B49\u7EA7" },
  snapshotId: { type: "string", description: "\u6307\u5B9A\u5386\u53F2\u5FEB\u7167\uFF1Brestore \u4F1A\u4EA7\u751F\u65B0\u7248\u672C" },
  baseRevision: { type: "integer", description: "\u4ECE read \u8FD4\u56DE\u7684\u603B\u7248\u672C\u8BFB\u53D6\uFF0C\u4E0D\u624B\u5DE5\u52A0\u51CF\uFF1B\u81F3\u5C11\u4E3A 0" },
  requestId: { type: "string", description: "\u63D0\u4EA4\u5FC5\u586B\uFF1B\u53EA\u6709\u539F\u6837\u91CD\u8BD5\u590D\u7528" },
  anchor: { type: "object", additionalProperties: false, properties: { kind: { type: "string", enum: ["initial", "chapter"] }, chapterId: { type: "string" }, chapterRevision: { type: "integer", description: "\u5DF2\u8BFB\u53D6\u7684\u7AE0\u8282\u7248\u672C\uFF0C\u81F3\u5C11\u4E3A 1" }, position: { type: "string", enum: ["start", "end"] }, label: { type: "string" } } },
  operations: { type: "array", description: "1\u2014200 \u4E2A\u8865\u4E01\uFF1B\u6BCF\u9879\u5FC5\u987B\u5305\u542B op \u548C path\uFF0C\u503C\u4F7F\u7528 JSON", items: { type: "object", additionalProperties: false, properties: { op: { type: "string", enum: ["set", "inc", "delete", "test", "add", "replace", "remove", "copy", "move"] }, path: { type: "string" }, value: { type: "json" }, from: { type: "string" } } } },
  text: { type: "string", description: "render \u662F\u53EA\u8BFB\u6A21\u677F\uFF1Bparse \u4EC5\u89E3\u6790\u66F4\u65B0\u547D\u4EE4\uFF0C\u4E0D\u6267\u884C" },
  reason: { type: "string" },
  userName: { type: "string" },
  characterName: { type: "string" },
  includeData: { type: "boolean" },
  limit: { type: "integer", description: "\u6BCF\u9875 1\u2014200 \u6761" },
  offset: { type: "integer", description: "\u975E\u8D1F\u5206\u9875\u8D77\u70B9" }
} };
const variablesJsonSchema = jsonSchema(variablesArgsSchema);
const variableActionDescription = (action) => `${action}\uFF1A\u4F5C\u54C1\u53EF\u9009\u5267\u60C5\u53D8\u91CF\u3002config/list \u5148\u770B\u662F\u5426\u542F\u7528\u548C\u7D22\u5F15\uFF1Bread \u5E26 chapterId/position \u6216 snapshotId \u5B9A\u4F4D\uFF1Brender \u53EA\u8BFB\u53D6\u53D6\u503C\u5B8F\uFF0Cparse \u53EA\u628A JSON Patch/MVU \u8F6C\u4E3A\u8865\u4E01\u3002preview \u4E0D\u5199\u6570\u636E\uFF1Bpatch/restore \u9700 baseRevision\u3001requestId\u3001anchor\uFF0C\u5199\u65E7\u7AE0\u5148\u6838\u5BF9\u5F53\u524D\u6B63\u6587\u7248\u672C\u3002\u4E92\u4E0D\u76F8\u4EA4\u8DEF\u5F84\u53EF\u5408\u5E76\uFF1B\u51B2\u7A81\u91CD\u8BFB\u3001\u8BF7\u4F5C\u8005\u51B3\u5B9A\uFF0C\u7981\u6B62\u76F4\u63A5\u8986\u76D6\u3002scope:session \u662F\u5F53\u524D\u4F1A\u8BDD\u8349\u7A3F\uFF1Bstory \u662F\u4F5C\u54C1\u72B6\u6001\u3002\u6CA1\u6709\u81EA\u52A8\u6574\u5E93\u6CE8\u5165\uFF0C\u4E5F\u4E0D\u6267\u884C JS/EJS\u3002`;
export {
  variableActionDescription,
  variablesArgsSchema,
  variablesJsonSchema,
  variablesToolDescription
};
