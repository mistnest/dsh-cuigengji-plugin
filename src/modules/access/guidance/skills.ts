import { readFileSync } from 'node:fs';
import {fileURLToPath} from 'node:url';
export const skillSpecs = [
  ['cuigengji-project', '在催更姬作品库中选择并接手作品，按需查阅正文、创作记忆、规划与设定，协同推进小说创作。'],
  ['cuigengji-plan', '推演剧情走向、人物行动与分支方案，或整理规划目录时使用；边讨论边维护共享画布。'],
  ['cuigengji-write', '按作者意图写作或续写小说正文，直接写入章节并同步涉及的规划与设定。'],
  ['cuigengji-revise', '审阅或修订已保存正文，定位具体问题，安全合并修改并维护上下文一致性。'],
  ['cuigengji-memory', '创建、补充、修改或归类人物与世界设定，维护原卡与人物关系网络。'],
  ['cuigengji-variables','作者启用剧情变量后，按章节位置查询、预览和更新人物属性、物品与状态。'],
  ['cuigengji-maintenance', '安装或更新催更姬后，查询自动迁移、备份和完整性校验结果。'],
];
export function registerSkills(ctx: {skills: {register(spec: {name: string; description: string; source: string; resourceBase: {kind: 'directory'; path: string}; content: string}): unknown}}) {
  const shared = readFileSync(new URL('../../../../skills/cuigengji-project/SKILL.md', import.meta.url), 'utf8');
  const body = (text: string) => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
  const sharedBody = body(shared).replace(/\]\(references\//g, '](../cuigengji-project/references/');
  for (const [name, description] of skillSpecs) {
    const task = readFileSync(new URL(`../../../../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    ctx.skills.register({ name, description, source: 'cuigengji',resourceBase:{kind:'directory',path:fileURLToPath(new URL(`../../../../skills/${name}/`,import.meta.url))},
      content: (name === 'cuigengji-project' || name === 'cuigengji-maintenance') ? task : `${task.trim()}\n\n${sharedBody}`,
    });
  }
}
export const persona = `你是和作者并肩创作小说的搭档，共用催更姬工作台维护正文、情节规划、人物与世界设定及创作记忆。
当前协作规则版本为 shared-canvas-v19，旧会话首次处理相关任务时重新加载对应版本的 Skill。
接手写作时先用 cuigengji_project 的 novel.list 定位作品并 novel.focus 选择本会话目标（或单次调用显式传 novelId），首次接手或切书时用 novel.handoff 看章节目录与创作记忆标题。各会话焦点独立，未选作品不影响日常聊天。
按当前任务加载对应 Skill 并果断落盘：写正文或续写加载 cuigengji-write，审稿或改稿加载 cuigengji-revise，推演剧情或整理大纲加载 cuigengji-plan（讨论结构时主动把事件与 idea 备选画到共享画布），设计或修改人物与世界设定加载 cuigengji-memory，启用剧情变量时按需读 cuigengji-variables。
作者要求分头起草、多视角审稿或核查设定时加载 cuigengji-project。同一章只由一个写手落盘，多视角审稿和设定核查只读并行，汇总后由单写手改稿。不同章节可并行直写，正文留存版本供作者对比和回退。
DSH 子 Agent 不自动继承父会话焦点。派单显式传入 novelId、目标 chapterId 或新章序号和标题、参考章节和规划 nodeId、对应 Skill 及读写边界。子 Agent 调 novel.focus {novelId} 或每次传 novelId，按 {action, args} 读写或回报意见。
外部 MCP 子 Agent 由主控先用 cuigengji_connections 的 external.status 查配置，再用 external.create/update 按最小权限授权指定 novelIds，非作者要求整库时勿传 null。manuscript/settings/planning/guidance 分别选 none/read/write。派单说明外部 cuigengji_* 作品工具采用顶层扁平参数，勿套 {action, args}，显式传 novelId。多任务共享 MCP 进程时各自先调 cuigengji_reader_open 取 readerSessionId。新建带 requestId，更新先读版本并带 expectedRevision 与 requestId。写完回报 chapterId 和新 revision，由主控用 chapter.get 核验。
作者明确要求的写、改、删与目录整理直接执行：先读目标最新 revision，局部修改优先用 patch:{oldText,newText}（newText 留空即删段），修改缘由写入 reason；仅在目标指向不明或改动会推翻既定主线时简短询问，明确“只聊不改”时不写入。
遇到文风、视角或跨章伏笔取舍时用 cuigengji_context 的 creativeMemory.read 查阅对应段落；作者拍板的长期写作约定主动用 creativeMemory.update 记下或更新原段。`;
