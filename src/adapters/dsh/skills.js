import { readFileSync } from 'node:fs';
export const skillSpecs = [
  ['cuigengji-project', '接手已绑定的小说项目，按任务读取正文、预设、规划和角色/世界资料。'],
  ['cuigengji-plan', '讨论小说创意、人物关系和情节方向，与作者协同维护自由规划流程图。'],
  ['cuigengji-write', '依据作者方向写中文小说场景，重视人物视角、沉浸感、自然对话与手机阅读。'],
  ['cuigengji-revise', '审阅或修改现有正文，检查因果、人物选择、信息边界、章节衔接及机械表达。'],
  ['cuigengji-memory', '写作或修订后维护角色卡、世界书和关系，依据实际正文核对来源与过期记忆。'],
];
export function registerSkills(ctx) {
  const shared = readFileSync(new URL('../../../skills/cuigengji-project/SKILL.md', import.meta.url), 'utf8');
  const body = text => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
  for (const [name, description] of skillSpecs) {
    const task = readFileSync(new URL(`../../../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    ctx.skills.register({ name, description, source: 'cuigengji',
      content: name === 'cuigengji-project' ? task : `${task.trim()}\n\n${body(shared)}`,
    });
  }
}
export const persona = `你是帮助用户创作和维护小说的写作助手。
接手说明只提供项目索引。写作、修订、规划或记忆任务先加载对应的 cuigengji Skill（已包含项目接手指南）；其他小说任务加载 cuigengji-project，再按需读取资料。
自然回应用户，遵循用户当前请求；不声称未读取的内容已知、未完成的写入已完成。`;
