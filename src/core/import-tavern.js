import { createHash } from 'node:crypto';

export const MAX_TAVERN_BYTES = 20 * 1024 * 1024;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = message => { throw Object.assign(new Error(message), { code: 'INVALID_TAVERN_FILE' }); };
const hash = value => createHash('sha256').update(value).digest('hex');
const strings = value => Array.isArray(value) ? value.filter(v => typeof v === 'string') : [];
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function parseTavernFile({ json, pngBase64 } = {}) {
  if (pngBase64 === undefined) {
    if (!object(json) || Buffer.byteLength(JSON.stringify(json)) > MAX_TAVERN_BYTES) fail('请选择有效的角色卡或世界书 JSON（最大 20 MB）');
    return json;
  }
  if (typeof pngBase64 !== 'string' || pngBase64.length > Math.ceil(MAX_TAVERN_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(pngBase64)) fail('PNG 文件无效或超过 20 MB');
  const bytes = Buffer.from(pngBase64, 'base64');
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) fail('不是 PNG 文件');
  const cards = new Map(); let ended = false;
  for (let offset = 8; offset < bytes.length;) {
    if (offset + 12 > bytes.length) fail('PNG 文件已截断');
    const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
    if (end > bytes.length) fail('PNG 数据块已截断');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) fail('PNG 校验失败，文件可能损坏');
    if (type === 'tEXt') {
      const data = bytes.subarray(offset + 8, end - 4), split = data.indexOf(0);
      const key = data.subarray(0, split).toString('latin1').toLowerCase();
      if (split > 0 && ['chara','ccv3'].includes(key)) cards.set(key, data.subarray(split + 1).toString('ascii'));
    }
    offset = end;
    if (type === 'IEND') { ended = true; break; }
  }
  if (!ended) fail('PNG 缺少结束数据块');
  const encoded = cards.get('ccv3') ?? cards.get('chara');
  if (!encoded) fail('这是一张普通 PNG，没有酒馆角色卡数据');
  try { return parseTavernFile({ json: JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) }); }
  catch (error) { fail(`角色卡数据无法解析：${error.message}`); }
}

/** Maps data only. Tavern prompt placement, macros, extensions and scripts are not executed. */
export function previewTavern(args) {
  const raw = parseTavernFile(args);
  if (raw.spec && !['chara_card_v2','chara_card_v3'].includes(raw.spec)) fail(`不支持的角色卡规范：${raw.spec}`);
  const data = raw.spec ? raw.data : raw;
  if (!object(data)) fail('角色卡缺少 data 对象');
  const card = !!raw.spec || (data.entries === undefined && typeof data.name === 'string' && typeof data.description === 'string');
  const nodes = [];
  const warnings = ['导入的是写作资料。酒馆的关键词触发、概率、递归扫描、插入位置、宏和扩展脚本不在 DSH 中执行。', '原始 JSON 和扩展字段随完整备份保留；系统提示词不会替换 DSH 的系统指令。PNG 图片本身与外部素材不保存。'];
  const add = (type, name, content, aliases = [], status = 'unconfirmed') => {
    nodes.push({ type, name, content, aliases, status, factType:'unconfirmed', summary:'', sources:[], knownBy:[], dependsOn:[], storyTime:'' });
  };
  function book(value, fallback) {
    if (!object(value) || !(Array.isArray(value.entries) || object(value.entries))) fail('世界书缺少 entries 数组或对象');
    const entries = Object.values(value.entries);
    if (entries.length > 2000) fail('单本世界书最多支持 2000 条条目');
    add('world_book', typeof value.name === 'string' && value.name.trim() ? value.name : fallback, typeof value.description === 'string' ? value.description : '从酒馆导入的世界书');
    for (const [index, entry] of entries.entries()) {
      if (!object(entry) || typeof entry.content !== 'string') fail(`世界书第 ${index + 1} 条缺少文本 content`);
      const keys = strings(entry.keys ?? entry.key);
      const name = [entry.name, entry.comment, keys[0]].find(v => typeof v === 'string' && v.trim()) || `世界条目 ${index + 1}`;
      add('world_entry', name, entry.content, keys, entry.disable === true || entry.enabled === false ? 'retired' : 'unconfirmed');
    }
  }
  if (card) {
    if (typeof data.name !== 'string' || !data.name.trim()) fail('角色卡缺少角色名称');
    const sections = [['description','角色描述'],['personality','性格'],['scenario','场景'],['first_mes','开场白'],['mes_example','对话示例']];
    const content = sections.filter(([key]) => typeof data[key] === 'string' && data[key]).map(([key,label]) => `## ${label}\n\n${data[key]}`);
    if (strings(data.alternate_greetings).length) content.push(`## 其他开场白\n\n${data.alternate_greetings.join('\n\n')}`);
    add('character_card', data.name, content.join('\n\n'));
    if (data.character_book) book(data.character_book, `${data.name}的世界书`);
    if (raw.spec === 'chara_card_v3') warnings.push('V3 仅映射通用文本和内嵌世界书；assets、额外问候与其他专属字段仅保存在原始 JSON 中。');
  } else book(data, typeof args.fileName === 'string' ? args.fileName.replace(/\.json$/i,'') : '导入世界书');
  return { format: card ? raw.spec || 'chara_card_v1' : 'world_info', fingerprint:hash(JSON.stringify(raw)), nodes, warnings, raw };
}
