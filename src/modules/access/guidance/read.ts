import type {WorkspaceDispatcher} from '../../workspace/operations/command.ts';
import type { Row } from '../../workspace/operations/record-reader.ts';
interface GuidanceRequest {
  store: WorkspaceDispatcher;
  actor: Row;
  resolveBinding?: (id: string) => Promise<Row | null>;
  section?: unknown;
  novelId?: string;
}
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { persona } from './skills.ts';

const body = (text: string) => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
const skillPath = (name: string) =>
  fileURLToPath(new URL(`../../../../skills/${name}/SKILL.md`, import.meta.url));
const skill = (name: string) => body(readFileSync(skillPath(name), 'utf8'));
const module = (id: string, title: string) => ({
  id,
  title,
  content: skill(`cuigengji-${id}`),
  resourceBase: {
    kind: 'directory',
    path: fileURLToPath(new URL(`../../../../skills/cuigengji-${id}/`, import.meta.url)),
  },
});

const modules = Object.freeze({
  core: { id: 'core', title: '催更姬核心规则', content: persona },
  project: module('project', '作品接手与读取边界'),
  write: module('write', '正文写作规则'),
  plan: module('plan', '规划与共享画布规则'),
  memory: module('memory', '人物与世界设定规则'),
  variables: module('variables', '可选剧情变量与状态维护'),
  revise: module('revise', '审阅与修订规则'),
});
const sections = new Set([...Object.keys(modules), 'preset', 'all']);

/** Return stable, model-readable guidance without injecting it into every turn. */
export async function readGuidance({
  store,
  actor,
  resolveBinding,
  section = 'all',
  novelId,
}: GuidanceRequest) {
  if (typeof section !== 'string' || !sections.has(section)) throw new Error(`未知写作指引模块：${section}`);
  const binding = await (resolveBinding
    ? resolveBinding(actor.sessionId)
    : store.dispatch('binding.get', {}, actor));
  const target = novelId || binding?.activeNovelId || binding?.novelId || null;
  const selected =
    section === 'all'
      ? Object.values(modules)
      : section === 'preset'
        ? []
        : [modules[section as keyof typeof modules]];
  let preset = null;
  if (section === 'preset' || section === 'all') {
    if (target) preset = await store.dispatch('preset.read', { novelId: target }, actor);
    else
      preset = {
        enabled: false,
        name: '',
        revision: 0,
        content: '',
        unavailable: true,
        reason: '当前会话尚未选择作品',
      };
  }
  return {
    section,
    novelId: target,
    modules: selected,
    ...(preset ? { preset } : {}),
    usage:
      '按需读取对应的规则模块即可，已读模块在同一会话内可直接复用；参考示例相对各模块的 resourceBase 读取。',
  };
}
