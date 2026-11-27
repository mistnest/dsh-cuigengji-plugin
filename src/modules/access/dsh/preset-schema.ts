import {jsonSchema,nativeValueSchema} from './schema-format.ts';
export const readItemsSchema = {type:'array',minItems:1,maxItems:12,description:'同一作品中已知的资料 ID，按填写顺序返回原文片段。',
  items:{type:'object',additionalProperties:false,required:['kind','id'],properties:{
    kind:{type:'string',enum:['chapter','setting','planning']},id:{type:'string'},start:{type:'integer',minimum:0},
    maxChars:{type:'integer',minimum:1,maximum:48000},expectedRevision:{type:'integer',minimum:1},
  }}};
export const presetToolDescription = 'binding.get 查看本会话当前作品。creativeMemory.read 默认列标题，query 搜索，section 读一段，full:true 读全文。creativeMemory.update 维护已商定的跨章决定，使用 expectedRevision、expectedHash、requestId 和 append、patch 或 content。preset.* 供旧格式兼容。作者要求导入/修改预设时：preset.get {identifier?} 读最新保存的可编辑结构和 revision（含停用条目，无导入原件）；preset.preview {input,fileName?,orderId?} 只预览；preset.import {input,policy:append/replace,expectedRevision,requestId,fileName?,orderId?,enabled?} 导入目标作品预设，追加保留原开关，首次导入或替换默认停用；preset.update {expectedRevision,requestId,name?,enabled?,operations?} 修改，operations 用 op:create/update/delete/move、identifier 定位条目，update 的 content/patch:{oldText,newText} 二选一，move 的 before 为目标标识或 null（末尾）。保留其他条目和元数据，冲突重读。临时写法不自动保存为预设。已知多条资料 ID 时，context.readMany {novelId,items:[{kind,id}]} 合读章节、设定与规划；逐项返回原文、状态和版本。context.get 按需读取正文参考。';

export const presetArgsSchema = { type: 'object', additionalProperties: true, properties: {
  items:nativeValueSchema(readItemsSchema),
  novelId: { type: 'string', description: '目标作品；省略使用本会话当前作品' },
  query:{type:'string'}, section:{type:'integer'}, full:{type:'boolean'}, expectedHash:{type:'string',description:'读取时的 contentHash'},
  content:{type:'string',description:'整份 Markdown，空文本清空'}, append:{type:'string',description:'新增 Markdown 段落'},
  patch:{type:'object',additionalProperties:false,properties:{oldText:{type:'string'},newText:{type:'string'}}},
  identifier: { type: 'string', description: 'preset.get 可指定单条标识，返回该条原文及整套 revision；省略返回可编辑结构（含停用条目）' },
  input: { type: 'json', description: 'preset.preview/import 的原始 JSON 对象或文件文本；直接传内容，不传存储路径' },
  fileName: { type: 'string', description: '输入是文件文本时提供原文件名；.txt/.md 始终作为提示词，不拆成章节' },
  orderId: { type: 'string', description: '导入多个排列方案时选择其 character_id' },
  sourceNovelId: { type: 'string', description: '从多部作品的备份提取预设时选择来源作品；novelId 仍是写入目标' },
  policy: { type: 'string', enum: ['append', 'replace'], description: 'preset.import 必须明确：append 追加，replace 替换' },
  expectedRevision: { type: 'integer', description: '读取创作记忆或旧预设时返回的 revision。冲突后重读合并' },
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
export const presetJsonSchema = jsonSchema({...presetArgsSchema,properties:{...presetArgsSchema.properties,items:readItemsSchema}});
export const presetActionDescription = (action: string) => (({
  'creativeMemory.read':'默认列出本书创作记忆的标题；query 搜索、section 读对应段，full:true 读全文，expectedHash 可固定版本。',
  'context.readMany':'同一作品内合读已知章节、设定和规划；items:[{kind,id,start?,maxChars?,expectedRevision?}]。逐项核对 ok、revision、status；nextStart 非空时带版本续读。',
  'creativeMemory.update':'维护已商定的长期创作决定，提供 expectedRevision、expectedHash、requestId。append 新增，patch:{oldText,newText} 改原文，content 替换全文。',
  'preset.get': '维护预设前读取可编辑结构及 revision，含停用条目；identifier 可只取一条。不返回导入原件。创作记忆另用 creativeMemory.read。',
  'preset.read': '读取本会话首次接手目标作品时使用的有效预设。维护最新预设用 preset.get。',
  'preset.preview': '预览提示词导入并返回目标预设 revision；不保存。input 是 JSON 对象或文件文本，TXT/Markdown 提供 fileName。',
  'preset.import': '按作者要求导入目标作品预设：input、policy:append/replace、expectedRevision、requestId；可带 fileName/orderId/enabled。追加保留原开关，首次导入或替换默认停用。',
  'preset.update': '按作者要求维护预设：expectedRevision、requestId，顶层 name/enabled；operations 的 create/update/delete/move 管条目，用 identifier 定位。保留未涉及条目和原导入元数据；正常写作的临时要求不自动保存为预设。',
} as Record<string,string>)[action] || action);
