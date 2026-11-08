# 原生创作工作台操作

工具 `cuigengji_story` 使用 `{action,args}`。novelId 可显式指定；省略时使用本会话当前作品。读取和编辑创作资料不会切换会话焦点，也不会修改正文。

## 读取

- `story.get {novelId?}` 返回 `{novelId,story,chapters,characters,diagnostics}`。旧作品没有 story 时返回 revision=0 的默认状态，读取不会初始化写盘。
- `story.context.get {novelId?,chapterId?,maxChars?}` 返回有界上下文：`plans` 是简报、目标蓝图和未完成意图；`facts` 是目标及此前的有效追踪、设定与有限原文。maxChars 默认 12000，范围 1000–24000，约束整个 JSON 返回。
- 每条 context item 包含 kind/id/title/content、来源章/版本（适用时）和 truncated。顶层 omitted 给出 future/stale/deleted/budget/unconfirmed 原因，omittedCount 是省略总数，omittedTruncated 表示省略清单也被截断。缺关键资料时按 ID 使用原生章节/设定工具补读，不假装窗口完整。

## 原子修改

`story.apply {novelId?,expectedRevision,requestId?,operations:[{op,value}]}`，expectedRevision 来自刚读过的 story.revision；operations 为 1–100 条，一起成功或失败。成功返回新读模型、revision、results（含新条目 ID）。requestId 是 1–200 字符的单次修改标识，同一请求重试保持不变。

| op | value |
| --- | --- |
| configure | 局部更新 mode、stage、brief |
| outline.upsert | 真实 chapterId、intent、beats 数组、endingHook，可选 minWords/maxWords |
| tracking.commit | chapterId、expectedChapterRevision、summary、storyTime、location、activeCharacterIds、commitments、risks |
| thread.upsert | 新建提供 kind/title/detail/status；更新提供真实 id 和变动字段；可附 sourceChapterId/sourceRevision/dueChapterId |
| review.upsert | 新建提供 chapterId/expectedChapterRevision/severity/category/location/evidence/issue/suggestion/status；更新用 id、expectedChapterRevision 和变动字段 |
| thread.remove / review.remove | 真实 id；需要保留处理轨迹时优先 retired/dismissed |

mode 为 long/short；stage 为 idea/design/outline/draft/review/ready。stage 记录作者工作位置，不代表模型验收或自动开始下一阶段。

brief 有 premise/readerPromise/protagonistGoal/coreConflict/ending/style 字符串字段，可局部更新，每项最多 4000 字符。

Thread kind 为 foreshadow/promise/expectation/constraint；status 为 open/progressing/resolved/retired。新建 ID 由后端生成。正文来源必须指向真实存在的章节版本；未发生的未来事件留在规划，不伪造 source。

Review severity 为 blocking/suggestion/note；category 为 causality/character/continuity/pacing/prose/promise；status 为 open/resolved/dismissed。新建和正文证据变动均须核对当前章 revision。仅处置旧问题不会把旧证据自动升为新版本。

## 示例

在真实 story.revision 为 0 时保存已确认的简报：

```json
{"action":"story.apply","args":{"expectedRevision":0,"requestId":"story-brief-unique","operations":[{"op":"configure","value":{"mode":"long","stage":"design","brief":{"premise":"夜班记账员发现每份账册都少了一页。","readerPromise":"用可验证的证据逐层揭开失账原因。"}}}]}}
```

写完实际章节后提交事实。CHAPTER_ID 和版本值必须替换为本次刚读取的数据；此例假设 story.revision=1、正文 revision=2，角色为空表示本次没有需要交接的角色卡引用：

```json
{"action":"story.apply","args":{"expectedRevision":1,"requestId":"story-tracking-unique","operations":[{"op":"tracking.commit","value":{"chapterId":"CHAPTER_ID","expectedChapterRevision":2,"summary":"记账员留下两份不同版本的收据，决定核对交接记录。","storyTime":"同日夜间","location":"账房","activeCharacterIds":[],"commitments":["下一章核对交接记录"],"risks":[]}}]}}
```

字符上限：outline intent≤4000、beats≤40条且每条≤1000、endingHook≤2000；tracking summary≤6000、时地各≤1000、commitments/risks各≤40条且每条≤1000；Thread title≤300/detail≤6000；Review location≤1000/evidence、issue、suggestion各≤4000。不要为用满预算填充内容。

诊断包含 untrackedChapterIds、staleTrackingChapterIds、staleReviewIds、staleThreadIds、dueThreadIds、blockingReviewIds。过期代表需要对照当前正文核实；更新版本号或阶段不能代替核对。
