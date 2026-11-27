# 通过插件市场更新催更姬

社区市场包名是 `dshmarket`；催更姬包名是 `dsh-cuigengji-plugin`，市场里的链接文字可能显示为 `mistnest/dsh-cuigengji-plugin`。它们是两个独立安装包。

市场安装与更新以**最新版 DSH Desktop 和最新版 dshmarket**为前提。每次验收前核对官方发布和桌面更新源，记录本次精确版本；不维护旧市场或旧宿主的兼容矩阵。催更姬仍需用上一公开版验证升级。

2026-11-16 的验收组合为 Windows 官方桌面包 DSH `0.2.2-rc.3`、市场 `1.73.20`，覆盖催更姬首次安装及 `0.5.1 → 0.6.0` 的 npm、Release、GitHub 来源更新和一次安装失败回滚。版本号是本次验收记录；后续执行时重新核对最新版。

## 正常更新

1. 在市场的“已安装”中检查更新，选择催更姬，等安装操作结束。
2. 保存正在编辑的内容，完整退出 DSH（包括托盘），再重新打开。市场可能先换上新版页面，后台仍使用启动时加载的旧模块；只刷新页面不等于后台已更新。
3. 回到原作品，核对原作品库位置。负责维护的 Agent 再调用 `cuigengji_maintenance` 的 `status` 和 `verify`，确认实际后台版本、原数据根与作品 ID。

无需先卸载催更姬，也无需重新导入作品。安装器显示成功、磁盘包版本正确和后台实际完成更新，需要分别确认。

## 更新时报 already-installed

先确认 DSH 和市场都已更新到最新版，再完整重启并重试。最新版仍出现此错误时，保留市场导出日志和两者版本，检查宿主返回的具体失败原因。不要通过卸载催更姬或清空作品库解决包管理错误。

可交给维护 Agent：

> 请先确认本机 DSH Desktop 和 dshmarket 都为最新版本，记录实际 desktop profile、催更姬原数据根和作品 ID。通过市场更新催更姬，保留插件配置和小说数据。完整退出托盘并重启后，核对 cuigengji_maintenance 的 status/verify、实际后台版本、原作品库位置与作品 ID。如果失败，保留市场导出日志和具体错误，不删除作品库。

不要把桌面端更新装到另一个 `web` profile，不混用系统全局 pnpm，也不为了安装而关闭供应链策略。若遇到等待期或下载失败，应保留具体错误并处理对应下载/策略条件。

## 原来从 GitHub 或成品包安装

市场需要确认原来源与目录中的催更姬对应。当前目录保留仓库身份、npm 映射和固定 Release 成品包地址。npm、Release 包和 GitHub 仓库安装都已在同一隔离宿主中验证可由市场升级；GitHub 源码更新的验收环境包含 Git，npm 与 Release 路径不需要 Git。

本地 `link:` 或 `file:` 开发安装由其工作区维护，不等同于普通市场安装。市场要求确认切换来源时，应核对原仓库与包名后使用它的恢复/迁移入口，不手改依赖声明或删除作品目录。

## 维护者验收

使用最新市场与最新桌面宿主，执行可复用的安装、更新和回滚检查：

```powershell
npm run test:market -- --desktop-exe <DSH可执行文件> --market-version <最新市场精确版本> --expected-dsh-version <最新DSH精确版本> --old-package dsh-cuigengji-plugin@<上一公开版> --target-version <目标公开版> --report test-results/market-update.json
```

- `--mode fresh`：市场首次安装；无需 `--old-package`。
- 默认 `--mode upgrade`：使用旧版实际写入合成作品，通过公开市场的更新路由更新，再重启并比较完整工作库。
- `--mode failed-upgrade`：只对目标替换包定点注入安装失败，核对旧包和完整数据的恢复。
- `--expected-dsh-version`：核对实际载入的桌面宿主就是本次确认的最新精确版本。
- `--old-package` 可使用 npm 精确包名、固定 Release URL 或 GitHub 提交引用；GitHub 测试需要另传 `--with-git`。
- `--keep-on-failure` 保留失败时的临时目录；报告与日志留在被 Git 忽略的目录。

脚本调用公开市场包的实际 HTTP 路由、官方 Desktop 适配器和桌面内置的真实 `pluginManager`。测试宿主通过 CLI 载入临时 profile，并明确使用桌面自带 pnpm；它不操作用户正式桌面窗口，不发送模型请求。通过此项不能替代其他系统、其他宿主版本或所有异常中断路径的验收。

发布时同步核对 npm `latest`、GitHub Release、市场在线目录的 npm 映射和备用成品包 URL。原收录 PR 合并后，新版本需检查并更新当前目录条目，不能把旧 PR 已合并当成本次渠道同步完成。渠道验收需包含“旧用户点击更新后实际运行新版”，不只验证能搜索和首次安装。
