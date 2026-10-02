# 公开版验收说明

日期：2026-10-02。源码版本 0.3.12，宿主基线 DSH 0.2.0-rc.2 / Node 24 / Windows。

## 本次实际执行

- 全新公开源码检出目录中 `npm ci` 完成。
- `npm test`：89/89 通过，包括 Store、规划事务、页面、预设、导入转换、工作数据往返与真实 stdio MCP。
- `npm run typecheck`、`npm run build` 通过。
- `npm run test:ui`：真实 Workbench + 临时 Store 的浏览器检查通过，覆盖正文自动保存与远端同步、富文本复制、连续情节规划、设定与关系维护、分组筛选、草稿恢复、预设入口以及工作数据导入导出。
- `npm pack` 完成，安装包包含许可证，文件清单不包含小说工作数据、个人导出或账号配置。
- Windows 安装脚本语法解析通过；没有在本次验收中重新安装或中断日常 DSH。
- 已检查公开文件列表、私人作品名称与常见密钥特征；本次同步不合并私人数据分支历史。

这些测试只使用合成测试作品和隔离目录，不读取作者的日常小说。

## 既有验证范围

此前迭代还分别检查过多页规划与批注、拖拽与连线、目录关闭区域、蓝色主题、下拉与常驻入口、酒馆资料和预设导入。复现脚本位于 `tests/ui-*.mjs`，本次没有重复运行全部专项界面脚本。

工具测试不等于 AI 在所有写作任务中都会自主正确选用工具。真实宿主 RPC、桌面重启后的界面和模型使用体验需要分别验收；本次没有重新启动桌面应用或调用模型，也不宣称任意未来 DSH 版本兼容。

## 复现

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run test:ui
npm pack
```

专项交互对应 `test:graph`、`test:pages`、`test:directory` 和 `test:presets`。真实 RPC 回归请用独立 DSH 实例及小说数据目录运行 `test:rpc-flow`，该脚本会创建测试作品。
