---
name: cuigengji-maintenance
description: 安装或更新催更姬后，查询自动迁移、备份和完整性校验结果；不要求绑定小说。
---

# 催更姬安装与更新维护

这份 Skill 只处理插件本身的安装、升级与数据验证，不参与小说创作。用户通常不会写代码，因此应使用 DSH 原生插件管理安装维护者发布的预构建 `.tgz`，按宿主返回完成重新加载，要求重启时正常退出再打开。不要让用户安装 Git、Node.js、pnpm，也不要让 Agent 直接改小说文件或手工重命名数据目录。

## 更新流程

1. 公开安装名统一为 `dsh-cuigengji-plugin`。先确认 DSH 桌面版、实际加载版本及启用包；发现旧名 `dsh-cuigengji` 时先按[名称迁移指南](https://github.com/mistnest/dsh-cuigengji-plugin/blob/main/docs/package-name-migration.md)关闭状态安装新版，正常退出后由工具转接配置与启用项，禁止同时启用两个包。内部条目 ID、工具名、草稿和数据目录保留。
2. 从公开仓库的 Releases 取得与宿主兼容的预构建包，核对资产文件名和 `SHA256SUMS`。没有成品包时，明确报告缺少发布资源，不临时让用户从源码构建。
3. 通过 DSH 原生插件管理安装本地路径或下载 URL。已有插件更新可能需要一次宿主重启，遵循宿主返回的 restart-required 状态。
4. 让 DSH 完整退出并重新加载插件。催更姬在加载阶段会自动处理配置的数据根：建立升级前的完整原始备份、恢复挂起事务、迁移物理布局、校验正文历史、规划页面、设定关系、预设、回收站、绑定和请求记录。
5. 重启完成后调用 `cuigengji_maintenance` 的 `status`，再调用 `verify`。`verify` 可带 `expectedVersion`、`expectedDataRoot` 和升级前的 `expectedNovelIds`，确认实际加载的包、正确的数据目录和原作品。
6. 只有 `status.status=ready` 且 `verify.verified=true` 才报告更新完成。若失败，报告 `failedStage`、错误代码、数据根和备份路径，保留现场并重新启动后重试；不要创建空库掩盖失败。

## 维护工具

```json
{"action":"status","args":{}}
```

返回当前插件版本、实际数据根、来源/目标存储版本、迁移阶段、完整备份路径、作品和正文数量，以及失败原因。它不要求会话绑定小说，迁移失败时仍可调用。

```json
{"action":"verify","args":{"expectedVersion":"0.4.4","expectedDataRoot":"C:\\Users\\用户名\\AppData\\Local\\cuigengji"}}
```

它在锁内重新读取并校验工作库，返回计数、摘要哈希和每项检查结果。不要把摘要哈希当作正文内容，也不要把数据根替换成维护者电脑上的路径。

## 失败与恢复边界

- 升级前原始文件快照位于数据根旁的 `.cuigengji-upgrade-backups`，包括正文历史、导入原件、规划页面和额外文件；锁文件等瞬态文件不会复制。
- 迁移记录写在数据根 `runtime/upgrade.json`。重复重启会复用已经完成的备份，事务中断会先恢复日志再继续，操作可重复。
- `failed` 时正常小说工具和导入导出会被拦截，维护查询仍可用。不要通过手工删除 `library.json`、`store.json`、`.lock` 或备份目录来“修复”。
- 回滚时先停止 DSH，保留升级后新写入的文件，再使用对应升级前快照和旧插件版本恢复；回滚前先取得用户明确授权，并报告会影响哪些新写入内容。
- DSH 的聊天、附件、API 密钥和宿主偏好由 DSH 自己管理，不属于催更姬工作数据迁移；不要声称它们包含在催更姬备份中。

先核对用户请求的目标版本及公开 Release，不把本 Skill 的示例号当成最新版本。详细步骤见[Windows Agent 安装指南](https://github.com/mistnest/dsh-cuigengji-plugin/blob/main/docs/agent-installation.md)、[名称迁移](https://github.com/mistnest/dsh-cuigengji-plugin/blob/main/docs/package-name-migration.md)和[升级恢复说明](https://github.com/mistnest/dsh-cuigengji-plugin/blob/main/docs/upgrade.md)。
