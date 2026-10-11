# 渠道维护与发布流程

本文件记录催更姬长期维护的发布方式。后续维护者和 Agent 以此为入口，再按链接使用现有安装、迁移和发布工具。普通用户看[安装说明](getting-started.md)或把[安装与更新指南](agent-installation.md)交给 Agent。

## 固定发布入口

作者说“发布更新”后，维护 Agent 先汇总这次实际修改，确定递增版本、更新 `package.json` / 锁文件 / `CHANGELOG.md`，构建并提交对应源码和产物，然后执行以下入口。作者不需要自己运行这些命令。

```powershell
npm run release -- plan
npm run release -- prepare --desktop-exe "D:\Apps\DeepSeek Harness\DeepSeek Harness.exe"
npm run release -- publish
npm run release -- status
```

其他电脑传实际 DSH exe 路径，或设置 `CUIGENGJI_DESKTOP_EXE`。这些命令不会更新或关闭正式 DSH，不读真实作品；原生安装测试使用临时 profile 和虚构工作库。

| 命令 | 负责什么 |
| --- | --- |
| `plan` / `status` | 只读检查当前版本、工作树、GitHub Release、npm 精确版本与占位状态、可信发布开关、市场 PR |
| `prepare` | 要求已提交的 main；跑测试、类型检查、构建一致性、实际包审计、桌面无 Git 全新安装与升级；上一稳定版和 v0.4.1 旧名称边界都验证 |
| `publish` | 复用准备好的包；推送提交并等待 CI；建立同提交的版本标签和草稿，核对资产后公开；等待 npm 工作流；下载公开版本并进行原生安装验收，再同步待审核市场条目 |
| `verify` | 不重新打包，补验收公开 GitHub URL / npm 精确版本和升级，恢复中断后的渠道同步 |
| `trust` | 首次通过 npm 官方 2FA 流程配置指定仓库 / 工作流的直接可信发布权限，核对后启用工作流；需要账号持有人的真实验证方式 |

每个版本的安装包、SHA-256、验收 JSON、`release-state.json`、更新公告草稿保存在 `releases/v<版本>/`，由 Git 忽略。状态绑定源提交与已测试归档；源、说明或包字节变化时拒绝继续。失败后先看报告中具体步骤，重跑原命令；同版本不重打包、不覆盖公开资产、不强推标签。并发运行会被锁阻止；已退出进程留下的锁可由脚本恢复。

准备阶段发现代码或验收脚本错误时，先修复并提交，再用 `prepare --reset --desktop-exe <exe>` 重新验收。此选项仅允许尚无 GitHub Release、npm 版本或本地/远端标签的版本；原归档与记录移入本版 `preparation-history/`，不删除。出现任何发布资产后不能重置，公开内容变化须递增版本。

默认完整发布必须已有 npm 可信发布授权。首次授权未完成而作者仍要发布 GitHub 版本时，用 `publish --github-only`，明确记录“GitHub 可用，npm 待完成”；之后用 `verify` 补齐。不得把 `0.0.0-stage` 占位版本、npm 命令返回 0 或只下载成功当作完成。npm 成功须同时核对精确版本、同一份归档、完整性、`latest` / `next` 指向与 DSH 无 Git 原生安装和升级。

市场入口与主发布分开记录：当前工具只更新已授权的收录 PR #7064 中本插件的 `tarball`，保留介绍；PR 已合并或关闭后提示核对公开目录并准备独立条目更新，不自动改其他条目或发送评论。实际市场搜索和点击安装尚未验证时，报告保持“未验证”。

账号首次授权完成后，后续 npm 上传由 GitHub Actions OIDC 处理；不依赖本地 npm 登录 token，也不保存密码或恢复码。首次可信授权必须两天内真实发布一个新版本，才能完成 npm 对仓库的验证。

## 一套源码，同一份成品包

| 维护项 | 固定职责 |
| --- | --- |
| [公开主仓库](https://github.com/mistnest/dsh-cuigengji-plugin) | 维护源码、使用文档、安装与升级指南、兼容范围、更新记录 |
| npm 包 `dsh-cuigengji-plugin` | 首次发布并验收后，作为普通用户首选安装渠道；稳定版 `latest`，预发布版 `next` |
| GitHub Release | 提供与 npm 完全相同的 `.tgz`、`SHA256SUMS`、版本说明和已验证的 DSH 版本 |
| 社区市场 `dshmarket` | 通过 `awesome-dsh-plugin` 维护名称、介绍、安装映射与收录状态；安装目标指向同一发布版本 |
| 仓库内的 Agent 指南 | 指导环境确认、原生安装、自动迁移验收与失败恢复 |

GitHub 仓库、npm 包和市场显示名统一为 **`dsh-cuigengji-plugin`**，中文名为“催更姬”。旧 `dsh-cuigengji` 仅用于识别和迁移历史安装；内部工具、数据目录和稳定条目 ID 不随包名变化。首次跨名称更新按[名称迁移指南](package-name-migration.md)执行。市场贡献用的 fork 只用于提交条目和跟进收录。

`src/` 是维护入口；`runtime/` 与 `lib/client.js` 是构建产物，随源码提交以兼容 GitHub 地址安装。发布前显式构建，不新增 `prepare`、`prepack` 或安装钩子。GitHub 源码 ZIP 不作为用户成品包。

先生成、审计、验收一份 `.tgz`，上传 GitHub Release；npm 发布复用这份归档并核对 SHA-256。不要从另一个工作目录重新打包同版本，也不要替换已经公开的同版本资产。公开内容变化必须递增版本。

## 社区市场

| 市场 | 收录方式 | 发布时核对 |
| --- | --- | --- |
| [dshmarket](https://github.com/dsh-market/dsh-market)，npm 名 `dshmarket` | 向 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提交条目 | PR 是否合并、公开目录是否出现、中文和英文搜索及实际安装 |

收录、可搜索、点击安装成功是不同状态，逐项记录。市场是可选发现入口，用户也能直接通过 DSH 原生插件管理安装。

按作者 2026-10-11 的决定，不再维护 `2BingLing/dsh-market`（`dsh.market` / `@dsh-market/plugin`），不跟进该渠道的索引或安装器，也不把它列为发布验收要求。其他平台自动索引本仓库，不代表本项目已适配或推荐其安装入口。

## 当前待完成事项

以下是 2026-10-11 调研时的状态；每次发布前重新确认，不将历史结果当作当前验收。

- npm 精确版本 `0.4.2` 的无 Git 安装与旧名升级已经验收；本次 `0.4.3` 仍待公开处理和默认标签验收。上传权限已验证，标签更新实际被拒绝，需开启同一可信连接的 `Allow npm dist-tag`。完成前继续使用已公开的 Release 成品包，见 [npm 发布](npm-publishing.md)。
- `dshmarket` 的[收录 PR #7064](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7064)尚未合并；不宣称该市场已经可搜索安装。
- 补充官方插件卡片可读取的中文标题、图标和简短介绍，并在真实插件管理界面核对显示。

npm 首次发布和无 Git 安装验收通过后，再把普通用户安装首选改成包名。已经验收的 Release `.tgz` 保留为备用入口。

上传与公开之间要留出 npm 扫描时间；工作流会等待最多 30 分钟，再核对正式归档和版本标签。已经接受的上传超时后使用 `verify_only=true` 的工作流与 `release verify` 补验收，不重传。可信发布还需要在 npm 包设置中为同一工作流开启独立的 `Allow npm dist-tag` 权限，才能自动维护 `latest` / `next`。

## 每次发布的顺序

### 1. 确定版本和范围

- 汇总本次新功能、体验调整、修复与兼容变化；没有的类别不硬凑。
- 区分本地试用修改与已经公开的版本。更新 `package.json`、锁文件中的本包版本记录（如有）、[更新记录](CHANGELOG.md)和安装指南中的固定版本示例。
- 记录已验证的 DSH 桌面版本与数据布局；兼容声明以实际验收为准。
- 涉及存储变化时，补迁移路径、合成旧库样例、失败恢复和回滚说明。

### 2. 构建并验收

执行[开发与测试说明](development.md)中的基础检查与受影响功能验收，再用 `npm run pack:release` 生成成品包。使用 `scripts/audit-release.mjs` 检查实际归档清单。

使用 `scripts/check-release-install.mjs` 在隔离 Windows profile 中验收：

- 无 Git、无需另装全局 Node.js 的全新安装；只使用桌面自带运行时。
- 从已支持的公开旧版升级，保持 profile 配置与原数据根。
- 维护状态就绪，实际加载版本正确，正文、历史、章节和作品回收站、设定、关系、规划页、批注、预设及绑定保留。
- DSH 原生“添加插件”的成品包入口；npm 发布后补按包名安装；GitHub 地址入口继续验证编译产物和无需构建授权。

自动化验收之外，在隔离 DSH 中按普通用户操作检查入口、首次建书、正文编辑和受影响界面。使用空库或虚构作品，不在用户正式工作库做写入测试，不调用模型连通性测试。

### 3. 发布同一份安装包

- 提交源码、对应构建产物与文档，建立与包版本相同的 `v<版本>` 标签。
- 上传已验收的 `.tgz` 和 `SHA256SUMS`，发布说明包含用户收益、宿主兼容范围、安装入口及数据迁移要求。
- 按 [npm 发布指南](npm-publishing.md)复用 Release 归档发布 npm。首次发布和 trusted publisher 配置完成后，由 `publish-npm.yml` 执行后续发布与哈希核对。
- 下载公开资产，再验收真实 URL 和 npm 精确版本。检查镜像同步及宿主供应链策略；下载或策略检查未通过时记录诊断，不放宽用户的保护设置。
- 同步市场条目并核对实际搜索与安装。尚未验收的渠道单独标明，不影响已通过的渠道。
- 公开安装路径通过后再发布公告；公告只写本次实际更新、用户收益及可用安装方式。

### 4. 用户升级由 Agent 接手

Agent 使用[安装与更新指南](agent-installation.md)确认用户当前 DSH/profile、配置、数据根和作品清单，取得固定版本成品包，再调用宿主原生安装服务。旧包名更新先运行[名称迁移工具](package-name-migration.md)，不同时启用两个包。下载成功、磁盘包更新和当前进程加载新版分别核对。

按宿主返回结果完成必要重启。插件加载阶段自动建立升级前快照、恢复事务、迁移并校验；Agent 在重启后通过 `cuigengji_maintenance` 确认 `status.status=ready`、`verify.verified=true`、目标版本和原作品保留，再报告完成。正常用户不需要手改 JSON/YAML、移动作品文件或运行迁移命令。

迁移工具和恢复路径沿用[更新与数据迁移](upgrade.md)。回退代码包不等于回退数据格式；恢复前保留升级后新写入的内容，在独立恢复目录校验旧包与快照。

## 安装与更新能力的边界

安装、依赖管理与重启状态优先复用 DSH。插件负责自己的备份、迁移、完整性校验和写作体验。

截至上述调研，官方第三方插件管理界面尚无统一更新按钮。每次宿主适配时重新核对能力；当前提供可交给 Agent 的更新指南，不要求用户自行卸载、重装或排查受管 profile。未来增加检查更新入口时，先复用宿主或市场已有服务。

公开仓库和安装包只含代码、公共文档与合成测试样例。真实小说、聊天、账号配置、导出文件和迁移备份留在仓库之外；发布审计检查的是实际归档。

## 官方与社区参考

- [官方插件开发入门](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/)
- [官方打包与安装](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish.html)
- [官方插件管理与当前限制](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-plugin-manager/README.zh.md)
- [官方插件标题、说明与图标](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-package.zh.md)
- [dsh-context](https://github.com/bowenliang123/dsh-context)：桌面包名安装与入口说明。
- [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)：Agent 安装指令、宿主版本对应与旧设置迁移。
- [dsh-im 更新说明](https://github.com/xmanrui/dsh-im/blob/main/docs/检查与安装更新.md)：保留配置并核对实际运行版本。

这些参考用于比较文档和发布流程；对应插件的全部安装路径未在本项目中逐一实装验收。
