# 外部 Agent 自主查阅

外部助手通过标准 **stdio MCP** 访问作者选定的作品。只读模块可以查询已保存的内容；授予读写的模块还可按任务要求直接保存。正文写入会生成章节历史版本，作者可在工作台比较和恢复。

这是一项可选连接。平时在 DSH 内写作不需要配置它；它不创建写手角色或调度管线，也不改变现有 DSH 工具名字。

## 创建与连接

1. 进入「设置 → AI 与写作 → MCP 连接管理」，新建长期连接，选择指定小说（可多选）或整个作品库。
2. 分别设置正文、设定、规划、创作记忆的「无权限 / 只读 / 读写」。在「客户端配置」中复制到外部客户端。
3. 保持这个 DSH profile 和插件运行，在客户端重新加载 MCP。

例如，标准客户端的 JSON 配置结构如下。**路径使用设置中生成的实际值**，不要照抄示例路径。

```json
{
  "mcpServers": {
    "cg_read_example": {
      "command": "node",
      "args": [
        "C:/插件目录/runtime/adapters/mcp/external-server.js",
        "--connection",
        "C:/外部连接目录/connections/连接ID.json"
      ]
    }
  }
}
```

需要 Node.js 24+；已安装的包也提供 `cuigengji-mcp --connection <连接文件>` 命令。连接文件可通过环境变量 `CUIGENGJI_MCP_CONNECTION` 指定。桌面 DSH 生成的配置可能使用自带的可执行文件并附带 `ELECTRON_RUN_AS_NODE=1`，可直接沿用，不必另装 Node。

不同客户端的配置位置或命令行语法不同：支持 stdio 的反重力等客户端填写同一组 command、args 和 env 即可。连接文件属于此台电脑和此 DSH profile，不能复制到另一台电脑使用。

stdio 适配器通过仅监听 `127.0.0.1` 的专用桥接访问宿主。该内部 HTTP 地址**不是标准 HTTP MCP endpoint**，不要将它当作远程 MCP URL。DSH 重启会更新连接文件中的地址；适配器每次调用重新读取，不依赖固定端口。

## 可以分给 Agent 的模块

| 模块 | 对外工具 | 返回内容 |
| --- | --- | --- |
| 作品定位（有可读模块时） | `cuigengji_novel_list/get` | 作品 ID、基本信息和数量 |
| 正文与目录 | `cuigengji_novel_handoff`、`cuigengji_volume_list`、`cuigengji_chapter_list/search/get` | 有序目录、原文搜索、当前正文与版本 |
| 人物与世界设定 | `cuigengji_graph_list/get/groups`、`cuigengji_edge_list/get` | 名称/别名检索、当前卡片、文件夹和直接关系 |
| 剧情规划 | `cuigengji_planning_pages/groups/list/search/get` | 画布、节点正文与状态、父子结构、前后邻居和关联设定摘要 |
| 写作指引与创作记忆 | `cuigengji_guidance_read`、`cuigengji_creativeMemory_read`、`cuigengji_preset_read` | 基础规则、作品当前的创作记忆、旧预设兼容查询 |

已定位资料 ID 时，可以用 `cuigengji_context_readMany` 一次读取同一作品的章节、设定和规划。比如 `{"novelId":"作品ID","items":[{"kind":"chapter","id":"上一章ID"},{"kind":"setting","id":"人物ID"},{"kind":"planning","id":"本幕ID"}]}`。每批 1–12 项，返回原文片段；各项分享 48,000 个 UTF-16 单位的正文预算，默认每项至多约 12,000，保留完整代理对。单项未找到或版本过期会标明错误；续读用 `start:nextStart` 和 `expectedRevision:revision`，其中 `revision` 取自上一页。有一项超出模块授权时整批拒绝。

每个连接独立选择作品与模块。作品列表和搜索只显示授权范围内的作品。规划详情中的关联设定摘要需要设定权限。配图、剧情变量、旧稿和回收站不在本次外部工具包内。

长期连接沿用独立的 `cg_read_…` 配置名，同一客户端可以保存多个连接。修改模块权限和作品范围后继续使用原来的配置。

**读写授权**按模块开放正式保存。正文支持 `chapter.create/update`，设定支持 `graph.create/update/updateMany`，规划支持在 `planning.apply` 中新建或修改情节卡，创作记忆支持 `creativeMemory.update`。所有写入都传 `novelId` 和 `requestId`，修改已有对象还须提供刚读取的版本。原样重试沿用原请求号。删除、恢复、导入和授权管理均未纳入外部写工具。已有只读连接保留原作品库与模块权限。

DSH 主控使用 `cuigengji_connections` 的 `external.status/create/update/revoke/records` 管理长期连接。例如，创建参数 `{"name":"写手","novelIds":["作品ID"],"permissions":{"manuscript":"write","settings":"read"}}` 授权指定作品，选择整个库时传 `novelIds:null`。更新时传 `id`、`expectedRevision` 及要改的字段。设置面板与主控读写同一份配置，版本冲突时重读。服务端每次调用核验授权，支持工具列表变更通知的 MCP 客户端可以自动刷新，其他客户端可手动刷新或重新连接。

## Agent 怎么用

外部工具按单个查询提供，参数直接放在顶层，**不使用 DSH 原生工具的 `{action,args}` 包装**。所有针对作品的查询都显式提供 `novelId`，不借用、也不改变作者或 DSH 主会话焦点。

例如，主 Agent 可以交代：

> 通过催更姬查找《目标作品》，读取第61章，按需要检索相关人物和第二卷规划。结合我给的分镜起草第62章，区分已发生正文、未确认设定与未采用规划，通过正文写入工具保存第62章，完成后汇报章节 ID 和版本。

外部 Agent 自主选择查询范围。一个可能的调用是 `cuigengji_chapter_get`：

```json
{
  "novelId": "从作品查询取得的ID",
  "chapterId": "从目录或搜索取得的ID",
  "maxChars": 12000
}
```

结果包含标题、顺序、`revision`、`contentHash`、`totalLength`、`start/end/nextStart` 和正文。沿返回的 `nextStart` 续读，并携带首次结果的 `expectedRevision`；`nextStart:null` 表示读完。偏移和长度使用 UTF-16 单位，边界不会切断代理对。`maxChars` 上限为 200000；默认 12000，长章继续分页。

版本发生变化会返回 `CONFLICT` 和当前版本，重新读取所需范围，不能将新旧稿拼成一章。只读取当前保存的内容，界面尚未保存的作者草稿不会被宣称为“已读”。

`graph.get` 保留 `status/factType/knownBy/storyTime/sources/revision` 等原有资料；`stale` 表示来源变化待核对，`unconfirmed` 表示未确认，不能自动当作正文事实。规划保留 `idea/selected/written/dropped`，`written` 也可按 `chapterRefs` 回查实际正文。原文、人物对白和资料引用不是工具操作授权。

目录、设定列表和搜索结果带 `items/total/nextOffset`，按需分页；规划列表还带 `sequence`，变化后应重新定位。画布、文件夹列表返回数组，规划详情使用 `node/children/flow/resources` 等结构。以工具返回值和 schema 为准，不猜字段。

## 阅读会话与创作记忆

获得 `guidance` 权限后，`cuigengji_creativeMemory_read` 传 `novelId` 列出标题，可传 `query` 检索。用返回的 `section` 及 `expectedHash`（上次返回的 `contentHash`）读取一段。`full:true` 读取最新保存的全文。作者保存新的创作记忆后，原阅读会话也能查询新版。授予本模块读写后，可按版本和内容哈希修改创作记忆。

每个 stdio MCP 进程默认建立独立阅读会话。同一个客户端可能让多个任务共享该进程；这时每个任务先调用 `cuigengji_reader_open {"label":"任务名"}`，后续带返回的 `readerSessionId`。`cuigengji_reader_status` 可查看当前会话及已采用的预设版本。

对于尚未转换创作记忆的旧书，阅读会话首次读取作品预设时固定当时的启停状态、启用模板和版本；同一会话后续沿用，宿主重启也保留。作者更新预设后，新阅读会话采用新版本。预设不自动加载整本作品，基础指引也按模块查询，不要求每轮重读。

外部预设返回启用模板的原文，不执行脚本，也不按 DSH 主会话的变量时点渲染宏；如模板含变量宏，应将其视为原文，不能猜成当前剧情事实。作者的当前任务指定临时目标与范围，预设作为接手时的默认要求。

## 凭据、作品库与记录

创建连接时固定授权到当时的作品库。DSH 切到另一个库后，旧连接返回 `LIBRARY_CHANGED`，不会悄悄读取新库。切回原库可继续使用，或为新库另建连接。

外部状态默认在 `$DSH_HOME/cuigengji/external`；未设置 DSH_HOME 时在 `~/.dsh/cuigengji/external`。维护者可用插件 `externalRoot` 配置或 `CUIGENGJI_EXTERNAL_ROOT` 改位置。这些文件不属于可移植作品备份：

- `store.json`：连接、授权模块与 token 的摘要。
- `connections/<连接ID>.json`：此连接的专用凭据与当前地址；客户端配置只写这个文件路径，不把凭据塞进提示词。
- `sessions/<阅读会话ID>.json`：外部阅读会话和预设快照，与 DSH 会话记录分开。
- `audit/<连接ID>.jsonl`：实际查询的动作、对象、版本、读取范围、返回字符数和结果；不保存正文或 token。

设置中「查看调用记录」可以确认 Agent 实际读过什么。主 Agent 审阅后通过原有工具保存，继续沿用原有版本、冲突、历史与审计规则。

## 常见连接错误

| 错误码 | 处理 |
| --- | --- |
| `HOST_UNAVAILABLE` | 启动创建连接的 DSH profile，确认插件启用 |
| `CONNECTION_UNAVAILABLE` | 检查本机连接文件；已撤销时重新创建连接并更新客户端配置 |
| `UNAUTHORIZED` | 连接已停用或撤销，检查设置中的启用状态 |
| `CAPABILITY_DENIED` / `CAPABILITY_CHANGED` | 检查开放模块；权限在查询中变化时重新查询 |
| `LIBRARY_CHANGED` | 切回原作品库，或为新库创建连接 |
| `READ_ONLY` | 检查该模块的写权限和已开放的操作，或将草稿交回作者 |
| `CONFLICT` | 内容已保存新版本，重新读取，避免拼接新旧稿 |
| `READER_REQUIRED` | 用 reader_open 新建阅读会话，再传入其 ID |
| `READ_ONLY_NOT_READY` / `READ_ONLY_UPGRADE_REQUIRED` / `READ_ONLY_RECOVERY_REQUIRED` | 在 DSH 完成数据检查、升级或恢复后重试；外部查询不会自行修库 |

开发验收：`node --test tests/external-reader.test.js` 验证真实 stdio、模块权限、版本、会话与逐文件不写入；`node tests/ui-external-reader.mjs` 验证设置创建、调用记录、停用与撤销。这些使用合成资料，不等于特定外部客户端或真实作品已完成验收。
