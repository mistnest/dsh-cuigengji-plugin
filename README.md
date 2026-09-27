# 催更姬（cuigengji）DSH 插件

这是面向 DeepSeek Harness（DSH 0.1.7-rc.2，Node 24）的单 Agent 小说工作台插件。它复用 DSH 的会话、模型、技能和右侧栏，提供小说正文、世界书/角色卡图谱、情节确认、版本控制和上下文组装。

## 试用状态

当前提供试用版本。最新构建、35 项自动测试及 39 次真实 DSH RPC 验收通过；新版布局、酒馆文件选择与预设界面尚未完成浏览器交互验收。酒馆格式兼容范围见文末说明。

## 安装

先选择要安装的 DSH profile。默认使用 web：

~~~powershell
dsh plugin --profile web add D:\path\dsh-cuigengji-0.1.0.tgz
dsh web
~~~

开发目录可以直接 link：

~~~powershell
dsh plugin --profile web add D:\deepseek-harness\cuigengji-plugin
dsh web
~~~

更新或卸载：

~~~powershell
dsh plugin --profile web update dsh-cuigengji
dsh plugin --profile web remove dsh-cuigengji
~~~

开发目录需要先生成前端 bundle：

~~~powershell
npm install
npm run build
~~~

本机可双击 `D:\deepseek-harness\start-dsh.cmd` 启动。保持终端窗口开启，在浏览器使用终端打印的 URL；关闭终端会停止服务。认证 token 每次启动变化。

本地包升级：退出 DSH，重新 `npm pack`，再用 `plugin --profile web add <新 tgz 路径>` 安装并重启。回滚时安装之前保存的 tgz。开发 link 修改宿主源码后需要重启，修改前端后先 build 再刷新页面。

插件的包清单必须导出 ./client；否则 DSH client module loader 会拒绝加载前端。

## 数据目录

多个 DSH 会话通过同一目录共享小说。可用 CUIGENGJI_DATA_ROOT 指定目录。

Windows 默认目录：`%LOCALAPPDATA%\cuigengji`
POSIX 默认目录：`$XDG_DATA_HOME/cuigengji`，未设置时为 `~/.local/share/cuigengji`

~~~powershell
$env:CUIGENGJI_DATA_ROOT = 'D:\cuigengji-data'
dsh web
~~~

图谱 MCP 是本地 stdio 子进程，插件负责 loopback 鉴权、会话隔离、超时和回收。

## 使用约束

1. 在右侧“催更姬”面板创建或选择小说，并绑定当前会话。
2. 先保存情节规划，再由作者点击“确认此版情节”。Agent 才能写入正文。
3. 正文修改必须携带 revision；冲突不会覆盖另一会话的版本。
4. 世界书、世界条目、角色卡和关系都经过图谱工具维护；章节修改会使依赖旧正文的记忆标为 stale。
5. 插件是单 Agent 设计，绑定会话中会阻止 subagent/delegate 及绕过版本历史的 shell/edit 工具。

## 开发与测试

~~~powershell
npm test
npm run build
npm pack
~~~

npm test 覆盖 Store、MCP、导入转换器、宿主工具执行和 Windows 持久化。npm run test:live 检查当前 DSH_HOME 的 web profile 是否包含插件。

真实 DSH RPC smoke 需要先启动 dsh web，并把打印出的带 token URL 放入 DSH_URL：

~~~powershell
$env:DSH_URL = 'http://127.0.0.1:3080/?token=...'
npm run test:rpc
~~~

test:rpc 会完成浏览器 token exchange，并验证 /api/cuigengji/dispatch 的 DSH request/response envelope。独立 tests/ui-smoke.mjs 只验证 Workbench 组件和 Store mock；真实宿主链路以 test:rpc 和 Web E2E 为准。

`npm run test:rpc-flow` 在真实 DSH 上执行 39 次请求，覆盖正文/规划/图谱/历史/冲突/迁移。它会创建测试小说，请用独立 DSH_HOME 和 CUIGENGJI_DATA_ROOT 启动验收实例，不要对正式作品目录运行。

## 兼容与适配边界

| 项目 | 当前支持与实现 |
| --- | --- |
| DSH | 0.1.7-rc.2，其他版本尚未验收 |
| Node / 系统 | Node 24 / Windows 已验收；POSIX 未在本轮运行 |
| RPC | Connection 精确 Fetch 路由 `/api/cuigengji/dispatch`；沿用宿主认证和 RPC envelope |
| 提示词 | 异步 assemble waterfall，仅绑定会话加入 persona 和小说资料；当前 section/context provider 为同步接口 |
| MCP | 独立 SDK 1.29 stdio 子进程，以协议边界与 DSH SDK 隔离 |
| 本地化 | 宿主标题与对话框接入 DSH locale；新版工作台主要为中文 |

绑定小说会话采用工具允许列表；新的第三方工具默认禁用。`run_code` 作为 DSH PTC 调用入口保留，内部工具仍经过宿主 guard。这是写作流程约束，不是操作系统安全沙箱。

## 备份、迁移与排错

- 小说管理中的“导出含历史的备份”保留正文历史、revision、hash 和图谱关系。相同备份重复导入不重复创建，同 ID 不同内容拒绝覆盖。
- “迁移旧项目 JSON”要求导出中含正文，先展示卷/章/节点/关系数量和警告，再确认导入。只含路径的项目应先从原项目导出正文；模型密钥和运行时配置不迁移，preset 请从“写作预设”单独导入并核对兼容限制。旧设定标记为未确认。
- 未认证或 token 过期：重新打开当前终端打印的完整 URL。
- 405：确认已安装新宿主代码并重启，前端 bundle 指向 `/api/cuigengji/dispatch`。
- 版本冲突：保留草稿，读取最新正文后比较；不要改 revision 强行覆盖。
- `PLAN_APPROVAL_REQUIRED`：在面板保存并确认最新规划。修改规划会撤销批准；Agent 不能自行批准。
- 数据整体备份：停止 DSH 后复制数据目录；恢复时保留原目录副本并在停机状态下替换。审计文件位于数据目录 `audit`。

## 目录

- src/core：持久化图谱、正文、版本历史、上下文选择和旧数据转换。
- src/mcp：每会话本地 stdio MCP bridge/server。
- src/assistant：中文写作、规划、修订、记忆 skills 和 DSH prompt adapter。
- src/client：DSH 右侧工作台。
- scripts：前端构建、profile smoke 和 RPC smoke。
- cordis.patch.yml：将插件注入 DSH host。


## 酒馆资料与写作预设

- 世界书、角色卡：设定 → 导入酒馆角色卡 / 世界书；支持范围见 [导入说明](docs/tavern-import.md)。
- 写作预设：作品名称旁 ··· → 写作预设；支持文本条目导入、排序、开关和实际注入预览，兼容限制见 [预设说明](docs/presets.md)。
