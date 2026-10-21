import {createHash} from 'node:crypto';
import {orderedDirectory,directoryKey} from '../directory/order.ts';
import type {Group} from './groups.ts';
import type {MemoryPage} from './pages.ts';

interface Member {id:string;groupId?:string|null;pageId?:string|null;revision:number;updatedAt:string}
interface Novel {nodes:Record<string,Member>;memoryGroups?:Record<string,Group>;memoryPages?:Record<string,MemoryPage>;memoryPageFolders?:Record<string,string>;memoryFolderWorkspace?:boolean;directoryOrder?:Record<string,string[]>;revision:number;updatedAt:string}
/** Explicit, atomic upgrade on opening the resource explorer. Reads never migrate files.
 * Legacy pages become real folders, retaining IDs of all resources and their history. */
export function organizeMemoryWorkspace(novel:Novel) {
  const pages=Object.values(novel.memoryPages||{}),groups=novel.memoryGroups??={};
  const mapping=new Map<string,string>();
  for(const page of pages){
    let id='memory-folder-'+createHash('sha256').update(page.id).digest('hex').slice(0,24);
    let suffix=0;while(groups[id]||novel.nodes[id])id='memory-folder-'+createHash('sha256').update(page.id+':'+(++suffix)).digest('hex').slice(0,24);
    mapping.set(page.id,id);
  }
  const changed=!novel.memoryFolderWorkspace||pages.length>0;
  if(!changed)return {changed:false,folders:{}};
  const timestamp=new Date().toISOString();
  const order=[...orderedDirectory(Object.values(novel.nodes).filter(n=>!n.pageId),novel.directoryOrder?.graph),...pages.flatMap(page=>orderedDirectory(Object.values(novel.nodes).filter(n=>n.pageId===page.id),novel.directoryOrder?.[directoryKey('graph',page.id)]))];
  for(const page of pages){
    const id=mapping.get(page.id)!;
    groups[id]={id,name:page.name,summary:page.summary,revision:1,parentId:null,pageId:null,createdAt:page.createdAt,updatedAt:timestamp};
  }
  for(const group of Object.values(groups))if(group.pageId){group.parentId??=mapping.get(group.pageId)||null;group.pageId=null;group.revision++;group.updatedAt=timestamp;}
  for(const node of Object.values(novel.nodes))if(node.pageId){node.groupId??=mapping.get(node.pageId)||null;node.pageId=null;node.revision++;node.updatedAt=timestamp;}
  // History stays immutable. Restore remaps its legacy page via this lookup.
  novel.memoryPageFolders={...novel.memoryPageFolders,...Object.fromEntries(mapping)};
  novel.memoryPages={};novel.memoryFolderWorkspace=true;
  novel.directoryOrder={...Object.fromEntries(Object.entries(novel.directoryOrder||{}).filter(([key])=>!key.startsWith('graph:'))),graph:order.map(n=>n.id)};
  novel.revision++;novel.updatedAt=timestamp;
  return {changed:true,folders:Object.fromEntries(mapping)};
}
