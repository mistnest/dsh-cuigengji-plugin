# 源码、构建与测试

开发需要 Node.js 24+。普通用户从 DSH 安装成品包即可，见[安装说明](getting-started.md)。模块和数据格式见[架构说明](architecture.md)，维护者发版见[发布流程](release-process.md)。

## 开始开发

```powershell
git clone https://github.com/mistnest/dsh-cuigengji-plugin.git
cd dsh-cuigengji-plugin
npm ci
npm run preview:workbench
```

预览使用隔离临时作品，不读取日常小说，也不发送模型对话。添加 `-- --welcome` 查看作品首页，添加 `-- --empty` 查看空库；试用后需要保留的内容请自行导出。

## 源码布局

| 目录 | 职责 |
| --- | --- |
| `src/modules/author-ui/` | 作者工作台与桌宠 |
| `src/modules/access/` | DSH、MCP、RPC、提示词和工具注册 |
| `src/modules/workspace/` | 作品、卷章、设定、规划、预设与写作业务 |
| `src/modules/collaboration/` | 长期外部连接的读写授权 |
| `src/modules/usage/` | 用量、计价、余额和账本 |
| `src/modules/library/` | 库切换、记录映射、事务和迁移 |
| `src/index.ts`、`src/composition/`、`src/platform/` | 插件入口、服务组装和共用基础能力 |
| `skills/` | Agent 写作与安装维护指南 |
| `tests/`、`scripts/` | 测试源码、合成样例、构建与验收工具 |
| `docs/`、`.github/` | 使用文档、功能截图、项目展示素材与 CI |

旧 `core`、`mcp`、`assistant` 路径保留兼容转发。插件源码使用严格模式 TypeScript，React 页面使用 TSX。DSH 安装包运行编译后的 JavaScript。

`src/` 是维护入口；`npm run build` 生成 `runtime/` 和 `lib/client.js`，这些产物随源码提交，供 DSH 从仓库地址直接安装。不要手工修改产物，也不要增加安装时构建钩子。`check:build` 会重新编译并核对文件内容与残留模块。

## 验证修改

```powershell
npm test
npm run typecheck
npm run build
npm run check:build
```

按修改范围补相应验收，无需每次运行所有界面脚本：

| 修改范围 | 主要入口 |
| --- | --- |
| 正文编辑、同步和章节顺序 | `test:manuscript`、`test:chapter-order` |
| 规划、设定与多页操作 | `test:graph`、`test:pages`、`test:ui-director-workspaces` |
| 嵌套目录与拖拽排序 | `test:ui-folders`、`test:ui-content-order` |
| 正文查找与替换 | `test:manuscript-search`、`test:ui-manuscript-search` |
| 桌宠、日期统计和会话范围 | `test:pet`、`test:records`、`test:session-access` |
| 目录与工作台导航 | `test:directory`、`test:navigation` |
| 作品管理、欢迎页与回收站 | `test:management`、`test:welcome-batch`、`test:novel-recycle` |
| 写作预设、导入导出 | `test:presets`、`test:transfer` |
| 完整作者操作流程 | `test:author-workflow` |
| 旧库升级 | `test:upgrade` |
| 外部 MCP 与作品、模块读写授权 | `node --test tests/external-reader.test.js`、`node tests/ui-external-reader.mjs` |
| DSH 原生子 Agent 直写、长期 MCP 读写和旧备份兼容 | `node --test tests/native-writing.test.js tests/external-reader.test.js tests/collaboration-retirement.test.js` |

以上入口通过 `npm run <入口>` 执行，界面脚本需要 Playwright 浏览器。`test:review-ui` 汇总执行主要流程，也可在 `--` 后指定流程名；检查失败需查看对应日志，不只看汇总数量。测试代码与合成 fixture 保留在公开仓库，验收输出和截图存入被忽略的临时目录。

直接列出的 `node` 命令无需 `npm run`。外部 MCP 测试默认运行源码适配器；构建后设置 `CUIGENGJI_TEST_CONNECTOR=runtime/adapters/mcp/external-server.js` 重跑，可检查正式 JavaScript 入口。真实客户端验收使用合成作品和独立工作目录，凭据沿用客户端自身登录方式，不读取或记录账号密钥。只读性通过前后文件哈希核对，Agent 是否读过资料以审计记录为准。

## 扩展工具模块

动作定义随业务模块维护，包含动作名、读写效果和开放入口。外部查询还声明授权模块、参数 schema 和加载动作。`access/catalog/` 汇总 DSH 和面板能力，`workspace/queries/catalog.ts` 从工作区声明派生外部只读契约。长期连接的外部写入白名单与参数由 `collaboration/grants/writes.ts` 声明，编辑复用 Store。DSH 参数格式和说明位于 `access/dsh/`。

维护 `chapter.*` 时，从 `workspace/chapters/` 开始。该目录中的 `operations.ts` 声明动作，`actions.ts` 实现业务行为，`query.ts` 提供查询，`load.ts` 选择逻辑记录。物理路径集中在 `library/records/`。写请求先经过会话策略，再由 `library/transactions/` 在同一把锁内检查回执并提交。


新增只读查询需验证按需加载、已删除对象排除、版本与分页、模块缩减后的拒绝，以及读取前后的库文件哈希。不要让 QueryService 调用 Store.dispatch/save、prepare、迁移或事务恢复。新增写命令继续使用现有 Store/domain 的 expectedRevision、requestId、历史与审计，不因接入另一种 Agent 复制写库逻辑；首期外部连接只组装查询模块。客户端通用模块名称放 `reader-modules.ts`，不要将 Zod 或服务器依赖打进设置界面。

## 数据兼容与安装验收

持久化、导入导出或并发修改需要覆盖旧数据兼容、正文历史、回收站、备份往返和失败恢复。`tests/fixtures/public-0.3.13/` 是由旧公开代码生成的合成工作库，来源在同目录 `provenance.json`。

迁移演练只操作副本，并核对完整逻辑内容：

```powershell
node scripts/check-project-names-migration.mjs <数据目录> <报告目录>
```

单文件旧库使用 `check-storage-migration.mjs <store.json> <报告目录>`。演练默认不修改原目录；正式应用前必须先完成备份，关闭使用该目录的宿主与托盘进程。

宿主验收使用临时 DSH profile 与合成作品：

```powershell
npm run test:host-compat -- --desktop-exe <DSH可执行文件> --package <成品tgz> --report <报告json>
npm run test:release -- --desktop-exe <DSH可执行文件> --package <成品tgz> --report <报告json>
```

前者实际启动 DSH 工作台，检查入口、正文保存、规划、设定、预设和工具注册；后者使用桌面内置运行时验证无 Git 安装。通过 `--old-package <旧包>` 验证升级；跨宿主升级另传 `--old-desktop-exe <旧版DSH>`。npm 入口用 `--npm-package dsh-cuigengji-plugin@<版本>` 替代 `--package`。

社区市场的更新不能由普通包安装检查代替。`scripts/check-market-update.mjs` 使用最新版市场和桌面宿主，覆盖真实更新路由、重启后的后台版本、配置和完整工作库保留，也支持失败回滚；参数见[市场更新说明](market-updates.md)。

只有 npm 发布的 alpha 版可通过 `test:host-compat -- --cli <官方DSH包的lib/bin.js> --pnpm <可信运行时的pnpm.mjs> --package <成品tgz> --report <报告json>` 检查真实 Web 宿主；这不等于通过对应版本的桌面验收。排查失败时可加 `--keep-on-failure` 保留报告中的临时目录，不复制真实作品或账号配置到这些自动检查中。

Windows 桌面是主要验收目标。记录应写清宿主版本、官方安装包或源码构建、真实操作与落库结果；Web 检查和脚本通过不能替代桌面实际使用。尚无官方桌面成品的版本可补充对应标签的源码桌面验收，但不得记作官方安装包验收。

真实 RPC 验收使用 `test:rpc` / `test:rpc-flow`，需要独立 DSH 实例与其认证 URL；后者会写入测试作品。`test:live` 只核对已安装文件与版本，不代表界面或模型验证。不要在用户正式 profile、小说目录运行写入测试，不做模型连通性请求。

## 贡献与公开范围

欢迎通过 Issues 描述场景、复现步骤和期望体验。提交修改时保留对应测试与构建产物；新增功能需核对实际操作和宽窄屏布局。

公开仓库保留可运行、可验证的正式代码与必要文档。开发日志、设计草稿、体验审查、实测报告、失败截图、视频工程及渠道申请记录保存在私有仓库或本地。宣传成品图放 `.github/assets/`，功能实图放 `docs/screenshots/`；完整视频素材在视频工作区维护。

真实小说、聊天、账号配置和数据备份始终放在仓库之外。需要作品复现时使用合成样例。从私有分支交付时，基于公开分支挑选目标修改，检查文件与提交历史后再推送。
