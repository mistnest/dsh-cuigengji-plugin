# 设定工具调用范例

ID、版本、来源都须先读取核对。更新 content 前合并原文，不能把摘要当全文；作者设定没有正文证据时不编造 sources。创建新卡后用 graph.arrange 的 missing 模式安放新卡，不挪已有对象。

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
