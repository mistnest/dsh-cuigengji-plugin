# 催更姬适配验收记录

日期：2026-09-26 至 2026-09-27。环境：Windows、Node 24.15、DSH 0.1.7-rc.2。

## 最新试用版本补充

最新代码已通过 35 项自动测试、构建和 39 次隔离真实 RPC 流程。新版排版及导入界面的浏览器验收尚未完成，下面的浏览器记录属于此前基线，不能代表新版。详见 usage-review.md、presets.md 和 tavern-import.md。

## 此前基线已运行并通过

- `npm test`：24/24，包含 Windows 原子写入、进程锁/CAS、pending 恢复、历史、来源过期、未来信息/视角、legacy converter、真实 stdio MCP、注册后的宿主工具执行、会话策略和提示词隔离。
- `npm run build`、`git diff --check` 通过。
- 本地 tgz 在新 DSH_HOME `D:/deepseek-harness/acceptance-profile-20260926` 安装、卸载和重装成功；重装后再次启动并跑通31次真实 RPC，未认证请求返回401。
- 新 profile 启动真实 DSH Web，独立小说目录。`scripts/rpc-flow.mjs` 31 次认证请求通过：非法 envelope/action/args、小说创建绑定、卷/章节、规划批准、节点/关系、CAS 冲突、history/restore、context、原生备份重复导入、旧格式转换/导入/导出/再次导入、同 ID 冲突拒绝。
- 新 profile 真实浏览器：插件面板加载；弹窗创建小说和章节；编辑保存正文至版本2；保存规划并批准至版本2；刷新后会话/小说绑定及章节版本恢复；检查时无前端 error 日志。
- 原 profile 真实模型：新建“催更姬集成验收会话”，绑定“联调测试小说”；模型读取 binding/context，保存 plan rev1；面板批准 rev2；模型创建“第一章 雨夜来客”rev1（214字符）、角色卡“林素”、屋子设定及“居住”关系，回读确认。章节 ID `759aef5a-6b1d-4c12-9360-affa860b060d`。模型没有请求 shell 或子 Agent。

- 最终包前端启动通过；Escape 和取消按钮均关闭弹窗；深色主题检查定位到 dialog 高度被撑高，已改为 fit-content，真实页面复测高度约150px；窄视口下打开会话、面板及章节正常。

- 日常 profile 重启后通过真实 RPC 再次读取214字正文、2个节点和1条关系；浏览器恢复同一验收会话与小说绑定。

## 解释与偏差

- 计划中的 `/api` rpc.intercept 被实际宿主 API Gateway 占用。实现改为 Connection 精确 Fetch 路由，保持认证、action allowlist 和标准 request/response envelope。
- 当前 section/context provider 为同步接口；小说 Store 异步读取，采用 assemble waterfall 返回新数组，并仅对绑定会话注入内容。
- MCP SDK 1.29 留在独立 stdio 边界，未升级宿主内部 SDK。
- 弹窗采用原生 HTML dialog，样式复用宿主主题变量，卸载时取消 pending 请求。
- 公共导航和按钮已接入 DSH locale，领域表单/业务错误仍为中文；不宣称完整英文翻译。
- `test:live` 仅检查指定 DSH_HOME 的 profile 插件列表，不代表浏览器或模型验收。
- 独立 `tests/ui-smoke.mjs` 使用 Store adapter，不是实际宿主 E2E，本轮没有把它算入上述24项。

## 尚未获得的证据

- 没有用户原个人项目的真实导出：迁移往返使用合成旧格式样本，不能声称真实作品全量迁移已完成。
- 未覆盖其他 DSH/Node 版本、POSIX 或断电硬件场景。
- 工具 guard 是写作流程约束；run_code 使用宿主 PTC 和其 sandbox，不是插件提供的安全隔离。
- 此前基线未发布；本次按用户要求提交并推送 GitHub，未发布 npm。

## 复现

启动隔离 DSH Web 后，将它打印的 token URL 设置为 DSH_URL，再运行 `npm run test:rpc-flow`。此脚本会创建测试小说，请勿使用正式数据目录。

Windows 不支持目录 fsync 时采用明确的 best-effort fallback；文件 flush、pending、rename 和锁仍保留。各类测试证据须分别看待，不能由单元测试推断全部浏览器行为。
