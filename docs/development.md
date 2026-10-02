# 开发、测试与公开发布

当前插件版本 0.3.12，Node.js 24+，DSH 兼容基线 0.2.0-rc.2。源码同时包含 TypeScript、JavaScript 和 JSX，尚未完成全部模块的 TypeScript 迁移。

## 模块与构建

- `src/client/features`：正文、规划、设定、预设与工作数据界面。
- `src/domain`：规划、分组、预设与正文规则。
- `src/application`：作品操作、会话绑定、查询和备份。
- `src/infrastructure`：持久化及旧数据转换。
- `src/adapters`：DSH 和 MCP 接入。
- `src/contracts`：共享契约；`skills`：写作助手协作指南。
- 旧 `core`、`mcp`、`assistant` 入口保留兼容转发。

`npm run build` 生成 `lib/client.js` 和服务端 `runtime/`。Node 不直接运行安装包中的 TypeScript，因此发布前必须重新构建。完整模块关系见[架构说明](architecture.md)。

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run test:ui
npm pack
```

`npm pack` 自动执行类型检查与构建。`test:ui` 使用真实 Workbench 和隔离临时 Store；图、目录、预设和页面交互还分别有 `test:graph`、`test:directory`、`test:presets` 和 `test:pages`。单独看前端可以运行 `npm run preview:workbench`。

DSH 内的真实 RPC 验收用 `test:rpc` / `test:rpc-flow`，需要独立 DSH 实例及其认证 URL；后者会创建测试作品。不要在正式小说目录运行写入验收。`test:live` 只检查 desktop profile 的安装版本和文件，不代表浏览器与模型行为验证。

Windows 桌面更新请参考[安装说明](getting-started.md)。桌面内置 Electron Node 与普通 Node 的子进程环境不同，涉及 MCP 的修改还应通过桌面运行时检查。

## 小说数据与源码分离

公开仓库是 `https://github.com/mistnest/dsh-cuigengji-plugin`，只发布代码、公共文档与合成测试样例。真实小说、设定、导出包、操作日志、聊天记录和个人环境备份保存在仓库之外。

根目录下的 `test-data`、`novel-data`、`data`、`backups`、`migration` 和 `releases` 被忽略，`*.cuigengji.json` 导出文件也被忽略。这是防误提交措施；已经被 Git 跟踪的文件仍需从索引移除，忽略规则不会抹掉提交历史。

从包含个人作品的私有分支发布时，应基于公开分支生成仅含源码的提交，不合并私人数据提交。推送前检查待推送的文件与历史，打包时确认没有小说和凭据。需要带作品复现问题时，使用脱离原作的合成样例。

## 贡献

欢迎在 Issues 里描述写作场景、复现步骤和期望体验。截图、日志和备份请先移除私人正文、设定、聊天和账号信息。涉及持久化、导入导出或协作冲突的修改，需要验证旧数据兼容与备份往返；前端修改应实际检查操作与布局。

[MIT 许可证](../LICENSE)适用于仓库源码，不授权使用他人的小说或导入资料。
