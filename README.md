# 催更姬（cuigengji）DSH 插件

这是面向 DeepSeek Harness（DSH `0.1.7-rc.2`，兼容 Node 24）的单 Agent 小说工作台插件。它复用 DSH 的会话、模型、技能和右侧栏，只补齐小说正文管理、世界书/角色卡图谱记忆、情节确认和上下文组装。

## 安装

在 DSH 项目目录执行：

```bash
npm install /path/to/dsh-cuigengji-0.1.0.tgz
dsh plugin add dsh-cuigengji
```

开发目录也可以直接安装：

```bash
dsh plugin add /scratch/wangzy/wzy/scalestool_trial_2026-07-24/writing/cuigengji-plugin
```

插件默认把数据写入 `~/.local/share/cuigengji`；可用 `CUIGENGJI_DATA_ROOT` 指定共享目录。多个 DSH 会话通过同一目录共享小说。图谱 MCP 是本地 stdio 子进程，插件负责鉴权、会话隔离、超时和回收。

## 使用约束

1. 在右侧“催更姬”面板创建/选择小说并绑定会话。
2. 先保存情节规划，再由作者在面板点击“确认此版情节”。Agent 才能写入正文。
3. 正文修改必须携带 revision（或使用工具返回的 revision）；冲突不会覆盖另一会话的版本。
4. 世界书、世界条目、角色卡和关系都经过图谱工具维护；章节修改会使依赖旧正文的记忆标为 stale。
5. 插件是单 Agent 设计，绑定会话中会阻止 subagent/delegate 及绕过版本历史的 shell/edit 工具。

## 开发与测试

```bash
source ../env.sh                 # 本机旧 glibc 开发环境需要
npm test                         # Store、MCP、导入转换器
npm run build                    # 生成 lib/client.js
npm pack                         # 生成可安装 tgz
```

`tests/ui-smoke.mjs` 是浏览器级 CRUD/CAS/草稿/关系图测试；需要可运行的 Chromium，并设置 `CHROMIUM_EXECUTABLE`。本机旧 glibc 无法直接运行 Playwright 下载的 Chromium 时，不影响核心和 MCP 测试，详见 `docs/test-report.md`。

## 目录

- `src/core`：持久化图谱、正文、版本历史、上下文选择和旧数据转换。
- `src/mcp`：每会话本地 stdio MCP bridge/server。
- `src/assistant`：中文写作、规划、修订、记忆 skills。
- `src/client`：DSH 右侧工作台。
- `cordis.patch.yml`：将插件注入 DSH host。
