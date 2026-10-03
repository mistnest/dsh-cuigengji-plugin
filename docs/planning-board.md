# 故事规划板

规划是作者与写作助手共用的流程图。节点用标题和摘要供浏览、搜索，正文自由记录场景、对话或长线构思；连线表达剧情推进、依赖铺垫或备选分支。分组只用于整理和查找，不决定情节顺序。旧版父子层级仍可编辑，但新规划不必先创建层级。正文是已发生的故事，规划是意图；二者不能互相替代。

## 工作台

顶部页面选择器中的“＋ 新建页面”创建独立画布，用途摘要说明这页讨论什么；旧节点位于“主线规划”。页面隔离不相关情节，分组用于当前页筛选（分组名称在全书复用）。列表批量选择后可移动到其他页面，内部连线保留，与未移动节点的连线需确认后移除。只允许删除空页面。

右键空白可新建情节、文字批注和讨论框；更多菜单也提供批注入口。批注与讨论框使用完整内容页编辑，外观选项收纳起来，拖标题移动、拖右下角调整尺寸。框选卡片后按 C 可创建包围选择的讨论框。新讨论框默认带动开始拖动时完整包含的卡片与批注，右键标题可切为“仅移动讨论框”；旧背景框保持只移动自身的行为。删除框保留卡片与连线。批注不是情节节点，不参与连线，所有内容随工作数据导出。协作冲突时保留草稿，可比较最新内容、人工合并后更新保存基准。

规划与设定采用同一套画布。顶部保留页面、分组、新建分组、搜索、列表/画布及新建卡片，缩放和适应视图放在右下角。状态、故事线、历史与批量入口保留在更多菜单中。分组用于筛选，不再自动画出“未分组”背景框。

画布支持任意正负坐标，没有滚动边界。右键拖动平移，右键短按显示鼠标命中对象的菜单；中键或空格加左键也可平移。直接滚轮围绕鼠标位置缩放。单击卡片选择，双击或键盘激活标题打开详情；空白拖动框选，Shift 追加选择，多张卡片一起拖动。布局松手后一次保存，发生冲突不会只移动部分对象；失败时保留本地位置，可重试或还原。Esc 取消尚未完成的移动或连接。

左右圆点支持拖拽或依次点击连线；拖到空白会打开“新建并连接”，完成后同时保存新卡片和箭头。右键连线可断开，规划箭头不需要填写属性；设定关系有名称或说明时直接显示在线旁。分组可创建、重命名、修改描述、删除，删除组时成员留在未分组。

视野按作品、页面和规划/设定分别保存在本机；筛选、新建、后台刷新和详情返回不自动跳转。Home 或“适应”定位当前选择，无选择时适应当前可见内容。Ctrl+Z / Ctrl+Y 只撤销、重做本次打开画布后的布局移动，并检查版本，不能覆盖之后的 AI 修改。卡片坐标随工作数据导出，视野偏好不进入作品数据。

点开节点后编辑标题、摘要、正文和分组。节点详情展示“从哪里来 → 当前情节 → 接下来”；“接着推进”会自动创建后续节点并连接普通箭头。讨论进展可区分构想、准备采用和已写入正文，故事线、旧层级与章节/资料引用收在次级区域。修改有 revision 检查；本地草稿不会被轮询覆盖。修改记录可比较前后版本并撤销；相关对象发生后续变更时拒绝覆盖。

## Agent 调用

先读 `planning.pages`，根据页面名称与用途选择 pageId，再用 `planning.list`/`planning.search` 获取标题、摘要、分组与连线；只对相关节点用 `planning.get` 读取正文。主线规划的 pageId 为 null；不传 pageId 仍为全书查询。Agent 不应猜测用户当前界面选中的页面。更新已有想法优先 `node.update`，同一章不因一次新讨论就拆出重复节点。独立事件确有先后、依赖或分支时，才连接节点。分组先用 `planning.groups` 查找并复用。

| action | 用途 |
| --- | --- |
| `planning.pages` | 列出页面用途、节点及批注数量 |
| `planning.page.create/update/delete` | 管理页面，更新/删除带 expectedRevision，删除须 confirm:true 且页面为空 |
| `planning.decorations` | 按 pageId、offset、limit 读取批注 |
| `planning.groups` | 列出活动分组 |
| `planning.group.create/update/delete` | 管理分组，更新/删除带 expectedRevision；删除须 confirm:true |
| `planning.list/search` | 按 groupId、parentId、query、status、thread 分页获取元信息和关系；不返回节点正文 |
| `planning.get` | 读取节点全文、邻居、flow.previous/next 前后情节与下级摘要 |
| `planning.continue` | nodeId、expectedRevision、requestId、value；原子创建节点和普通箭头，默认继承起点分组与页面；side:in 补前置事件，默认 out 续接后续 |
| `planning.apply` | 一次提交 1–200 个节点/分组/连线操作，带 requestId 和 reason |
| `planning.history/changes` | 查看事务及增量 |
| `planning.revert` | 按版本检查后撤销一次事务 |

创建节点时提供 `title`、`summary`、`content`，可选 `groupId`。`node.update` 需要 id、expectedRevision 和 value；`edge.create` 的 `type` 为 `next`、`requires` 或 `alternative`。`edge.update` 可改端点、类型、说明；删除操作需要 confirm:true。对有子节点的旧层级节点，删除时指定 `childPolicy: detach` 或 `subtree`，并用 `expectedSequence` 保护已确认的范围。重复 requestId 重试同一请求不会重复提交；冲突时重新读取，不自动提升版本覆盖。

```json
{
  "requestId": "unique-request-id",
  "reason": "完善开篇相遇",
  "operations": [
    {"op":"node.create","ref":"a","value":{"title":"收到来信","summary":"旧友请她回城","content":"..."}},
    {"op":"node.create","ref":"b","value":{"title":"决定赴约","summary":"她权衡风险后启程","content":"..."}},
    {"op":"edge.create","value":{"from":"a","to":"b","type":"next"}}
  ]
}
```

`planning.apply` 还支持 `page.create/update/delete` 与 `decoration.create/update/delete`，同一事务可引用新建页面。创建节点/批注时传 pageId，续接强制继承起点页面；跨页连线与父子关系会被拒绝。批注 kind 为 note 或 frame，可传 title、content、position、width、height、color、fontSize、fontFamily、moveContents。坐标可正可负，必须为有限数值。合法底色为 neutral/sand/sage/sky/rose，字号为 14/18/24/32，字体为 sans/serif。直接用工具修改框坐标只移动框，要移动整片区域应在一次 apply 中更新全部成员。完整调用示例见规划 Skill。

领域模型与事务在 `src/domain/planning`，类型契约在 `src/contracts/planning.ts`，画布在 `src/client/features/planning`。备份 schemaVersion 2 包含节点、分组、页面、批注、连线、坐标与事务；仍接受 v1 迁移，缺少页面/批注字段的旧备份可原样读取。升级前复制数据目录，旧程序不能直接读取新格式。规划不自动加入 Agent 提示词；项目接手只给有限索引，已启用预设随系统提示词提供；正文、规划和资料由 Agent 按需读取。

## 共同讨论

AI 先找到正在讨论的情节，补充原节点；出现新事件时沿该节点续接。比较两种走向时从同一起点连出两支，未决定的路线保留为构想，采用的路线标记为准备采用。一个节点的标题、摘要与正文可自由编辑；分组不能代替推进关系，规划不能代替正文事实。具体工具示例随 cuigengji-plan Skill 提供。
