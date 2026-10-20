# 催更姬项目维护

源码在 `src/`；`runtime/`、`lib/client.js` 是提交到 Git 的构建产物，修改源码后运行 `npm run build`。它们用于 DSH 直接安装，不能为了整理目录而移除。真实小说和用户 DSH profile 不属于公开源码或测试样例。

## 公开仓库的内容边界

公开仓库保留正式源码、对应构建产物、安装与使用文档、稳定的架构和贡献指南、测试源码、合成 fixture、构建/验收脚本及 CI。测试报告、失败截图、开发日志、设计草稿、视频工程、渠道申请与账号授权记录只留在私有仓库或本地，不提交到公开分支。

修改公开介绍时，以公开稳定版的实际能力为准；不要把私有开发版的功能、版本号或截图带到公开 README。宣传素材放 `.github/assets/`，功能实图放 `docs/screenshots/`；视频原件和制作过程继续放视频工作区。新增公开文档在 `docs/README.md` 提供入口。

README 的视频区保留少量已发布、与正式版相关的演示和上手教程，更多内容链接 B 站主页。先核实实际发布链接与版本标注，不把本地交付成片当成已发布视频；后续发布新教程时同步检查入口。

从私有开发分支向公开仓库交付时，基于公开分支挑选并检查目标修改，不整体合并私有分支。推送前检查待推送文件和提交历史；整理已公开的过程文档时先在仓库外归档，不重写公开 Git 历史。

## 安装与发布

用户要求“发布更新”“发新版”时，先读 [docs/release-process.md](docs/release-process.md)，使用 `npm run release -- plan/prepare/publish/verify/status`。普通用户安装、更新和数据迁移用 `skills/cuigengji-maintenance/SKILL.md`，不走维护者发布流程。

发布流程保存进度在被 Git 忽略的 `releases/v<版本>/`。GitHub 与 npm 使用同一份验收归档，不能覆盖已公开版本。账号密码、OTP、恢复码和 token 不进入源码、Skill 或发布报告。

本机正式 DSH/profile 与小说工作库不用于发布测试。`scripts/check-release-install.mjs` 使用临时 profile、合成旧库和桌面自带运行时；不要为发布关闭或替换用户的正式 DSH，也不要启动模型连通性测试。用户自行试用界面，发布验收使用脚本。
