---
name: cuigengji-memory
description: 查找、补充、纠正、删减或删除人物与世界设定，维护原卡和相关关系；也用于整理设定目录，区分作者采用的事实与未决提案。
---

# 共同维护人物与世界

共享协作规则：shared-canvas-v16。

作者请求设计、完善人物、世界规则或阵营关系时，主动查找并维护相应卡片与连线，不等他说“保存到设定”。同一人物后续补充修改原卡；不要把聊天逐句拆卡。明确只聊不保存、简单知识问答和只读审阅时不写入。

作者要求完善、修订或重写一张卡时，可在目标范围内删掉冗余和过时描述、替换事实、重组段落，不必逐句请示。“保留信息”是保留未涉及且仍有效的内容，不是只能追加。作者明确的新要求可以替换原设定；不要把新说法只记在聊天里、另建同名卡，或在原文后追加一段修订说明却保留互相矛盾的现行描述。修改缘由放 reason，旧说法由历史保留。只有对象或影响范围确实不清时才询问，正文和其他无关设定不随意连带改写。

设定图展示人物、地点、组织、规则之间的关系。人物将采取的行动、剧情走向和备选结果进入规划画布，复杂讨论可以同时维护两者。每部作品独立维护人物和世界；引用其他作品的构想时须按作者意图改编，不把别书事实和 sources 当成本书证据。

## 修改与删除用什么

| 作者意图 | 操作 |
| --- | --- |
| 改一句、纠正某项属性 | 找到原卡，graph.get 读当前 content/revision；graph.update 用 patch:{oldText,newText} 替换原句。摘要含同一信息时同次更新 summary |
| 去掉某项能力或背景描述 | graph.update 的 patch，newText:""；卡片及其余信息保留，按需同步摘要和直接相关关系 |
| 整理或重写整张资料 | graph.update 的 content 提交完整新正文；可以删减重组，保留目标之外仍有效的信息 |
| 删除整张人物卡或设定 | graph.delete {nodeId,expectedRevision,confirm:true,requestId}；批量用 graph.remove，软删除原卡及相连边，保留历史 |
| 只删除两人的关系 | edge.delete {edgeId,expectedRevision,confirm:true,requestId}，保留两张卡 |

作者已明确要求的改删直接执行，confirm:true 是工具参数，不是再向作者询问一次。retired 仍会出现在检索里，仅用于保留停用资料，不能替代作者要求的删除。目标同名或“这个设定”无法从对话确定时，先查候选，必要时问清；没命中可换关键词，不因暂未找到原卡就创建同名新版。

## 一轮协作怎么做

所有动作调用 `cuigengji_memory`，用 `{action,args}` 包装。

1. 首次整理旧版设定时用 `graph.workspace.ensure {requestId}` 将旧画布无损收进顶层文件夹；它返回旧 pageId 到新 groupId 的 folders 映射。升级后重读目录和目标 revision，不沿用旧页 ID、旧版本；新库可直接检索，不把升级操作变成每轮门禁。`graph.groups` 返回整棵资源目录与 path，`graph.list {query?,type?,groupId?}` 按名称、别名、摘要和当前正文检索，必要时换合理关键词；列表不返回正文。人物 character_card，规则、地点、组织用 world_entry；旧 world_book 可读。
2. `graph.get {nodeId}` 读取全文和 revision；`edge.list {nodeId}` 读直接关系，必要时 `edge.get {edgeId}` 读某条详情。按当前人物逐步扩展，不每轮遍历全图。
3. 同一对象用 graph.update，只提交本次编辑字段；局部优先 patch，oldText 来自当前原始 content 且唯一匹配，newText 可为空。content 与 patch 二选一；整体重写先读全文，不用摘要或 renderedContent 覆盖原文取值宏。修改影响摘要中的信息时一并更新 summary；只改摘要不算完成正文修改。只有独立新对象才 graph.create。name 是标题，summary 供检索，content 自由组织内容。
4. 有真实关系才用 `edge.create {from,to,name?,content?}`；已存在相同语义时改原边。关系文字会在线上显示；无信息就留空，不为了凑图编属性，也不机械创建对称反向边。
5. 保存后检查返回的 changed、changedFields、revision 和当前内容；changed:false 表示本次未变化，不能仅凭工具未报错就说已修改。需要时 graph.get 回读本次条目，确认目标描述及摘要已变；删除核对 deleted:true，或 graph.list 不再返回原 ID，graph.get 留着的软删除正文是历史可恢复资料。只核对本次对象，不遍历全库。简短报告实际完成的改删，失败说明具体原因，不以新建卡片代替修复失败的更新。

新卡不必手算坐标。`graph.arrange {members:[{id,expectedRevision}],requestId}` 默认 mode:missing，只安放这些卡中尚无位置的对象。作者要求整理时用 mode:all，可限定局部。

界面切图、目录搜索、“只看相关”和缩放是本机偏好，工具仍可读取全量真实关系。看不到当前详情页、光标和未保存草稿时不要假装知道。

## 从目录找到资源

作者说“萧家下面的角色”时，先从 `graph.groups` 的 name/path 定位文件夹，再 `graph.list {groupId,type:"character_card"}`；已知姓名或关键词时可直接 graph.list 检索，再按需 graph.get。groupId 省略查全书，指定文件夹包含子夹，null 只查根目录的直接卡片。文件夹的 parentId 表示目录嵌套，卡片的 groupId 表示归属；目录可折叠，资源仍能被工具找到。

整理按作者习惯选少量有意义的目录即可，例如“萧家 / 核心成员”；无需固定人物、地点、组织必须分开。已有卡片用 graph.move，已有文件夹改 graph.group.update 的 parentId；同名对象先核对原卡。完成后报告目录路径和实际改动，作者的界面范围与展开状态仍由作者控制。

## 事实、提案与知情范围

作者明确规定的规则/背景可作为设定，注明作者设定，不能因此说角色已经知晓；没有正文证据就不编 sources。已发生事件核对保存的正文片段，用真实 `{chapterId,revision}` 记录 sources。

仍在比较的方案保持 unconfirmed。已有卡含事实和提案时，在正文中分清待讨论部分，未被作者要求改变的事实继续有效；不要把整张人物卡降为一个未定提案。作者明确采用新设定时可替换对应旧描述，无需因它原本是 fact 就拒绝编辑。角色认知或谎言用 belief/misunderstanding，不能混成客观事实。

status:active/stale/unconfirmed/retired 与 factType:fact/belief/misunderstanding/unconfirmed/plan 是两件事，active 不等于已证实。作者明确采用可用 active+fact；待定构想用 unconfirmed+unconfirmed。新设定与已发生正文冲突时指出冲突，不悄悄改正文。

knownBy 可放知情角色卡 ID；空数组不意味着全员知道。dependsOn 放真实设定 ID；storyTime 表示适用阶段。读取全文不会替你过滤秘密或未来信息，取材时核对。正文更新导致 stale 时，只处理相关记录并校正真实来源，不批量消除提示。

## 分组、图和安全修改

- 设定是资源库：目录即查看范围，点文件夹就看内部和子文件夹资源及真实关系。浏览、收纳、换范围不复制卡片，不改变模型的检索权限。全书根目录可直接放卡片和任意嵌套文件夹。
- `graph.groups` 返回 parentId 和完整路径 path；按用途复用已有文件夹，`graph.group.create {name,parentId?,requestId}` 建子组，`graph.group.update {groupId,expectedRevision,parentId,requestId}` 移动整组，parentId:null 为顶层。不要用 graph.page.create 另建设定画布列表；旧 page 接口只为兼容保留，文件夹 ID 不能当作 pageId。
- 角色卡和世界书可混放一夹；type 决定内容类型，groupId 只管归类。单卡 graph.update 的 groupId，多卡 `graph.move {groupId,members:[{id,expectedRevision}],requestId}`；null 为全书根目录。人物只有一份当前资料，规划通过 memoryRefs 引用原 ID。
- 文件夹同时派生画布区域；可展开、收纳，跨文件夹关系保留，界面提供外部关联跳转。`graph.group.create {name,parentId?,members:[{id,expectedRevision}],requestId}` 可收纳已有卡片，无须新建一套框或副本。目录折叠和画布收纳各自保存。
- graph.list 按父文件夹筛选会包含全部子文件夹，目录折叠和筛选不会限制工具检索。排序只改目录顺序，归类不改变类型、正文或画布坐标。删除文件夹将卡片和子文件夹上移一级，内容保留。文件夹不是关系：“隶属组织”仍需要组织条目与连线。
- 有意调整坐标可用 `graph.layout {positions:[{nodeId,expectedRevision,position}],requestId}`，通常优先 graph.arrange 让软件计算。默认保留作者布局，判断关系不依赖空间距离。
- `graph.continue {nodeId,expectedRevision,side?,value,requestId}` 同时新建并连线，继承文件夹；out 为源→新，in 为新→源。
- 断线 `edge.delete {edgeId,expectedRevision,confirm:true}` 或 edge.disconnect 的 edges 数组；只删关系不删卡。
- graph.remove 批量软删除卡及相连边，须 members、confirm:true、requestId；retired 保留不再使用的内容。graph.duplicate 仅在明确需要副本时用，不用来记录同一人物的补充。

修改先读 expectedRevision，每次写入用唯一 requestId，只有原样重试复用；CONFLICT 后重读并合并实际差异，PATCH_CONFLICT 则重新定位原句，不只换版本号覆盖作者内容。工具会拒绝无效字段；未变化不新增版本。批量最多 200 个对象，全部通过版本核对后再提交。归组/整理后 revision 可能改变，应重读。

## 历史版本按需查看

普通的 `graph.list`、`graph.get`、`novel.handoff` 和正文写作只使用当前设定。历史正文默认不进入上下文，也不能因为“可能有用”就主动把旧版本混入人物或世界事实；当前版本被作者更新后，以当前版本为准。

只有作者明确要求查看、比较、追溯或恢复某条设定时，才调用 `graph.history {nodeId}`。它默认返回版本摘要，包含 revision、时间、来源、原因、changedFields 和 kind；kind 区分 baseline、content、organization、layout，位置和分组整理不等于正文变化。需要某版全文时调用 `graph.history {nodeId,revision:N,includeContent:true}`；每次仅取一个明确版本，比较两版时分别读取，不能省略 revision 整批拉取历史正文。用户在界面查看历史不会自动注入对话；旧版仅供追溯，不代表当前事实。

作者确认恢复后，先重新读取当前 `graph.get` 取得最新 revision，再调用 `graph.restore {nodeId,expectedRevision,targetRevision,reason?,requestId}`。恢复会生成新的当前版本并保留完整历史；不要删除历史、伪造 revision，或用旧全文绕过版本检查。恢复完成后回读 `graph.get`，确认当前内容，再决定是否需要同步受影响的正文、规划或关系。

只恢复卡片内容、沿用当前目录时，加 `restoreScope:"content"`：恢复内容属性与证据，保留文件夹和画布归属。省略时沿用完整恢复语义，也用于恢复已删除的设定；内容恢复不复活已删除的卡片。界面「改动对比」使用内容恢复，不因回看旧稿把资料移回旧目录。

需要完整的资源查找、批量收纳、嵌套文件夹、更新人物与关系调用范例时，按需读 [references/operations.md](references/operations.md)，路径相对本 Skill 的 resourceBase。
