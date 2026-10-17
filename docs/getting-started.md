# 安装与开始使用

使用 DSH Windows 桌面版自带的插件管理即可，普通用户无需另装 Git、Node.js 或 pnpm，也不用编译源码。兼容范围为 DSH **0.2.0-rc.2 及以上、0.3.0 以下**：0.2.0 线从 `0.2.0-rc.2` 起放行，0.2.1 线的预发布从 `0.2.1-rc.2` 起放行，0.3 起需要新的插件版本声明。已实际验收 **0.2.1-rc.2** 和 **0.2.0-rc.2**。

## 交给 Agent 安装或更新

把[Windows Agent 安装指南](agent-installation.md)的链接交给 DSH 的 Agent，并告诉它：

> 请按这个指南帮我安装或更新催更姬，保留我的配置和小说数据，重启后确认新版已加载、数据迁移完成，原有作品可以继续使用。

首次安装会得到空白工作库。已有用户更新时，由插件自动备份、迁移和校验，Agent 负责确认结果；用户不需要单独运行迁移命令。

## 自己在桌面版安装

当前稳定版为 **0.4.5**，统一名称为 `dsh-cuigengji-plugin`。新安装与已使用统一名称的用户可直接按包名安装。旧安装名为 `dsh-cuigengji` 的用户，把[名称迁移指南](package-name-migration.md)交给 Agent，由它保留配置与小说完成转换。

1. 从 DSH 左侧进入“插件”，点击“添加插件”。
2. 在“包名或地址”中填写下面的包名和版本号。
3. “安装源”保持默认，或选择 npm 官方源 / 中国大陆镜像源；它用于下载依赖，不填写 GitHub 仓库地址。
4. 点击“安装”，完成后按 DSH 返回结果处理；需要重启时保存编辑并正常退出，包括托盘，再打开。从左侧“催更姬”进入。

```text
dsh-cuigengji-plugin@0.4.5
```

请保留 `@0.4.5`。只填包名时，DSH 的版本选择策略可能安装到较旧的版本；本次已实际验证带版本号的安装与升级。保留原有配置与小说数据，镜像暂未同步时可改选 npm 官方源，或使用下面的成品包地址。

### 成品包备用入口

也可以在同一“包名或地址”输入框安装 GitHub Release 成品包：

```text
https://github.com/mistnest/dsh-cuigengji-plugin/releases/download/v0.4.5/dsh-cuigengji-plugin-0.4.5.tgz
```

或者先[下载成品包](https://github.com/mistnest/dsh-cuigengji-plugin/releases/tag/v0.4.5)，将下载后的 Windows 绝对路径填入同一输入框。需要核对下载文件时，可使用 Release 中的 `SHA256SUMS`，或交给 Agent 检查。GitHub 与 npm 使用同一份已验收的包；GitHub 的“Download ZIP”是源码下载，不是这里的成品包。

### GitHub 地址安装

0.4.1 起，仓库包含完整编译文件，也支持在“包名或地址”中填写：

```text
https://github.com/mistnest/dsh-cuigengji-plugin
```

仓库地址的引用解析可能需要 Git；没有 Git 或更新已有插件时，优先使用带版本号的成品包。当前宿主重复安装同一个仓库地址时可能沿用旧提交；遇到“无法从依赖变更中确定安装了哪一个包”，按 Agent 安装指南改用目标版本的包，不删除小说数据。

## 开始一起写

先创建或选择作品。你在当前会话选中的作品会成为 AI 的写作项目，可以直接告诉它：

> 先看看这本书的正文和相关设定，和我讨论下一章怎么推进，暂时不要续写。

> 把我们确定的走向更新到规划里，接在当前情节后面。

> 按这条规划续写下一章，保持人物动机和世界规则一致。

正文可直接编辑；规划支持多页、分组、拖拽连线和批注；设定支持角色卡、世界书、分组和关系图。写作预设在设置里，启用后作为该作品的写作要求提供给绑定会话。

## 作品保存在哪里

“工作数据 · 导入/导出”会显示实际保存位置。默认目录：

- Windows：`%LOCALAPPDATA%\cuigengji`
- Linux/macOS：`$XDG_DATA_HOME/cuigengji`；没有设置时使用 `~/.local/share/cuigengji`

Windows 桌面版是当前主要验证环境；其他系统的默认目录已实现，但本次没有完成宿主适配验收。

如需修改位置，可在 desktop profile 的插件配置中设置 `dataRoot`，或使用 `CUIGENGJI_DATA_ROOT` 环境变量。优先级为插件配置、环境变量、默认目录。配置不会自动搬运已有作品，请先导出备份，切换位置后在工作台导入。

不要把源码或插件安装目录作为小说目录。代码升级、Git 提交和 npm 打包都不应携带你的作品。

## 备份与迁移

- **作品与备份**：导出或恢复单本作品，包括正文历史、设定、规划和预设。
- **工作数据 · 导入/导出**：导出整个小说工作数据，导入前会展示预览和冲突，保存导入前快照。
- 同 ID、同内容会跳过；同 ID、不同内容不会直接覆盖。
- DSH 聊天记录、附件、账号配置和浏览器未保存草稿不属于小说备份。迁移 DSH 时需要另外处理。

插件升级时自动创建原始快照并迁移校验，负责升级的 Agent 按[更新指南](upgrade.md)确认结果。你也可以自行导出额外备份；不要用旧备份覆盖升级后新增的正文。详细存储边界见[架构说明](architecture.md)。

## 常见问题

**安装后没有入口**：在 DSH 插件管理中检查催更姬是否已安装、启用，并按提示完全退出、重启。仍没有入口时，将[Agent 安装指南](agent-installation.md)交给 Agent 核对当前环境和实际加载状态。

**新版 DSH 提示 0.4.3 不兼容**：在“包名或地址”填写 `dsh-cuigengji-plugin@0.4.5` 更新，不用关闭版本检查或移动小说。0.4.5 保留原有功能与数据格式。

**提示版本冲突**：保留草稿，读取最新内容后比较。不要修改版本号强行覆盖另一会话或 AI 的修改。

**找不到以前的作品**：检查“工作数据”显示的实际目录，再从旧环境导出备份。切换数据目录不会自动迁移。

**酒馆文件导入后效果不同**：我们保留资料和提示词内容，不运行酒馆的触发与装填规则；导入后检查和编辑内容，再启用预设。见[导入说明](tavern-import.md)和[预设说明](presets.md)。

## 开发者源码预览

源码预览需要 Git 和 Node.js 24 或更新版本，属于开发试用方式。克隆后运行：

```powershell
git clone https://github.com/mistnest/dsh-cuigengji-plugin.git
cd dsh-cuigengji-plugin
npm ci
npm run preview:workbench
```

打开返回的本地地址。预览使用独立临时目录，不读取日常作品，也不提供真实模型对话。想保留试用内容，请在工作台导出。

也可以用自己的单本作品备份创建试用副本：

```powershell
npm run preview:workbench -- "C:\你的备份目录\作品.cuigengji.json"
```

修改只写入临时副本，保留内容仍需导出。完整开发、测试和发布流程见[开发说明](development.md)与[渠道维护与发布流程](release-process.md)。

## 开发者本地安装

下面的源码构建流程仅供开发维护使用。

1. 安装并启动过 DSH 桌面版，让它创建 `desktop` profile。
2. 克隆本仓库，进入项目目录，执行 `npm ci`。
3. 从 DSH 菜单退出应用，包括托盘进程。
4. 运行安装脚本，将参数换成你实际的 DSH 可执行文件路径：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-desktop.ps1 -DesktopExe "C:\你的DSH安装目录\DeepSeek Harness.exe"
```

脚本构建并打包插件，使用 DSH 自带的 Node/pnpm 安装到 `%USERPROFILE%\.dsh\profiles\desktop`。如果自定义过 DSH Home，请额外传入 `-DshHome "你的DSH数据目录"`。打包文件存于项目内 `releases`，不包含小说工作数据。

5. 首次安装时，在 `desktop` profile 的 `package.json` 中找到 `dsh.profile.bundles`，保留已有内容并加入 `"dsh-cuigengji-plugin"`。开发者安装脚本会处理已启用旧包的名称与配置转换；普通用户交给 Agent 按[名称迁移指南](package-name-migration.md)操作。
6. 通过 DSH 自己的快捷方式重新启动，从左侧栏的“催更姬”进入。

若找不到可执行文件，可查看桌面快捷方式的属性。不要用 CLI 创建或替换名为 `desktop` 的 profile；桌面 profile 由 DSH 桌面应用管理。
