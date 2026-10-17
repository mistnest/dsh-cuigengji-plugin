# 从旧安装名迁移到统一名称

0.4.2 起，GitHub 仓库、npm 包和市场显示名统一为 **`dsh-cuigengji-plugin`**，界面仍显示“催更姬”。旧安装包名 `dsh-cuigengji` 仅用于识别历史安装。

这是一次安装身份转换，不搬动小说。内部条目 ID `cuigengji`、工具名、会话绑定、资源地址、浏览器草稿、环境变量和默认工作数据目录保留。不能把 `%LOCALAPPDATA%/cuigengji` 重命名为包名；自定义 `dataRoot` 同样保留。

## 给负责升级的 Agent

先用原生 `plugin_manager` 的 `list_bundles` / `list_plugins` 确认旧包是否存在，记录实际 DSH 版本、当前 profile、DSH Home、原有数据根、启用状态和作品 ID。新安装或已经使用统一名称的用户按[普通安装指南](agent-installation.md)操作。

旧名更新按以下顺序执行，避免旧、新两个工作台同时加载。

### 1. 安装新版，先保持关闭

通过 DSH 原生工具安装精确版本，使用 `enabled:false`：

```json
{"action":"install_bundle","target":"https://github.com/mistnest/dsh-cuigengji-plugin/releases/download/v0.4.5/dsh-cuigengji-plugin-0.4.5.tgz","enabled":false}
```

npm 发布并验证后，`target` 也可使用 `dsh-cuigengji-plugin@0.4.5`。读取真实安装返回，确认新包已落盘。安装失败时旧包继续保留，停止后续步骤。

### 2. 正常退出后，运行名称迁移工具

工具在新包的 `runtime/adapters/dsh/rename-installation.js` 中，用桌面自带 Node 执行。下面是维护 Agent 的示例，路径应换成用户实际环境：

```powershell
$taskDesktopExe = 'C:\你的DSH安装目录\DeepSeek Harness.exe'
$taskDshHome = Join-Path $env:USERPROFILE '.dsh'
$taskProfile = Join-Path $taskDshHome 'profiles\desktop'
$taskNode = Join-Path (Split-Path -Parent $taskDesktopExe) 'resources\runtime\bin\node.cmd'
$taskRenameTool = Join-Path $taskProfile 'node_modules\dsh-cuigengji-plugin\runtime\adapters\dsh\rename-installation.js'
& $taskNode $taskRenameTool --profile $taskProfile --home $taskDshHome
```

默认仅预览。正常退出 DSH（包括托盘）后应用：

```powershell
& $taskNode $taskRenameTool --profile $taskProfile --home $taskDshHome --apply --desktop-exe $taskDesktopExe
```

工具确认 DSH 已退出，取得与宿主包操作相同的 profile 文件锁，备份原始配置后执行：

- 把启用列表中的旧包替换为新包，保留原位置与其他插件顺序，并去重。
- 对 profile 和 DSH Home 中限定了旧模块名的 `cuigengji` 配置，按稳定条目 ID 继续应用；保留 `dataRoot`、禁用状态和其他配置。显式插入的旧条目改为新模块名。
- 保留依赖、锁文件、原小说数据与所有历史；旧依赖在新版验收前不删除。

原始配置备份在 `<profile>/.cuigengji-package-rename/<本次操作>`，带逐文件 SHA-256。工具返回 JSON，包含版本、变更文件、启用列表和备份路径。重复执行不会重复改名；中断后保留现场，保持 DSH 关闭并重新执行。非法配置、目录链接、缺少新包或无法确认退出都会停止。

DSH 内的 Agent 需要在退出前准备后台维护任务。工具可加 `--wait-for-exit 600`，等待用户正常退出后再应用；后台启动使用隐藏窗口，保留输出与退出码，不强行结束宿主进程。不具备退出后的执行能力时交由外部 Agent 接手，不要求普通用户手改文件。

### 3. 从原入口重新打开，核对作品

从用户原来的快捷方式启动 DSH。确认仅新包被启用，工具调用和前端入口各只有一份；再按[更新与数据迁移](upgrade.md)调用 `cuigengji_maintenance` 的 `status` / `verify`，核对 `0.4.5`、原数据根和升级前作品 ID。只有就绪且完整性验证通过才报告完成。

### 4. 清理旧依赖

新版验收通过后，通过 DSH 原生工具移除旧包：

```json
{"action":"remove_bundle","target":"dsh-cuigengji"}
```

若宿主要求先停止 profile，按其返回处理。暂时无法卸载时保留关闭的旧依赖，并明确报告；它不能与新包同时启用。不要删除小说目录、升级前快照或名称迁移的配置备份。

回退包和恢复数据格式分别处理，按[恢复说明](upgrade.md#恢复与回滚)操作，不用旧快照覆盖升级后新增的正文。
