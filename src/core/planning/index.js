import { ensurePlanning, validatePlanning } from './model.js';
export { ensurePlanning, validatePlanning } from './model.js';
import { randomUUID } from 'node:crypto';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const copy=v=>structuredClone(v);
const own=(map,id)=>Object.prototype.hasOwnProperty.call(map,id);
const entity=(map,id)=>{if(!own(map,id))fail('NOT_FOUND','规划对象不存在');return map[id];};
const check=(item,revision)=>{if(item.revision!==revision)fail('CONFLICT',`规划版本已变化，当前版本 ${item.revision}`);};
const page=(values,args)=>{const offset=args.offset??0,limit=args.limit??50;if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>200)fail('INVALID_INPUT','分页参数无效');return {items:values.slice(offset,offset+limit),total:values.length,nextOffset:offset+limit<values.length?offset+limit:null};};
export function planningAction(novel,action,args,actor) {
  const board=ensurePlanning(novel);
  if(action==='planning.groups') return Object.values(board.groups);
  if(action==='planning.group.create') { const id=randomUUID(); board.groups[id]={id,revision:1,name:args.name,summary:args.summary||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; return board.groups[id]; }
  if(action==='planning.list'||action==='planning.search'){
    const q=(args.query||'').toLowerCase();
    const rows=Object.values(board.nodes).filter(n=>(args.includeDeleted||!n.deleted)&&(args.parentId===undefined||n.parentId===args.parentId)&&(args.groupId===undefined||n.groupId===args.groupId)&&(!args.status||n.status===args.status)&&(!args.thread||n.threads.includes(args.thread))&&(!q||`${n.title}\n${n.summary}`.toLowerCase().includes(q))).map(({content,...n})=>n);
    return {...page(rows,args),edges:Object.values(board.edges).filter(e=>!e.deleted),sequence:board.sequence};
  }
  if(action==='planning.get'){const node=entity(board.nodes,args.nodeId);return {node,edges:Object.values(board.edges).filter(e=>!e.deleted&&(e.from===node.id||e.to===node.id)),children:Object.values(board.nodes).filter(n=>!n.deleted&&n.parentId===node.id).map(({content,...n})=>n),sequence:board.sequence};}
  if(action==='planning.changes'||action==='planning.history'){
    const values=board.transactions.filter(t=>(args.after===undefined||t.sequence>args.after)&&(!args.nodeId||t.changes.some(c=>c.id===args.nodeId)));
    return {...page(action==='planning.history'?values.reverse():values,args),sequence:board.sequence};
  }
  if(!['planning.apply','planning.revert'].includes(action))fail('UNKNOWN_ACTION',action);
  if(typeof args.requestId!=='string'||!args.requestId)fail('INVALID_INPUT','规划修改必须提供 requestId');
  if(args.expectedSequence!==undefined&&args.expectedSequence!==board.sequence)fail('CONFLICT','规划结构在确认期间已变化，请重新核对删除范围');
  const draft=copy(board), touched=new Map(),mapping={};
  const remember=(collection,id)=>{const key=`${collection}:${id}`;if(!touched.has(key))touched.set(key,{collection,id,before:copy(draft[collection][id]??null)});};
  const stamp=()=>({lastSequence:board.sequence+1,updatedAt:new Date().toISOString(),actor:{kind:actor.kind==='human'?'human':'agent',sessionId:actor.sessionId||null}});
  const update=(collection,id,patch)=>{remember(collection,id);const previous=draft[collection][id];draft[collection][id]={...previous,...patch,id,revision:(previous?.revision||0)+1,...stamp()};};
  const resolve=id=>own(mapping,id)?mapping[id]:id;
  if(action==='planning.revert'){
    const transaction=board.transactions.find(t=>t.id===args.transactionId);if(!transaction)fail('NOT_FOUND','变更记录不存在');
    for(const change of transaction.changes){const current=entity(draft[change.collection],change.id);check(current,change.after.revision);update(change.collection,change.id,change.before||{...current,deleted:true});}
  }else{
    if(!Array.isArray(args.operations)||!args.operations.length||args.operations.length>200)fail('INVALID_INPUT','请提供 1–200 个规划操作');
    for(const op of args.operations){
      if(op.op==='node.create'){
        const id=randomUUID();if(op.ref){if(own(mapping,op.ref))fail('INVALID_INPUT','临时引用重复');Object.defineProperty(mapping,op.ref,{value:id,enumerable:true});}
        update('nodes',id,{title:'新规划',summary:'',content:'',scope:'near',status:'idea',parentId:null,threads:[],chapterRefs:[],memoryRefs:[],...pickNode(op.value),parentId:resolve(op.value?.parentId)||null,deleted:false});
      }else if(op.op==='node.update'){
        const id=resolve(op.id),node=entity(draft.nodes,id);check(node,op.expectedRevision);if(node.deleted)fail('DELETED','规划已删除');const value=pickNode(op.value);if(value.parentId)value.parentId=resolve(value.parentId);update('nodes',id,value);
      }else if(op.op==='node.delete'){
        const id=resolve(op.id),node=entity(draft.nodes,id);check(node,op.expectedRevision);if(op.confirm!==true)fail('CONFIRM_REQUIRED','删除需要确认');
        const children=Object.values(draft.nodes).filter(n=>!n.deleted&&n.parentId===id);
        if(children.length&&!['detach','subtree'].includes(op.childPolicy))fail('CONFIRM_REQUIRED','请选择移出子节点或删除子树');
        const ids=new Set([id]);if(op.childPolicy==='subtree'){let changed=true;while(changed){changed=false;for(const n of Object.values(draft.nodes))if(!n.deleted&&ids.has(n.parentId)&&!ids.has(n.id)){ids.add(n.id);changed=true;}}}
        else for(const child of children)update('nodes',child.id,{parentId:node.parentId});
        for(const target of ids)update('nodes',target,{deleted:true});
        for(const edge of Object.values(draft.edges))if(!edge.deleted&&(ids.has(edge.from)||ids.has(edge.to)))update('edges',edge.id,{deleted:true});
      }else if(op.op==='edge.create'){
        update('edges',randomUUID(),{from:resolve(op.value?.from),to:resolve(op.value?.to),type:op.value?.type||'next',label:op.value?.label||'',deleted:false});
      }else if(op.op==='edge.delete'){
        const id=resolve(op.id);check(entity(draft.edges,id),op.expectedRevision);if(op.confirm!==true)fail('CONFIRM_REQUIRED','删除关系需要确认');update('edges',id,{deleted:true});
      }else fail('INVALID_INPUT',`不支持的规划操作：${op.op}`);
    }
  }
  validatePlanning(draft,novel);
  const transaction={id:randomUUID(),sequence:board.sequence+1,...stamp(),reason:typeof args.reason==='string'?args.reason:'调整规划',changes:[...touched.values()].map(c=>({...c,after:copy(draft[c.collection][c.id])}))};
  draft.sequence=transaction.sequence;draft.transactions.push(transaction);novel.planning=draft;
  return {transactionId:transaction.id,sequence:draft.sequence,mapping,changed:transaction.changes.map(c=>({id:c.id,collection:c.collection,revision:c.after.revision}))};
}
function pickNode(value={}) {return Object.fromEntries(['title','summary','content','scope','status','parentId','groupId','threads','chapterRefs','memoryRefs'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));}
