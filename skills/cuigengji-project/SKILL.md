---
name: cuigengji-project
description: 在催更姬作品库中选择并接手作品，按需查阅正文、创作记忆、规划与设定，协同推进小说创作。
---

# 接手与协同维护小说

协作规则版本：shared-canvas-v19。

你与作者操作同一份实时作品库：设定是人物与世界资料库，规划是剧情推演画布，正文是正式成稿，创作记忆记录跨章文风与伏笔约定。

## 按作者意图直接行动

| 作者意图 | 协作方式 |
| --- | --- |
| “看看这一章”“先聊聊思路，别改” | 按需读取相关章节或卡片并讨论，不写入 |
| “后面怎么走”“推演决战方案”“对比两条路线” | 用 `cuigengji-plan` 主动在画布呈现事件、因果连线与待定分支（`idea`），边画边聊 |
| “完善这个角色”“改掉/删掉某条设定” | 用 `cuigengji-memory` 直接修改或删除原设定卡与关系 |
| “写下一章”“续写”“把这段改顺一点” | 用 `cuigengji-write` / `cuigengji-revise` 直接写入章节，旧稿自动留存在章节历史中 |
| “让子 Agent 分头写/审稿”或“给外部写手开权限” | 按下文分配写入范围与权限，回收并核验结果 |

已有明确指令的创作、修改、重组与删除直接落盘完成；仅在目标书/章节重名难辨，或改动会推翻既定主线时简短向作者确认。

## 选书与按需取材

1. **定位作品**：先看 `binding.get`；未绑定或作者指定其他书时，用 `novel.list` 找到目标后 `novel.focus {novelId}`（临时跨书查阅或写入也可直接在参数里传 `novelId`，不影响当前焦点）。新建作品用 `novel.create {title,description?,requestId}` 后再 `novel.focus`。
2. **快速接手**：首次接手、切书或上下文压缩后，调 `novel.handoff` 获取本书目录与创作记忆标题索引（默认返回近期章节摘要，不含正文）。已知多个目标 ID 时，可用 `cuigengji_context` 的 `context.readMany` 一次合读 `{kind:"chapter"|"setting"|"planning",id}`。持续指引关闭时，可调 `cuigengji_guidance {section,args:{novelId?}}` 按需读取 `project`、`write`、`plan`、`memory`、`revise`、`variables`、`core` 或 `preset`。
3. **取材优先级**（够用即止，已读未变直接复用）：
   - **正文**：已发生剧情的唯一事实依据。续写读目标章或紧邻前文，局部修订用 `chapter.search` / `chapter.get {chapterId,start?,maxChars?}`（长文沿 `nextStart` 分段读取）。
   - **创作记忆**：涉及叙事视角、文风基调或跨章伏笔时，用 `creativeMemory.read {novelId,query?,section?}` 查阅；作者拍板的长期决定用 `creativeMemory.update`（带 `expectedRevision`、`expectedHash`、`requestId`，新增用 `append`，改删原段用 `patch:{oldText,newText}`）主动维护。单章临时试写留在对话即可。
   - **规划**：用 `planning.pages` 与 `planning.search/list` 找当前路线，再 `planning.get` 看详情、前后邻居与关联资源摘要。
   - **设定**：用 `graph.groups` 与 `graph.list` 查相关人物、地点与规则，按需 `graph.get` 读当前全文；仅当作者要求追溯或回退旧版时才查 `history`。

## 核心工具入口

DSH 原生工具采用 `{action, args}` 调用（省略 `novelId` 时使用当前会话 `focus` 的作品）：

| 工具 | 常用操作 |
| --- | --- |
| `cuigengji_project` | `novel.list/focus/create/handoff`；`chapter.list {volumeId?}`、`chapter.search {query,chapterId?,limit?}`、`chapter.get/create/update/delete/history/restore`；`volume.list/create/update/delete`（非空卷删除需指定 `chapterPolicy:"detach"|"delete"` 与 `confirm:true`） |
| `cuigengji_plan` | `planning.pages`、`planning.page.create/update/delete`；`planning.groups`；`planning.search/list {pageId?,query?,groupId?,status?,offset?,limit?}`；`planning.get/decorations/continue/apply/layout/changes/history/revert`；`planning.node.history/restore` |
| `cuigengji_memory` | `graph.groups`、`graph.list {query?,type?,groupId?}`、`graph.get/create/update/updateMany/delete/remove/move/arrange/layout/continue/history/restore/workspace.ensure`；`edge.list/get/create/update/delete`；按需配图 `image.list/read/import/update/delete` |
| `cuigengji_context` | `binding.get`、`context.readMany`、`creativeMemory.read/update`；旧版预设兼容读取 `preset.read`，导入或编辑旧版预设时按需读 [references/presets.md](references/presets.md) 并用 `preset.get/preview/import/update` |
| `cuigengji_connections` | `external.status`、`external.create {name,novelIds,permissions}`、`external.update {id,expectedRevision,novelIds?,permissions?,enabled?}`、`external.records`、`external.revoke` |

## 主 Agent 分发子 Agent 与外部 MCP 协作

### 并发分工

- 同章多视角审稿和设定核查走只读并行。主控汇总意见后，由一个写手改稿落盘。
- 不同章节起草、互不依赖的卡片维护可并行直写。明确各自的写入目标与只读引用。

### 路径 A：DSH 原生子 Agent

- 子会话不会自动继承父会话的 `novel.focus`。派单显式传入 `novelId`、目标 `chapterId`（或新章序号和标题）、参考章节和规划 `nodeId`、需加载的 Skill 及读写边界。
- 子 Agent 调 `novel.focus {novelId}`，或每次调用传 `novelId`。按 `{action, args}` 取材和保存，只读任务回报意见。写入完成后回报 `chapterId` 和 `revision`。

### 路径 B：外部 MCP 子 Agent / 客户端

1. 主控用 `cuigengji_connections` 调 `external.status`，再按需 `external.create` / `external.update`。明确授权 `novelIds`，仅在作者要求整库时传 `novelIds:null`。分别为 `manuscript`、`settings`、`planning`、`guidance` 选择所需的 `none`、`read` 或 `write`。
2. 派单说明外部 `cuigengji_*` 工具采用**顶层扁平参数**，勿套 `{action, args}`。按需用 `cuigengji_creativeMemory_read`、`cuigengji_context_readMany`、`cuigengji_chapter_get`、`cuigengji_chapter_create` 或 `cuigengji_chapter_update`，每次传目标 `novelId`。
3. 多任务共用同一 MCP 进程时，每个任务先调 `cuigengji_reader_open {"label":"任务名"}`，后续调用传各自的 `readerSessionId`。
4. 新建传 `novelId` 和 `requestId`，并按派单核对卷和章序。修改已有内容先读当前版本，再传 `novelId`、`expectedRevision` 和 `requestId`。完成后回报 `chapterId` 和新 `revision`。

### 主控回收核验

- 用 `chapter.get` 核对实际落盘内容和最新版本。外部写入可配合 `external.records` 核对调用记录。
- 简短告诉作者实际改了哪些章节，提示可用「改动对比」审阅。

## 并发写入与版本规则

- **先读版本再写入**：修改前读取目标最新 `revision`，更新时传入 `expectedRevision` 与唯一 `requestId`（网络超时原样重试复用同一 `requestId`，修改参数后换新 ID）。
- **精准更新正文**：`chapter.update` 的 `content`、`append`、`patch:{oldText,newText}` 三选一；局部增删改优先用唯一匹配的 `patch`，追加结尾用 `append`（自带段落换行），整章替换前须先用 `nextStart` 读完同一版本全文。
- **处理冲突与删除**：返回 `CONFLICT` 时保留拟稿，重读最新内容合并无冲突修改，同一处分歧向作者说明；删除操作核对影响范围后带 `confirm:true` 执行。完成后简短告知作者实际更新了哪些章节或条目。
