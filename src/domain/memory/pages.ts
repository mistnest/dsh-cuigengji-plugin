import {randomUUID} from 'node:crypto';
export interface MemoryPage {id:string;revision:number;name:string;summary:string;createdAt:string;updatedAt:string}
interface Novel {memoryPages?:Record<string,MemoryPage>;memoryGroups?:Record<string,{pageId?:string|null}>;nodes:Record<string,{deleted?:boolean;pageId?:string|null}>;revision:number;updatedAt:string}
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function memoryPageId(novel:Novel,value:unknown):string|null {
  if(value===undefined||value===null)return null;
  if(typeof value!=='string'||!Object.hasOwn(novel.memoryPages||{},value))fail('NOT_FOUND','设定画布不存在');
  return value as string;
}
export function validateMemoryPages(novel:Novel):void {
  if(novel.memoryPages!==undefined&&!record(novel.memoryPages))fail('INVALID_BACKUP','设定画布格式无效');
  for(const [id,page] of Object.entries(novel.memoryPages||{}))if(!record(page)||id!==page.id||!Number.isSafeInteger(page.revision)||page.revision<1||typeof page.name!=='string'||!page.name.trim()||typeof page.summary!=='string')fail('INVALID_BACKUP','设定画布无效');
  for(const node of Object.values(novel.nodes))if(!node.deleted)memoryPageId(novel,node.pageId);
}
export function memoryPageAction(novel:Novel,action:string,args:Record<string,unknown>):unknown {
  const groups=Object.values(novel.memoryGroups||{}),nodes=Object.values(novel.nodes);
  if(action==='graph.pages')return [{id:null,name:'设定总览',summary:'原有设定与默认画布',revision:0},...Object.values(novel.memoryPages||{})].map(page=>({...page,nodeCount:nodes.filter(n=>!n.deleted&&(n.pageId??null)===page.id).length,groupCount:groups.filter(g=>(g.pageId??null)===page.id).length,decorationCount:0}));
  const name=(value:unknown)=>typeof value==='string'&&!!value.trim()?value:fail('INVALID_INPUT','画布名称不能为空');
  const summary=(value:unknown)=>typeof value==='string'?value:fail('INVALID_INPUT','画布说明必须是文本');
  let result:MemoryPage;
  if(action==='graph.page.create'){
    const time=new Date().toISOString();result={id:randomUUID(),revision:1,name:name(args.name),summary:summary(args.summary??''),createdAt:time,updatedAt:time};
    novel.memoryPages??={};novel.memoryPages[result.id]=result;
  }else{
    const id=memoryPageId(novel,args.pageId);if(!id)fail('INVALID_INPUT','默认设定画布不能删除或重命名');
    result=novel.memoryPages![id!];if(args.expectedRevision!==result.revision)fail('CONFLICT','设定画布已变化，请重新读取');
    if(action==='graph.page.delete'){
      if(args.confirm!==true)fail('CONFIRM_REQUIRED','删除画布需要确认');
      if(nodes.some(n=>!n.deleted&&n.pageId===id)||groups.some(g=>g.pageId===id))fail('PAGE_NOT_EMPTY','请先移出设定并解散文件夹，再删除空画布');
      delete novel.memoryPages![id!];
    }else if(action==='graph.page.update'){
      const patch={name:args.name===undefined?result.name:name(args.name),summary:args.summary===undefined?result.summary:summary(args.summary)};
      Object.assign(result,patch,{revision:result.revision+1,updatedAt:new Date().toISOString()});
    }else return fail('UNKNOWN_ACTION',action);
  }
  novel.revision++;novel.updatedAt=new Date().toISOString();return result;
}
