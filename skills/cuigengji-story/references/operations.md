# 原生创作工作台操作

工具 `cuigengji_story` 使用 `{action,args}`。novelId 可显式指定；省略时使用本会话当前作品。读取和编辑创作资料不会切换会话焦点，也不会修改正文。

## 读取

- `story.get {novelId?}` 返回 `{novelId,story,chapters,volumes,characters,diagnostics,style}`。旧作品没有 story 时返回 revision=0 的默认状态，读取不会初始化写盘。`chapters` 带真实正文测量（sentences/dialogueRatio/paragraphs），`style` 是文风要求与已写章节的对照。
- `story.context.get {novelId?,chapterId?,maxChars?}` 返回有界上下文：`plans` 是简报、目标蓝图、剧情单元、文风要求、未完成意图；`facts` 是目标及此前的有效追踪、设定与有限原文。maxChars 默认 12000，范围 1000–24000，约束整个 JSON 返回。
- `story.detect {novelId?,chapterId?,limit?}` 只读扫描已保存正文的 AI 味句式，按章返回带行号 column 的候选、分类计数（blocking/advisory）和 perThousand；不评分、不改正文。`story.detect.get` 只扫指定章。命中是候选：零命中也不代表故事成立。
- `story.reference.import {novelId?,path}` 读取本机拆文库书籍文件夹（如 `拆文库/书名/`），把章节摘要、文风、节奏、情绪模块和拆文报告保存为本书的对标副本；原文件夹只读，不修改拆文库。返回更新后的 story 快照。
- 每条 context item 包含 kind/id/title/content、来源章/版本（适用时）和 truncated。顶层 omitted 给出 future/stale/deleted/budget/unconfirmed 原因，omittedCount 是省略总数，omittedTruncated 表示省略清单也被截断。缺关键资料时按 ID 使用原生章节/设定工具补读，不假装窗口完整。

## 原子修改

`story.apply {novelId?,expectedRevision,requestId?,operations:[{op,value}]}`，expectedRevision 来自刚读过的 story.revision；operations 为 1–100 条，一起成功或失败。成功返回新读模型、revision、results（含新条目 ID）。requestId 是 1–200 字符的单次修改标识，同一请求重试保持不变。

| op | value |
| --- | --- |
| configure | 局部更新 mode、stage、brief |
| outline.upsert | 真实 chapterId、intent、beats 数组、endingHook，可选 minWords/maxWords |
| tracking.commit | chapterId、expectedChapterRevision、summary、storyTime、location、activeCharacterIds、commitments、risks；可附 storyTimeOrder（可选整数，故事内时间顺序，越小越早，只用于画故事时间轴，不从 storyTime 文本推断；不传表示保留原值，传 null 表示清除）、authorTruth（作者真相，读者未必知道）与 readerKnown（读者已从正文得知）两个字符串数组 |
| thread.upsert | 新建提供 kind/title/detail/status；更新提供真实 id 和变动字段；可附 sourceChapterId/sourceRevision/dueChapterId |
| review.upsert | 新建提供 chapterId/expectedChapterRevision/severity/category/location/evidence/issue/suggestion/status；更新用 id、expectedChapterRevision 和变动字段 |
| unit.upsert | 剧情单元（卷内一段完整剧情，不等于章节）：新建提供 volumeId（无卷用 null）、title，可附 order/promise/emotionEngine/causeEntry/blocker/choice/payoff/hook/lineIds/chapterIds/contractRisk |
| storyline.upsert | 故事线（横向贯穿多个单元）：新建提供 title，可附 kind（main/subplot）、driver/junction/canCarryChapter（yes/half/no） |
| rhythm.upsert | 某章的基调与章内角色：chapterId、expectedChapterRevision（必填，绑定当前正文版本）、tone（tense/light/sad/hot/satisfying/sweet/warm/horror/oppressive/other）、role（''/setup/escalate/turn/payoff/aftermath）、note |
| style.upsert | 文风要求（表达层）：targetSentence（目标平均句长，按每句可见字数，0–400）、dialogueRatio（目标对白占比 0–100）、viewpoint/tense/diction/avoid、anchors 数组；只提交变动字段，未提交的保留 |
| rhythm.remove | chapterId；只删节奏记录，不影响正文 |
| reference.upsert | 对标书副本：id/title/source/importedAt/report/style/rhythm/emotion/chapters[]/counts；通常由 story.reference.import 生成，手工调用需完整对象 |
| reference.remove | 真实 id；只移除本书副本，不影响原拆文库 |
| thread.remove / review.remove / unit.remove / storyline.remove | 真实 id；需要保留处理轨迹时优先 retired/dismissed。仍被单元引用的故事线不能删除 |

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

字符上限：outline intent≤4000、beats≤40条且每条≤1000、endingHook≤2000；tracking summary≤6000、时地各≤1000、commitments/risks/authorTruth/readerKnown各≤40条且每条≤1000；Thread title≤300/detail≤6000；Review location≤1000/evidence、issue、suggestion各≤4000。不要为用满预算填充内容。

诊断包含 untrackedChapterIds、staleTrackingChapterIds、staleReviewIds、staleThreadIds、dueThreadIds、blockingReviewIds、overdueUnitIds。过期代表需要对照当前正文核实；更新版本号或阶段不能代替核对。overdueUnitIds 表示单元的章节范围已全部写完、单元契约却仍标为待补强或已破坏。
