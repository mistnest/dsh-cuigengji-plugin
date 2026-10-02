---
name: cuigengji-plan
description: 和作者讨论情节走向，更新或续接共享流程图，处理分支、独立页面、画布批注、分组、正文关联与协作冲突。
---

# 共同讨论与维护剧情流程图

规划区用于展示“当前处境 → 选择/行动 → 后果/新问题”。聊天讨论细节，图保留可继续使用的情节与未决路线，不是聊天逐条归档区。作者明确要求只聊不改时只读取；授权整理、推进或修改规划后，才更新对应节点。

## 定位与决定怎么改

所有下述 action 调用 `cuigengji_plan`，用 `{action,args}` 包装。

1. 先按下述“页面与画布批注”选定页面，再根据本次情节用 `planning.search {query}` 或 `planning.list {pageId,groupId,status,offset,limit}` 找标题和摘要；需要分组时读 `planning.groups`。命中后 `planning.get {nodeId}` 读取 `node` 的全文、`edges` 和 `flow.previous/next` 的相邻摘要。列表返回的 edges 可能包含本次筛选之外的关系，不能把所有边都当作当前路线。
2. 核对人物动机、前因与后果。只在需要确认已发生事件时读相关章节；不为调一条连线读取全书。
3. 同一情节的补充、否定或解释，更新原节点。独立事件或真正不同的路线才新增；不能因为同一章讨论了三次，就建三个重复节点。

| 需要做的事 | 操作 |
| --- | --- |
| 补充原有情节 | `planning.apply` 中 `node.update {id,expectedRevision,value}`；只提交要改的字段 |
| 接续独立的下一步 | `planning.continue {nodeId,expectedRevision,requestId,value}`，同时创建新节点和普通箭头，默认继承起点页面与分组 |
| 两种未定走向 | 同一起点连接两个具体事件；新节点用 `idea`，标题/摘要交代差别；不要要求作者填写边类型 |
| 连上已有节点 | 先检查是否已有边，再 `planning.apply` 的 `edge.create {value:{from,to}}` |
| 取消连线 | `edge.delete {id,expectedRevision,confirm:true}`，不删除两个节点 |
| 在 A→B 中插入事件 | 一次 apply 创建 X、删 A→B、建 A→X 和 X→B，避免半张图 |
| 整理分组 | `planning.group.create/update/delete`；节点归组用 node.update 的 groupId，多节点移动放在同一 apply |
| 查作者或 AI 的改动 | 已知 sequence 时按需 `planning.changes {after,nodeId?,limit}`；回顾用 `planning.history {nodeId?,offset,limit}` |
| 撤销一次图修改 | 查明影响后 `planning.revert {transactionId,requestId}`；有后续改动导致冲突时不强行回滚 |

独立故事线可以有自己的起点；不要为了让所有节点相连而编造因果，也不要按创建时间把旧节点串成一条线。连线不允许自环或循环。

删除节点用 apply 的 `node.delete {id,expectedRevision,confirm:true}`，同时移除相连的边；有下级节点时指定 childPolicy:detach（保留下级并移出）或 subtree（一起删除）。作者要删整段路线时先读清范围，并把读到的 sequence 放在 args.expectedSequence 中，避免并行更新扩大删除范围。放弃一个方案通常只需标 dropped。

## 内容与进展

- **标题**让作者一眼看懂事件，例如“发现假账，暂时隐瞒”。
- **摘要**写触发原因和发生的变化，便于扫图、检索；不要把全文挤进摘要。
- **正文**自由组织动机、细节、伏笔、分歧和待解问题，不强制套模板。
- `idea`：还在讨论；`selected`：作者决定采用；`written`：已在保存的正文中实现；`dropped`：暂不采用。不要因自己提出了方案就标 selected，也不要把备选当成已发生事实。

分组是检索目录，不是故事中的关系；规划分组和设定分组有各自的 ID，不能混用。用 `planning.group.create {name,summary?,requestId}` 建组，修改/删除用 groupId 和 expectedRevision，删除还需 confirm:true。删除组保留节点并移到未分组；分组调整后成员 revision 可能改变，应重新读取。日常协作不依赖旧 parentId 层级；保留已有层级与位置，不顺手整理作者的画布。

## 页面与画布批注

- `planning.pages {}` 返回页面 ID、名称、用途摘要和内容数量。默认“主线规划”的 pageId 为 null；未传 pageId 的 list/search 为全局检索，日常讨论用选定的 pageId 只读这一页。UI 当前选页不是 Agent 隐式上下文，不要猜测，应根据作者提到的情节、页名和摘要定位。
- 与旧情节关系不大的新篇章或独立讨论，用 `planning.page.create {name,summary,requestId}` 创建独立页；同一事件的补充留在原页原节点。创建节点明确带 value.pageId；`planning.continue` 强制继承起点页面，避免续接散落。
- 页面用于隔离画布，分组用于页内筛选，不能互相替代。跨页不能连线或建立父子层级。迁移完整路线时在同一 apply 更新所有相关节点的 pageId；迁移局部时先核对并删除跨页边、断开跨页 parentId。保留节点正文、引用和页内边。改名/摘要用 `planning.page.update {pageId,expectedRevision,name?,summary?,requestId}`；page.delete 仅删除空页，仍需 expectedRevision、confirm:true、requestId。
- `planning.decorations {pageId,offset,limit}` 读取本页文字批注和背景框（items、nextOffset）。它们放讨论疑问、备选说明和区域标题，不是正式情节节点或已发生事实。不能用批注代替情节节点，也不要无目的地调整作者的字体/布局。
- `planning.apply` 支持 `decoration.create {ref?,value}`、`decoration.update {id,expectedRevision,value}`、`decoration.delete {id,expectedRevision,confirm:true}`。value 可含 pageId、kind:note/frame、title、content、position:{x,y}、width、height、color:neutral/sand/sage/sky/rose、fontSize:14/18/24/32、fontFamily:sans/serif。坐标非负；宽度 160–6000，高度 80–6000。更新只提交需要的字段；同样支持事务撤销、版本冲突和导入导出。

创建独立页及讨论材料可以一次完成；后续用 mapping 返回的真实 ID：

```json
{"action":"planning.apply","args":{"requestId":"new-independent-page-unique","reason":"另开一页讨论远行篇，不混入当前路线","operations":[{"op":"page.create","ref":"journey","value":{"name":"远行篇 · 讨论","summary":"离开雨城后的独立情节，还未决定采用。"}},{"op":"node.create","ref":"arrival","value":{"pageId":"journey","title":"抵达陌生港口","summary":"旅途的第一处落脚点，先核对人物目标。","content":"这是备选事件，具体冲突等待作者讨论。","position":{"x":100,"y":120}}},{"op":"decoration.create","ref":"question","value":{"pageId":"journey","kind":"note","title":"待讨论","content":"这一段的驱动力来自人物主动选择，还是外界压力？","position":{"x":420,"y":120},"color":"sand","fontSize":18}}]}}
```

## 调用示例

示例中的大写 ID 是占位说明，必须换成查询返回的真实 ID；revision=1 仅是假设读到的版本。每个 requestId 换成该操作唯一的值；真正重试原请求时保持不变。

补充原节点，不新建备忘录。`value` 中省略的字段保留：

```json
{"action":"planning.apply","args":{"requestId":"update-scene-unique","reason":"补充暂不揭穿假账的动机","operations":[{"op":"node.update","id":"SCENE_ID","expectedRevision":1,"value":{"summary":"主角压下质问冲动，准备沿送账人的去向追查。","content":"留存可疑账册。主角没有当场质问，因为惊动送账人会使幕后线索中断；他准备先核对送账人的去向。"}}]}}
```

接续下一步，默认留在同一分组：

```json
{"action":"planning.continue","args":{"nodeId":"SCENE_ID","expectedRevision":1,"requestId":"continue-scene-unique","value":{"title":"暗中跟踪送账人","summary":"送账人没有回账房，而是走向废弃码头。","content":"这是尚未采用的下一步：跟踪可能找到幕后人，也可能让主角暴露。","status":"idea"}}}
```

插入中间事件。`clue` 是本次事务的 ref，直接使用这个字符串，不加 `$`；只在本次 apply 内有效，之后用返回 mapping 里的真实 ID：

```json
{"action":"planning.apply","args":{"requestId":"insert-scene-unique","reason":"在发现假账与追查码头之间补上线索","operations":[{"op":"node.create","ref":"clue","value":{"title":"核对送账时间","summary":"账本时间与码头收据不符，提供追查方向。","content":"由人物主动核对得出线索，避免突然知道目的地。","groupId":"PLAN_GROUP_ID","status":"idea"}},{"op":"edge.delete","id":"DIRECT_EDGE_ID","expectedRevision":1,"confirm":true},{"op":"edge.create","value":{"from":"SCENE_ID","to":"clue"}},{"op":"edge.create","value":{"from":"clue","to":"NEXT_SCENE_ID"}}]}}
```

apply 返回 mapping、changed、sequence 和 transactionId，不是节点全文；continue 返回新 node 的元数据及 from。保存后按需 `planning.get` 核对内容和前后关系。

## 与正文、设定协作

`memoryRefs` 放相关设定节点 ID，`chapterRefs` 放 `{chapterId,revision}`；增补这些数组时保留已有引用。真正写入正文后，读取已保存章节版本，再更新对应节点的 chapterRefs 和 written 状态；工具要求 written 至少有一个正文版本引用。部分实现的情节在节点正文中说明剩余部分，不把整条路线标成完成。

不要因为改了规划就连锁重写正文或改人物事实。来源正文被作者修改后，对相关节点按需核对引用与意图；只调整受影响部分。历史引用本身可以保留，不为了看起来“最新”而机械换版本。
