# 酒馆导入兼容性实测（2026-10-01）

> 后续进展：0.3.10 已补齐本文第 1–3 项中的有效内容提示、PromptManager 与简单系统提示词导入，宏改为保留原文且不再停用整条。下文保留 0.3.9 的审查结果；当前行为见 presets.md。

## 结论

当前 0.3.9（8d0c60b）支持将常见酒馆世界书和角色卡转换为催更姬写作资料，保存、去重和备份恢复链路可用；写作预设只有部分兼容，不能称为完整酒馆导入适配。能解析文件、能保留原始字段、能在写作中发挥作用是三个不同层次。

本轮只审查、实测并记录结果，未修改产品实现、正式小说或桌面安装，未调用模型。所有写入发生在独立临时 Store。第三方样本与源码放在被 Git 忽略的 test-results/tavern-audit，未提交到插件分发包。

## 对照基线与来源

从 SillyTavern 官方仓库 release 分支读取并固定提交 `06bde939fb1e9c4c8d8641d810f0a916b5bce127`，后续下载全部使用该提交，而非浮动分支。这里只说明本次检查基线，不宣称覆盖所有历史版本。

- PNG 解析：`src/character-card-parser.js` 的 read/write，tEXt、base64、ccv3 优先于 chara。
- 角色卡格式：`src/endpoints/characters.js` 的 importFromJson 和导入格式映射。
- 世界书：`public/scripts/world-info.js` 的 convertCharacterBook、importWorldInfo 和字段定义。
- 预设：`public/scripts/PromptManager.js` 的 handleFullExport、export、import；`public/scripts/openai.js`。
- 官方样本：`default/content/Eldoria.json`、`default/content/default_Seraphina.png`、`default/content/presets/openai/Default.json`。
- 其他官方预设样本：Instruct/Alpaca、Context/Default、System Prompt/Writer - Creative。

官方源码及固定版本地址清单：`test-results/tavern-audit/sources.json`。下载来源为 `https://raw.githubusercontent.com/SillyTavern/SillyTavern/06bde939fb1e9c4c8d8641d810f0a916b5bce127/` 加以上文件路径。

## 实测结果

| 对象 | 实际执行 | 结果 |
| --- | --- | --- |
| 官方 Eldoria 世界书 | 后端导入、浏览器文件选择/预览/确认 | 4 条原始条目导入为 4 条设定 |
| 官方 Seraphina PNG 卡 | 后端及浏览器导入 | 识别 V3，得到 1 张角色卡及 4 条内嵌世界书 |
| 从该 PNG 提取的 JSON 卡 | 再次上传 JSON | 识别相同原始内容，新增 0、跳过 5 |
| 官方默认 Chat Completion 预设 | 浏览器解析、整体启用并保存，后端组装提示词 | 12 个条目；2 个启用但内容均为空；有效文本 0 字符，无预设段注入 |
| 静态提示词 | 在同一预设界面新增明确文本并保存 | preset.read 返回该文本；静态注入行为另由现有预设测试验证 |
| 原始预设下载 | 点击界面下载按钮 | 与导入 JSON 完全一致，不含后续界面编辑 |
| 作品备份恢复 | 导出后导入第二个临时 Store | novel 对象深度相等，含原始导入字段 |

本轮重跑现有 `tavern-import.test.js` 和 `preset.test.js` 共 7 项测试，全通过。新增审查脚本为 `test-results/tavern-audit/audit.mjs`、`ui.mjs`；结果为 `results.json`、`ui-results.json`，截图为 `ui-import.png`、`ui-empty-preset.png`。UI 使用正式 Workbench 和真实 Store 的隔离预览，未重启/操作正式 DSH。

## 已完成的部分

### 世界书

- 接受酒馆 entries 对象以及 Character Book 的 entries 数组。
- content 原文进入设定正文，主关键词进入 aliases，标题使用 name/comment/首个关键词。
- 原文件禁用条目保留并标记 retired，启用条目标记 unconfirmed。
- 单本世界书最多 2000 条，文件最多 20 MB；预览、勾选、确认、部分补导及相同文件去重已实现。

### 角色卡

- V1/V2 JSON、PNG 的 chara/ccv3 数据块及 V3 通用字段可用；官方样本 V3 PNG 已实测。
- description、personality、scenario、first_mes、mes_example、alternate_greetings 转为可查阅正文。
- 内嵌 character_book 可一并导入。
- CRC 与损坏 PNG 检查、备份保留原始 JSON 及扩展字段已有测试。

### 预设

- 支持顶层 prompts/prompt_order 的 Chat Completion JSON，按选定排列保留顺序。
- 支持条目编辑、启停、排序、保存、生效文本预览与原始文件下载。
- 已启用且兼容的 system 文本会跟随催更姬开场提示词；宏、marker、历史深度插入、事件触发和其他消息角色目前停用。

## 具体缺口

### 1. 导入并启用成功不代表预设有效（优先处理）

官方默认预设的 Main Prompt 含 `{{char}}`、`{{user}}`，被当前规则停用；动态 marker 也停用。剩下两条启用文本为空，因此有效文本为 0。界面有逐条“待适配”和底部字符数，但整体启用与保存仍然成功，没有醒目的总结果说明。不是 0.3.8 注入位置失效，而是没有有效内容可注入。

建议：导入结果明确展示“可生效条目/字符数、停用原因、仅归档字段”，整体启用但有效文本为空时在主操作附近提醒。

### 2. 提示词管理器独立导出尚不支持

官方 PromptManager 导出形如 `{version,type,data:{prompts,prompt_order}}`，其中顺序形态也与完整 Chat Completion 预设不同。按该源码构造封装后，本插件直接拒绝。此样本是源码形态探针，不是假称由酒馆界面实际导出的文件。

建议：分别识别完整预设与提示词管理器导出，并归一化排列结构。

### 3. 系统提示词、Instruct、Context 尚不支持

官方 Writer - Creative 的 `{name,content,post_history}` 也被拒绝，尽管主体是可用的静态写作要求；Alpaca Instruct 与 Default Context 样本同样被拒绝。

建议：优先支持简单系统提示词文件。Instruct/Context 的模板语义需要单独设计，不应直接拼接所有字段。

### 4. 宏与角色扮演语义没有转换

世界书/角色卡的宏以原文保留，Agent 能读到 `{{char}}`、`{{user}}`；预设则直接停用含宏条目。官方 Eldoria 样本验证了前者。不能直接认定 `user` 等于作者、`char` 等于小说主角，尤其多角色小说并无固定扮演对象。

建议：提供明确绑定或编辑确认，分清可安全替换的名字宏、需要语境的角色扮演要求，以及暂不执行的脚本/变量宏。不需要为此实现酒馆完整运行时。

### 5. 部分可用资料仅保存在原始归档

角色卡 creator_notes、system_prompt、post_history_instructions、tags、V3 专属字段未进入普通角色正文；世界书 secondary_keys/keysecondary 未进入当前别名索引。素材与 PNG 图片本身不保存，CHARX/YAML/BYAF 等官方支持的其他导入路径也未接入。

建议：将有写作价值的作者说明与标签作为可见、可选择导入的内容，不自动提升角色卡提示词权限。对二级关键词保留其条件语义或允许用户选择作为检索词。

### 6. 分组、关系与跨文件去重不完整

导入条目目前不自动建立催更姬分组或“角色卡包含世界书”的关系。先导入独立 Eldoria，再导入含同样世界书的 Seraphina，实测得到 9 条资料；相同完整 JSON 才被去重，不会跨来源合并同名/同正文条目。

酒馆 World Info 的 group 属于其激活选择机制，不能直接当作催更姬的用户文件夹。可以按导入来源创建普通分组，另将原字段作为来源信息保留。

### 7. 反向导出边界

当前支持催更姬完整工作数据往返，以及预设“下载原始文件（不含编辑）”；尚无将修改后的设定、角色卡或预设重新生成酒馆格式的完整通路。若目标只是导入后在催更姬维护，现有备份机制可用；若目标是两边往返编辑，则尚未完成。

## 与小说工作台方向相符的后续顺序

1. 补齐导入结果摘要、有效文本为空提示，以及 PromptManager/简单系统提示词的格式识别。
2. 设计宏与角色扮演称谓的明确映射；让来源、未映射文本、作者说明可见可处理。
3. 增加导入目标分组、可选包含关系和重复候选预览，避免无声合并作者数据。
4. 只有确实需要回酒馆继续使用时，再补修改后导出与 CHARX 素材支持。

不把世界书关键词触发、概率、递归扫描、sticky/cooldown 等运行机制列为当前小说工作台必需项；这些与当前“Agent 按需查阅资料”的方向不同。保留原始字段及明确报告支持边界，比表面导入但行为不明更重要。
