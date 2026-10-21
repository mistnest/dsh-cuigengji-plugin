import { PLANNING_OPERATIONS } from "../../contracts/planning.js";
const planningArgsSchema = {
  type: "object",
  additionalProperties: true,
  description: "\u4F7F\u7528\u5F53\u524D\u4F5C\u54C1\u7126\u70B9\u6216\u663E\u5F0F novelId\u3002\u8BFB\u53D6/\u7EED\u63A5\u7528 nodeId\uFF1Bapply \u7528 operations:[{op,id,expectedRevision,value}]\u3002\u8282\u70B9\u662F\u4E8B\u4EF6\u800C\u975E\u7AE0\u8282\uFF1B\u53EF\u7701\u7565\u5750\u6807\uFF0C\u7528 planning.layout \u81EA\u52A8\u6574\u7406\u65B0\u589E\u5BF9\u8C61\u3002",
  properties: {
    novelId: { type: "string", description: "\u672C\u6B21\u76EE\u6807\u4F5C\u54C1 ID\uFF0C\u4E0D\u6539\u53D8\u4F1A\u8BDD\u7126\u70B9\uFF1B\u672A\u9009\u62E9\u5F53\u524D\u4F5C\u54C1\u65F6\u4E5F\u53EF\u663E\u5F0F\u4F7F\u7528" },
    requestId: { type: "string", description: "\u4E00\u6B21\u4FEE\u6539\u7684\u552F\u4E00\u8BF7\u6C42\u6807\u8BC6\uFF0C\u91CD\u8BD5\u540C\u4E00\u8BF7\u6C42\u4FDD\u6301\u4E0D\u53D8" },
    nodeId: { type: "string", description: "planning.get/continue \u7684\u8282\u70B9 ID" },
    query: { type: "string", description: "planning.list/search \u6309\u6807\u9898\u4E0E\u6458\u8981\u68C0\u7D22\uFF0C\u4E0D\u68C0\u7D22\u6B63\u6587" },
    name: { type: "string", description: "page.create/update \u6216 group.create/update \u7684\u540D\u79F0" },
    summary: { type: "string", description: "page/group \u7684\u7B80\u77ED\u8BF4\u660E\uFF1B\u8282\u70B9\u6458\u8981\u5199\u5728 value \u4E2D" },
    status: { type: "string", enum: ["idea", "selected", "written", "dropped"], description: "list/search \u7684\u8282\u70B9\u72B6\u6001\u7B5B\u9009\uFF1B\u5199\u5165\u72B6\u6001\u7528 value.status" },
    offset: { type: "integer", description: "list/search/decorations/history/changes \u7684\u5206\u9875\u8D77\u70B9\uFF0C\u9ED8\u8BA4 0" },
    limit: { type: "integer", description: "\u666E\u901A\u5206\u9875\u6BCF\u9875 1\u2013200 \u6761\uFF0C\u9ED8\u8BA4 50\uFF1B\u5173\u8054\u8D44\u6E90\u53E6\u7528 resourceOffset" },
    resourceOffset: { type: "integer", description: "planning.get \u5173\u8054\u8D44\u6E90\u6458\u8981\u7684\u4E0B\u4E00\u9875\u8D77\u70B9\uFF0C\u9ED8\u8BA4 0\uFF1B\u987B\u4E3A\u975E\u8D1F\u6574\u6570\uFF0C\u6BCF\u9875\u6700\u591A 12 \u6761\u5F53\u524D\u6458\u8981\uFF0C\u5168\u6587\u6309\u9700 graph.get" },
    expectedRevision: { type: "integer", description: "continue \u6216\u9875\u9762/\u5206\u7EC4\u66F4\u65B0\u6240\u8BFB\u53D6\u7684\u7248\u672C" },
    expectedSequence: { type: "integer", description: "planning.layout \u5FC5\u987B\u586B\u5199\u5DF2\u8BFB\u53D6\u7684 sequence\uFF1Bapply \u53EF\u7528\u5B83\u4FDD\u62A4\u6574\u6279\u7ED3\u6784" },
    pageId: { oneOf: [{ type: "string" }, { type: "null" }], description: "\u76EE\u6807\u753B\u5E03\u9875\uFF1Bnull \u4E3A\u4E3B\u7EBF\u89C4\u5212" },
    groupId: { oneOf: [{ type: "string" }, { type: "null" }], description: "\u68C0\u7D22\u7236\u5206\u7EC4\u65F6\u5305\u542B\u5B50\u7EC4\uFF1Bnull \u4E3A\u5F53\u524D\u753B\u5E03\u6839\u76EE\u5F55\uFF1Bgroup.update/delete \u7528\u5B83\u6307\u5B9A\u76EE\u6807\u7EC4" },
    parentId: { oneOf: [{ type: "string" }, { type: "null" }], description: "group.create/update \u7684\u7236\u6587\u4EF6\u5939\uFF1Blist/search \u7528\u5B83\u7B5B\u9009\u76F4\u63A5\u5B50\u60C5\u8282\uFF0Cnull \u4E3A\u9876\u5C42\u60C5\u8282\u3002\u65B0\u5EFA/\u79FB\u52A8\u60C5\u8282\u7528 operations[].value.parentId\uFF0C\u4E8C\u8005\u72EC\u7ACB" },
    side: { type: "string", enum: ["in", "out"], description: "planning.continue \u9ED8\u8BA4 out \u4E3A\u539F\u4E8B\u4EF6\u2192\u65B0\u4E8B\u4EF6\uFF0Cin \u4E3A\u65B0\u4E8B\u4EF6\u2192\u539F\u4E8B\u4EF6\uFF1B\u7EE7\u627F\u539F\u9875\u3001\u6587\u4EF6\u5939\u548C\u7236\u9636\u6BB5" },
    value: { type: "object", additionalProperties: true, description: "planning.continue \u65B0\u4E8B\u4EF6\u7684 title/summary/content \u7B49\u5B57\u6BB5\uFF1Btitle \u5FC5\u586B\u3002\u6DFB\u52A0\u5B50\u60C5\u8282\u987B\u7528 apply \u7684 node.create\uFF0C\u4E0D\u7528 continue \u5047\u88C5\u5305\u542B\u5173\u7CFB" },
    transactionId: { type: "string", description: "planning.revert \u8981\u64A4\u9500\u7684\u5DF2\u8BFB\u4E8B\u52A1 ID" },
    after: { type: "integer", description: "planning.changes \u4ECE\u8FD9\u4E2A sequence \u4E4B\u540E\u8BFB\u53D6" },
    reason: { type: "string", description: "\u672C\u6B21\u4FEE\u6539\u7684\u539F\u56E0" },
    confirm: { type: "boolean", description: "page.delete/group.delete \u987B\u4E3A true\uFF1Bapply \u5220\u9664\u5728\u5BF9\u5E94 operation \u4E2D\u63D0\u4F9B" },
    nodeIds: { type: "array", items: { type: "string" }, description: "planning.layout \u53EF\u9009\u7684\u5C40\u90E8\u8282\u70B9\u3001\u4FBF\u7B7E\u6216\u6587\u4EF6\u5939 ID\uFF1B\u7701\u7565\u65F6\u4E3A\u5F53\u524D\u9875" },
    mode: { type: "string", enum: ["missing", "all"], description: "planning.layout \u9ED8\u8BA4 missing\uFF0C\u4EC5\u5B89\u653E\u672A\u5B9A\u4F4D\u7684\u65B0\u5BF9\u8C61\uFF1Ball \u4F1A\u91CD\u6392\u6307\u5B9A\u5BF9\u8C61\uFF0C\u987B\u7B26\u5408\u4F5C\u8005\u7684\u6574\u7406\u610F\u56FE" },
    operations: { type: "array", description: "planning.apply \u7684 1\u2013200 \u6761\u64CD\u4F5C\uFF0C\u6574\u6279\u4E00\u8D77\u6210\u529F\u6216\u5931\u8D25", items: {
      type: "object",
      additionalProperties: true,
      properties: {
        op: { type: "string", enum: PLANNING_OPERATIONS, description: "\u64CD\u4F5C\u540D" },
        id: { type: "string", description: "\u66F4\u65B0/\u5220\u9664\u5BF9\u8C61\u7684\u771F\u5B9E ID\uFF0C\u4E0E op \u540C\u5C42" },
        expectedRevision: { type: "integer", description: "\u66F4\u65B0/\u5220\u9664\u5BF9\u8C61\u7684\u5DF2\u8BFB\u53D6\u7248\u672C\uFF0C\u4E0E op \u540C\u5C42" },
        ref: { type: "string", description: "\u65B0\u5BF9\u8C61\u7684\u4E34\u65F6\u540D\u5B57\uFF0C\u672C\u6B21\u540E\u7EED\u64CD\u4F5C\u76F4\u63A5\u7528\u6B64\u5B57\u7B26\u4E32\u5F15\u7528" },
        value: { type: "object", additionalProperties: true, description: "\u8282\u70B9\u3001\u8FDE\u7EBF\u3001\u9875\u6216\u6587\u4EF6\u5939\u7684\u5B57\u6BB5\uFF1B\u8BFB\u53D6\u5DF2\u6709\u5BF9\u8C61\u540E\u53EA\u63D0\u4EA4\u53D8\u52A8\u5B57\u6BB5\u3002\u65B0\u589E\u53EF\u7701\u7565\u5750\u6807\uFF0C\u518D planning.layout \u5B89\u653E\u3002", properties: {
          title: { type: "string" },
          name: { type: "string" },
          summary: { type: "string" },
          content: { type: "string" },
          parentId: { oneOf: [{ type: "string" }, { type: "null" }], description: "node.create/update \u6307\u5411\u7236\u9636\u6BB5\u8282\u70B9\uFF1Bgroup.create/update \u6307\u5411\u7236\u6587\u4EF6\u5939\u3002\u53EA\u8868\u793A\u5305\u542B\uFF0C\u4E0D\u521B\u5EFA\u56E0\u679C\u8FB9" },
          pageId: { oneOf: [{ type: "string" }, { type: "null" }], description: "\u6240\u5C5E\u5DE5\u4F5C\u9875\uFF1B\u5B50\u60C5\u8282\u5FC5\u987B\u4E0E\u7236\u9636\u6BB5\u540C\u9875\uFF0C\u521B\u5EFA\u65F6\u6309\u7236\u9636\u6BB5\u8BFB\u53D6\u7ED3\u679C\u663E\u5F0F\u586B\u5199" },
          groupId: { oneOf: [{ type: "string" }, { type: "null" }], description: "\u81EA\u7531\u5F52\u7C7B\u7684\u540C\u9875\u6587\u4EF6\u5939\uFF1Bnull \u4E3A\u9875\u6839\u76EE\u5F55\uFF0C\u4E0D\u80FD\u7528\u9636\u6BB5 ID \u4EE3\u66FF" },
          memoryRefs: { type: "array", items: { type: "string" }, description: "\u771F\u5B9E\u8BBE\u5B9A ID\u3002\u589E\u8865\u524D\u4FDD\u7559\u5DF2\u6709\u5F15\u7528\uFF0C\u4E0D\u5728\u89C4\u5212\u91CC\u590D\u5236\u89D2\u8272\u5361" },
          chapterRefs: { type: "array", items: { type: "object", additionalProperties: true, properties: { chapterId: { type: "string" }, revision: { type: "integer" } } }, description: "\u5DF2\u4FDD\u5B58\u6B63\u6587\u7248\u672C\u8BC1\u636E\uFF1Bwritten \u81F3\u5C11\u9700\u8981\u4E00\u9879\u6709\u6548\u5F15\u7528" },
          status: { type: "string", enum: ["idea", "selected", "written", "dropped"] },
          from: { type: "string" },
          to: { type: "string" },
          type: { type: "string", enum: ["next", "requires", "alternative"] },
          label: { type: "string" },
          kind: { type: "string", enum: ["note", "frame"], description: "\u65B0\u6279\u6CE8\u901A\u5E38\u7528 note\uFF1Bframe \u4EC5\u4E3A\u65E7\u8BA8\u8BBA\u6846\u517C\u5BB9\uFF0C\u6536\u7EB3\u7528\u9636\u6BB5\u6216\u6587\u4EF6\u5939" }
        } },
        confirm: { type: "boolean", description: "\u5220\u9664\u64CD\u4F5C\u987B\u660E\u786E\u4E3A true" },
        childPolicy: { type: "string", enum: ["detach", "subtree"], description: "node.delete \u6709\u4E0B\u7EA7\u65F6\u5FC5\u987B\u9009\u62E9\uFF1Bdetach \u4FDD\u7559\u5E76\u4E0A\u79FB\u5B50\u60C5\u8282\uFF0C\u4EC5\u4F5C\u8005\u660E\u786E\u5220\u9664\u6574\u68F5\u5B50\u6811\u65F6\u7528 subtree" }
      }
    } }
  }
};
export {
  planningArgsSchema
};
