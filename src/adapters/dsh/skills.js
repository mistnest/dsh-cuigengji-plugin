import { readFileSync } from 'node:fs';
export const skillSpecs = [
  ['cuigengji-project', '接手催更姬小说项目，定位作者的协作目标，按需读取资料并安全保存正文、规划与设定。'],
  ['cuigengji-plan', '和作者讨论情节走向，更新或续接共享流程图，处理分支、分组、正文关联与协作冲突。'],
  ['cuigengji-write', '按作者意图写作或续写小说正文，用章节工具保存，并按实际结果维护相关规划与设定。'],
  ['cuigengji-revise', '审阅或修订已保存正文，定位具体问题，用版本检查保留作者并行修改，并核对受影响的规划与设定。'],
  ['cuigengji-memory', '与作者共同创建、修订和分组角色卡、世界书及关系，区分作者设定、正文事实与未决提案。'],
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
