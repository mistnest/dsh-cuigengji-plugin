---
name: cuigengji-memory
description: 创建、补充、修改或归类人物与世界设定，维护原卡与人物关系网络。
---

# 维护人物与世界设定

共享协作规则：shared-canvas-v19。

设定库里每个人物（`character_card`）和世界词条（`world_entry`，含地点、势力、规则、器物）只维护一份活档案。作者讨论人物塑造、调整世界规则或梳理阵营关系时（除非明确只聊不存），主动查找并更新原卡与连线；后续变动直接改原卡、删去过时内容，把旧说法留给卡片历史版本，让当前卡片始终干净准确。

## 增删改查怎么选

调用 `cuigengji_memory`（跨资料合读用 `cuigengji_context` 的 `context.readMany`），参数为 `{action, args}`：

| 要做的事 | 操作方式 |
| --- | --- |
| 查找目录与条目 | `graph.groups` 看文件夹树与 `path`；`graph.list {query?,type?,groupId?}` 检索（省略 `groupId` 查全书，指定文件夹含子夹，`null` 查根目录直接卡片），命中后 `graph.get {nodeId}` 读全文与 `revision` |
| 局部修改或删掉某句 | `graph.update {nodeId,expectedRevision,patch:{oldText,newText},summary?,reason?,requestId}`（`newText:""` 即删除该段；涉及摘要信息时一并更新 `summary`） |
| 整理重写整张卡 | 先 `graph.get` 读完整 `content`（启用变量时编辑原始 `content` 保留宏），再传 `content` 提交完整新正文 |
| 多张设定卡联动修改 | 先 `context.readMany` 读齐版本，再 `graph.updateMany {novelId?,reason,requestId,updates:[...]}` 原子提交（最多 20 张） |
| 新建卡片与关系 | 新对象用 `graph.create`（或 `graph.continue` 同时新建并连线），随后调 `graph.arrange {members:[{id,expectedRevision}],requestId}`（默认 `mode:"missing"` 自动安放新卡）；有明确互动或归属关系时用 `edge.create` / `edge.update` |
| 删除卡片或关系 | 删整卡用 `graph.delete`（批量 `graph.remove`），只断关系用 `edge.delete`，均带 `expectedRevision` 与 `confirm:true` |

若遇到旧版多画布设定库，首次整理调一次 `graph.workspace.ensure {requestId}` 即可无损转为顶层文件夹，随后重读新目录与版本。

## 事实状态与知情边界

- **区分事实与认知**：`status`（`active`/`stale`/`unconfirmed`/`retired`）搭配 `factType`（`fact`/`belief`/`misunderstanding`/`unconfirmed`/`plan`）。作者敲定的设定用 `active` + `fact`（尚无正文出场时 `sources` 留空即可，已落入正文的事件可附上真实 `{chapterId,revision}`）；角色单方面的误解或信念用 `belief` / `misunderstanding`；还在比选的构想标 `unconfirmed`。
- **管好秘密范围**：涉及秘密或阶段性情报时，在 `knownBy` 填入知情角色卡 ID，用 `storyTime` 标明适用时期，帮助写作时守住人物视角边界。

## 目录整理、历史恢复与配图

- **文件夹归类**：人物与世界词条可按阵营或地域混放同一文件夹；移动卡片用 `graph.move {groupId,members,requestId}`（`groupId:null` 移回根目录），嵌套移动文件夹用 `graph.group.update {groupId,expectedRevision,parentId,requestId}`。
- **按需追溯历史**：仅在作者要求对比或恢复旧版设定时调 `graph.history {nodeId}`（读指定版本正文加 `revision:N,includeContent:true`），恢复前重读最新 `revision`，再调 `graph.restore {nodeId,expectedRevision,targetRevision,restoreScope?,reason?,requestId}`（传 `restoreScope:"content"` 可只恢复文字内容而保留当前所在文件夹）。
- **卡片配图（按需）**：平时写作无需查图；仅当作者要求导入或管理角色/场景配图时，使用 `image.list/read/import/update/delete`（注意配图使用独立的图片 `expectedRevision`）。

需要补充角色、批量归组、嵌套文件夹、局部改删与配图的完整 JSON 范例时，按需读取 [references/operations.md](references/operations.md)。
