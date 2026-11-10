import { STORY_OPERATIONS } from '../../contracts/story.ts';

// The Harness value-schema DSL accepts only type/oneOf/properties/items/enum/
// const/additionalProperties plus annotations; ranges live in the descriptions
// and are enforced by the domain layer.
export const storyArgsSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    novelId: {type: 'string', description: '目标作品 ID；省略时使用本会话已选择作品，不改变其他会话的焦点'},
    chapterId: {type: 'string', description: 'story.context.get 的目标章；只读取此章及之前的有效事实，省略时为最新章'},
    path: {type: 'string', description: 'story.reference.import 的拆文库书籍文件夹绝对路径；读取 章节/*_摘要.md、文风.md、剧情/节奏.md、剧情/情绪模块.md、拆文报告.md，原文件只读'},
    maxChars: {type: 'integer', description: '续写上下文字符预算，1000–24000，默认 12000；约束整个 JSON 返回，结果报告省略项及原因'},
    limit: {type: 'integer', description: 'story.detect 整本扫描的章节上限，1–200，默认 60；只扫描已有正文的章节'},
    expectedRevision: {type: 'integer', description: 'story.apply 必填，取自 story.get 的 story.revision；旧作品首次为 0'},
    requestId: {type: 'string', description: '一次修改的唯一标识，1–200 字符；同一请求重试保持不变'},
    operations: {
      type: 'array', description: 'story.apply 的原子操作，1–100 条；整批成功或失败。完整字段按 cuigengji_guidance section=story-operations 查询',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          op: {type: 'string', enum: STORY_OPERATIONS, required: true, description: '操作名'},
          value: {
            type: 'object', additionalProperties: true, required: true,
            description: 'configure 更新模式/阶段/简报；outline.upsert 保存章蓝图；tracking.commit 保存已发生事实（summary/storyTime/location/activeCharacterIds/commitments/risks，可附 authorTruth 作者真相与 readerKnown 读者已知）；thread.upsert 维护伏笔/承诺/期待/约束；review.upsert 维护证据问题；unit.upsert 维护卷内剧情单元（promise/emotionEngine/blocker/choice/payoff/hook/lineIds/chapterIds/contractRisk）；storyline.upsert 维护故事线（title/kind/driver/junction/canCarryChapter）；rhythm.upsert 记录某章基调与章内角色；style.upsert 维护文风要求（targetSentence/dialogueRatio/viewpoint/tense/diction/avoid/anchors）；reference.upsert/reference.remove 维护项目内对标书副本。新建条目不传 id，更新/移除使用已读 id',
            properties: {
              id: {type: 'string', description: '更新或移除条目的真实 ID'},
              chapterId: {type: 'string', description: '蓝图、追踪、审稿关联的真实章节 ID'},
              expectedChapterRevision: {type: 'integer', description: '提交追踪、新建审稿或处置问题时必须提供已读取的当前正文版本'},
            },
          },
        },
      },
    },
  },
};
