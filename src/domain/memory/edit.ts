import {isDeepStrictEqual} from 'node:util';

type Row = Record<string, any>;
const fields = ['type','name','summary','content','storyTime','status','factType','sources','aliases','knownBy','dependsOn','groupId','pageId','position'];
const error = (code:string,message:string):never => {throw Object.assign(new Error(message),{code});};

/** Reject misspelled and misplaced edit fields rather than acknowledging a
 * save that silently ignored the requested change. Other actions have their
 * own argument shapes; this check only applies to single-card mutations. */
export function validateMemoryMutation(action:string,args:Row) {
  const allowed = new Set(['novelId','nodeId','expectedRevision','expectedHash','requestId','reason',
    ...(action === 'graph.update' ? [...fields,'patch'] : ['confirm'])]);
  const unknown = Object.keys(args).filter(key=>!allowed.has(key));
  if(unknown.length)error('INVALID_INPUT',`${action} 不支持参数：${unknown.join('、')}。${action==='graph.update'?'局部修改用 patch:{oldText,newText}，整段重写用 content。':'graph.delete 删除整张设定卡；仅删除卡内描述请用 graph.update 的 patch，newText 为空字符串。'}`);
  if(args.reason!==undefined&&typeof args.reason!=='string')error('INVALID_INPUT','reason 必须是文本');
  if(action==='graph.update'&&args.content!==undefined&&args.patch!==undefined)error('INVALID_INPUT','content 和 patch 只能选一个；summary 等其他字段可以同时更新');
}

/** Literal replacement of one uniquely located passage. Empty replacement
 * deletes that passage; no regex expansion or hidden whitespace conversion. */
export function patchMemoryContent(content:string,patch:unknown):string {
  if(!patch||typeof patch!=='object'||Array.isArray(patch))error('INVALID_INPUT','patch 必须为 {oldText,newText} 对象');
  const value=patch as Row,unknown=Object.keys(value).filter(key=>!['oldText','newText'].includes(key));
  if(unknown.length)error('INVALID_INPUT',`patch 不支持参数：${unknown.join('、')}；使用 oldText 和 newText`);
  if(typeof value.oldText!=='string'||!value.oldText.length)error('INVALID_INPUT','patch.oldText 必须是从当前 content 读取的非空原文');
  if(typeof value.newText!=='string')error('INVALID_INPUT','patch.newText 必须是文本；删除该段时填写空字符串');
  const offset=content.indexOf(value.oldText);
  if(offset===-1)error('PATCH_CONFLICT','待替换原文不存在；请重读 graph.get 的当前 content 后重新定位，不使用摘要或 renderedContent');
  if(content.indexOf(value.oldText,offset+1)!==-1)error('PATCH_CONFLICT','待替换原文匹配多处；请扩充 oldText 上下文，唯一定位后再修改');
  return content.slice(0,offset)+value.newText+content.slice(offset+value.oldText.length);
}

export function memoryChangedFields(before:Row,after:Row):string[] {
  return [...fields,'deleted'].filter(field=>!isDeepStrictEqual(before[field],after[field]));
}
