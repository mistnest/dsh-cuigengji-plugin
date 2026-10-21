# 模块与数据存储

`src/` 是源码入口；`runtime/` 和 `lib/client.js` 为对应构建产物，随源码提交，供 DSH 直接安装。旧 `core`、`assistant`、`mcp` 路径保留兼容转发。普通用户安装不运行构建钩子。

## 模块边界

| 模块 | 责任 |
| --- | --- |
| `client/WorkbenchShell.tsx`、`client/features/` | 正文、规划、设定、预设、作品、统计与陪伴界面 |
| `client/shared/` | 目录树、画布交互、连线、详情、设置、偏好与草稿 |
| `domain/` | 正文版本、目录、规划层级、资源、分组、历史与布局规则 |
| `application/store.js` | 统一动作、作者/Agent边界、版本与持久化协调 |
| `application/libraries/` | 当前作品库、切换、迁移和进行中操作的互斥门 |
| `application/transfer/`、`backup/` | 识别、预览、范围选择、恢复/复用、备份与引用重映射 |
| `infrastructure/persistence/` | 分文件索引、按需读取、文件锁、事务恢复及布局迁移 |
| `adapters/dsh/`、`adapters/mcp/` | 宿主接口、工具、Skill、会话与按需指引 |
| `application/pet/`、`desktop/` | Windows透明陪伴窗口、生命周期与宿主桥接 |

规划是故事意图，设定是资源；节点不等于章节。规划的独立页包含事件、嵌套阶段/文件夹、连线与批注；设定文件夹是画布查看范围，不另叠加一套面向作者的页面选择。目录顺序、层级、画布坐标和情节因果是分离的数据。

界面单击选择、双击打开。轮询保留已加载内容，编辑草稿不被后台索引替换；保存前读取最新版本，不相交修改可合并，重叠冲突由作者决定。自动排布与拖拽布局同样核对版本；目录排序不改坐标或关系。共享画布不使用远端页面截图替代真实对象。

## 会话和上下文

会话访问整个作品库，通过 `novel.list/focus` 记住当前作品，或在调用中显式传 `novelId`。未选书不阻断普通聊天；具体作品操作目标不明时才要求选择。主会话与 DSH 原生子 Agent 使用同一规则，没有固定写手权限或插件自己的多Agent调度器。旧协作数据仅为备份兼容继续保留，不自动调度。

开启会话写作指引时，常驻提示词包含稳定核心规则与当前作品有效预设；关闭后由 `cuigengji_guidance` 按需返回完整模块与预设。工具与Skill继续注册。正文、设定、规划先查摘要索引，再读相关全文；旧设定须明确版本读取。作者浏览详情、历史或另一部作品，不会把这些内容自动注入AI或替会话切书。

## 独立作品目录

`dataRoot` 配置优先于 `CUIGENGJI_DATA_ROOT`，再回落到系统默认目录。运行数据不属于源码。`LibraryService` 统一控制完整操作期间的库选择；切库检查未保存草稿与进行中操作，迁移复制已校验快照，校验成功并保存配置后才切换。

当前**存储布局5**保留可读名称与稳定短后缀，通过索引映射回完整业务 ID。示意：

```text
dataRoot/
  library.json                         作品、目录映射与布局版本
  novels/<书名>/
    project.json                       作品信息、卷与模块元信息
    chapters/index.json                当前正文与版本索引
    chapters/<卷名或未分卷>/<章节名--短ID>.json
    chapters/回收站/...                 已删除章节正文
    settings/index.json                人物/世界索引，不含全文
    settings/entries/设定总览--main/<文件夹>/<设定名--短ID>.json
    settings/groups.json               嵌套资源目录
    settings/relations.json            当前资源关系
    planning/index.json                规划摘要、关系和页面索引
    planning/<页面>/<文件夹>/<事件名--短ID>.json
    planning/<页面>/<画布--短ID>.json   页面成员与关系
    preset.json                        本书预设及原文
    imports/originals.json              导入原件
    history/chapters/<章节ID>.json       正文旧稿
    history/settings/<设定ID>.json       逐次修改轨迹
    history/planning/<事务ID>.json       规划变更与撤销快照
  activity/index.json                  写作记录年份索引
  activity/<年份>.json                 每日统计，不含聊天正文
  runtime/bindings.json                 会话当前作品
  runtime/upgrade.json                  升级阶段、版本与校验
  runtime/requests/                     幂等请求结果
  audit/                               操作日志
  backups/                             迁移与导入前快照
```

具体路径以索引为准；名称清洗、重名避让和过深目录缩短由存储层处理，引用不依赖路径。手工放入的额外文件不能被受管理文件覆盖。不要绕过工具移动、改名或编辑文件。

普通读取只加载所需索引和目标正文，历史按需单读；完整备份、迁移和维护校验才装配完整库。写作记录按查询年份读取，不因看统计加载所有小说。整书/整库备份带齐相应历史；复用时连同历史快照、章节和资源引用一起重映射。

## 事务与升级

文件事务先暂存内容，提交索引并保留恢复日志，重启后在同一文件锁内完成中断操作。永久删书先核对目录与内部ID，再按事务暂存、更新索引、清理；回收保留所有内容，正在使用作品的Agent会阻止回收。

启动的 `UpgradeCoordinator` 建立数据根旁的完整原始快照，恢复旧事务，迁移旧布局并比较逻辑工作库。失败时保留现场和维护查询，阻止正常写作，避免空库掩盖丢失。快照包含校验清单；普通回退必须保留升级后新写入并恢复到单独目录，不能只换旧代码读取布局5。

更完整的操作流程见[迁移与恢复](upgrade.md)、[导入导出](import-export.md)和[开发说明](development.md)。真实作品、测试输出、开发记录与凭据不进入公开源码。
