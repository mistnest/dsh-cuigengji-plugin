# 适配变更（未发布）

目标：DSH 0.1.7-rc.2 / Node 24 / Windows。

- 前端正式导出 `./client`，构建器使用包名注册模块。
- RPC 独立到 transport，改用 Connection 精确 Fetch route，与宿主 API Gateway 共存。
- 工具动作共用契约；修复 edge.get、Agent 入口未定义 readAction。
- 单独的会话策略与提示词模块，未绑定会话不注入小说 persona。
- Agent 正文新增/更新/恢复/删除受规划批准约束，在存储锁内复核；第三方工具采用允许列表。
- 修复 Windows 目录 fsync 兼容、MCP 重连时旧进程清理竞态。
- 旧项目 JSON 迁移预览、报告、确认导入和同 ID 冲突保护。
- 弹窗提取为独立原生 dialog 组件，支持焦点约束、Escape 和卸载时取消。
- 公共界面接入 DSH locale，继续使用宿主主题变量。
- 增加实际注册工具执行测试和完整 DSH RPC 流程脚本。

旧备份格式保持 v1。未向 npm/GitHub 发布。
