---
name: cuigengji-variables
description: 在作者启用剧情变量时，按小说剧情位置查询和维护人物属性、物品与世界状态；支持常见酒馆取值宏及 MVU 补丁解析。
---

# 可选剧情状态

变量帮助记住会变动的数字、标志和结构化属性，文字设定和共享规划仍负责人物塑造与剧情讨论。先 `variables.config` / `variables.list` 看目标作品是否启用；未启用时按原有文字写作流程，不要求作者配置变量，也不主动创建一套硬性人物属性。

## 先定位，再读取

所有调用可提供 novelId；否则沿用本会话当前作品。写第几章的故事，就明确该章 chapterId、chapterRevision 和 position:start/end；不要用最新章末状态写早期情节。命名场景用 anchor.label。章节 ID 与版本是锚，目录序号只是显示。

`variables.list` 返回摘要和定义，`variables.read {path?,chapterId?,chapterRevision?,position?,scope?}` 按需取值。story 是作品正式状态；session 是当前会话推演草稿，不会改变其他会话的状态。只有作者请求追溯时才查 `variables.history`，默认返回轨迹摘要，指定 includeData:true 才带历史值。历史值不是当前事实，界面浏览不会自动塞给模型。

stale 表示来源正文或上游状态已变。保留旧快照，核对受影响的情节后，在当前正文版本上提交修正；不要把旧数据标成新事实，不需要拦截整部小说写作。

## 预览与提交

1. 读取相关正文、人物和当前变量，取得 read 返回的 revision。
2. 对本轮确实变化的路径构造 operations。`set` 设置，`inc` 增减数字，`remove` 删除；也支持 JSON Patch 的 add/replace/test/copy/move。路径用 JSON Pointer，例如 `/stat_data/主角/等级`。
3. `variables.preview {baseRevision,anchor,scope?,operations}` 检查变化，不会保存。作者已授权的状态维护可以在核对后直接提交；讨论中的备选方案用 session，或只预览。
4. `variables.patch` 带同一补丁、最新 baseRevision、anchor、reason 和唯一 requestId。网络原样重试复用 requestId，不能另造 ID 让 inc 再加一遍。

互不相交路径的并行修改可以自动合并；相同或父子路径、数组结构、变量配置发生冲突时重读，保留双方意图，复杂情况请作者选择，不换版本号硬覆盖。保存旧剧情位置的新状态后，后续依赖快照会待核对。

示例：

```json
{"action":"variables.patch","args":{"novelId":"BOOK_ID","baseRevision":4,"requestId":"level-up-unique","anchor":{"kind":"chapter","chapterId":"CHAPTER_ID","chapterRevision":2,"position":"end"},"operations":[{"op":"inc","path":"/stat_data/主角/等级","value":1}],"reason":"本章突破后提升等级"}}
```

## 酒馆与 MVU

`variables.render {text,chapterId?,position?,characterName?}` 冻结读取到的状态，只替换支持的取值宏；不会执行 set/inc 等写入宏。`variables.parse {text}` 把 JSON Patch 或常见 MVU 字面量更新命令转换为 operations，之后仍要预览、核对并提交。不要把解析成功说成已保存。

`graph.get` 在变量启用时附带 `renderedContent` 和 `variableSnapshot`。按当前剧情使用渲染值，编辑设定时以原始 `content` 为基础保留取值宏，不能把某一章的临时数值反写成整本设定。需要其他文本或指定历史快照时用 `variables.render`。`variables.history` 支持 offset/limit 分页，只有作者需要时追溯。

普通 getvar 对应会话变量；MVU stat_data 对应作品剧情状态；getglobalvar 对应导入时明确转换到本作品的 tavernGlobal。它们的原始作用域不同，不能静默混为一体。初始化导入、启用开关和映射确认由作者在设置中操作；原来源保留。任意 JS/EJS、扩展状态栏和表达式不执行，不能宣称兼容所有角色卡。

写作指引关闭时，通过 MCP 按需读取本 Skill、变量和预设。预设模板沿用本会话首次读取的版本，宏按本次请求定位的剧情状态取值。读取和预览不写入变量。
