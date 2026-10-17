# 开发、测试与公开发布

渠道分工、版本规则与每次发布的顺序统一见[渠道维护与发布流程](release-process.md)；本文说明具体构建、测试和迁移验收工具。

当前插件版本 0.4.5，统一公开名称 `dsh-cuigengji-plugin`，Node.js 24+，最低宿主要求 DSH `>=0.2.0-rc.2`，后续版本默认允许安装；实际验收 DSH 0.2.1-rc.2 和 0.2.0-rc.2。开发依赖固定 0.2.1-rc.2，范围回归用例不代表已运行未来宿主。源码同时包含 TypeScript、JavaScript 和 JSX，尚未完成全部模块的 TypeScript 迁移。

## 模块与构建

- `src/client/features`：正文、规划、设定、预设与统一导入导出界面。
- `src/domain`：规划、分组、预设与正文规则。
- `src/application`：作品操作、会话绑定、查询、备份和独立导入导出模块。
- `src/infrastructure`：持久化及旧数据转换。
- `src/adapters`：DSH 和 MCP 接入。
- `src/contracts`：共享契约；`skills`：写作助手协作指南。
- 旧 `core`、`mcp`、`assistant` 入口保留兼容转发。

`src/` 是维护入口。`npm run build` 生成 `lib/client.js` 和服务端 `runtime/`；这两处生成文件随源码提交，供 DSH 直接安装。GitHub 默认折叠它们的差异，不在生成文件上手工改功能。Node 不直接运行安装包中的 TypeScript，因此发布前必须重新构建。完整模块关系见[架构说明](architecture.md)。

根 `package.json` 不声明 `prepare`、`prepack` 或安装脚本；DSH 从 GitHub 安装时只读取预构建文件，不需要运行构建或放宽 pnpm 保护。开发者通过显式命令构建、打包；CI 用 `check:build` 重新编译并逐字节检查生成文件，发现源码和产物不同或残留旧模块就拒绝提交。

```powershell
npm ci
npm test
npm run typecheck
npm run check:build
npm run test:ui
npm run pack:release
```

`npm run pack:release` 显式执行类型检查、构建、产物核对和打包；直接 `npm pack` 只打包已存在的文件，不再自动构建。界面脚本使用真实 Workbench 和隔离临时 Store。作者操作流程用 `test:author-workflow`；图、页面、目录关闭、章节排序、正文光标、管理页和预设分别有 `test:graph`、`test:pages`、`test:directory`、`test:chapter-order`、`test:manuscript`、`test:management`、`test:presets` 和 `test:transfer`。欢迎页与批量管理用 `test:welcome-batch`，覆盖作品入口、筛选后的选择范围、移动失败与跨页连线，以及宽窄屏和深色布局。顶部导航、刷新保留草稿/视野、正文底部间距和设置内预设入口用 `test:navigation` 验收。旧 `test:ui` 仍有待同步的界面名称，不代替这些专项验收。

单独看前端可以运行 `npm run preview:workbench`；添加 `-- --welcome` 查看未绑定会话的作品首页，添加 `-- --empty` 查看空库欢迎页。两种模式都使用隔离的临时数据，不加载日常小说。

整本作品的回收与恢复由 `tests/novel-recycle.test.js` 覆盖，包含完整内容与引用、旧归档兼容、运行中拒绝回收、并发启动检查、永久删除和中断恢复。`npm run test:novel-recycle` 使用隔离数据检查卡片右侧按钮的独立点击范围、确认取消、跨面板刷新、恢复与永久删除，以及窄窗口和深色布局。

DSH 内的真实 RPC 验收用 `test:rpc` / `test:rpc-flow`，需要独立 DSH 实例及其认证 URL；后者会创建测试作品。不要在正式小说目录运行写入验收。`test:live` 检查 desktop profile 的安装版本，并逐一比对已安装 `package.json`、前端构建、全部服务端运行时和 Skill 文件的 SHA-256；同版本号的旧包也会报错。这个只读检查不代表浏览器与模型行为验证。

Windows 桌面更新请参考[安装说明](getting-started.md)。桌面内置 Electron Node 与普通 Node 的子进程环境不同，涉及 MCP 的修改还应通过桌面运行时检查。

## 存储迁移验证

正常用户更新由插件加载阶段的 `UpgradeCoordinator` 自动备份、恢复、迁移和校验，安装 Agent 再调用维护工具验收。`tests/upgrade.test.js` 使用公开 0.3.13 实际代码生成的合成库及 v2/v3/v4 布局，验证完整历史、回收站、导入原件、页面/批注、绑定/请求、重复升级、中断恢复和失败闸门。生成旧库的脚本与来源提交记录见 `scripts/generate-upgrade-fixture.mjs`、`tests/fixtures/public-0.3.13/provenance.json`；不会使用真实小说。

布局版本 4 使用可读文件名，稳定业务 ID 和单本/全库导出格式保持不变。`tests/project-file-names.test.js` 覆盖文件名冲突、改名与恢复、完整页面内容、迁移中断及引用/备份兼容；目录与按需读写分别由 `project-directories.test.js`、`project-storage.test.js` 验证。

迁移真实数据前先运行隔离演练：

```powershell
node scripts/check-project-names-migration.mjs <数据目录> <报告目录>
```

脚本在锁内复制数据，不加载原目录；副本升级后逐条核对正文、设定、规划、历史、请求及额外文件的 SHA-256，另外核对索引除路径映射外完全相同、完整逻辑快照一致，以及工作数据导出/导入往返。支持布局 2、3、4，布局 4 再次运行不会重命名文件。单文件旧格式使用 `check-storage-migration.mjs <store.json> <报告目录>`。

桌面宿主与托盘进程退出、新插件安装通过后，可添加 `--apply` 将同样的核对应用于正式目录。迁移快照保存在数据目录的 `backups`，演练与应用报告保存在指定的报告目录。

## 发布包验收

发布 `.tgz`、`SHA256SUMS` 和安装升级指南，并使用相同版本标签记录源码。打包前完成 `npm test`、类型检查、构建和文件清单检查。GitHub 源码 ZIP 不充当用户成品安装包。

Windows 上 `scripts/check-release-install.mjs` 在临时 profile 中调用 DSH 原生 `runPluginCommand`，把 PATH 限制为桌面内置 Node shim 与 Windows 系统目录，检查找不到 Git，再验收本地或远程 `.tgz` 的新安装/旧包更新。它保留无关 profile 字段、启用组合包，随后用桌面 Node 加载 node_modules 中的编译包，验证维护工具、正文、规划、预设和真实 stdio MCP。不会读写用户 desktop profile。

包操作通过 `scripts/desktop-package-operation.mjs` 在指定桌面的 Electron Node 中执行，解析该桌面自己携带的插件管理器。兼容旧 `resources/runtime/pnpm/` 和新 `resources/runtime/primary-runtime/dependencies/pnpm/`，不借用开发依赖或修改宿主版本豁免。跨宿主升级添加 `--old-desktop-exe <旧版exe>`：旧包先在旧宿主运行，随后用新宿主升级，比较前后完整逻辑工作库摘要。

`npm run test:host-compat -- --desktop-exe <exe> --package <tgz> --report <json>` 在临时 profile 启动该桌面内置的真实 DSH Host，通过 headless 浏览器验收侧栏入口、首次建书、正文自动保存、规划、设定、预设和导入导出，并检查宿主工具与 Skill 注册。只用合成数据，不发送聊天或调用模型；失败截图与诊断保存在报告旁。正式 `release prepare` 也会执行这项检查。

```powershell
node scripts/check-release-install.mjs --desktop-exe "C:\新版DSH\DeepSeek Harness.exe" --old-desktop-exe "C:\旧版DSH\DeepSeek Harness.exe" --package "C:\发布目录\dsh-cuigengji-plugin-0.4.5.tgz" --old-package "C:\旧包目录\dsh-cuigengji-plugin-0.4.3.tgz" --report "C:\验收目录\update.json"
```

省略 `--old-package` 验证全新安装；`--package` 也可使用真实 Release `.tgz` URL、完整 GitHub 仓库 URL 或固定提交的 `github:owner/repo#commit`。默认不提供 Git，固定提交使用完整 40 位 SHA；不固定提交的仓库地址加 `--with-git` 验收宿主的 Git 引用解析。GitHub 路径同样检查安装后的编译文件、无构建授权和旧库内容。用户安装使用[原生 Agent 指南](agent-installation.md)，不运行此开发者验收脚本。

npm 首次发布与后续可信发布流程见 [npm 发布](npm-publishing.md)。首次发布成功后，同一验收脚本可用 `--npm-package dsh-cuigengji-plugin@0.4.5` 检查按包名安装；它与 `--package` 二选一，继续使用没有 Git 的隔离 profile。名称转换由 `tests/package-identity.test.js` 和真实安装验收覆盖，包括自定义数据根、home/profile 配置、去重、配置原始备份和幂等重试。

## 小说数据与源码分离

公开仓库是 `https://github.com/mistnest/dsh-cuigengji-plugin`，只发布代码、公共文档与合成测试样例。真实小说、设定、导出包、操作日志、聊天记录和个人环境备份保存在仓库之外。

根目录下的 `test-data`、`novel-data`、`data`、`backups`、`migration` 和 `releases` 被忽略，`*.cuigengji.json` 导出文件也被忽略。这是防误提交措施；已经被 Git 跟踪的文件仍需从索引移除，忽略规则不会抹掉提交历史。

从包含个人作品的私有分支发布时，应基于公开分支生成仅含源码的提交，不合并私人数据提交。推送前检查待推送的文件与历史，打包时确认没有小说和凭据。需要带作品复现问题时，使用脱离原作的合成样例。

## 贡献

欢迎在 Issues 里描述写作场景、复现步骤和期望体验。截图、日志和备份请先移除私人正文、设定、聊天和账号信息。涉及持久化、导入导出或协作冲突的修改，需要验证旧数据兼容与备份往返；前端修改应实际检查操作与布局。

[MIT 许可证](../LICENSE)适用于仓库源码，不授权使用他人的小说或导入资料。
