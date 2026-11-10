---
name: cuigengji-plan
description: 推演情节、人物行动、分歧与因果，或整理规划目录时，主动维护和作者共用的画布；以事件和并行动线对齐思路，持续修改原图。
---

# 和作者一起推演故事

共享协作规则：shared-canvas-v16。

画布是双方正在使用的讨论现场。作者说“这场决战怎么设计”“反派为何这样行动”“换一种推进方式”，就在相关页呈现处境、各方行动、选择及后果，记录有实质内容的未确认方案，再在聊天中解释关键分歧。不要等作者说“画图”，也不等大纲全部定稿。明确只聊不保存、简单问答或只读审阅时不写入。

后续反馈修改原页、原事件和原便签；同一情节的补充不另建重复节点。作者要求调整方案时，可在目标范围内删去过时或重复的内容、替换走向、合并事件；未采用的备选按讨论需要保留，不必把所有旧说法继续堆在当前图中。图用于对齐信息，不是把聊天逐句归档。

## 一轮讨论的动作

规划动作调用 `cuigengji_plan`，查资源用 `cuigengji_memory`；参数均为 `{action,args}`。

1. `planning.pages` 按名称与摘要定位讨论页；主线 pageId:null。`planning.search/list {pageId,query?,groupId?,status?,offset?,limit?}` 只读相关标题摘要。命中后 `planning.get {nodeId}` 读全文、真实连线和直接邻居 `flow.previous/next`；按需 `planning.decorations {pageId}` 了解框和便签。不要读取整部小说来调一条线。
2. 围绕本轮人物行动、地点或规则，核对相关当前设定。`planning.get` 的 resources 提供已关联资源的有限摘要、revision、status/factType 和 graph.get 入口；read 中的 action、novelId、nodeId 是调用提示，调用 cuigengji_memory 时仍包装成 `{action:"graph.get",args:{novelId,nodeId}}`，不能直接照抄为工具顶层参数。有 nextOffset 且确需更多时用 resourceOffset 续读。未关联时按姓名、别名或合理关键词 graph.list 查找，必要时 graph.get / edge.list 核对细节，再把真实 ID 补入 memoryRefs。已读且未变的资料可复用，摘要足够就不读全文；不扫全库，不为无关闲聊查资料，也不因缺少引用阻止讨论或保存。
3. 推演本轮问题，更新原事件；有独立用途的新事件才新增。新提案用 idea，作者明确采用后才 selected。连线表示行动引起的变化、依赖或选择，依据内容建立，不依据章节编号或卡片距离。
4. 一次 `planning.apply {requestId,operations,reason}` 提交相关节点、边与讨论材料。新建 `{op,ref,value}`；更新 `{op,id,expectedRevision,value}`；边 `{op:"edge.create",value:{from,to}}`。ref 是本批临时名字，直接引用，后续调用用返回 mapping 中的真实 ID。整批一起成功或失败。
5. 新增对象可省略坐标。随后 `planning.layout {pageId,expectedSequence,requestId}` 安放未定位的新对象；expectedSequence 使用刚读到或刚写入返回的 sequence。默认 mode:missing，不挪已有卡片。作者要求整理时才用 mode:all，并可用 nodeIds 限定局部。软件负责分列、留白和减少交叉，无须手算 x/y。
6. 回读涉及的节点/关系，简短说明更新在哪一页、核心方案和仍待确认的点。保存失败就说明剩余工作，不声称已完成。

列表分页最多 200 项，有 nextOffset 才继续读需要的部分。list 的 edges 可能包含筛选外的端点，使用前核对。UI 的筛选、缩放、收起和当前详情页是本机视图，不会过滤工具的真实数据，也不能假装知道作者光标或未保存草稿。

## 画布选择与目录怎么对应工具

作者的“当前画布”下拉框只切换界面。AI 按讨论目标从 `planning.pages` 定位名称和用途；查询与布局用 args.pageId，apply 新增情节、文件夹和批注在各自 value.pageId 填真实 ID，主线用 null。只在 apply 顶层填 pageId 不会替新增对象设置所在页，已有对象则保留原页。省略 pageId 的 list/search 会跨页检索，命中后以条目的 pageId 继续读取。工具不会替作者切换下拉框，完成后说明画布名和目录路径，方便作者找到。

| 要做什么 | 调用方式 |
| --- | --- |
| 看某画布有哪些文件夹和情节 | `planning.groups {pageId}` 配合 `planning.list {pageId,offset,limit}`，沿 parentId/groupId 还原目录 |
| 查某阶段的直接子情节 | `planning.get {nodeId}` 的 children，或 `planning.list {pageId,parentId:阶段ID}`；parentId:null 仅表示没有父阶段 |
| 查某文件夹及其子夹的情节 | 从 groups 的 path 找到文件夹，再 `planning.list {pageId,groupId}` |
| 把已有卡片收进新文件夹 | 同次 apply 创建 group，再用 node.update 的 groupId 引用它；已有子文件夹通过 group.update 的 parentId 收进来 |
| 把已有卡片组织成一个阶段 | 复用或创建概括事件，同次 apply 更新子事件的 parentId；保留原 ID、正文和真实连线 |

`planning.search` 查事件标题和摘要；文件夹名从 groups 的 name/path 定位，便签用 `planning.decorations` 读取。界面的原位搜索会保留祖先路径，AI 查询返回的平面索引也应按真实层级理解；需要上下文时沿 parentId 回读相关父阶段，用 groups.path 确认文件夹路径。作者只说“整理目录”时，优先调整归属与层级；画布重新排布是另一项操作，不能用移动坐标代替收纳。层级结构可由工具维护，实际展开/折叠状态留给作者的界面偏好。

## 选什么结构

节点是事件、冲突、人物选择、关键转折或阶段目标。一个章节可实现多个节点，一个事件也可跨章；伏笔和背景推演可以长期无 chapterRefs。written 只是完整落入已保存正文的证据，不是节点必须到达的终点。

标题说清事件，摘要写触发条件与变化，正文自由组织动机、细节和待解问题。不要把全文挤进摘要。按真实结构组织，例如：

```text
主角：潜入仓库 → 识破诱饵 ─┐
守方：布置埋伏 → 封锁出口 ─┼→ 黑暗中争夺账本 → 付出代价
第三方：等待交火 → 切断照明 ┘
```

三个前因共用同一个交汇节点；不是三套重复的高潮，更不是七章目录。单线故事可以单线，独立构想可以暂不相连，不为凑网状编造因果。互斥方案从同一处境分叉，在摘要中写明代价，待作者选择。

## 页、框、便签与分组

- **阶段包含子情节**：一个事件需要细拆时，以原节点为阶段，用 node.create 的 value.parentId 指向它。先读父节点，子情节显式填写相同的 pageId，并按需要沿用 groupId；不要假定只写 parentId 就会继承所在页。原节点的标题、摘要就是收纳后的概括，展开后显示同一批子情节，不另做概括卡和重复详情页。例如“开篇 → 退婚风波 → 登门 / 冲突 / 约定”；包含不是因果，推进关系另用边表达。planning.continue 会新增前后事件和箭头，不是添加子情节。
- **页是独立推演工作台**：确实需要另一张工作台时可开页；已有阶段的细化优先在原页做父子结构。无需为每章建页，也不凭名字把作者旧页并入别处。`planning.page.create {name,summary,requestId}`；节点明确 value.pageId，主线用 null。
- **文件夹用于自由归类**：阵营、线索或作者自定类别可用 groupId 归组，`planning.groups {pageId}` 返回目录和 path；`group.create {name,pageId,parentId?,requestId}` 建嵌套文件夹，更新用 groupId、expectedRevision。目录折叠和画布收纳独立，不改真实连线。节点 parentId 表示情节从属，组 parentId 表示文件夹从属，不为同一阶段再维护一套平行文件夹。
- 根目录可直接放情节与文件夹。目录排序不动坐标；删除文件夹将内容上移一级，保留全文。父阶段收纳会合并真实外部连线，展开仍是原节点和原关系。
- **便签记录待议事项**：精彩台词、未决问题、伏笔提醒可用 `decoration.create {kind:"note",title,content,pageId,groupId?}`，不把它们强行做成有因果的情节。便签只在画布展示和编辑，不混入内容目录及目录搜索；工具通过 planning.decorations 按页读取。
- 旧 kind:frame 讨论框保留批注与原布局；需要收纳时，用界面的“转换为文件夹”，或在同批创建组、将原成员归组并删除旧框。新收纳用文件夹，不再创建第二套 frame.members 归类。
- 跨画布移动用一次 apply：清理跨页边/父子关系，更新成员 pageId 及目标 groupId；保留移动成员之间的连线。先核对目标画布与文件夹，不复制同一事件来模拟移动。目录搜索和折叠只影响浏览，不限制 AI 查阅；画布里的文件夹与便签不能代替真实因果。

## 常用修改与边界

从一个起点续接：`planning.continue {nodeId,expectedRevision,requestId,value:{title,summary,content}}`，同时创建节点和箭头，继承页、分组和所属阶段；side:in 补前置，默认 out。多因汇合、分支和中间插入用 apply：插入 X 时同批删除 A→B、创建 A→X→B，不保留误导的直达边。

取消连线只删边：apply 中用 `edge.delete {id,expectedRevision,confirm:true}`；这是规划边，不能误用设定工具的 edge.delete/edgeId。删节点用 node.delete，同步移除相连边；有下级时明确 childPolicy:detach 保留并上移子情节，作者明确删除整棵子树时才选 subtree。删一段路线带已读 expectedSequence 核对范围。放弃方案通常只改 dropped。

修改记录：`planning.changes {after,nodeId?,limit?}` 或 history 返回事务；`planning.revert {transactionId,requestId}` 撤销该事务的整批修改，不适合只恢复其中一张卡片。所有修改保留唯一 requestId，同一请求重试保持不变；冲突后重新读取、合并具体差异，不换 revision 强行覆盖。

作者要求比较或恢复单张卡片时，先 `planning.node.history {nodeId,offset?,limit?}` 看版本摘要；需要某版全文再加 `revision:N,includeContent:true`，一次只读一个版本。普通讨论仍以 planning.get 的当前内容为准，界面查看历史不会自动注入对话。恢复前重读当前 revision，再 `planning.node.restore {nodeId,expectedRevision,targetRevision,requestId,reason?}`；仅恢复这张卡片的标题、摘要、正文、范围、状态、故事线与引用，保留当前目录、坐标、包含关系、连线和其他卡片。恢复结果成为新版本，原历史继续保留；完成后回读当前卡片，旧版引用仍需按实际正文核对。

正文保存后只核对本轮涉及的事件。chapterRefs 是 `{chapterId,revision}` 的多对多证据，memoryRefs 是真实设定 ID；增补时保留原引用。完整实现且有有效正文版本的事件才标 written；部分实现说明剩余内容，不为每章新增节点。改画布不会自动修改正文或人物事实。“计划让角色受伤”仍是意图，正文实际落实后再按保存结果更新角色当前状态。


需要收纳已有卡片、嵌套文件夹、细化阶段、插入事件、跨页操作或三线汇合的完整调用时，按需读取 [references/operations.md](references/operations.md)，路径相对本 Skill 的 resourceBase；其中 JSON 的 ID/版本是示例，必须换成真实查询结果。
