# 交给 Agent 安装或更新催更姬（Windows）

统一公开名称为 **`dsh-cuigengji-plugin`**，界面显示“催更姬”。普通用户使用 DSH 桌面版自带的插件管理和预构建包即可，无需 Git、Node.js、pnpm 或源码构建。此文可以在首次安装前交给 Agent；安装后另有 `cuigengji-maintenance` Skill 指导维护验收。

## 下载入口

- 目标发布：[0.4.5](https://github.com/mistnest/dsh-cuigengji-plugin/releases/tag/v0.4.5)
- 成品安装包：[dsh-cuigengji-plugin-0.4.5.tgz](https://github.com/mistnest/dsh-cuigengji-plugin/releases/download/v0.4.5/dsh-cuigengji-plugin-0.4.5.tgz)
- 哈希校验：[SHA256SUMS](https://github.com/mistnest/dsh-cuigengji-plugin/releases/download/v0.4.5/SHA256SUMS)
- 最低宿主：DSH **0.2.0-rc.2**；后续正式版和预发布版默认允许安装。
- 已验证宿主：DSH Windows 桌面版 **0.2.1-rc.2** 和 **0.2.0-rc.2**。此列表是实际验收记录，不是安装白名单；后续版本遇到具体接口错误时按错误排查，不因未测试就擅自添加版本豁免或改动用户配置。

安装或更新优先使用精确版本 `dsh-cuigengji-plugin@0.4.5`，执行前核对 npm 精确版本与发布说明。无 Git 验收覆盖新装、旧宿主的 0.4.3 / 0.4.4 同名升级及 0.4.1 旧名升级，升级后检查完整逻辑工作库保留。备用入口使用上面的 `.tgz` URL，或下载后的 Windows 绝对路径。也支持仓库地址 `https://github.com/mistnest/dsh-cuigengji-plugin`；0.4.1 起仓库包含完整编译文件，不需要构建授权。GitHub 的源码 ZIP 不替代 `.tgz` 包。

**环境清单中若存在旧包 `dsh-cuigengji`，先按[安装名称迁移](package-name-migration.md)以关闭状态装入新包，再离线转接启用项和原配置。不要直接同时启用两个包。** 新安装或已经使用统一名称的更新继续本页流程。

已经从同一个 GitHub 地址安装过时，重复填写该地址可能沿用 pnpm 锁定的旧提交，并报“无法从依赖变更中确定安装了哪一个包”。这是已验证宿主的同地址安装限制，不表示新代码已经加载。升级使用新版本的 `.tgz` URL；需要测试指定源码时，可在仓库地址后加 `#` 和完整 40 位提交 SHA。不要为了刷新源码而删除小说目录。普通仓库地址及分支名仍可能需要 Git 解析，不能代替无 Git 用户的成品包路径。

“安装源”字段控制 npm 依赖从哪里下载，选择默认、官方源或中国大陆镜像源，不填写 GitHub 仓库地址。用户的包源、供应链保护和构建白名单不因安装催更姬而修改。

## 用户可直接交给 Agent 的话

> 请按催更姬的 Windows Agent 安装指南帮我安装或更新 dsh-cuigengji-plugin 到 0.4.5。使用 DSH 原生插件管理与已公开成品包；如果存在旧安装名，先完成名称迁移。保留已有配置和小说数据，完整重启后确认实际加载版本、数据目录和迁移校验结果。重新进入插件时应能直接继续写作。

## 1. 查明当前环境

确认用户实际运行的 DSH 版本、当前桌面 profile 和已有催更姬状态，以该环境为目标，不套用维护者电脑的路径。

DSH 中的 Agent 可使用原生 `plugin_manager`。已验证宿主在 Creator 模式提供此工具；其他预设可能需要切换到具备管理能力的模式。权限和宿主审批遵循 DSH 的既有机制。

```json
{"action":"list_bundles","offset":0,"limit":100}
```

已有插件更新时，先记录原有 `dataRoot`、插件配置、启用状态和作品清单；旧版若没有维护工具，用 `settings.get` 和只读作品清单核对。保留原数据根、DSH Home、聊天、附件和桌面偏好，更新包不改它们。

## 2. 取得并核对包

下载真实的发布资产，核对 `SHA256SUMS` 的 SHA-256。下载失败时可以重试下载或改为本地 `.tgz` 路径；不要给用户临时搭建 Git 或源码构建环境。

Windows 外部 Agent 可以用 PowerShell 的 `Get-FileHash -Algorithm SHA256` 核对已下载文件。安装目标始终是用户当前的 DSH profile，不新建同名 desktop 环境。

## 3. 由宿主安装和启用

通过 DSH 原生工具安装固定版本：

```json
{"action":"install_bundle","target":"dsh-cuigengji-plugin@0.4.5","enabled":true}
```

需要使用 GitHub 成品包时：

```json
{"action":"install_bundle","target":"https://github.com/mistnest/dsh-cuigengji-plugin/releases/download/v0.4.5/dsh-cuigengji-plugin-0.4.5.tgz","enabled":true}
```

或把 `target` 换成已经核对过的本地 `.tgz` 绝对路径。没有原生工具访问能力的外部 Agent，可以先准备好包，交由 DSH 的原生插件页安装，并继续接手后面的验证。

读取安装返回的 `application`、`error`、`packageResult`。`restart-required` 表示磁盘上的包已更新，当前进程仍使用旧代码，需要一次完整重启。若宿主报告安装失败，保留具体诊断，不把已下载文件当成已安装。

desktop profile 由桌面应用管理。普通 DSH CLI 会拒绝对它直接操作；不要创建同名 profile、手工改 bundles 或在用户 profile 直接运行 `pnpm add`。本仓库的 `install-desktop.ps1` 是开发者维护脚本，不属于普通用户安装路径。

## 4. 重新加载与自动迁移

先读取宿主安装结果。报告需要重启或仍加载旧版本时，请用户保存编辑中的内容，从 DSH 菜单正常退出，包括托盘进程，再从原快捷方式启动。宿主已热重载时可直接验收实际版本；未完成加载就不能报告成功。具备相应权限的安装 Agent 可以完成重启；否则说明唯一剩余步骤并在重启后继续验收。

插件加载阶段完成升级前的完整原始快照、挂起事务恢复、物理布局迁移和完整逻辑校验。用户不需要单独运行迁移命令，也不会看到迁移向导。**负责更新的 Agent 必须完成这一步的验证，才能说更新结束。**

## 5. 验收实际加载结果

重启后调用不要求绑定小说的 `cuigengji_maintenance`：

```json
{"action":"status","args":{}}
```

再核对版本、原数据根和原作品 ID；下面的数据目录是示例，请换成之前查明的目录：

```json
{"action":"verify","args":{"expectedVersion":"0.4.5","expectedDataRoot":"C:\\Users\\用户名\\AppData\\Local\\cuigengji","expectedNovelIds":[]}}
```

`expectedNovelIds` 可填升级前作品的真实 ID，不用新 ID 替代。确认：

- `status.status=ready`，实际加载版本为 0.4.5，数据根与更新前一致。
- `verify.verified=true`，各作品、正文版本、回收站、设定、规划页和绑定数量符合原数据。
- 原有作品仍能通过只读工具访问。初次安装应是可用空库，不会附带作者小说。

维护结果可通过同一 DSH 连接的 `cuigengji/dispatch` RPC 查询 `maintenance.status` / `maintenance.verify`；这是外部 Agent 的替代查询入口，需要正常宿主认证。不要打印连接凭据。

报告给用户的内容保持简短：已加载版本、迁移完成与否、原作品是否保留。上述校验不需要调用任何模型连通性测试。

## 失败时怎样处理

- **新版 DSH 拒绝旧 0.4.3**：旧包仅声明支持 0.2.0-rc.2。DSH 0.2.1-rc.2 使用本页的 0.4.5 更新入口，保留原配置和数据根，不添加兼容豁免或停用供应链检查。
- **无法从依赖变更中确定安装了哪一个包**：若重复用了同一个仓库地址，改为目标版本的 `.tgz` URL 或明确的新提交地址；核对安装结果与重启后版本，不把无依赖变更当作更新完成。
- **找不到 Git / `git ls-remote`**：核对是否误用了仓库地址，换成已核实的 `.tgz`。
- **不兼容或构建批准提示**：保留宿主的具体结果，按相应发布说明处理，不绕过宿主检查。
- **安装完仍是旧版本**：核对完整退出和重新加载结果，不因磁盘包版本更新就宣称已生效。
- **迁移 `failed`**：查询维护结果中的 `failedStage`、错误代码、原数据根与 `backupPath`，保留现场。重新加载会恢复挂起事务并继续同一次升级；反复失败时把元数据交给维护者。
- **缺失作品**：先比对原数据根和作品 ID。不要创建空库或用旧备份覆盖升级后新写入的正文。

完整恢复边界、快照位置和回滚流程见[更新与数据迁移](upgrade.md)。分享日志前移除凭据和私人内容。历史独立版的模型连通性日志不属于本次插件安装证据。
