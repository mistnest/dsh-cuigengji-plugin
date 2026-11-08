import { STORY_OPERATIONS } from "../../contracts/story.js";
const storyArgsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    novelId: { type: "string", description: "\u76EE\u6807\u4F5C\u54C1 ID\uFF1B\u7701\u7565\u65F6\u4F7F\u7528\u672C\u4F1A\u8BDD\u5DF2\u9009\u62E9\u4F5C\u54C1\uFF0C\u4E0D\u6539\u53D8\u5176\u4ED6\u4F1A\u8BDD\u7684\u7126\u70B9" },
    chapterId: { type: "string", description: "story.context.get \u7684\u76EE\u6807\u7AE0\uFF1B\u53EA\u8BFB\u53D6\u6B64\u7AE0\u53CA\u4E4B\u524D\u7684\u6709\u6548\u4E8B\u5B9E\uFF0C\u7701\u7565\u65F6\u4E3A\u6700\u65B0\u7AE0" },
    maxChars: { type: "integer", description: "\u7EED\u5199\u4E0A\u4E0B\u6587\u5B57\u7B26\u9884\u7B97\uFF0C1000\u201324000\uFF0C\u9ED8\u8BA4 12000\uFF1B\u7EA6\u675F\u6574\u4E2A JSON \u8FD4\u56DE\uFF0C\u7ED3\u679C\u62A5\u544A\u7701\u7565\u9879\u53CA\u539F\u56E0" },
    expectedRevision: { type: "integer", description: "story.apply \u5FC5\u586B\uFF0C\u53D6\u81EA story.get \u7684 story.revision\uFF1B\u65E7\u4F5C\u54C1\u9996\u6B21\u4E3A 0" },
    requestId: { type: "string", description: "\u4E00\u6B21\u4FEE\u6539\u7684\u552F\u4E00\u6807\u8BC6\uFF0C1\u2013200 \u5B57\u7B26\uFF1B\u540C\u4E00\u8BF7\u6C42\u91CD\u8BD5\u4FDD\u6301\u4E0D\u53D8" },
    operations: {
      type: "array",
      description: "story.apply \u7684\u539F\u5B50\u64CD\u4F5C\uFF0C1\u2013100 \u6761\uFF1B\u6574\u6279\u6210\u529F\u6216\u5931\u8D25\u3002\u5B8C\u6574\u5B57\u6BB5\u6309 cuigengji_guidance section=story-operations \u67E5\u8BE2",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          op: { type: "string", enum: STORY_OPERATIONS, required: true, description: "\u64CD\u4F5C\u540D" },
          value: {
            type: "object",
            additionalProperties: true,
            required: true,
            description: "configure \u66F4\u65B0\u6A21\u5F0F/\u9636\u6BB5/\u7B80\u62A5\uFF1Boutline.upsert \u4FDD\u5B58\u7AE0\u84DD\u56FE\uFF1Btracking.commit \u4FDD\u5B58\u5DF2\u53D1\u751F\u4E8B\u5B9E\uFF1Bthread.upsert \u7EF4\u62A4\u4F0F\u7B14/\u627F\u8BFA/\u671F\u5F85/\u7EA6\u675F\uFF1Breview.upsert \u7EF4\u62A4\u8BC1\u636E\u95EE\u9898\u3002\u65B0\u5EFA\u6761\u76EE\u4E0D\u4F20 id\uFF0C\u66F4\u65B0/\u79FB\u9664\u4F7F\u7528\u5DF2\u8BFB id",
            properties: {
              id: { type: "string", description: "\u66F4\u65B0\u6216\u79FB\u9664\u6761\u76EE\u7684\u771F\u5B9E ID" },
              chapterId: { type: "string", description: "\u84DD\u56FE\u3001\u8FFD\u8E2A\u3001\u5BA1\u7A3F\u5173\u8054\u7684\u771F\u5B9E\u7AE0\u8282 ID" },
              expectedChapterRevision: { type: "integer", description: "\u63D0\u4EA4\u8FFD\u8E2A\u3001\u65B0\u5EFA\u5BA1\u7A3F\u6216\u5904\u7F6E\u95EE\u9898\u65F6\u5FC5\u987B\u63D0\u4F9B\u5DF2\u8BFB\u53D6\u7684\u5F53\u524D\u6B63\u6587\u7248\u672C" }
            }
          }
        }
      }
    }
  }
};
export {
  storyArgsSchema
};
