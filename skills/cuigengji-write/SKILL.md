---
name: cuigengji-write
description: 按作者意图写作或续写小说正文，直接写入章节并同步涉及的规划与设定。
---

# 正文写作与直写落盘

共享协作规则：shared-canvas-v19。

## 动笔前快速对齐上下文

1. 定位目标章节，读取当前正文或紧邻前文（长文有 `nextStart` 时带同一 `expectedRevision` 续读所需段落）。没有大纲时直接按作者交代的方向动笔。
2. 已知本章、出场人物与对应情节卡 ID 时，用 `cuigengji_context` 的 `context.readMany` 一次取回原文；未关联设定时用 `graph.list` 按名字或关键词检索，必要时 `graph.get` / `edge.list` 核对人物现状、关系与知情范围（`knownBy`）。
3. 扫一眼 `novel.handoff` 中的创作记忆标题；涉及整卷视角、文风基调或重要伏笔回收时，用 `creativeMemory.read` 核对原段约定。关键动机或主线走向确实缺失时先简短问清，其余细节自然展开。

## 写出有质感的场景

- **落在人物当下的感知与行动**：从具体感官细节、动作反应和处境切入，让情绪从人物的选择与代价里长出来，少用空泛总结、排比金句或旁白替读者下结论。
- **对话带出潜台词与关系**：允许停顿、试探、隐瞒、误解或岔开话题，不必借角色之口把背景设定全盘托出；按动作、说话人与呼吸节奏自然分段，避免整屏大段堆砌或句句单行。
- **正文保持纯粹**：章节内容只放故事文本与自然段落，修改说明放工具的 `reason` 字段，创作讨论留在聊天回复里。

## 直接写入正式章节

通过 `cuigengji_project`（`{action, args}`）直接保存，每次写入都会自动保留历史版本供作者随时查看、对比或回退：

| 场景 | 操作方式 |
| --- | --- |
| 续写本章末尾 | `chapter.update {chapterId,expectedRevision,append,reason?,requestId}`（`append` 开头自带必要换行） |
| 新开下一章 | 先查 `chapter.list` 确认章节标题与顺序，再 `chapter.create {title,content,volumeId?,order?,reason?,requestId}` |
| 修改局部段落 | `chapter.update {chapterId,expectedRevision,patch:{oldText,newText},reason?,requestId}`（`oldText` 取自刚读到的原文并唯一匹配） |
| 重写整章 | 先沿 `nextStart` 读完同一版本全文，再 `chapter.update {chapterId,expectedRevision,content,reason?,requestId}` |

`content`、`append`、`patch` 三选一（注意目录 `textCount` 是去空白字数，分页偏移 `start` 使用字符串长度 `charCount`）。局部修改示例：

```json
{"action":"chapter.update","args":{"chapterId":"CHAPTER_ID","expectedRevision":1,"requestId":"revise-passage-unique","patch":{"oldText":"她立刻赶往码头。","newText":"她先核对了收据上的时间，才将目光投向码头的方向。"},"reason":"按作者要求补足行动的因果"}}
```

若遇到 `CONFLICT`，保留刚写好的草稿，读取最新章节内容合并后再提交。

## 写后顺手维护关联资料

- **规划节点**：本章完整落实了某个已有规划事件时，读取其最新 `revision`，补上 `{chapterId, revision}` 到 `chapterRefs` 并标为 `written`；只推进了一半则保持原状态并在回复中提一句剩余部分。
- **设定更新**：仅当剧情实质改变了人物状态、关系、知情范围或新抛出关键伏笔时，用 `cuigengji-memory` 更新对应卡片并附上本章 `sources`。
- **简短反馈**：完成后告诉作者写到了哪里、有哪些可以顺势展开的看点即可，无需长篇自评写作手法。
