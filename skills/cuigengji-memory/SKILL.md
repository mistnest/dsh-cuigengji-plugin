---
name: cuigengji-memory
description: 与作者共同创建、修订和分组角色卡、世界书及关系，区分作者设定、正文事实与未决提案。
---

# 共同维护设定与关系图

设定区和正文、规划一样，由作者与 Agent 共用。支持提前构建世界观，也支持从已写正文维护连续性；并非必须先写出章节才能建人物或世界规则。

## 先分清信息的性质

| 来源 | 如何记录 |
| --- | --- |
| 作者明确规定的世界规则、人物背景 | 可作为作品设定保存；在正文内容中注明作者设定，尚未在故事中揭示的部分不写成角色已经知道的事。没有章节证据时不编造 sources |
| 已保存正文中明确发生的事件 | 核对相关片段，用真实章节 ID 和 revision 记录 sources |
| 作者正在比较的方案、Agent 提议、推测 | 保持未确认；未来情节优先留在规划，不冒充当前人物事实 |
| 角色的认知、谎言或误解 | 在正文中明确是谁的认知，区分 belief / misunderstanding 与客观事实 |

作者的新设定与已发生正文冲突时，指出具体冲突，再判断是未来补充、角色误解还是作者要修订前文。不要悄悄覆盖正文来迁就设定。

## 查找、复用、更新

所有下述 action 调用 `cuigengji_memory`，用 `{action,args}` 包装。

1. 根据人物名称、别名或场景关键词用 `graph.list {query,type?,groupId?}` 查找。query 会搜索名称、摘要、别名和正文，但列表不返回正文。没有命中时换合理别名；空结果不等于人物一定不存在。
2. 用 `graph.get {nodeId}` 读取命中的全文和 revision；需要关系时 `edge.list {nodeId}`，详细核对某条边用 `edge.get {edgeId}`。不用每轮遍历整个图谱。
3. 补充同一个人物或规则优先 `graph.update`。只有新的独立对象才 `graph.create {type,name,summary,content,...}`；新角色用 character_card，世界规则、地点、组织等用 world_entry。旧 world_book 数据可以读取，日常新增使用前两类。
4. 保留作者的表述、别名、来源、知情范围和分组。只改本次涉及的字段；更新 content 是替换整个条目正文，必须先读完整条目并合并，不拿一段摘要覆盖全文。
5. name 是界面标题，summary 用于扫列表与检索，content 是自由正文。不要把每条聊天消息拆成一张卡，也不要把审阅指令、预设或 skill 写入世界书。

## 分组与关系各司其职

- 用 `graph.groups` 读已有目录。创建组：`graph.group.create {name,summary?}`；修改/删除：`graph.group.update/delete {groupId,expectedRevision,...}`，删除还需 confirm:true。
- 单条归组：graph.update 的 groupId；多条归组：`graph.move {groupId,members:[{id,expectedRevision}]}`。groupId:null 表示未分组；删除组不会删人物或设定。分组操作可能更新成员 revision，后续写入重读版本。
- 分组用于查找，例如“雨城人物”“帝国制度”；人物“隶属某组织”属于世界关系，需要组织条目与连线，不能只靠文件夹位置表达。
- 连线：`edge.create {from,to,name?,content?}`。有准确的信息才填名称/说明，文字会直接显示在关系图的边上；无信息时允许只有箭头，不硬编关系属性。
- 更新/断线：`edge.update/delete {edgeId,expectedRevision,...}`；删除带 confirm:true。删除一条边不删除两个端点。已存在相同语义的关系时更新旧边，不反复创建；不要为了对称而机械补一条反向边。
- 规划箭头表示情节推进，设定箭头表示人物或世界关系，两个图的 ID 与工具不混用。

## 共同操作关系画布

卡片的 position 为有限的 `{x,y}` 世界坐标，可正可负。作者平移和缩放视图不会修改作品数据，视图也不作为 Agent 上下文。默认保留作者布局，只有本次要求整理位置时才移动已有卡片；判断关系依据连线和正文，不依赖空间距离。

以下批量动作均先检查所有对象的 expectedRevision，再一次提交，最多 200 个对象。每次写入带唯一 requestId；只有原样重试复用它。遇到冲突先重读并合并意图，不自动替换版本号覆盖作者后续修改。

| 需要做的事 | 操作 |
| --- | --- |
| 移动多张卡片 | `graph.layout {positions:[{nodeId,expectedRevision,position}],requestId}`；只更新坐标，保留全文、来源与关系 |
| 新建卡片并与已有对象连接 | `graph.continue {nodeId,expectedRevision,side,value,requestId}`；value 是 graph.create 的字段，默认继承源节点分组；out 为源→新，in 为新→源。返回 node、edge |
| 明确要求复制一组卡片 | `graph.duplicate {members:[{id,expectedRevision,position?}],requestId}`；复制全文与组内连线，返回 nodes、edges；不要用它记录同一人物的补充 |
| 删除多张卡片 | `graph.remove {members:[{id,expectedRevision}],confirm:true,requestId}`；软删除卡片及相连关系，先核对范围 |
| 断开多条关系 | `edge.disconnect {edges:[{id,expectedRevision}],confirm:true,requestId}`；保留两端卡片 |

创建并连接不会只留下孤立卡片。关系名称和说明仍可在创建后用 edge.update 按已读版本补充；有信息才填写，未确认的联系保留相应状态。

## 状态、来源与人物知情

`status` 可用 active（当前可用）、stale（来源变化待核对）、unconfirmed（待确认）、retired（不再使用）。`factType` 可用 fact、belief、misunderstanding、unconfirmed、plan。状态与事实性质是两回事：默认创建可能是 active + unconfirmed，不能把 active 自动理解为已证实。

作者明确采纳的规则可用 active + fact；未定构思用 unconfirmed + unconfirmed。角色卡同时含事实和猜测时，在 content 中清楚区分，不用一个笼统标签掩盖不确定部分。

`sources` 是 `[{chapterId,revision}]`，版本必须真实存在；`knownBy` 可放知情角色卡 ID；`dependsOn` 放依赖的设定节点 ID；`storyTime` 用文本说明适用阶段。knownBy 为空不等于所有人物都知道，仍需结合正文核对。直接 graph.get 不会替你过滤未来信息或角色秘密，取材时自己检查。

正文更新会把引用该章及依赖它的资料标为 stale。只对当前任务相关记录核对最新来源，修正文案并更新 sources 后再恢复 active；不要批量消除提示。retired 用于保留不再使用的内容；graph.delete 会软删除条目及其连线，先核对作者是否真的要连关系一起删除。

## 调用示例

大写 ID 必须换成真实查询结果；revision=1 是示例读取值。每个操作生成唯一 requestId，只有原样重试复用它。

作者要求补充一名已有角色的身份，用原节点保存。此例假设已合并完原文；其他字段省略即保留：

```json
{"action":"graph.update","args":{"nodeId":"CHARACTER_ID","expectedRevision":1,"requestId":"update-character-unique","summary":"经营夜间书铺，熟悉旧账册的修复。","content":"她继承了母亲留下的书铺。作者补充：她以书铺为生，擅长修补受潮的账册；这项能力尚未在正文中展示。","status":"active","factType":"fact"}}
```

将已查明的几条资料移动到已有分组，不改正文和关系：

```json
{"action":"graph.move","args":{"groupId":"MEMORY_GROUP_ID","requestId":"move-settings-unique","members":[{"id":"CHARACTER_ID","expectedRevision":1},{"id":"PLACE_ID","expectedRevision":1}]}}
```

只在已有连线检查后建立人物与地点的关系。来源必须来自已经保存并读过的章节；若关系只是作者新设定，省略 sources 并在说明中注明：

```json
{"action":"edge.create","args":{"from":"CHARACTER_ID","to":"PLACE_ID","name":"经营","content":"在本章时点负责书铺日常经营。","factType":"fact","status":"active","sources":[{"chapterId":"CHAPTER_ID","revision":1}],"requestId":"connect-settings-unique"}}
```

保存后回读相关条目或关系，报告新增/更新/归组了什么。不要因为整理了设定就声称正文已改；若正文保存成功而设定维护失败，说明具体剩余工作。
