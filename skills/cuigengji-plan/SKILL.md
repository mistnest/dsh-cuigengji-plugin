---
name: cuigengji-plan
description: 推演剧情走向、人物行动与分支方案，或整理规划目录时使用；边讨论边维护共享画布。
---

# 用共享画布推演剧情

共享协作规则：shared-canvas-v19。

画布是和作者一起摆沙盘的白板。只要作者在推演剧情走向、设计一场戏的多方博弈或对比备选路线（除非明确说“只聊不画”），就主动把关键事件、行动因果与待定分支更新到对应画布上，再在对话里聚焦讨论核心取舍。后续调整直接改原画布、原节点和原便签，删繁去旧，让画布始终保持清晰好用。

## 一轮推演的标准动作

规划操作调用 `cuigengji_plan`，核对人物与世界设定调用 `cuigengji_memory`（均为 `{action, args}`）：

1. **定位画布与已有节点**：用 `planning.pages` 按名称和摘要确定目标画布（主线画布 `pageId:null`），再用 `planning.search/list {pageId,query?,groupId?,status?,offset?,limit?}` 查相关标题摘要，命中后 `planning.get {nodeId}` 读详情、连线与前后邻居 `flow.previous/next`；按需读 `planning.decorations {pageId}` 查看便签。
2. **核对相关设定**：`planning.get` 的 `resources` 附带已关联设定的当前摘要与版本；需看完整人物动机或秘密时调 `cuigengji_memory`（`{action:"graph.get",args:{novelId,nodeId}}`），或用 `graph.list` 检索后把真实设定 ID 补入 `memoryRefs`。
3. **组织事件与分支**：节点代表具体事件、冲突、人物选择或阶段目标（一章可含多个事件，一个事件也可跨章）。未定构想标 `idea`，作者敲定采用标 `selected`，完整写入正文且挂上真实 `{chapterId,revision}` 的 `chapterRefs` 后才标 `written`。互斥方案从同一前置节点分叉，在摘要里写清各自代价。
4. **原子提交与自动排版**：用 `planning.apply {requestId,operations,reason}` 一次提交节点、连线、分组或便签（同批内新对象可用临时 `ref` 互相引用，新增节点/文件夹/便签须在各自 `value.pageId` 显式填画布 ID 或 `null`）。新增对象省略坐标，紧接着调 `planning.layout {pageId,expectedSequence,requestId}`（默认 `mode:"missing"` 只排新卡，作者要求重排整页或局部时才用 `mode:"all"` 配合可选 `nodeIds`）。
5. **简短汇报**：告诉作者更新在哪张画布或目录路径、核心推进逻辑以及待拍板的分叉点。

## 画布、阶段、文件夹与便签分工

- **阶段细化（`parentId`）**：把一个大事件拆成若干子情节时，让子节点的 `value.parentId` 指向原阶段节点（显式填相同的 `pageId` 和 `groupId`）。原节点本身就是收纳后的阶段概括，子情节之间的先后因果另用 `edge.create` 连线表达。
- **文件夹归类（`groupId`）**：按阵营、线索或篇章归类用 `planning.groups {pageId}` 查看路径，`group.create` / `group.update` 维护嵌套文件夹，`node.update` 的 `groupId` 调整卡片归属，保留原有 ID 与连线。
- **独立推演页（`pageId`）**：需要单独开辟沙盘对比大支线时用 `planning.page.create {name,summary,requestId}`；跨页移动在一次 `apply` 内清理跨页连线/父子关系并更新 `pageId` 与目标 `groupId`。
- **便签（`decoration`）**：灵光一现的台词、待解悬念或备忘用 `decoration.create {kind:"note",title,content,pageId,groupId?}` 贴在画布旁，不混入事件因果链。

## 常用修改与回退

- **顺延与插入**：从单点往后（或 `side:"in"` 往前）续接一步可用 `planning.continue`；在 `A → B` 中间插入 `X` 时，同次 `apply` 执行 `edge.delete`（带 `id, expectedRevision, confirm:true`）删原直连边并建 `A → X → B`。删除有下级的节点时用 `childPolicy:"detach"` 保留上移子情节（仅在作者要求整棵删掉时用 `"subtree"`）。
- **版本回退**：撤销整批规划事务用 `planning.changes` / `planning.history` 配合 `planning.revert {transactionId,requestId}`；只看或恢复单张卡片内容用 `planning.node.history {nodeId}` 与 `planning.node.restore {nodeId,expectedRevision,targetRevision,requestId,reason?}`。

需要新建沙盘、三线汇合、插入事件、阶段细化或归入嵌套文件夹的完整 JSON 范例时，按需读取 [references/operations.md](references/operations.md)。
