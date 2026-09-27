# 酒馆角色卡与世界书导入

入口：催更姬 → 设定 → 导入酒馆角色卡 / 世界书。选择文件后预览并勾选条目，确认后导入当前作品。

支持：

- V1、V2 角色卡 JSON。
- PNG 中的 `chara` / `ccv3` 文本数据块；两者存在时优先读取 `ccv3`，检查数据块完整性和 CRC。
- V3 的通用角色文本和内嵌世界书。V3 专属素材不解析。
- 酒馆 World Info 的 `entries` 对象，以及 Character Book 的 `entries` 数组。
- 角色卡内嵌 `character_book`，可单独勾选角色、世界书和条目。
- 单文件最大 20 MB，单本世界书最多 2000 条。

映射：角色描述、性格、场景、开场白、对话示例和备用开场白整理为角色资料；世界书正文和关键词映射为条目内容及别名。启用的条目标记未确认，原文件禁用的条目标记停用。

兼容边界：不实现酒馆的关键词触发引擎、概率、递归扫描、提示词插入位置或宏替换；不执行扩展脚本，不用卡片系统提示词替换 DSH 系统指令。不支持 CHARX、WebP 或外部素材下载，PNG 图片不保存。

原始 JSON（含未知扩展及未映射字段）存于作品的 `tavernSources`，随完整备份导出和恢复。普通作品读取不携带这份原始归档，避免无关字段进入 Agent 资料。

导入为一次事务，不覆盖同名资料；相同解析后 JSON 生成相同标识，重复导入跳过已存在条目。修改过的文件视为新资料。预览不写入作品，确认时重新解析并核对文件指纹。部分选择可在之后重新导入时补齐。

验证：覆盖 JSON/PNG、V3 优先级、中文文本、禁用条目、损坏 PNG、无效文件、作者权限、预览不写入、原子性、部分选择、重复导入及完整备份恢复。真实用户文件和浏览器文件选择操作仍待验收。

参考：

- https://github.com/malfoyslastname/character-card-spec-v2
- https://github.com/SillyTavern/SillyTavern/blob/release/src/character-card-parser.js
- https://docs.sillytavern.app/usage/core-concepts/worldinfo/
