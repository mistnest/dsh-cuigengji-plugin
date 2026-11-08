---
name: cuigengji-story
description: 长短篇开书、章节蓝图、逐章事实追踪、伏笔承诺和证据审稿；按当前阶段加载精简方法，维护原生创作工作台。
---

# 小说创作与连续性

方法版本：story-workflow-v1。方法改编自 Oh Story，来源与 MIT 许可见包内 THIRD_PARTY_NOTICES.md。

把创作成果放在催更姬原生作品库，与作者在「创作」工作台共同维护。正文仍由 cuigengji_project 保存；人物/世界由 cuigengji_memory 管理；事件因果仍由 cuigengji_plan 管理。

## 先确定本轮交付

确认当前作品、对象（讨论/简报/蓝图/正文/修订）、章节范围、字数和停点。已有授权范围内继续完成，不为每次保存重复确认；规划请求交付规划，不自动写正文。当前请求优先于本书预设，再其次才是通用方法；未知的核心事实明确写成待定。

用 cuigengji_story 的 story.get 读状态，用 story.context.get 取目标章的有限上下文。plans 是意图，facts 是已发生资料；核对来源版本、truncated 和 omitted，缺关键事实再按返回 ID 查询，不能用规划替代已写正文。需要当前正文时按项目指南的 nextStart 读到足够。

## 只加载当前阶段

调用 cuigengji_guidance `{section,args?:{novelId}}`，或读取本 Skill 的对应参考文件：

| 当前任务 | section | 参考文件 |
| --- | --- | --- |
| 长篇选题、开书、滚动规划 | story-long | references/long-form.md |
| 短篇构思、小节与分批成稿 | story-short | references/short-form.md |
| 指定章细纲、情节点、章尾 | story-outline | references/outline.md |
| 写完一章、接续下一章、修订后核对 | story-tracking | references/tracking.md |
| 审稿、连续性与问题卡 | story-review | references/review.md |
| 去 AI 味、详略与因果精修 | story-deslop | references/deslop.md |
| 调用原生创作数据操作 | story-operations | references/operations.md |

一次只取当前阶段方法和所需操作字段，不加载整套参考。all 返回入口规则，阶段参考仍单独获取。

## 形成可续接的结果

- 简报记录读者期待、主角目标、核心冲突、结局方向和文风；长短篇分开安排节奏。
- 蓝图写清本章意图、因果情节点与具体章尾。下一章只消费当前已批准计划。
- 正文保存并回读后，核对实际变化，以最新 chapter.revision 提交 tracking.commit；同书多章逐章完成追踪再继续。
- 分开维护伏笔、下章承诺、长期期待和长期约束。已发生事实必须有正文依据；需要作者决定的新主线或结算不偷偷落实。
- 审稿按位置、引文、影响和最小修法交付。只读审阅不改正文；要求记录问题时才维护审稿看板。
- 界面阶段、计数或“已解决”仅是工作记录；正文变化后的陈旧追踪/审稿要重新核对，不用换版本号消除提示。

向作者报告本次写了什么、保存到了哪里、尚未解决的具体问题。没有执行的同步、审稿或全书检查不能算完成。
