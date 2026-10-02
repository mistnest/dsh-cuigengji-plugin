# 催更姬模块与工作数据

```mermaid
flowchart TD
    UI[写作界面：正文 / 规划 / 设定] --> RPC[DSH RPC 适配层]
    DATAUI[工作数据区：位置 / 清单 / 导入导出] --> RPC
    AGENT[Agent 工具与技能] --> POLICY[会话绑定与操作记录]
    RPC --> POLICY
    RPC --> DATA[WorkData 全库备份服务]
    POLICY --> STORE[Store：作品操作与事务]
    DATA --> STORE
    STORE --> DISK[独立小说数据目录]
    POLICY --> MCP[MCP 图谱桥接]
    MCP --> STORE
```

- `src/client/features`：正文、规划、设定、预设与工作数据界面，仅使用 RPC。
- `src/adapters/dsh`、`src/adapters/mcp`：宿主通信、技能注册与工具边界；全库导入导出仅供作者界面。
- `src/application/backup`：全库备份格式、SHA-256 校验、冲突预览、合并与导入前备份。
- `src/application/bindings`、`src/application/queries`：会话绑定和按需接手信息；不会自动塞小说全文或全库资料。
- `src/domain/planning`、`src/domain/memory`、`src/domain/preset`：规划事务、资料分组与预设规则。
- `src/infrastructure/persistence`、`src/infrastructure/migrations`：跨进程锁与原子写入、旧格式转换。
- `src/application/store.js`：仍编排作品、章节和图谱命令；进一步拆分时保持既有 action 与备份格式。旧路径保留兼容转发，TypeScript 迁移尚未覆盖全部 JS/JSX。

## 独立数据目录

配置优先级：插件 `dataRoot` > `CUIGENGJI_DATA_ROOT` > 系统默认目录。小说数据应存放在仓库之外，与源码、DSH Home 和 Electron 浏览器数据分开；公开仓库不提供个人作品或运行数据。工作数据页显示服务实际使用的绝对路径，迁移应核对作品名称清单，不能只按文件是否复制成功判断。

## 备份契约

单本作品继续使用“作品与备份”。“工作数据 · 导入/导出”使用独立版本化格式 `cuigengji-workspace`，保存整个 Store（含归档作品、删除章节及历史、规划变更、原始预设、绑定和请求记录），并附带操作日志、旧规划迁移备份及校验码。

导入前预览；确认时在同一 Store 锁内重新校验冲突。相同作品跳过，不同内容的同 ID 作品、不同绑定或分叉日志拒绝导入。当前工作数据先存入 `backups/before-import-*`，再合并；源备份不修改。相同日志的前缀版本保留较长一份。导入前备份是本机回滚快照，不递归打包进后续导出，避免备份无限膨胀。

这是小说工作数据备份，不是 DSH 整机备份：聊天记录、附件、凭据由 DSH 管理，浏览器未保存草稿需先保存。备份预览会明确提示边界。恢复会话绑定依赖相同的 DSH 会话 ID；只迁移小说时仍可在新会话手动选择作品。

## 后续解耦边界

后续可将 `application/store.js` 的 Novel/Chapter 与 Graph 命令继续分离，逐步为剩余 JS/JSX 增加类型契约。每一步都应以旧数据、版本冲突和完整备份的回归测试保证兼容；Agent 始终是写作助手，正文优先，资料按需读取。
