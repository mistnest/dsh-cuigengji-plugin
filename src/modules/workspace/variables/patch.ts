import {isDeepStrictEqual} from 'node:util';
import type {Json,Values,VariablePatch,VariableDefinition} from './model.ts';
export const variableError=(message:string,code='INVALID_VARIABLE'):never=>{throw Object.assign(new Error(message),{code});};
const forbidden=new Set(['__proto__','prototype','constructor']);
export function jsonValue(value:any,depth=0):asserts value is Json{
  if(depth>24)variableError('变量嵌套超过 24 层');
  if(value===null||['string','boolean'].includes(typeof value))return;
  if(typeof value==='number'){if(!Number.isFinite(value))variableError('变量数字必须有限');return;}
  if(!value||typeof value!=='object'||![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)))variableError('变量值必须是 JSON 数据');
  if(Array.isArray(value)&&Object.keys(value).length!==value.length)variableError('变量数组不能包含空位或额外属性');
  for(const [key,item] of Object.entries(value)){if(forbidden.has(key))variableError('变量路径包含保留名称');jsonValue(item,depth+1);}
}
export function pointer(path:string){if(typeof path!=='string'||path.length>500||path&&!path.startsWith('/'))variableError('变量路径使用 JSON Pointer，例如 /人物/萧炎/等级');return path?path.slice(1).split('/').map(p=>{if(/~(?![01])/g.test(p))variableError('变量路径转义无效');const key=p.replaceAll('~1','/').replaceAll('~0','~');if(forbidden.has(key))variableError('变量路径包含保留名称');return key;}):[];}
export const toPointer=(value:string)=>value.startsWith('/')||value===''?value:'/'+value.split('.').map(v=>v.replaceAll('~','~0').replaceAll('/','~1')).join('/');
export function valueAt(data:Values,path:string):Json|undefined{let current:any=data;for(const key of pointer(path)){if(!current||typeof current!=='object'||!Object.hasOwn(current,key))return undefined;current=current[key];}return structuredClone(current);}
export const pathsOverlap=(a:string,b:string)=>a===b||a===''||b===''||a.startsWith(b+'/')||b.startsWith(a+'/');
export function applyVariablePatch(initial:Values,operations:VariablePatch[],definitions:VariableDefinition[]=[]):Values{
  if(!Array.isArray(operations)||!operations.length||operations.length>200)variableError('每次提交 1—200 项变量变更');let data:Values=structuredClone(initial);
  for(const patch of operations){
    if(!patch||!['set','inc','delete','test','add','replace','remove','copy','move'].includes(patch.op))variableError('不支持的变量操作');const keys=pointer(patch.path),old=valueAt(data,patch.path);let value=patch.value;
    if(patch.op==='test'){if(!isDeepStrictEqual(old,value))variableError('变量校验条件已变化：'+patch.path,'CONFLICT');continue;}
    if(patch.op==='copy'||patch.op==='move'){if(typeof patch.from!=='string')variableError('复制 / 移动需要 from 路径');value=valueAt(data,patch.from!);if(value===undefined)variableError('来源变量不存在');if(patch.op==='move'){if(patch.from===patch.path)continue;if(patch.path.startsWith(patch.from!+'/'))variableError('不能把变量移到自己的子路径');data=applyVariablePatch(data,[{op:'remove',path:patch.from!}]);}}
    if(patch.op==='inc'){if(typeof old!=='number'||typeof value!=='number'||!Number.isFinite(old+value))return variableError('递增要求原值和增量都是有限数字');value=old+value;}
    if(patch.op==='replace'&&old===undefined)variableError('替换的变量不存在：'+patch.path);
    if(!keys.length){if(['delete','remove'].includes(patch.op))variableError('不能删除整个变量根');jsonValue(value);if(!value||Array.isArray(value)||typeof value!=='object')variableError('变量根必须是对象');data=structuredClone(value) as Values;continue;}
    let parent:any=data;for(const key of keys.slice(0,-1)){if(!parent||typeof parent!=='object')variableError('变量父路径不是对象');if(!Object.hasOwn(parent,key)) {if(patch.op!=='set')variableError('变量父路径不存在');parent[key]={};}parent=parent[key];}
    if(!parent||typeof parent!=='object')variableError('变量父路径不是对象');let key=keys.at(-1)!;
    const insert=['add','copy','move'].includes(patch.op);
    if(Array.isArray(parent)){if(key==='-'&&insert)key=String(parent.length);if(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>parent.length||Number(key)===parent.length&&!insert&&patch.op!=='set')variableError('数组下标无效');}
    if(['delete','remove'].includes(patch.op)){if(!Object.hasOwn(parent,key))variableError('删除的变量不存在：'+patch.path);if(Array.isArray(parent))parent.splice(Number(key),1);else delete parent[key];}
    else {jsonValue(value);if(Array.isArray(parent)&&insert)parent.splice(Number(key),0,structuredClone(value));else parent[key]=structuredClone(value);}
  }
  jsonValue(data);if(Buffer.byteLength(JSON.stringify(data),'utf8')>1_000_000)variableError('单份变量快照不能超过 1 MB');
  for(const d of definitions){const value=valueAt(data,d.path);if(value===undefined)continue;const type=value===null?'null':Array.isArray(value)?'array':typeof value;if(d.type&&type!==d.type)variableError(`${d.name} 需要 ${d.type} 类型`);if(d.schema)checkSchema(value,d.schema,d.name);}
  return data;
}
function checkSchema(value:Json,schema:Record<string,any>,label:string,depth=0){
  if(depth>24)variableError('schema 嵌套过深');const type=value===null?'null':Array.isArray(value)?'array':typeof value;
  if(schema.type&&!(Array.isArray(schema.type)?schema.type:[schema.type]).includes(type))variableError(label+' 类型不符合约束');
  if(schema.enum&&!schema.enum.some((v:Json)=>isDeepStrictEqual(v,value)))variableError(label+' 不在可选值中');
  if(typeof value==='number'&&(schema.minimum!==undefined&&value<schema.minimum||schema.maximum!==undefined&&value>schema.maximum))variableError(label+' 超出数值范围');
  if(typeof value==='string'&&schema.maxLength!==undefined&&value.length>schema.maxLength)variableError(label+' 文字过长');
  if(Array.isArray(value)&&schema.items)for(const item of value)checkSchema(item,schema.items,label,depth+1);
  if(value&&typeof value==='object'&&!Array.isArray(value)){for(const key of schema.required||[])if(!Object.hasOwn(value,key))variableError(label+' 缺少 '+key);for(const [key,item] of Object.entries(value))if(schema.properties?.[key])checkSchema(item,schema.properties[key],label+'.'+key,depth+1);}
}
