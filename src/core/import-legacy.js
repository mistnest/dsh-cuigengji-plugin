import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const list = value => Array.isArray(value) ? value : value && typeof value === 'object'
  ? Object.entries(value).map(([key, item]) => typeof item === 'object' && item !== null ? { name: key, ...item } : { name: key, content: String(item ?? '') }) : [];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function invalid(message) { const e = new Error(message); e.code = 'INVALID_LEGACY_EXPORT'; throw e; }
function stableId(type, id, value) { return `legacy-${type}-${hash(String(id || JSON.stringify(value))).slice(0, 24)}`; }
function prose(value) {
  if (typeof value === 'string') return value;
  // Preserve rich card/worldbook structure without interpreting paths or secret settings.
  if (value === undefined || value === null) return '';
  return JSON.stringify(value, null, 2);
}

/** Pure converter for exported, in-memory legacy data. It never reads paths.
 * Accepts {project?, workspace?, chapters, volumes?, worldBooks?, characters?, graph?}.
 * Existing folder projects must first be exported by an explicit trusted caller.
 */
export function convertLegacyExport(input) {
  if (!object(input)) invalid('旧项目导出必须是 JSON 对象');
  const project = object(input.project) ? input.project : input;
  const workspace = object(input.workspace) ? input.workspace : input;
  const chapters = list(input.chapters ?? workspace.chapters);
  const title = project.title || project.name || workspace.title;
  if (typeof title !== 'string' || !title.trim()) invalid('旧项目缺少 title 或 name');
  if (chapters.some(c => c.type !== 'volume' && typeof c.content !== 'string')) invalid('章节缺少正文；请导出包含正文的数据，不能仅导入文件路径或目录');
  const warnings = [];
  const timestamp = '1970-01-01T00:00:00.000Z';
  const entity = (id, fields) => ({ id, revision: 1, createdAt: timestamp, updatedAt: timestamp, deleted: false, ...fields });
  const n = entity(stableId('novel', project.id || project.novelId || workspace.novelId, title), {
    title, description: prose(project.description || ''), archived: false, volumes: {}, chapters: {}, nodes: {}, edges: {}, plan: null,
  });
  const volumeMap = new Map(); const chapterMap = new Map(); const nodeMap = new Map();
  const volumes = [...list(input.volumes ?? workspace.volumes), ...chapters.filter(c => c.type === 'volume')];
  for (const [index, v] of volumes.entries()) {
    const id = stableId('volume', v.id, v.title || v.name || index);
    volumeMap.set(v.id || v.name || v.title, id);
    n.volumes[id] = entity(id, { title: v.title || v.name || `第${index + 1}卷`, order: Number.isFinite(v.order) ? v.order : index });
  }
  for (const [index, c] of chapters.filter(c => c.type !== 'volume').entries()) {
    const id = stableId('chapter', c.id, { index, title: c.title, content: c.content });
    if (n.chapters[id]) invalid(`重复章节 ID：${c.id}`);
    chapterMap.set(c.id || id, id);
    const volumeId = volumeMap.get(c.volumeId) || null;
    if (c.volumeId && !volumeId) warnings.push(`章节“${c.title || index + 1}”引用的卷不存在，已放入未分卷章节。`);
    const ch = entity(id, { title: c.title || c.name || `第${index + 1}章`, volumeId, order: Number.isFinite(c.order) ? c.order : index, content: c.content, contentHash: hash(c.content), versions: [] });
    ch.versions.push({ revision: 1, content: ch.content, contentHash: ch.contentHash, title: ch.title, volumeId, order: ch.order, deleted: false, timestamp, actor: { kind: 'human', sessionId: null }, reason: '旧项目导入' });
    n.chapters[id] = ch;
  }
  function addNode(raw, type, index) {
    const data = object(raw.data) ? raw.data : raw;
    const name = raw.name || raw.title || data.name || `导入设定${index + 1}`;
    const id = stableId('node', raw.id, `${type}:${name}`);
    nodeMap.set(raw.id || name, id);
    if (n.nodes[id]) return id;
    // Cards may have many meaningful fields; retain their full data if no explicit body.
    const body = raw.body ?? data.content ?? data.description ?? data;
    n.nodes[id] = entity(id, { type, name, summary: prose(raw.summary ?? data.summary ?? ''), content: prose(body),
      status: 'unconfirmed', factType: 'unconfirmed', aliases: Array.isArray(raw.aliases) ? raw.aliases.filter(v => typeof v === 'string') : [],
      sources: [], knownBy: [], dependsOn: [], storyTime: '' });
    return id;
  }
  let nodeIndex = 0;
  for (const book of list(input.worldBooks ?? input.worldbooks ?? workspace.worldBooks)) addNode(book, 'world_book', nodeIndex++);
  if (object(workspace.worldBook)) {
    const entries = list(workspace.worldBook.entries);
    if (entries.length) for (const entry of entries) addNode(entry, 'world_entry', nodeIndex++);
    else addNode({ name: '世界书', ...workspace.worldBook }, 'world_book', nodeIndex++);
  }
  for (const card of list(input.characters ?? workspace.characters ?? input.characterCards)) addNode(card, 'character_card', nodeIndex++);
  const graph = object(input.graph) ? input.graph : {};
  for (const raw of list(graph.nodes)) {
    const type = raw.type || raw.kind;
    if (!['world_book', 'world_entry', 'character_card'].includes(type)) { warnings.push(`未导入不支持的节点类型：${type}`); continue; }
    addNode(raw, type, nodeIndex++);
  }
  for (const [index, raw] of list(graph.edges).entries()) {
    const from = nodeMap.get(raw.from || raw.source), to = nodeMap.get(raw.to || raw.target);
    if (!from || !to) { warnings.push(`关系 ${raw.id || index + 1} 缺少端点，未导入。`); continue; }
    const id = stableId('edge', raw.id, { from, to, index });
    n.edges[id] = entity(id, { from, to, name: raw.name || raw.relation || raw.type || '相关', summary: prose(raw.summary || ''), content: prose(raw.content ?? raw.body ?? ''),
      status: 'unconfirmed', factType: 'unconfirmed', sources: [], aliases: [], knownBy: [], dependsOn: [], storyTime: '' });
  }
  const outline = workspace.outline ?? input.outline;
  if (outline) n.plan = entity(stableId('plan', n.id, ''), { content: prose(outline), approved: false, approvedAt: null });
  warnings.push('旧设定已标记为未确认；历史修订与来源版本不能从普通导出中恢复，需作者核对。');
  return {
    backup: { format: 'cuigengji', schemaVersion: 1, exportedAt: timestamp, novel: n },
    report: { novelId: n.id, title, volumes: Object.keys(n.volumes).length, chapters: Object.keys(n.chapters).length,
      nodes: Object.keys(n.nodes).length, edges: Object.keys(n.edges).length, warnings },
  };
}

export default convertLegacyExport;
