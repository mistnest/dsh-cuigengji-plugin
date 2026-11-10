# 设定工具调用范例

ID、版本、来源都须先读取核对。小范围改删优先 patch，整体重写读全文后提交 content；可按作者要求删减、替换和重组，不把摘要当全文。作者设定没有正文证据时不编造 sources。创建新卡后用 graph.arrange 的 missing 模式安放新卡，不挪已有对象。

查某文件夹内的资源：graph.groups 找到 name/path 和真实 ID，再 graph.list {groupId,type?,query?}；命中后 graph.get {nodeId}。例如“萧家 / 核心成员”的人物和地点可以混放一夹，人物筛选用 type:character_card。graph.list 只给索引，groupId 省略查全书，null 只查根目录直接卡片；文件夹展开与否不影响检索。

## 补充已有角色

```json
{"action":"graph.update","args":{"nodeId":"CHARACTER_ID","expectedRevision":1,"requestId":"update-character-unique","summary":"经营夜间书铺，熟悉旧账册的修复。","content":"她继承了母亲留下的书铺。作者补充：她以书铺为生，擅长修补受潮的账册；这项能力尚未在正文中展示。","status":"active","factType":"fact"}}
```

## 批量归入已有分组

```json
{"action":"graph.move","args":{"groupId":"MEMORY_GROUP_ID","requestId":"move-settings-unique","members":[{"id":"CHARACTER_ID","expectedRevision":1},{"id":"PLACE_ID","expectedRevision":1}]}}
```

## 建立有真实来源的关系

```json
{"action":"edge.create","args":{"from":"CHARACTER_ID","to":"PLACE_ID","name":"经营","content":"在本章时点负责书铺日常经营。","factType":"fact","status":"active","sources":[{"chapterId":"CHAPTER_ID","revision":1}],"requestId":"connect-settings-unique"}}
```


## 同一资源库中的嵌套文件夹

先查 graph.groups，复用同一主题的文件夹。角色只有一份原卡，切换文件夹只是换查看范围，不另建一套设定画布。

```json
{"action":"graph.group.create","args":{"name":"码头守方","parentId":"PARENT_GROUP_ID","members":[{"id":"CHARACTER_ID","expectedRevision":1},{"id":"PLACE_ID","expectedRevision":1}],"requestId":"folder-settings-unique"}}
```

文件夹自动成为可收纳区域；版本不符整批失败。改归类保留卡片 ID、正文、关系与历史：

```json
{"action":"graph.move","args":{"groupId":"TARGET_GROUP_ID","members":[{"id":"CHARACTER_ID","expectedRevision":2}],"requestId":"move-folder-unique"}}
```

## 把已有文件夹收进另一文件夹

先读 graph.groups，核对原夹与目标夹路径及原夹 revision。修改原夹的 parentId 会整体调整目录层级，里面的卡片和子文件夹仍使用原 ID；不逐条复制，不改变原有关系。

```json
{"action":"graph.group.update","args":{"groupId":"MEMORY_GROUP_ID","expectedRevision":1,"parentId":"TARGET_GROUP_ID","requestId":"nest-existing-settings-folder-unique"}}
```

移回顶层时 parentId:null；单张卡移回全书根目录则用 graph.move 的 groupId:null。回读 graph.groups 的 path 验证层级，并向作者给出资源所在路径。画布查看范围和折叠状态由界面保存，不在工具参数里模拟点击。

## 纠正已有设定，并同步摘要

作者说“她改成十九岁”，已通过 graph.list 找到原卡、graph.get 读到 revision:1 和原句“她十八岁。”。直接修改原卡，不另建同名人物，也不把旧年龄留在当前摘要里：

```json
{"action":"graph.update","args":{"nodeId":"CHARACTER_ID","expectedRevision":1,"patch":{"oldText":"她十八岁。","newText":"她十九岁。"},"summary":"十九岁的书铺店主。","reason":"按作者要求调整年龄","requestId":"correct-existing-setting-unique"}}
```

返回 changed:true，changedFields 包含 content 和 summary。核对返回的当前正文保留了其他资料；若只改一处，原 ID、分组和无关关系继续使用。

## 只删掉卡内一项能力

作者说“去掉她会炼丹这个设定”，当前卡片正文中“她会炼丹。”唯一出现，且摘要未提这项能力。newText 为空仅删除这项描述：

```json
{"action":"graph.update","args":{"nodeId":"CHARACTER_ID","expectedRevision":1,"patch":{"oldText":"她会炼丹。","newText":""},"reason":"去掉作者不再采用的能力","requestId":"remove-setting-passage-unique"}}
```

卡片仍在，其他描述保留。如果摘要或直接相关关系也提及炼丹，按本次范围同步改删。PATCH_CONFLICT 时从当前 content 扩充定位上下文，再提交新请求。不要用 status:retired 停用整张人物卡代替删掉一项能力。

## 删除整张设定卡

作者明确要求“把这张人物卡删掉”，先核对原卡及 edge.list 的直接关系，在授权范围内直接执行：

```json
{"action":"graph.delete","args":{"nodeId":"CHARACTER_ID","expectedRevision":1,"confirm":true,"reason":"按作者要求删除这张人物卡","requestId":"delete-existing-setting-unique"}}
```

返回 deleted:true、changed 和 deletedEdgeIds，确认原卡从正常 graph.list 消失。历史仍可按作者要求查看，规划中的原 ID 引用显示已删除，不会另造人物或静默改写正文。删错时可先看历史摘要，再 graph.restore 到明确的未删除版本；相连关系不自动恢复，按作者需要单独重建。
