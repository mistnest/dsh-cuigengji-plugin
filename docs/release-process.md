# 维护者发布流程

普通用户使用[安装说明](getting-started.md)或[Agent 安装与更新指南](agent-installation.md)。本文说明维护者如何交付可安装、可升级的正式版本，具体构建与测试见[开发说明](development.md)。

## 固定入口

确定版本范围，更新包版本、锁文件、[更新记录](CHANGELOG.md)和安装指南中的版本示例；构建并提交源码、产物与文档后，在公开 `main` 执行：

```powershell
npm run release -- plan
npm run release -- prepare --desktop-exe "C:\DSH\DeepSeek Harness.exe"
npm run release -- publish
npm run release -- status
```

将路径换成实际 DSH exe，或设置 `CUIGENGJI_DESKTOP_EXE`。跨宿主升级另传 `--old-desktop-exe <旧版exe>`，或设置 `CUIGENGJI_PREVIOUS_DESKTOP_EXE`。工具使用临时 profile、合成作品及桌面自带运行时，不替换用户的正式 DSH。

| 命令 | 作用 |
| --- | --- |
| `plan` / `status` | 检查版本、工作树、GitHub / npm 及渠道状态 |
| `prepare` | 要求已提交的 main，执行测试、构建一致性、包审计、新宿主工作台、无 Git 安装及升级验收 |
| `publish` | 发布已验收的同一份包，等待 CI / npm，并核对公开下载与安装结果 |
| `verify` | 复用原包，补验收公开 URL、npm 和中断的渠道同步 |
| `trust` | 首次配置 npm 官方可信发布；需要账号持有人完成身份验证 |

## 一份包，多个入口

| 渠道 | 维护内容 |
| --- | --- |
| [公开仓库](https://github.com/mistnest/dsh-cuigengji-plugin) | 正式源码、编译产物、使用文档、兼容范围与更新记录 |
| npm `dsh-cuigengji-plugin` | 稳定版 `latest`，预发布版 `next` |
| GitHub Release | 与 npm 字节一致的 `.tgz`、`SHA256SUMS`、说明及实际验收的 DSH 版本 |
| 社区 `dshmarket` | 通过 `awesome-dsh-plugin` 维护名称、介绍与安装映射；单独核对收录、搜索和安装状态 |
| 仓库 Agent 指南 | 环境确认、原生安装、迁移验收与失败恢复 |

仓库、npm 包和市场显示名统一为 `dsh-cuigengji-plugin`，中文名“催更姬”；旧 `dsh-cuigengji` 仅用于[历史安装迁移](package-name-migration.md)。不维护 `2BingLing/dsh-market` 安装渠道。

普通用户安装指南给出已验收的精确版本，例如 `dsh-cuigengji-plugin@0.6.0`，同时保留 Release `.tgz` 备用入口。宿主可能为不带版本的包名选择旧版，不能仅凭 npm `latest` 判断实际安装版本。GitHub 仓库地址继续兼容；源码 ZIP 不作为用户成品包。

`src/` 对应的 `runtime/` 与 `lib/client.js` 必须提交。显式构建并验收一份 `.tgz`，GitHub 和 npm 复用它；不从另一工作区重打同版本包，不覆盖公开资产、版本或标签。公开安装包内容变化必须递增版本。

## 验收要求

1. 通过 `npm test`、类型检查、构建一致性和受影响功能检查；用 `scripts/audit-release.mjs` 审计实际包清单。
2. 在目标 DSH 实际启动工作台，验证入口、建书、正文保存、规划、设定、预设及工具注册，不只检查兼容声明。
3. 使用桌面内置运行时，在无 Git 环境验收新安装、上一稳定版升级与旧包名迁移，核对配置、数据根和完整逻辑工作库保留。
4. 发布后下载公开 `.tgz`，核对 SHA-256；验收 npm 精确版本、归档、完整性、标签及原生安装。镜像、策略或渠道未通过时记录具体状态，不放宽用户的保护设置。
5. 市场收录、可搜索、点击安装分别确认。尚未验证的渠道写明状态，不把自动检查通过当作收录或安装成功。

`engines.dsh` 和宿主 peer 依赖表达最低要求，允许后续版本安装；开发依赖固定实际验收版本。未来版本范围测试不算真实宿主验收。宿主接口变化时做能力检测或局部降级；核心读写或数据完整性无法保证时应明确报错。

涉及数据变化时补迁移、备份和中断恢复路径。插件加载阶段自动备份、恢复、迁移并校验，升级 Agent 在重启后通过 `cuigengji_maintenance` 确认 `status.status=ready`、`verify.verified=true`、目标版本及原作品保留。回退代码不等于回退数据格式，恢复前保留升级后的新内容。

## 中断恢复与发布记录

每版安装包、验收 JSON、更新公告草稿和 `release-state.json` 存在被 Git 忽略的 `releases/v<版本>/`。状态绑定源提交和包字节；失败后查看报告，重跑原命令，不重新生成已公开版本。并发发布由锁阻止。

准备阶段修复问题后，可提交修改并运行 `prepare --reset --desktop-exe <exe>`。只有不存在 GitHub Release、npm 版本和本地/远端标签时才能重置，原记录会归档到 `preparation-history/`；已有公开资产必须递增版本。

npm 上传由 `.github/workflows/publish-npm.yml` 的 OIDC 可信发布完成，不依赖本地长期 token。首次授权用 `trust`；授权未完成而需要先交付 GitHub 时，用 `publish --github-only`，明确记录 npm 待完成，随后通过 `verify` 补齐。npm 扫描延迟用 `verify_only=true` 的工作流复查，不重复上传。

账号密码、验证码、恢复码、token 及个人环境记录不进入仓库或发布报告。开发过程、授权流水和渠道申请草稿保存在私有仓库或本地；公开发布说明只写本版变化、用户收益、兼容范围和可用安装入口。
