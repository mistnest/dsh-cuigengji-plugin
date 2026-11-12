import {createHash} from 'node:crypto';
import {parse as parseYaml} from 'yaml';
import type {Values,Json,VariablePatch} from './model.ts';
import {jsonValue,valueAt,toPointer,pointer,variableError} from './patch.ts';
const stringify=(v:Json)=>typeof v==='string'?v:JSON.stringify(v);
/** Pure rendering. Mutation macros are reported, never executed by a read. */
export function renderVariables(text:string,story:Values,local:Values,names:{user?:string;char?:string}={}){
  if(text.length>100000)variableError('一次最多渲染十万字');const warnings=new Set<string>();
  const content=text.replace(/\{\{([^{}]+)\}\}/g,(raw,body:string)=>{
    if(body==='user')return names.user||'作者';if(body==='char'){if(names.char)return names.char;warnings.add('未提供 char，保留原占位符');return raw;}
    const [op,name]=body.split('::');let value:Json|undefined;
    if(op==='var')value=valueAt(story,toPointer(name||''));
    else if(op==='getvar')value=valueAt(name==='stat_data'||name?.startsWith('stat_data.')?story:local,toPointer(name||''));
    else if(op==='getglobalvar')value=valueAt(story,'/tavernGlobal'+toPointer(name||''));
    else {warnings.add(/^(set|inc|dec|add).*var/.test(op)?'写入宏不在读取时执行；请先解析、预览，再通过变量补丁提交':'未支持的宏：'+op);return raw;}
    if(value===undefined){warnings.add('变量尚无值：'+name);return raw;}return stringify(value);
  });
  if(/<%|\{\{(?:eval|run)|<script\b/i.test(text))warnings.add('EJS、JavaScript 和扩展脚本不会执行');
  return {content,warnings:[...warnings]};
}
function literal(text:string):Json{
  const value=text.trim();if(value.startsWith("'")&&value.endsWith("'")){
    let result='';for(let i=1;i<value.length-1;i++){const c=value[i];if(c==='\\'){const n=value[++i];if(n===undefined)variableError('字符串转义不完整');result+=({n:'\n',r:'\r',t:'\t',"'":"'",'\\':'\\','"':'"'} as Record<string,string>)[n]??variableError('仅支持 JSON 字符串转义');}else result+=c;}return result;
  }
  try{const result=JSON.parse(value);jsonValue(result);return result;}catch{ return variableError('更新命令的值必须是 JSON 字面量，不执行表达式');}
}
function argumentsOf(text:string){const result:string[]=[];let start=0,depth=0,quote='',escaped=false;for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if('[{('.includes(c))depth++;else if(']})'.includes(c))depth--;else if(c===','&&depth===0){result.push(text.slice(start,i));start=i+1;}}result.push(text.slice(start));return result.map(literal);}
export function parseVariableUpdates(text:string){
  if(typeof text!=='string'||text.length>1_000_000)variableError('更新文本过长');
  const warnings:string[]=[],operations:VariablePatch[]=[];let body=(text.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/i)?.[1]||text).trim().replace(/^```(?:json)?\s*|\s*```$/g,'');
  if(body.startsWith('[')){
    let rows:any;try{rows=JSON.parse(body);}catch{return variableError('JSON Patch 无法解析');}if(!Array.isArray(rows)||rows.length>200)variableError('补丁最多二百项');
    for(const row of rows){if(!row||!['add','replace','remove','test','copy','move','inc','set','delete'].includes(row.op))variableError('不支持的补丁操作');operations.push({op:row.op,path:row.path,...(Object.hasOwn(row,'value')?{value:row.value}:{}),...(row.from!==undefined?{from:row.from}:{})});}
  }else{
    const regex=/_\.(set|add|remove|insert)\s*\(/g;let match:RegExpExecArray|null;
    while((match=regex.exec(body))){let i=regex.lastIndex,start=i,depth=1,quote='',escaped=false;for(;i<body.length;i++){const c=body[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='(')depth++;else if(c===')'&&--depth===0)break;}
      if(depth!==0)variableError('更新命令括号不完整');const args=argumentsOf(body.slice(start,i)),path=typeof args[0]==='string'?toPointer(args[0]):variableError('更新路径必须是字符串');
      if(match[1]==='set'){if(args.length<2||args.length>3)variableError('set 需要路径和值');if(args.length===3)operations.push({op:'test',path,value:args[1]});operations.push({op:'set',path,value:args.at(-1)});}
      else if(match[1]==='add')operations.push({op:'inc',path,value:args[1]});
      else if(match[1]==='insert')operations.push({op:'add',path:path+(args.length===2?'/-':'/'+String(args[1]).replaceAll('~','~0').replaceAll('/','~1')),value:args.at(-1)});
      else operations.push({op:'remove',path:path+(args.length>1?'/'+String(args[1]).replaceAll('~','~0').replaceAll('/','~1'):'')});
      regex.lastIndex=i+1;
    }
    if(!operations.length)variableError('未识别到 JSON Patch 或常见 MVU 更新命令');
    warnings.push('只解析受支持的字面量命令；不会执行 JavaScript、EJS 或任意函数。');
  }
  if(operations.length>200)variableError('补丁最多二百项');for(const op of operations){pointer(op.path);if(op.from!==undefined)pointer(op.from);if(Object.hasOwn(op,'value'))jsonValue(op.value);}return {operations,warnings};
}
export function importVariableSource(input:any){
  if(!input||typeof input!=='object'||JSON.stringify(input).length>2_000_000)variableError('变量来源必须是小于 2 MB 的 JSON');jsonValue(input);
  const story:Values={},local:Values={},warnings=new Set<string>();let hasGlobals=false;
  const raw=input as Record<string,any>,data=raw.data||raw,entries=data.entries||data.character_book?.entries||raw.prompts||data.prompts||[];
  const texts:{name:string;text:string}[]=[];
  for(const e of Array.isArray(entries)?entries:Object.values(entries) as any[]){if(typeof (e as any)?.content==='string')texts.push({name:String((e as any).name||(e as any).comment||''),text:(e as any).content});}
  for(const field of ['description','scenario','system_prompt','content'])if(typeof data[field]==='string')texts.push({name:field,text:data[field]});
  if(data.stat_data&&typeof data.stat_data==='object')story.stat_data=structuredClone(data.stat_data);
  for(const {name,text} of texts){
    const init=text.match(/<initvar>\s*([\s\S]*?)\s*<\/initvar>/i)?.[1]||(/\[?initvar\]?/i.test(name)?text:null);
    if(init){let value:any;try{value=parseYaml(init.replace(/^```(?:ya?ml|json)?\s*|\s*```$/g,''));jsonValue(value);}catch{return variableError('初始化变量无法解析：'+name);}if(!value||typeof value!=='object'||Array.isArray(value))return variableError('初始化变量需要对象');story.stat_data=structuredClone((value as Record<string,any>).stat_data||value);}
    for(const m of text.matchAll(/\{\{(setvar|setglobalvar)::([^{}:]+)::([^{}]*)\}\}/g)){
      const value=(()=>{try{return literal(m[3]);}catch{return m[3];}})(),path=toPointer(m[2]);
      pointer(path);
      if(path.split('/').length!==2){warnings.add('嵌套 setvar 初始化请在变量编辑器核对：'+m[2]);continue;}
      if(m[1]==='setglobalvar'){hasGlobals=true;(story.tavernGlobal??={}) as Values;(story.tavernGlobal as Values)[m[2]]=value;}
      else local[m[2]]=value;
    }
    for(const warning of renderVariables(text,story,local).warnings)warnings.add(warning);
  }
  warnings.add('普通 setvar 初值映射为会话局部默认值；MVU InitVar/stat_data 映射为这本作品的剧情状态。');
  if(hasGlobals)warnings.add('原酒馆跨聊天全局变量将放进本作品 tavernGlobal；不会与其他作品共享，导入时需要确认。');
  warnings.add('只兼容常见取值宏、初始化、JSON Patch 和字面量更新命令；原始来源保留，EJS/脚本/状态栏扩展不执行。');
  return {story,local,warnings:[...warnings],hasGlobals,digest:createHash('sha256').update(JSON.stringify(input)).digest('hex'),counts:{story:Object.keys(story).length,local:Object.keys(local).length}};
}
