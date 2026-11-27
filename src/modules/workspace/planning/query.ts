import {planningAction} from './rules/index.ts';
import {checkReadRevision,current,type Row} from '../queries/common.ts';
export function planningQuery(novel:Row,action:string,args:Row){
  // Legacy normalization remains an in-memory projection in a query.
  const projection=structuredClone(novel);
  const result:any=planningAction(projection as any,action,args,{kind:'external-agent'});
  if(action==='planning.get'){
    current(projection.planning.nodes,args.nodeId,'规划');checkReadRevision(result.node,args);
    const parent=result.node.parentId?projection.planning.nodes[result.node.parentId]:null;
    return {...result,parent:parent?Object.fromEntries(['id','title','summary','revision','status'].map(key=>[key,parent[key]])):null};
  }
  if(action==='planning.pages'&&args.query)return result.filter((page:Row)=>`${page.name}\n${page.summary}`.toLowerCase().includes(args.query.toLowerCase()));
  return result;
}
