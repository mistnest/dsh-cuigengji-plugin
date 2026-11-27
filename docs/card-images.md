# 卡片配图

规划、角色卡和世界设定可选配图。画布显示一张封面，点击图片放大；没有图片的卡片保持原来的样子。

双击卡片打开详情，在「配图」中添加图片，也可以拖入或粘贴。多张图片可切换查看、设为封面、更换或移除。支持 PNG、JPEG、WebP、GIF，单张最多 12 MB，一次最多添加 12 张。文字草稿与配图独立保存；换图不会覆盖正在编辑的文字。

原图复制到作品目录，缩略图用于日常画布。整书、全库备份和作品库迁移包含配图；局部导出只携带所选卡片的图片，复用导入时重映射到新卡片。画布图片导出也包含封面。导入数据包沿用现有的 64 MB 文件大小限制。

移除配图会删除该卡片保存的对应图片；文字历史不保存图片旧版。已有的主动备份不随移除操作改变。

## AI 按需接口

配图用于作者查看，不自动加入写作提示词，普通 `graph.get/list`、`planning.get/list` 不返回图片。作者要求导入、查看或更换配图时，才使用现有 `cuigengji_memory` 内的 `image.*` 动作；不会新增一套日常写作前置步骤。

| 动作 | 参数和行为 |
| --- | --- |
| `image.list` | `novelId?`、`kind?:memory/planning`、`nodeId?`；列出图片信息和配图自身的 `revision`，不返回原图 |
| `image.read` | `kind`、`nodeId`、`imageId`；明确读取一张图，MCP 返回图片内容块，原生 DSH 交给宿主附件服务 |
| `image.import` | `kind`、`nodeId`、`files`、`expectedRevision`、`requestId`；文件使用 `filePath`（本地绝对路径）或 `name/data`（base64），复制后不依赖原文件；`replaceImageId` 可更换一张旧图 |
| `image.update` | 上述卡片身份、配图版本、`requestId` 与 `coverId`；指定封面 |
| `image.delete` | 上述卡片身份、配图版本、`requestId` 与 `imageId`；移除一张图 |

这里的 `expectedRevision` 是配图版本，与设定或规划的文字版本不同；无配图时为 0。旧宿主缺少附件服务时，作者面板仍可看图，AI 原生读图会明确提示宿主能力不可用。

## 存储与验证

`images/index.json` 保存图库摘要和缩略图，`images/<卡片身份摘要>.json` 保存该卡片原图及校验信息。使用既有作品文件锁与可恢复事务；单张原图按需读取。图片不写入正文、规划文本、设定正文或自动提示词。

`node --test tests/card-images.test.js` 验证持久化、按需读取、版本冲突、备份和复制。`node tests/ui-card-images.mjs` 在隔离作品库验证真实前端的选图、封面、更换、移除、放大、拖入及重载。
