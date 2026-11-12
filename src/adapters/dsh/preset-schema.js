export const presetArgsSchema = { type: 'object', additionalProperties: true, properties: {
  novelId: { type: 'string', description: '目标作品；省略使用本会话当前作品' },
  identifier: { type: 'string', description: 'preset.get 可指定单条标识，返回该条原文及整套 revision；省略返回可编辑结构（含停用条目）' },
  input: { type: 'json', description: 'preset.preview/import 的原始 JSON 对象或文件文本；直接传内容，不传存储路径' },
  fileName: { type: 'string', description: '输入是文件文本时提供原文件名；.txt/.md 始终作为提示词，不拆成章节' },
  orderId: { type: 'string', description: '导入多个排列方案时选择其 character_id' },
  sourceNovelId: { type: 'string', description: '从多部作品的备份提取预设时选择来源作品；novelId 仍是写入目标' },
  policy: { type: 'string', enum: ['append', 'replace'], description: 'preset.import 必须明确：append 追加，replace 替换' },
  expectedRevision: { type: 'integer', description: '维护前从 preset.get/preview 取得的整套版本；无预设为 0。冲突后重读合并' },
  name: { type: 'string', description: 'preset.update 修改整套预设名称；条目名称放 operations 内' },
  enabled: { type: 'boolean', description: '整套预设启停。省略时，追加与修改保留原开关，首次导入或替换默认停用' },
  operations: { type: 'array', description: 'preset.update 的 1—200 项条目操作，一起提交；仅在作者要求维护预设时调用', items: {
    type: 'object', additionalProperties: false, properties: {
      op: { type: 'string', enum: ['create', 'update', 'delete', 'move'] },
      identifier: { type: 'string', description: '读取到的条目标识；create 可省略由工具生成' },
      name: { type: 'string' }, content: { type: 'string', description: '条目完整原文；局部修改可使用 patch' }, enabled: { type: 'boolean' },
      before: { oneOf: [{ type: 'string' }, { type: 'null' }], description: 'create/move 插到该条目前，null 为末尾；move 必填' },
      patch: { type: 'object', additionalProperties: false, properties: { oldText: { type: 'string' }, newText: { type: 'string' } }, description: '唯一原文替换；newText 为空删除该段' },
    },
  } },
  requestId: { type: 'string', description: '写入的唯一请求标识；仅原样重试复用' }, reason: { type: 'string' },
  chapterId: { type: 'string' }, chapterRevision: { type: 'integer' }, position: { type: 'string', enum: ['start', 'end'] },
  includeChapters: { type: 'boolean' }, nodeIds: { type: 'array', items: { type: 'string' } }, povNodeId: { type: 'string' },
} };
const jsonSchema = value => Array.isArray(value) ? value.map(jsonSchema) : value && typeof value === 'object'
  ? value.type === 'json' ? {} : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSchema(item)])) : value;
export const presetJsonSchema = jsonSchema(presetArgsSchema);
export const presetActionDescription = action => ({
  'preset.get': '维护预设前读取可编辑结构及 revision，含停用条目；identifier 可只取一条。不返回导入原件。正常写作使用自动注入，无须额外读取。',
  'preset.read': '读取本会话首次接手目标作品时使用的有效预设。维护最新预设用 preset.get。',
  'preset.preview': '预览提示词导入并返回目标预设 revision；不保存。input 是 JSON 对象或文件文本，TXT/Markdown 提供 fileName。',
  'preset.import': '按作者要求导入目标作品预设：input、policy:append/replace、expectedRevision、requestId；可带 fileName/orderId/enabled。追加保留原开关，首次导入或替换默认停用。',
  'preset.update': '按作者要求维护预设：expectedRevision、requestId，顶层 name/enabled；operations 的 create/update/delete/move 管条目，用 identifier 定位。保留未涉及条目和原导入元数据；正常写作的临时要求不自动保存为预设。',
}[action] || action);
