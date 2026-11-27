import {QUERY_CAPABILITIES,queryInputSchema} from '../../workspace/queries/catalog.ts';

export const projectToolDescription = '管理作品库和卷、章、正文。所有会话包括 DSH 原生子 Agent 使用同一套作品选择规则：novel.list 查看作品，novel.focus {novelId} 记住本会话当前作品，或在单次操作显式提供 novelId；互不切换其他会话的焦点。novel.create {title,description?,requestId} 创建空白作品，不改变焦点。novel.handoff 返回作品索引和有限目录，不含正文。chapter.get 按 start/maxChars 读取。修改需 expectedRevision，chapter.update 的 content/append/patch:{oldText,newText} 三选一。删除 confirm:true；非空卷还需 chapterPolicy:detach/delete。';

/** DSH uses a value-schema DSL, not full JSON Schema. Runtime query validation
 * retains lengths/ranges; this adapter only describes the host's supported keys. */
function dshSchema(input:Record<string,any>):Record<string,any>{
  if(input.anyOf)return {oneOf:input.anyOf.map(dshSchema)};
  const output:Record<string,any>={};
  for(const key of ['type','description','enum','const'])if(input[key]!==undefined)output[key]=input[key];
  if(input.properties){output.properties=Object.fromEntries(Object.entries(input.properties).map(([key,value])=>[key,{...dshSchema(value as Record<string,any>),...(input.required?.includes(key)?{required:true}:{})}]));output.additionalProperties=input.additionalProperties===true;}
  if(input.items)output.items=dshSchema(input.items);
  return output;
}
/** Project read parameters and common writer parameters share one declared
 * vocabulary; the operation's own runtime rule still validates its shape. */
export function projectArgsSchema(){
  const properties=Object.fromEntries(Object.entries(Object.assign({},...QUERY_CAPABILITIES.filter(query=>query.tool==='cuigengji_project').map(query=>queryInputSchema(query).properties))).map(([key,value])=>[key,dshSchema(value as Record<string,any>)]));
  return {type:'object',additionalProperties:true,properties:{...properties,title:{type:'string'},description:{type:'string'},volumeId:{oneOf:[{type:'string'},{type:'null'}]},chapterId:{type:'string'},order:{type:'number'},content:{type:'string'},append:{type:'string'},patch:{type:'object',properties:{oldText:{type:'string'},newText:{type:'string'}},additionalProperties:false},expectedRevision:{type:'integer'},targetRevision:{type:'integer'},requestId:{type:'string'},confirm:{type:'boolean'},chapterPolicy:{type:'string',enum:['detach','delete']},includeContent:{type:'boolean'},revision:{type:'integer'},reason:{type:'string'}}};
}
