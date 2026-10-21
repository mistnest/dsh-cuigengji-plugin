/** Only current index metadata is attached. Full text and old revisions remain
 * behind explicit graph.get/history calls, independent of author navigation. */
export function linkedResources(refs:string[],nodes:Record<string,unknown>,offset=0,limit=12,novelId?:string) {
  const items=refs.slice(offset,offset+limit).map(id=>{
    const node=nodes[id] as {name?:string;summary?:string;revision?:number;status?:string;factType?:string;type?:string;deleted?:boolean}|undefined;
    if(!node||node.deleted)return {id,availability:node?'deleted':'missing'};
    return {id,availability:'current',name:(node.name||'').slice(0,160),summary:(node.summary||'').slice(0,600),revision:node.revision,status:node.status,factType:node.factType,type:node.type,read:{action:'graph.get',...(novelId?{novelId}:{}),nodeId:id}};
  });
  return {items,total:refs.length,nextOffset:offset+limit<refs.length?offset+limit:null};
}
