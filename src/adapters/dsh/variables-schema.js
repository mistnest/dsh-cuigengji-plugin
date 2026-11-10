export const variablesArgsSchema={type:'object',additionalProperties:true,properties:{
  novelId:{type:'string',description:'目标作品；省略使用本会话焦点'},
  chapterId:{type:'string',description:'读取指定剧情位置，写前文时必须明确，避免误用后文状态'},
  chapterRevision:{type:'integer',description:'已读取的章节版本，至少为 1'},position:{type:'string',enum:['start','end']},
  scope:{type:'string',enum:['story','session'],description:'长期作品状态或当前会话草稿'},
  path:{type:'string',description:'JSON Pointer 路径，例如 /stat_data/主角/等级'},
  snapshotId:{type:'string',description:'指定历史快照；restore 会产生新版本'},
  baseRevision:{type:'integer',description:'从 read 返回的总版本读取，不手工加减；至少为 0'},
  requestId:{type:'string',description:'提交必填；只有原样重试复用'},
  anchor:{type:'object',additionalProperties:false,properties:{kind:{type:'string',enum:['initial','chapter']},chapterId:{type:'string'},chapterRevision:{type:'integer',description:'已读取的章节版本，至少为 1'},position:{type:'string',enum:['start','end']},label:{type:'string'}}},
  operations:{type:'array',description:'1—200 个补丁；每项必须包含 op 和 path，值使用 JSON',items:{type:'object',additionalProperties:false,properties:{op:{type:'string',enum:['set','inc','delete','test','add','replace','remove','copy','move']},path:{type:'string'},value:{type:'json'},from:{type:'string'}}}},
  text:{type:'string',description:'render 是只读模板；parse 仅解析更新命令，不执行'},
  reason:{type:'string'},userName:{type:'string'},characterName:{type:'string'},includeData:{type:'boolean'},limit:{type:'integer',description:'每页 1—200 条'},offset:{type:'integer',description:'非负分页起点'},
}};
// DSH's value-schema DSL spells an arbitrary JSON value as `type:json`;
// MCP takes standard JSON Schema, where the equivalent is the empty schema.
const jsonSchema=value=>Array.isArray(value)?value.map(jsonSchema):value&&typeof value==='object'?value.type==='json'?{}:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,jsonSchema(item)])):value;
export const variablesJsonSchema=jsonSchema(variablesArgsSchema);
export const variableActionDescription=action=>`${action}：作品可选剧情变量。config/list 先看是否启用和索引；read 带 chapterId/position 或 snapshotId 定位；render 只读取取值宏，parse 只把 JSON Patch/MVU 转为补丁。preview 不写数据；patch/restore 需 baseRevision、requestId、anchor，写旧章先核对当前正文版本。互不相交路径可合并；冲突重读、请作者决定，禁止直接覆盖。scope:session 是当前会话草稿；story 是作品状态。没有自动整库注入，也不执行 JS/EJS。`;
