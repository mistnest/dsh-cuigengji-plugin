# 故事规划板

规划是作者与写作助手共用的流程图。节点用标题和摘要供浏览、搜索，正文自由记录场景、对话或长线构思；连线表达剧情推进、依赖铺垫或备选分支。分组只用于整理和查找，不决定情节顺序。旧版父子层级仍可编辑，但新规划不必先创建层级。正文是已发生的故事，规划是意图；二者不能互相替代。

## 工作台

规划页可按标题、摘要、故事线搜索，并按分组与状态筛选。窄面板默认列表，宽面板默认流程图，也可手动切换。画布可缩放、整理、拖动节点，布局需要显式保存；节点坐标随小说数据导出。分组可以创建、重命名、修改描述、删除；删除时成员留在未分组。列表和画布共用节点内容，批量选择后可移动分组。

点开节点后编辑标题、摘要、正文和分组。状态、故事线、旧层级与章节/资料引用收在次级区域。修改有 revision 检查；本地草稿不会被轮询覆盖。修改记录可比较前后版本并撤销；相关对象发生后续变更时拒绝覆盖。

## Agent 调用

先读 `planning.list`/`planning.search` 返回的标题、摘要、分组与连线；只对相关节点用 `planning.get` 读取正文。更新已有想法优先 `node.update`，同一章不因一次新讨论就拆出重复节点。独立事件确有先后、依赖或分支时，才连接节点。分组先用 `planning.groups` 查找并复用。

| action | 用途 |
| --- | --- |
| `planning.groups` | 列出活动分组 |
| `planning.group.create/update/delete` | 管理分组，更新/删除带 expectedRevision；删除须 confirm:true |
| `planning.list/search` | 按 groupId、parentId、query、status、thread 分页获取元信息和关系；不返回节点正文 |
| `planning.get` | 读取节点全文、邻居和下级摘要 |
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

领域模型与事务在 `src/domain/planning`，类型契约在 `src/contracts/planning.ts`，画布在 `src/client/features/planning`。备份 schemaVersion 2 包含节点、分组、连线、坐标与事务；仍接受 v1 迁移。升级前复制数据目录，旧程序不能直接读取新格式。规划不自动加入 Agent 提示词；项目接手只给有限索引，正文、预设、规划和资料由 Agent 按需读取。
