---
name: cuigengji-variables
description: 作者启用剧情变量后，按章节位置查询、预览和更新人物属性、物品与状态。
---

# 剧情变量与状态追踪

变量用于精确追踪随章节变化的数值、物品与标志位，人物性格与剧情推演仍由设定卡和规划画布承载。先调 `variables.config` 或 `variables.list` 确认目标作品是否已启用变量；未启用时直接按常规文字流程写作即可。

## 按剧情锚点读取

所有操作均支持 `novelId`（省略时使用当前会话作品）。读写变量时锚定当前情节所在的 `chapterId`、`chapterRevision` 与 `position`（`"start"` 或 `"end"`，特定节点可用 `anchor.label`），确保写前文时取到当时的准确状态。

- `variables.list`：查看变量配置与路径摘要。
- `variables.read {path?,chapterId?,chapterRevision?,position?,scope?}`：按需取值。`scope:"story"` 为正式作品状态，`"session"` 为当前会话推演草稿。
- `variables.history`：仅在作者要求追溯变化轨迹时按需分页查询（加 `includeData:true` 读取历史快照值）。状态显示 `stale` 时，结合最新正文核对后提交修正即可。

## 预览与提交更新

1. 读取目标章节与当前变量，记下 `revision`。
2. 针对实际发生变化的字段构造 `operations`（路径采用 JSON Pointer，如 `"/stat_data/主角/等级"`）：支持 `set`、`inc`、`remove` 以及标准 JSON Patch 操作。
3. 调 `variables.preview {baseRevision,anchor,scope?,operations}` 预览变更结果；确认无误后调 `variables.patch` 提交（带最新 `baseRevision`、`anchor`、`reason` 与唯一 `requestId`，仅网络原样重试复用 `requestId`）。互不重叠的路径修改会自动合并，同一路径冲突时重读后请作者确认。

示例：

```json
{"action":"variables.patch","args":{"novelId":"BOOK_ID","baseRevision":4,"requestId":"level-up-unique","anchor":{"kind":"chapter","chapterId":"CHAPTER_ID","chapterRevision":2,"position":"end"},"operations":[{"op":"inc","path":"/stat_data/主角/等级","value":1}],"reason":"本章突破后提升等级"}}
```

## 酒馆取值宏与 MVU 兼容

- `variables.render {text,chapterId?,position?,characterName?}`：按指定剧情位置渲染文本中的取值宏（只读渲染，不执行写入宏）。变量启用时，`graph.get` 也会附带当前渲染结果 `renderedContent`；修改设定卡时始终编辑原始 `content` 以保留宏占位符。
- `variables.parse {text}`：将常见 MVU 更新指令或 JSON Patch 文本解析为 `operations` 数组，解析后按上述流程 `preview` 并 `patch` 保存。
- 作用域对应关系：`getvar` 对应会话变量（`session`），MVU `stat_data` 对应正式剧情状态（`story`），`getglobalvar` 对应导入本作品的 `tavernGlobal`。
