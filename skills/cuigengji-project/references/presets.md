# 按作者要求维护预设

调用 `cuigengji_context`，参数为 `{action,args}`；MCP 同时提供 `memory_preset_get/preview/import/update`。所有动作支持目标 `novelId`，省略沿用当前作品。普通写作已自动提供有效预设，不为了写每一章而重复读取结构或改预设。

## 读取与修改

`preset.get` 返回最新保存的可编辑条目（包括停用项）及整套 `revision`。指定 `identifier` 只读取一条原文，仍返回整套 revision。无预设时返回 revision:0、空条目。维护时编辑原始 content，保留变量宏。

`preset.update` 需要 expectedRevision、唯一 requestId；顶层 name/enabled 修改整套名称或启停。operations 是同次提交的条目操作：

- `update {identifier,name?,content?,patch?,enabled?}`：content 完整替换该条，patch:{oldText,newText} 唯一匹配局部原文；二选一，空 newText 删段。
- `create {identifier?,name,content,enabled?,before?}`：新增条目，省略 identifier 由工具生成；条目默认启用，整套启停保持原状。
- `delete {identifier}`：删除指定条目；作者要求清空时，先读取再逐项 delete。
- `move {identifier,before}`：移到指定标识前，before:null 移到末尾。

例如，作者明确要求把文风条目中的“少写对话”改成“通过对话推进人物冲突”：

```json
{"action":"preset.update","args":{"novelId":"BOOK_ID","expectedRevision":3,"requestId":"preset-edit-unique","operations":[{"op":"update","identifier":"style","patch":{"oldText":"少写对话","newText":"通过对话推进人物冲突"}}],"reason":"按作者要求修改文风预设"}}
```

ID、原文和版本替换成真实读取结果。仅修改作者指定范围；“这一段换种写法”是正文任务，“把预设改一下”才维护预设。作者已明确的修改直接完成。

## 导入

先 `preset.preview {input,fileName?,orderId?,sourceNovelId?}` 核对解析结果；它不保存，返回目标当前 revision。input 接收原始 JSON 对象或文件文本，TXT/Markdown 提供 .txt/.md 的 fileName，即使含章节标题也只作为预设。支持酒馆完整预设、PromptManager、独立提示词、催更姬预设配置与备份；备份包含多本预设时，按返回候选用 sourceNovelId 选择来源，novelId 仍是写入目标。

`preset.import` 再提供同一 input、policy:append/replace、expectedRevision、requestId。追加保留原有总开关、条目与顺序，重名标识会重映射，mapping 返回实际新标识。首次导入和替换默认停用。作者明确要求启用或停用时才传 enabled。

```json
{"action":"preset.import","args":{"novelId":"BOOK_ID","expectedRevision":3,"requestId":"preset-import-unique","fileName":"文风.md","input":"# 文风\n\n通过人物行动表达情绪。","policy":"append","enabled":true,"reason":"按作者要求追加并启用文风预设"}}
```

保留导入原文，不执行酒馆脚本、插入深度或采样参数。返回 changed/changedFields 和新 revision；changed:false 不报告已修改。保存后用 `preset.get` 核对最新条目。`preset.read` 返回会话首次读取时采用的版本，新会话接手时才采用已保存的修改。遇到 CONFLICT 时保留拟稿并重读差异。参数变化使用新 requestId，原样重试复用原 ID。
