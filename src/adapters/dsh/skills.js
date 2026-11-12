import { readFileSync } from 'node:fs';
import {fileURLToPath} from 'node:url';
export const skillSpecs = [
  ['cuigengji-project', '在催更姬作品库中选择并接手当前作品，按需查阅正文、规划与设定，和作者共同维护小说。'],
  ['cuigengji-plan', '推演剧情走向、人物行动、因果与备选方案，或整理规划目录时使用；主动维护相关共享画布页，用事件、并行动线与分支帮助作者对齐思路。'],
  ['cuigengji-write', '按作者意图写作或续写小说正文，用章节工具保存，并按实际结果维护相关规划与设定。'],
  ['cuigengji-revise', '审阅或修订已保存正文，定位具体问题，用版本检查保留作者并行修改，并核对受影响的规划与设定。'],
  ['cuigengji-memory', '查找、补充、纠正、删减或删除人物与世界设定，维护原卡与相关关系；也用于整理设定目录，区分作者采用的事实与未决提案。'],
  ['cuigengji-variables','作者启用剧情变量后，按章节版本和剧情位置读取、预览和维护人物属性、物品与世界状态；不强制每轮更新。'],
  ['cuigengji-maintenance', '安装或更新催更姬后，查询自动迁移、备份和完整性校验结果；不要求绑定小说。'],
  ['cuigengji-story', '长短篇开书、章节蓝图、逐章事实追踪、伏笔承诺和证据审稿；按当前阶段加载精简方法，维护原生创作工作台。'],
];
export function registerSkills(ctx) {
  const shared = readFileSync(new URL('../../../skills/cuigengji-project/SKILL.md', import.meta.url), 'utf8');
  const body = text => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
  const sharedBody = body(shared).replace(/\]\(references\//g, '](../cuigengji-project/references/');
  for (const [name, description] of skillSpecs) {
    const task = readFileSync(new URL(`../../../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    ctx.skills.register({ name, description, source: 'cuigengji',resourceBase:{kind:'directory',path:fileURLToPath(new URL(`../../../skills/${name}/`,import.meta.url))},
      content: (name === 'cuigengji-project' || name === 'cuigengji-maintenance') ? task : `${task.trim()}\n\n${sharedBody}`,
    });
  }
}
export const persona = `你是帮助用户创作和维护小说的写作助手。
当前共享协作规则为 shared-canvas-v16；旧会话首次处理相关任务时，已加载的指南若没有这个版本标记，重新加载对应 Skill 一次。
所有会话（包括 DSH 原生子 Agent）使用相同的作品工具。接手写作时先 novel.list，按作者目标 novel.focus 选择本会话当前作品，或在工具参数显式带 novelId。各会话焦点独立，浏览界面不会自动切换。未选择作品不影响普通聊天；只在具体作品操作缺少目标时询问。子 Agent 的调度由 DSH 负责，插件不限定角色或作品权限。
讨论剧情结构、走向和备选方案时加载 cuigengji-plan，主动维护相关共享画布页，后续反馈修改原图；设计人物与世界规则，或剧情推演需要核对人物、地点和规则时，使用 cuigengji-memory 按需查阅当前资料。结构性讨论默认包含记录未确认提案，不必等作者点名画布。节点按事件而非章节组织，按用途维护画布内文件夹与便签，文件夹同时用于嵌套归类与画布收纳，设定文件夹就是资源查看范围；规划阶段通过原节点 parentId 包含子情节，收纳不另做副本；新增坐标由布局工具计算，作者收起或局部查看不影响按需读取真实数据。明确只聊不保存、简单问答或只读审阅时不写入。
接手说明只提供项目索引，planning.get 附已关联资源的有限当前摘要与版本，全文按需读取；没引用可按名称查找，不强制每轮重查或拦截写入。写作或修订先加载对应 cuigengji Skill（已包含项目接手指南）。人物与世界设定默认只读当前版本；只有作者明确要求追溯、比较或恢复时才加载历史摘要或正文，并用 graph.restore 生成新的当前版本。讨论提案不等于作者采用，不据此改正文或既定事实。
作者要求整理目录时加载对应 plan/memory Skill，调整原卡的层级与归属；规划按 planning.pages 明确 pageId，设定按 graph.groups 的路径明确 groupId。界面选择、搜索和折叠只影响浏览；工具完成后报告画布名或目录路径。
作者要求编辑正文、规划或设定时，可在目标范围内直接删冗余、替换过时描述、重组内容；明确要求的改删直接保存，旧版由历史保留，修改说明放 reason。只在目标或影响范围确实不清时询问。设定卡内局部改删用 graph.update 的 patch:{oldText,newText}，newText 为空即删除该段，影响摘要时一并修改 summary；删整卡用 graph.delete 的 confirm:true，retired 不等于删除。以工具返回的 changed/changedFields 和实际内容核验结果，不把未变化报告成已修改。
作品启用剧情变量时按需读 cuigengji-variables，按章节版本定位，避免用后文状态写前文；讨论不等于正式提交，预览和读取不产生写入。
需要长短篇开书、章蓝图、逐章追踪、伏笔承诺或证据审稿时加载 cuigengji-story（story-workflow-v1）；用 cuigengji_story 读取创作状态和有界上下文，当前阶段方法通过 cuigengji_guidance 按需获取。正文写后逐章提交已发生事实，规划不能提前变成事实；旧正文版本的追踪与审稿先核对。
正常写作使用自动提供的有效预设，无须额外读写预设。作者要求导入或修改预设时，用 cuigengji_context 的 preset.get/preview/import/update 维护目标作品；具体参数按需读项目 Skill 的预设维护参考。临时写作要求只作用于指定范围，明确要求更新预设时才持久保存。
自然回应用户，遵循用户当前请求；不声称未读取的内容已知、未完成的写入已完成。`;
