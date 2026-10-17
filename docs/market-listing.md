# 插件市场展示与维护

催更姬的市场条目通过 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 目录提交，由 [dshmarket](https://github.com/dsh-market/dsh-market)（npm 包名 `dshmarket`）使用该目录展示。提交成功不代表已经收录，需要目录维护者审核并合并；收录规则以其 [contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md) 为准。

按作者 2026-10-11 的决定，不再维护另一个 `2BingLing/dsh-market`（`dsh.market` / `@dsh-market/plugin`）渠道。它自动索引到本仓库不代表其安装器已经通过本项目验收。

首次收录申请：[PR #7064](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7064)。审核、合并与反馈以该页面的实际状态为准。

## 条目

提交 `data/plugins/mistnest__dsh-cuigengji-plugin.yml`，仅改这一个条目，不手工修改目录仓库的 README：

```yaml
url: https://github.com/mistnest/dsh-cuigengji-plugin
name: dsh-cuigengji-plugin
category: ui
description:
  en: A fiction-writing workbench for DSH with chapter editing, shared plot canvases, grouped character and world settings, writing presets, and scoped import/export for author-agent collaboration.
  zh: 催更姬：DSH 小说写作工作台，支持章节编辑、共享剧情画布、人物与世界设定分组、写作预设和按范围导入导出，供作者与 AI 一起讨论和推进故事。
tarball: https://github.com/mistnest/dsh-cuigengji-plugin/releases/download/v0.4.3/dsh-cuigengji-plugin-0.4.3.tgz
```

市场显示名统一为 `dsh-cuigengji-plugin`，中文介绍保留“催更姬”，便于按英文名称或中文名称查找。条目文件名和仓库地址仍用于识别作者与项目，不随显示名修改。

仓库保留 `dsh-plugin`、`deepseek-harness`、`cuigengji` 等主题标签，供市场与 Agent 检索。最低宿主要求以 `package.json` 为准，Release 单独列明实际验收版本，未来版本默认允许安装。npm 包名也统一为 `dsh-cuigengji-plugin`，首次发布与安装验收通过后再将包名入口标为可用；成品包仍使用固定版本 Release 地址。用户界面标题保持“催更姬”，英文安装名在全部渠道一致。

## 收录验收

1. 确认收录 PR 已合并，再核对公开 `https://awesome-dsh-plugin.com/plugins.json` 中的名称、仓库地址与 `tarball`。PR 检查通过不等于已经上架。
2. 在 `dshmarket` 内分别搜索 `dsh-cuigengji-plugin`、`cuigengji` 和 `催更姬`，确认结果指向同一仓库。
3. 从该条目完成安装，确认使用公开 Release 成品包，随后重启并打开催更姬核对版本和作品数据。成品包的直接安装验收不能替代市场入口验收。

如果 PR 尚未合并或公开目录尚未更新，记录“待收录”，不能宣称用户已经能通过市场搜索和安装。此时可以使用 Release 成品包经 DSH 的“添加插件”入口安装，步骤见 `agent-installation.md`。

## 展示图与介绍

根目录 `screenshots.json` 声明正文、规划、设定的展示顺序。图片位于 `docs/screenshots/`，README 使用同一组图片，B 站演示与作者联系方式也从 README 进入。

需要更新截图时运行：

```powershell
node scripts/capture-market-screenshots.mjs
```

脚本使用正式 Workbench 和临时 Store，生成专用虚构演示作品，不读取本机 DSH profile 或任何真实小说。图片中的蓝色标题与边框是展示排版，内部工作台使用正式组件；不伪造模型回复。替换截图后检查画布文字与连线是否完整、界面版本是否与截图一致，再提交本仓库。

视频制作的源素材与流程继续放在 `D:\up视频`，插件仓库只保存这组市场展示图和链接。

## 后续发版

1. 完成 Release 成品包、校验文件、Agent 安装指南与升级验证。
2. 向目录提交本条目 `tarball` 的新版本链接；带版本文件名使用固定标签，不写 `latest/download/旧版本文件名`。
3. 更新受影响的展示图，功能未变化的图片不必重新做。
4. 完整安装与迁移步骤仍链接 `agent-installation.md` 与 `upgrade.md`。评论用于具体使用问题，更新说明由 Release 和 `docs/CHANGELOG.md` 维护。

任何时候都不把私人小说、聊天、模型密钥或迁移备份作为宣传素材提交。
