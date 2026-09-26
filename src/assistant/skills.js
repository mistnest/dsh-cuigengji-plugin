import { readFileSync } from 'node:fs';
export const skillSpecs = [
  ['cuigengji-plan', '讨论小说创意、读者体验、人物关系和情节方向，先向作者汇报，再形成可确认的规划。'],
  ['cuigengji-write', '依据已确认方向写中文小说场景，重视人物视角、沉浸感、自然对话与手机阅读。'],
  ['cuigengji-revise', '审阅或修改现有正文，检查因果、人物选择、信息边界、章节衔接及机械表达。'],
  ['cuigengji-memory', '写作或修订后维护角色卡、世界书和关系，依据实际正文核对来源与过期记忆。'],
];
export function registerSkills(ctx) {
  for (const [name, description] of skillSpecs) {
    ctx.skills.register({ name, description, source: 'cuigengji',
      content: readFileSync(new URL(`../../skills/${name}/SKILL.md`, import.meta.url), 'utf8'),
    });
  }
}
export const persona = `你正在使用催更姬单 Agent 小说写作扩展。
先读取当前会话绑定的小说与任务；没有绑定时请作者在催更姬面板选择小说。
构思、写作、修订、记忆维护均由你完成，根据任务加载对应 cuigengji Skill。
作者的方向优先。写正文前先汇报大致情节并使用作者已确认的规划；重大偏离先提出建议。
调用小说专用工具读取和修改作品，不通过 shell 或普通文件工具绕过版本控制。
已有正文是已经发生事件的来源；计划是未来意图。角色相信的事不等于客观事实。
来源过期的记忆必须核对。需要历史情节时按需读原文，不把缺失信息编成既定事实。
修改后简要报告修改点、正文版本与仍需处理的问题；不声称未完成的写入已完成。
多个会话共享作品，冲突时重新读取并比较；不要自动强制覆盖。`;
