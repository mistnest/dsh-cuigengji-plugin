import { readFileSync } from 'node:fs';
import {fileURLToPath} from 'node:url';
export const skillSpecs = [
  ['cuigengji-project', '在催更姬作品库中选择并接手当前作品，按需查阅正文、规划与设定，和作者共同维护小说。'],
  ['cuigengji-plan', '讨论剧情走向、人物行动、因果或备选方案时使用；主动把结构性讨论维护到相关共享画布页，用事件、并行动线与分支帮助作者对齐思路。'],
  ['cuigengji-write', '按作者意图写作或续写小说正文，用章节工具保存，并按实际结果维护相关规划与设定。'],
  ['cuigengji-revise', '审阅或修订已保存正文，定位具体问题，用版本检查保留作者并行修改，并核对受影响的规划与设定。'],
  ['cuigengji-memory', '讨论、设计或完善人物动机、世界规则、阵营与关系时使用；主动复用设定卡与关系图，保留未决提案并区分既定事实。'],
  ['cuigengji-maintenance', '安装或更新催更姬后，查询自动迁移、备份和完整性校验结果；不要求绑定小说。'],
];
export function registerSkills(ctx) {
  const shared = readFileSync(new URL('../../../skills/cuigengji-project/SKILL.md', import.meta.url), 'utf8');
  const body = text => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
  for (const [name, description] of skillSpecs) {
    const task = readFileSync(new URL(`../../../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    ctx.skills.register({ name, description, source: 'cuigengji',resourceBase:{kind:'directory',path:fileURLToPath(new URL(`../../../skills/${name}/`,import.meta.url))},
      content: (name === 'cuigengji-project' || name === 'cuigengji-maintenance') ? task : `${task.trim()}\n\n${body(shared)}`,
    });
  }
}
export const persona = `你是帮助用户创作和维护小说的写作助手。
当前共享协作规则为 shared-canvas-v12；旧会话首次处理相关任务时，已加载的指南若没有这个版本标记，重新加载对应 Skill 一次。
所有会话（包括 DSH 原生子 Agent）使用相同的作品工具。接手写作时先 novel.list，按作者目标 novel.focus 选择本会话当前作品，或在工具参数显式带 novelId。各会话焦点独立，浏览界面不会自动切换。未选择作品不影响普通聊天；只在具体作品操作缺少目标时询问。子 Agent 的调度由 DSH 负责，插件不限定角色或作品权限。
讨论剧情结构、走向和备选方案时加载 cuigengji-plan，主动维护相关共享画布页，后续反馈修改原图；设计人物与世界规则，或剧情推演需要核对人物、地点和规则时，使用 cuigengji-memory 按需查阅当前资料。结构性讨论默认包含记录未确认提案，不必等作者点名画布。节点按事件而非章节组织，按用途维护画布内文件夹与便签，文件夹同时用于嵌套归类与画布收纳，设定文件夹就是资源查看范围；规划阶段通过原节点 parentId 包含子情节，收纳不另做副本；新增坐标由布局工具计算，作者收起或局部查看不影响按需读取真实数据。明确只聊不保存、简单问答或只读审阅时不写入。
接手说明只提供项目索引，planning.get 附已关联资源的有限当前摘要与版本，全文按需读取；没引用可按名称查找，不强制每轮重查或拦截写入。写作或修订先加载对应 cuigengji Skill（已包含项目接手指南）。人物与世界设定默认只读当前版本；只有作者明确要求追溯、比较或恢复时才加载历史摘要或正文，并用 graph.restore 生成新的当前版本。讨论提案不等于作者采用，不据此改正文或既定事实。
自然回应用户，遵循用户当前请求；不声称未读取的内容已知、未完成的写入已完成。`;
