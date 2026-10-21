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
| `src/client/` | 正文、规划、设定、预设与导入导出界面 |
| `src/domain/` | 正文、章节顺序、规划、分组与预设规则 |
| `src/application/` | 作品操作、会话绑定、查询、备份和导入导出 |
| `src/infrastructure/` | 持久化、文件事务与旧数据转换 |
| `src/adapters/`、`src/contracts/` | DSH / MCP 接入及共享契约 |
| `src/desktop/` | Windows透明桌宠窗口及启动脚本 |
| `skills/` | Agent 写作与安装维护指南 |
| `tests/`、`scripts/` | 测试源码、合成样例、构建与验收工具 |
| `docs/`、`.github/` | 使用文档、功能截图、项目展示素材与 CI |

旧 `core`、`mcp`、`assistant` 路径保留兼容转发。源码包含 TypeScript、JavaScript 和 JSX。

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

以上入口通过 `npm run <入口>` 执行，界面脚本需要 Playwright 浏览器。`test:review-ui` 汇总执行主要流程，也可在 `--` 后指定流程名；检查失败需查看对应日志，不只看汇总数量。测试代码与合成 fixture 保留在公开仓库，验收输出和截图存入被忽略的临时目录。

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

真实 RPC 验收使用 `test:rpc` / `test:rpc-flow`，需要独立 DSH 实例与其认证 URL；后者会写入测试作品。`test:live` 只核对已安装文件与版本，不代表界面或模型验证。不要在用户正式 profile、小说目录运行写入测试，不做模型连通性请求。

## 贡献与公开范围

欢迎通过 Issues 描述场景、复现步骤和期望体验。提交修改时保留对应测试与构建产物；新增功能需核对实际操作和宽窄屏布局。

公开仓库保留可运行、可验证的正式代码与必要文档。开发日志、设计草稿、体验审查、实测报告、失败截图、视频工程及渠道申请记录保存在私有仓库或本地。宣传成品图放 `.github/assets/`，功能实图放 `docs/screenshots/`；完整视频素材在视频工作区维护。

真实小说、聊天、账号配置和数据备份始终放在仓库之外。需要作品复现时使用合成样例。从私有分支交付时，基于公开分支挑选目标修改，检查文件与提交历史后再推送。
