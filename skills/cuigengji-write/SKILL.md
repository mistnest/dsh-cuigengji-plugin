---
name: cuigengji-write
description: 按作者意图写作或续写小说正文，用章节工具保存，并按实际结果维护相关规划与设定。
---

# 正文写作与协作落盘

## 读到足够再写

按项目指南定位目标章，先读当前正文和必要的紧邻前文，遵循系统提示词中作者已启用的写作预设，再按需取相关规划及本场景的人物/世界资料。没有参考章时从作者指定目标和目录定位；没有规划也可以按请求写作，不增加审批门槛。

规划标题或人物摘要不能代替已写正文。相关规划用 planning.get 读全文和前后情节；设定用 graph.get 与 edge.list/get 核对状态、来源、适用阶段和知情范围。缺失的关键动机或主线选择无法合理推断时先说明，不凭空写成已发生事实。

## 把场景写成立

从人物当下可感知的信息落笔。情绪来自有后果的动作、选择和互动，细节服务于人物注意力，不给每段机械安排比喻、金句或总结。

对话包含意图和关系，允许犹豫、隐瞒、误解和转移话题；人物不必完整解释所有背景。按动作、说话者、注意力和节奏自然分段，避免整屏长段或每个短句都拆行。先完成可信的场景，再检查人物行动、衔接和表达。

章节正文保存纯文本和自然段；不把分析、JSON、对作者的解释或“本章小结”混进故事，除非作者要求这种体裁。

## 用正确的章节操作保存

调用 `cuigengji_project`，参数为 `{action,args}`。

| 场景 | action 与参数 |
| --- | --- |
| 续写同一章末尾 | `chapter.update {chapterId,expectedRevision,append,reason?,requestId}`；append 自带必要换行 |
| 新增下一章 | 先查 chapter.list 避免重复，再 `chapter.create {title,content,volumeId?,order?,reason?,requestId}`；不要覆盖上一章 |
| 修改已有段落 | `chapter.update {chapterId,expectedRevision,patch:{oldText,newText},reason?,requestId}`；oldText 必须唯一匹配 |
| 重写整章 | 先用 nextStart 读完同一版本，再 `chapter.update {chapterId,expectedRevision,content,reason?,requestId}` |

content、append、patch 只能选一个。整章替换会覆盖原文，不能用只读到的窗口或刚写好的局部片段代替整章。目录中的 textCount 是界面字数，charCount/读取偏移是字符串长度；不要把字数当作 start 偏移。

示例：读取版本为 1 的目标章后，作者要求把“直接去码头”改成“先核对证据”。CHAPTER_ID 替换为真实 ID；oldText 必须来自当前读取到的原文，不是凭对话回忆抄写：

```json
{"action":"chapter.update","args":{"chapterId":"CHAPTER_ID","expectedRevision":1,"requestId":"revise-passage-unique","patch":{"oldText":"她立刻赶往码头。","newText":"她先核对了收据上的时间，才将目光投向码头的方向。"},"reason":"按作者要求补足行动的因果"}}
```

保存成功返回的是章节元数据和新 revision，不是全文。回读本次写入位置确认衔接；若返回冲突，保留拟稿并按项目指南合并，不强行覆盖作者的并行修改。作者已授权写作时直接完成保存，不为每个章节更新重复询问。

## 根据实际正文维护协作资料

- 若本次落实了某个规划节点，读取它的最新版本，在 `cuigengji_plan` 的 planning.apply 中更新 chapterRefs，并在完整实现后标 written；未写到的部分仍保留讨论状态或在节点中明确剩余事项。
- 若正文确实新增或改变了会影响后文的人物状态、世界规则、关系或伏笔，使用 cuigengji-memory 搜索并更新对应条目，记录保存后的章节 revision。普通措辞调整不需要新造设定卡；无需每写一段都维护全图。
- 正文、规划、设定是分别保存的；按顺序处理依赖，不假装是一次跨模块事务。后续维护失败，报告“正文已保存，某条关联待处理”，不重复写一遍正文。

向作者简要说明写到了哪里、实际保存结果和还需决定的情节；不要附加长篇自评或强制解释所有写作技巧。
