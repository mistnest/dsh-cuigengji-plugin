# 故事规划板

## 写作流程

1. 在“规划”添加长期方向，进入子规划拆成阶段、场景。范围标签与父子关系独立，允许未指定范围。
2. 用“剧情推进”“依赖铺垫”“备选分支”建立关系。备选分支不是既定剧情；“准备采用”由作者和 AI 协作标记。
3. 点节点默认阅读，编辑后显式保存。列表视图适合窄面板；流程图支持拖动、缩放、定位和整理当前层。故事线是可多选的文字标签。
4. 可关联章节历史版本与人物/世界设定。“已写入正文”需要正文版本引用；来源章节后来删除时保留引用，可查看历史正文。
5. 修改记录显示作者或 AI、原因、时间、前后内容及关联字段。撤销是一次新的事务；相关对象已有新版本时拒绝撤销覆盖。
6. 有本地草稿时远端更新不会覆盖输入。比较远端并手动合并后，明确更新保存基准，再保存。

规划通过工具按需读取，不自动加入小说参考；正文不再依赖规划审批。预设仍按已保存配置参与提示词组装。插件不增加自动参考字符上限或截断。

## AI 工具

通过 `cuigengji_plan` 调用下列 action，小说与操作者由宿主会话绑定。

| action | 参数与结果 |
| --- | --- |
| planning.list/search | parentId、query、status、thread、offset、limit；返回节点元信息、连线、sequence；search 可搜索完整内容 |
| planning.get | nodeId；返回完整节点、相邻连线、下级摘要 |
| planning.history | nodeId 可选；按新到旧分页读取事务 |
| planning.changes | after 可选；读取该 sequence 之后的事务，按旧到新 |
| planning.apply | requestId、reason、operations；返回 transactionId、sequence、临时引用映射 |
| planning.revert | requestId、transactionId；检查受影响对象版本后撤销 |

`limit` 为 1–200，默认 50；分页是读取方式，不会截短节点正文。写入最多 200 个操作一批，全部校验后一起落盘。

```json
{
  "action": "planning.apply",
  "args": {
    "requestId": "unique-request-id",
    "reason": "将第一幕拆成两个场景",
    "operations": [
      {"op":"node.create","ref":"a","value":{"title":"收到来信","scope":"near"}},
      {"op":"node.create","ref":"b","value":{"title":"决定赴约","scope":"near"}},
      {"op":"edge.create","value":{"from":"a","to":"b","type":"next"}}
    ]
  }
}
```

- node.update：id、expectedRevision、value。字段包括 title/summary/content、scope、status、parentId、threads、chapterRefs、memoryRefs。
- node.delete：id、expectedRevision、confirm:true。存在子节点时明确 childPolicy: detach 或 subtree。传入列表返回的 sequence 作为 expectedSequence，保护确认后的删除范围。
- edge.create：value 的 from/to/type/label；type 为 next/requires/alternative。
- edge.delete：id、expectedRevision、confirm:true。修改连线可同批删除旧线、创建新线。
- 禁止层级循环、剧情循环、依赖循环、自连接、重复关系和无效引用。状态为 idea/selected/written/dropped。
- 同 requestId 重试同一请求不会重复提交；不同内容重用会被拒绝。不要自动刷新 revision 重试覆盖。

## 数据、迁移与回滚

领域模型位于 src/core/planning/model.js，事务与查询位于 index.js；React 画布/布局位于 src/client/planning。画布坐标、缩放和当前选择属于界面状态，不进入 AI 工具和业务备份。

新备份为 schemaVersion 2，包含规划节点、连线、全部事务和原始旧规划。仍接受 v1。首次读取旧规划时将完整文本迁入“原有规划”节点，保留旧数据，并在数据目录生成 before-planning-*.json；不会将批准状态转成正文权限。

升级前建议停止 DSH 复制整个数据目录。旧版本不能读取 v2 备份；回滚旧程序时使用升级前数据副本或 v1 迁移备份，切勿直接让旧程序写入新的规划数据。

## 本轮范围与待验收

43 项自动测试、50 次真实 DSH RPC 通过。浏览器标签列表为空，此前错误页刷新被安全检查拒绝，本轮未绕过；新界面尚未完成真实浏览器视觉、键盘及文件选择验收。真实模型自主使用新版规划板也尚未实测，已测试实际注册工具和 MCP 执行链路。

视图采用面板宽度断点；AI 参考暂用带返回入口的独立页。保存仍沿用工作台串行提交，错误在工作台顶部显示。规划轮询间隔 4 秒；列表分页检测 sequence，读取期间更新会提示重试，保留已有画布与草稿。界面搜索标题、概述与故事线，工具搜索包含全文。图形局部视图没有承诺大规模密集关系的可读性；后续以真实作品验收继续调整。
