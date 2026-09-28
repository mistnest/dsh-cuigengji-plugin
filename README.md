# 催更姬（cuigengji）DSH 插件

这是面向 DeepSeek Harness（DSH 0.1.7-rc.2，Node 24）的小说工作台插件。它复用 DSH 的会话、模型、技能和右侧栏，提供小说正文、世界书/角色卡图谱、协同故事规划、版本控制和按需项目接手。

## 试用状态

当前提供试用版本。最新构建、50 项自动测试和浏览器工作台烟测通过；真实 DSH RPC 流程仍需使用隔离实例验收。酒馆格式兼容范围见文末说明。

## 安装

桌面版是当前主力运行方式。桌面端仍复用 DSH 的 Web client manifest，但插件要安装到 Electron 管理的 `desktop` profile；不要用 CLI 直接管理名为 `desktop` 的 profile。

在官方 DSH 源码目录构建并启动桌面版：

~~~powershell
cd D:\deepseek-harness\dsh-upstream
pnpm install --frozen-lockfile
pnpm run build:official
pnpm run build:desktop
$env:DSH_HOME = 'D:\deepseek-harness\dsh-desktop\home'
$env:DSH_DESKTOP_USER_DATA_DIR = 'D:\deepseek-harness\dsh-desktop\electron-user-data'
$env:CUIGENGJI_DATA_ROOT = 'D:\deepseek-harness\dsh-desktop\cuigengji-data'
pnpm run start:desktop
~~~

桌面端首次启动后，在另一个终端把插件安装到 Electron 的桌面 profile：

~~~powershell
cd D:\deepseek-harness\dsh-desktop\home\profiles\desktop
pnpm add D:\deepseek-harness\cuigengji-plugin\dsh-cuigengji-0.1.0.tgz
~~~

然后将 `dsh-cuigengji` 加入该 profile 的 `dsh.profile.bundles`，重启桌面端。开发时每次源码或前端 bundle 更新后重新 `npm run build`、`npm pack`，再安装新的 tgz。

如果仍使用浏览器版，选择要安装的 DSH profile。默认使用 web：

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
2. 在“规划”中整理长期方向、阶段和场景。作者与 AI 均可读取修改；规划通过工具按需获取，不自动装填，也不再要求批准后才能写正文。
3. 正文修改必须携带 revision；冲突不会覆盖另一会话的版本。
4. 世界书、世界条目、角色卡和关系都经过图谱工具维护；章节修改会使依赖旧正文的记忆标为 stale。

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

`npm run test:rpc-flow` 在真实 DSH 上执行 50 次请求，覆盖正文/规划/图谱/历史/冲突/迁移。它会创建测试小说，请用独立 DSH_HOME 和 CUIGENGJI_DATA_ROOT 启动验收实例，不要对正式作品目录运行。

## 兼容与适配边界

| 项目 | 当前支持与实现 |
| --- | --- |
| DSH | 0.1.7-rc.2，其他版本尚未验收 |
| Node / 系统 | Node 24 / Windows 已验收；POSIX 未在本轮运行 |
| RPC | Connection 精确 Fetch 路由 `/api/cuigengji/dispatch`；沿用宿主认证和 RPC envelope |
| 提示词 | 异步 assemble waterfall，仅绑定会话加入 persona 和小说资料；当前 section/context provider 为同步接口 |
| MCP | 独立 SDK 1.29 stdio 子进程，以协议边界与 DSH SDK 隔离 |
| 本地化 | 宿主标题与对话框接入 DSH locale；新版工作台主要为中文 |

绑定小说只约束催更姬的数据访问范围。DSH 的其它工具和 Agent 能力仍由宿主设置管理；通过 shell 或文件工具直接修改插件数据目录会绕过版本历史与审计，建议使用催更姬工具维护作品内容。

## 备份、迁移与排错

- 作品与备份中的“下载完整备份”使用格式 v2，保留正文历史、revision、hash、图谱、预设和规划事务；仍可导入 v1。相同备份重复导入不重复创建，同 ID 不同内容拒绝覆盖。
- “迁移旧项目 JSON”要求导出中含正文，先展示卷/章/节点/关系数量和警告，再确认导入。只含路径的项目应先从原项目导出正文；模型密钥和运行时配置不迁移，preset 请从“写作预设”单独导入并核对兼容限制。旧设定标记为未确认。
- 未认证或 token 过期：重新打开当前终端打印的完整 URL。
- 405：确认已安装新宿主代码并重启，前端 bundle 指向 `/api/cuigengji/dispatch`。
- 版本冲突：保留草稿，读取最新正文后比较；不要改 revision 强行覆盖。
- 规划冲突：保留草稿，比较远端版本并手动合并；删除子树前重新核对范围。旧 plan.* 接口已停用，改用 planning.*。
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
- 写作预设：作品菜单 → 写作预设；支持文本条目导入、排序、开关和有效文本预览，兼容限制见 [预设说明](docs/presets.md)。


## Agent 接手与按需读取

Agent 的系统提示词保持稳定，只提供写作助手职责和工具使用方式。需要接手项目时，Agent 通过 `novel.handoff` 按需获取作品身份、当前任务、有限章节元数据索引和资料入口；不自动附加章节正文、预设全文、规划内容或图谱条目。章节索引默认列最近 20 章，并额外列出当前参考章；作品简介最多提供 500 字。

Agent 按任务加载 `cuigengji-project` 和对应的写作、修订、规划或记忆 Skill，再调用独立工具读取内容：正文用 `chapter.get`，启用预设用 `preset.read`，规划用 `planning.list/search/get`，人物和世界资料用 `graph.list/get` 与 `edge.list/get`。读取范围遵循正文、预设、规划、相关设定的默认顺序，不全量读取作品。

正文是已发生事件的连续性依据；预设约束表达方式；规划描述未来意图；图谱资料按场景检索并核对来源、状态和知情范围。此顺序指导取材，不允许规划或设定覆盖正文事实。

`context.get` 不带章节参数时不会隐式返回正文。面板参考预览显式请求章节内容；`nodeIds` 可用于按需读取通过知情范围检查的设定。预览展示当前数据，不代表上一轮模型实际读取记录。

## 协同规划与新版工作台

主导航为正文、规划、资料；预设和作品管理收在作品菜单，AI 参考作为编辑器抽屉打开。规划模型、事务、画布和视图状态分开维护，详见 [规划使用与接口](docs/planning-board.md)。最新验证范围见 [验收记录](docs/test-report.md)。
