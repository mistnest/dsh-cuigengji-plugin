# 催更姬适配验收记录

## 2026-09-28 项目接手重构

- `npm test`：50/50 通过，覆盖有限接手索引、正文显式读取、预设按需读取、Skill 组合、提示词重组、读操作无存储写入和宿主工具注册。
- `npm run build`、`npx tsc --noEmit`、`git diff --check` 通过。
- `node tests/ui-smoke.mjs`：章节编辑与草稿恢复、资料 CRUD、规划入口、项目接手抽屉桌面/窄屏展示、预设导航和不自动读取正文通过。
- 未验证真实模型自主写作行为；真实 DSH RPC 仍需在隔离实例中运行 `npm run test:rpc-flow`。
- 提示词组装不再读取项目数据；缓存行为需以实际 DSH/模型服务的 usage 统计为准。

日期：2026-09-26 至 2026-09-27。环境：Windows、Node 24.15、DSH 0.1.7-rc.2。

## 2026-09-27 规划板与 UI 调整

- `npm test`：43/43 通过；涵盖实际注册工具/MCP、规划原子事务、临时引用、幂等、CAS、循环检测、子树删除与撤销、历史分页、备份恢复和一次性旧规划迁移。
- 新增删除确认后结构变化的冲突测试、章节删除后历史引用可编辑/备份测试、100 节点/150 关系布局坐标与卡片不重叠检查。
- `npm run build` 通过。
- 独立数据目录 `D:/deepseek-harness/planning-acceptance-20260927`，真实 DSH 3081 服务执行 `test:rpc-flow`：50 次认证请求通过，包含规划 CRUD/关系/CAS/撤销/历史/子树删除恢复、正文图谱、预设、酒馆导入去重及备份迁移往返。
- 本地 tgz 在全新 DSH_HOME `D:/deepseek-harness/planning-package-profile-20260927` 安装并启动成功，独立数据目录再次通过 50 次真实 RPC。随后仅修正前端标签输入与分页一致性检查，补充测试并重新构建打包。
- 2026-09-28：新增规划分页版本一致性测试，当前 43 项通过。
- 当前不自动注入规划，正文无审批门槛；以下旧基线的“批准”属于历史记录。
- 新版 UI、主题、窄屏和键盘尚未完成真实页面验收；浏览器无可用标签页，之前安全拒绝的错误页导航未绕过。不能用测试与构建替代视觉验收。
- 未实测真实模型自主编辑新版规划板。注册工具/MCP 链路测试不等于模型行为测试。

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

## 2026-09-28 UI 精简

公共框架、正文、设定、规划、预设、参考与管理均完成第一轮入口与布局精简。构建、43项现有自动测试和diff检查通过。未做真实浏览器验收，详情和仍未完成的计划项目见 layout-progress.md。
