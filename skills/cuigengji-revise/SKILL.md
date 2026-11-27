---
name: cuigengji-revise
description: 审阅或修订已保存正文，定位具体问题，安全合并修改并维护上下文一致性。
---

# 审阅、润色与修订

共享协作规则：shared-canvas-v19。

## 分清“给意见”与“直接改”

- **作者想听审稿意见**（如“帮我看看这章”“哪里不对劲”）：只读正文与关联设定，直接给出定位到章节与原句的具体诊断和改法，不擅自改稿。
- **作者要求动手修改**（如“把这段润色一下”“修好刚才说的问题”）：先读目标最新正文与 `revision`，在请求范围内直接删繁就简、替换表达或重组段落并保存，旧稿由章节历史自动留存。改动若会波及后续主线走向，先简短确认。

查找定位用 `cuigengji_project` 的 `chapter.search {query,chapterId?,limit?}` 配合 `chapter.get {chapterId,start,maxChars}` 读取上下文；涉及整卷视角或文风取舍时核对 `creativeMemory.read`。

## 审稿重点看什么

1. **连续性与逻辑硬伤**：时间地点前后矛盾、人物提前知道尚未揭晓的信息（核对设定 `knownBy`）、动机突兀转折、重要行动缺少后果或前文伏笔断线。
2. **叙事节奏与语感**：对话变成设定说明书、情绪靠形容词或总结句硬推、重复比喻拖慢动作戏节奏。指出原句为什么卡顿、给出一两个可直接替换的改法方向。
3. **规划与正文差异**：正文写法与早期规划不同，可能是作者边写边调整了方向——指出来请作者拍板是改回正文还是同步更新规划即可。

## 安全写入与回退

- **局部修订优先 `patch`**：调 `chapter.update {chapterId,expectedRevision,patch:{oldText,newText},reason,requestId}`，`oldText` 从刚读到的原文精确截取并确保唯一匹配。整章大改须先沿 `nextStart` 读完同一版本全文再传 `content`。
- **连续修改与冲突合并**：同一章连改多处时依次使用上一步返回的新 `revision`；遇到 `CONFLICT` 保留修改稿、读取最新正文合并后再提交。
- **历史对比与恢复**：作者要求回退整章旧稿时，先用 `chapter.history {chapterId}` 查看历史版本（需读某版全文加 `includeContent:true`），再用 `chapter.restore {chapterId,expectedRevision,targetRevision,reason?,requestId}` 生成新当前版本；若只撤回其中一两句，直接用 `patch` 局部改回更稳妥。

## 同步受影响的设定与规划

- 正文修改使关联设定变成 `stale` 时，读对应设定核对：原设定依然成立则更新 `sources` 版本，剧情事实已变则同步修改设定内容与关系。
- 若本次改写删掉了原先已标 `written` 的情节事件，将对应规划节点改回 `selected`（后续仍要写）或 `idea`（重新讨论），并在回复中简短说明已改内容与待定事项。
