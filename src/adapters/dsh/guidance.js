import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { persona } from './skills.js';

const body = text => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
const skillRoot = name => new URL(`../../../skills/cuigengji-${name}/`, import.meta.url);
const entry = (id, title) => ({id, title, name: id, file: 'SKILL.md'});
const reference = (id, title, file) => ({id, title, name: 'story', file: `references/${file}.md`});
const modules = Object.freeze({
  core: {id: 'core', title: '催更姬核心规则', content: persona},
  project: entry('project', '作品接手与读取边界'),
  write: entry('write', '正文写作规则'),
  plan: entry('plan', '规划与共享画布规则'),
  memory: entry('memory', '人物与世界设定规则'),
  variables: entry('variables', '可选剧情变量与状态维护'),
  revise: entry('revise', '审阅与修订规则'),
  story: entry('story', '长短篇创作流程与连续性'),
});
const references = Object.freeze({
  'story-long': reference('story-long', '长篇开书与滚动规划', 'long-form'),
  'story-short': reference('story-short', '短篇构思与分批成稿', 'short-form'),
  'story-outline': reference('story-outline', '章节蓝图与读者契约', 'outline'),
  'story-tracking': reference('story-tracking', '逐章事实与连续性追踪', 'tracking'),
  'story-review': reference('story-review', '带证据的审稿与整改', 'review'),
  'story-deslop': reference('story-deslop', '表达、用笔与因果精修', 'deslop'),
  'story-operations': reference('story-operations', '创作工作台操作字段', 'operations'),
});
export const GUIDANCE_SECTIONS = Object.freeze([...Object.keys(modules), ...Object.keys(references), 'preset', 'all']);
const sections = new Set(GUIDANCE_SECTIONS);
function materialize(spec) {
  if (spec.content !== undefined) return spec;
  const base = skillRoot(spec.name);
  return {id: spec.id, title: spec.title, content: body(readFileSync(new URL(spec.file, base), 'utf8')),
    resourceBase: {kind: 'directory', path: fileURLToPath(base)}};
}

/** Resolve one named method on demand; the complete reference library stays out of ordinary turns. */
export async function readGuidance({ store, actor, resolveBinding, section = 'all', novelId }) {
  if (typeof section !== 'string' || !sections.has(section)) throw new Error(`未知写作指引模块：${section}`);
  const binding = await (resolveBinding ? resolveBinding(actor.sessionId) : store.dispatch('binding.get', {}, actor));
  const target = novelId || binding?.activeNovelId || binding?.novelId || null;
  const selected = section === 'all' ? Object.values(modules) : section === 'preset' ? [] : [modules[section] || references[section]];
  let preset = null;
  if (section === 'preset' || section === 'all') {
    preset = target ? await store.dispatch('preset.read', {novelId: target}, actor)
      : {enabled: false, name: '', revision: 0, content: '', unavailable: true, reason: '当前会话尚未选择作品'};
  }
  return {section, novelId: target, modules: selected.map(materialize), ...(preset ? {preset} : {}),
    availableMethods: Object.values(references).map(({id, title}) => ({section: id, title})),
    usage: '这是按需资料。all 仅加载入口规则和预设；阶段方法用 availableMethods 的 section 单独读取。参考文件相对 resourceBase 读取。不据此扩大作者授权，也不把规划提案写成正文事实。'};
}
