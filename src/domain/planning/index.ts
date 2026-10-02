import type { Board, Collection, Change, Decoration, PlanningEntity, PlanningNode, PlanningNovel, PlanningArgs, Operation } from '../../contracts/planning.ts';
import { ensurePlanning, validatePlanning } from './model.ts';
export { ensurePlanning, validatePlanning } from './model.ts';
import { randomUUID } from 'node:crypto';
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
const copy=<T>(v:T):T=>structuredClone(v);
const own=(map:object,id:string)=>Object.prototype.hasOwnProperty.call(map,id);
const entity=<T>(map:Record<string,T>,id:string|undefined):T=>{if(!id||!own(map,id))fail('NOT_FOUND','规划对象不存在');return map[id!];};
const check=(item:{revision:number},revision:number|undefined)=>{if(item.revision!==revision)fail('CONFLICT',`规划版本已变化，当前版本 ${item.revision}`);};
const page=<T>(values:T[],args:PlanningArgs)=>{const offset=args.offset??0,limit=args.limit??50;if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>200)fail('INVALID_INPUT','分页参数无效');return {items:values.slice(offset,offset+limit),total:values.length,nextOffset:offset+limit<values.length?offset+limit:null};};
export function planningAction(novel:PlanningNovel,action:string,args:PlanningArgs,actor:{kind?:string;sessionId?:string}): unknown {
  const board=ensurePlanning(novel);
  const inPage=(node:{pageId?:string|null})=>args.pageId===undefined||(node.pageId??null)===args.pageId;
  if(args.pageId!==undefined&&args.pageId!==null&&(!own(board.pages||{},args.pageId)||board.pages[args.pageId].deleted))fail('NOT_FOUND','规划页面不存在');
  if(action==='planning.pages')return [{id:null,name:'主线规划',summary:'原有规划与默认页面',revision:0},...Object.values(board.pages||{}).filter(p=>!p.deleted)].map(p=>({...p,nodeCount:Object.values(board.nodes).filter(n=>!n.deleted&&(n.pageId??null)===p.id).length,decorationCount:Object.values(board.decorations||{}).filter(d=>!d.deleted&&d.pageId===p.id).length}));
  if(action==='planning.decorations')return {...page(Object.values(board.decorations||{}).filter(d=>(args.includeDeleted||!d.deleted)&&inPage(d)),args),sequence:board.sequence};
  if(action.startsWith('planning.page.')){
    const op=action.slice('planning.'.length) as 'page.create'|'page.update'|'page.delete';
    const result=planningAction(novel,'planning.apply',{...args,operations:[{op,id:args.pageId,expectedRevision:args.expectedRevision,confirm:args.confirm,ref:'page',value:{name:args.name,summary:args.summary}} as Operation]},actor) as {mapping:Record<string,string>;sequence:number;transactionId:string};
    return {...novel.planning!.pages[result.mapping.page||args.pageId||''],sequence:result.sequence,transactionId:result.transactionId};
  }
  if(action==='planning.continue'){
    const source=entity(board.nodes,args.nodeId);check(source,args.expectedRevision);
    if(source.deleted)fail('DELETED','起点已删除');
    if(typeof args.value?.title!=='string'||!args.value.title.trim())fail('INVALID_INPUT','请填写下一步情节标题');
    const result=planningAction(novel,'planning.apply',{...args,reason:args.reason||`从「${source.title}」继续推进`,operations:[
      {op:'node.create',ref:'continuation',value:{...args.value,pageId:source.pageId??null,groupId:args.value?.groupId===undefined?source.groupId??null:args.value.groupId}},
      {op:'edge.create',value:{from:source.id,to:'continuation',type:'next'}},
    ]},actor) as {mapping:Record<string,string>;transactionId:string;sequence:number};
    const {content,...node}=novel.planning!.nodes[result.mapping.continuation];
    return {...result,node,from:source.id};
  }
  if(action==='planning.groups') return Object.values(board.groups).filter(g=>!g.deleted);
  if(action.startsWith('planning.group.')) {
    const op=action.slice('planning.'.length) as 'group.create'|'group.update'|'group.delete';
    const result=planningAction(novel,'planning.apply',{...args,operations:[{op,id:args.groupId,expectedRevision:args.expectedRevision,confirm:args.confirm,ref:'group',value:{name:args.name,summary:args.summary}} as Operation]},actor) as {mapping:Record<string,string>;sequence:number;transactionId:string};
    return {...novel.planning!.groups[result.mapping.group||args.groupId||''],sequence:result.sequence,transactionId:result.transactionId};
  }
  if(action==='planning.list'||action==='planning.search'){
    const q=(args.query||'').toLowerCase();
    const rows=Object.values(board.nodes).filter(n=>inPage(n)&&(args.includeDeleted||!n.deleted)&&(args.parentId===undefined||n.parentId===args.parentId)&&(args.groupId===undefined||(n.groupId??null)===args.groupId)&&(!args.status||n.status===args.status)&&(!args.thread||n.threads.includes(args.thread))&&(!q||`${n.title}\n${n.summary}`.toLowerCase().includes(q))).map(({content,...n})=>n);
    return {...page(rows,args),edges:Object.values(board.edges).filter(e=>!e.deleted&&inPage(board.nodes[e.from])),sequence:board.sequence};
  }
  if(action==='planning.get'){const node=entity(board.nodes,args.nodeId),edges=Object.values(board.edges).filter(e=>!e.deleted&&(e.from===node.id||e.to===node.id));const neighbors=Object.values(board.nodes).filter(n=>!n.deleted&&n.id!==node.id&&edges.some(e=>e.from===n.id||e.to===n.id)).map(({content,...n})=>n);return {node,edges,neighbors,flow:{previous:neighbors.filter(n=>edges.some(e=>e.from===n.id&&e.to===node.id)),next:neighbors.filter(n=>edges.some(e=>e.from===node.id&&e.to===n.id))},children:Object.values(board.nodes).filter(n=>!n.deleted&&n.parentId===node.id).map(({content,...n})=>n),sequence:board.sequence};}
  if(action==='planning.changes'||action==='planning.history'){
    const values=board.transactions.filter(t=>(args.after===undefined||t.sequence>args.after)&&(!args.nodeId||t.changes.some(c=>c.id===args.nodeId)));
    return {...page(action==='planning.history'?values.reverse():values,args),sequence:board.sequence};
  }
  if(!['planning.apply','planning.revert'].includes(action))fail('UNKNOWN_ACTION',action);
  if(typeof args.requestId!=='string'||!args.requestId)fail('INVALID_INPUT','规划修改必须提供 requestId');
  if(args.expectedSequence!==undefined&&args.expectedSequence!==board.sequence)fail('CONFLICT','规划结构在确认期间已变化，请重新核对删除范围');
  const draft=copy(board), touched=new Map<string,Omit<Change,'after'>>(),mapping:Record<string,string>={};
  draft.pages??={};draft.decorations??={};
  const remember=(collection:Collection,id:string)=>{const key=`${collection}:${id}`;if(!touched.has(key))touched.set(key,{collection,id,before:copy(draft[collection][id]??null)});};
  const stamp=()=>({lastSequence:board.sequence+1,updatedAt:new Date().toISOString(),actor:{kind:actor.kind==='human'?'human':'agent',sessionId:actor.sessionId||null}});
  const update=<K extends Collection>(collection:K,id:string,patch:Partial<Board[K][string]>)=>{remember(collection,id);const previous=draft[collection][id];(draft[collection] as Record<string,PlanningEntity>)[id]={...previous,...patch,id,revision:(previous?.revision||0)+1,...stamp()} as PlanningEntity;};
  const resolve=(id:string|null|undefined):string=>id&&(own(mapping,id)?mapping[id]:id)||'';
  if(action==='planning.revert'){
    const transaction=board.transactions.find(t=>t.id===args.transactionId);if(!transaction)fail('NOT_FOUND','变更记录不存在');
    for(const change of transaction!.changes){const current=entity<PlanningEntity>(draft[change.collection],change.id);check(current,change.after.revision);update(change.collection,change.id,change.before||{...current,deleted:true});}
  }else{
    if(!Array.isArray(args.operations)||!args.operations.length||args.operations.length>200)fail('INVALID_INPUT','请提供 1–200 个规划操作');
    for(const op of args.operations!){
      if(op.op==='page.create'){
        const id=randomUUID();if(op.ref){if(own(mapping,op.ref))fail('INVALID_INPUT','临时引用重复');Object.defineProperty(mapping,op.ref,{value:id,enumerable:true});}
        update('pages',id,{name:op.value?.name,summary:op.value?.summary??'',deleted:false});
      }else if(op.op==='page.update'||op.op==='page.delete'){
        const id=resolve(op.id),p=entity(draft.pages,id);check(p,op.expectedRevision);if(p.deleted)fail('DELETED','页面已删除');
        if(op.op==='page.delete'){
          if(op.confirm!==true)fail('CONFIRM_REQUIRED','删除页面需要确认');
          if([...Object.values(draft.nodes),...Object.values(draft.decorations)].some(n=>!n.deleted&&n.pageId===id))fail('PAGE_NOT_EMPTY','请先移出情节并移除批注，再删除空页面');
          update('pages',id,{deleted:true});
        }else update('pages',id,Object.fromEntries((['name','summary'] as const).filter(k=>op.value?.[k]!==undefined).map(k=>[k,op.value![k]])));
      }else if(op.op==='decoration.create'){
        const id=randomUUID();if(op.ref){if(own(mapping,op.ref))fail('INVALID_INPUT','临时引用重复');Object.defineProperty(mapping,op.ref,{value:id,enumerable:true});}
        update('decorations',id,{kind:'note',title:'',content:'',position:{x:40,y:60},width:280,height:160,color:'sand',fontSize:18,fontFamily:'sans',...pickDecoration(op.value),pageId:resolve(op.value?.pageId)||null,deleted:false});
      }else if(op.op==='decoration.update'||op.op==='decoration.delete'){
        const id=resolve(op.id),d=entity(draft.decorations,id);check(d,op.expectedRevision);if(d.deleted)fail('DELETED','批注已删除');
        if(op.op==='decoration.delete'){if(op.confirm!==true)fail('CONFIRM_REQUIRED','删除批注需要确认');update('decorations',id,{deleted:true});}
        else {const value=pickDecoration(op.value);if(value.pageId)value.pageId=resolve(value.pageId);update('decorations',id,value);}
      }else if(op.op==='group.create'){
        const id=randomUUID();if(op.ref){if(own(mapping,op.ref))fail('INVALID_INPUT','临时引用重复');Object.defineProperty(mapping,op.ref,{value:id,enumerable:true});}
        update('groups',id,{name:op.value?.name,summary:op.value?.summary??'',deleted:false});
      }else if(op.op==='group.update'||op.op==='group.delete'){
        const id=resolve(op.id),group=entity(draft.groups,id);check(group,op.expectedRevision);if(group.deleted)fail('DELETED','分组已删除');
        if(op.op==='group.delete'){
          if(op.confirm!==true)fail('CONFIRM_REQUIRED','删除分组需要确认');
          for(const node of Object.values(draft.nodes))if(node.groupId===id)update('nodes',node.id,{groupId:null});
          update('groups',id,{deleted:true});
        }else update('groups',id,Object.fromEntries((['name','summary'] as const).filter(k=>op.value?.[k]!==undefined).map(k=>[k,op.value![k]])));
      }else if(op.op==='node.create'){
        const id=randomUUID();if(op.ref){if(own(mapping,op.ref))fail('INVALID_INPUT','临时引用重复');Object.defineProperty(mapping,op.ref,{value:id,enumerable:true});}
        update('nodes',id,{title:'新规划',summary:'',content:'',scope:'unspecified',status:'idea',threads:[],chapterRefs:[],memoryRefs:[],...pickNode(op.value),pageId:resolve(op.value?.pageId)||null,groupId:resolve(op.value?.groupId)||null,parentId:resolve(op.value?.parentId)||null,deleted:false});
      }else if(op.op==='node.update'){
        const id=resolve(op.id),node=entity(draft.nodes,id);check(node,op.expectedRevision);if(node.deleted)fail('DELETED','规划已删除');const value=pickNode(op.value);if(value.parentId)value.parentId=resolve(value.parentId);if(value.groupId)value.groupId=resolve(value.groupId);if(value.pageId)value.pageId=resolve(value.pageId);update('nodes',id,value);
      }else if(op.op==='node.delete'){
        const id=resolve(op.id),node=entity(draft.nodes,id);check(node,op.expectedRevision);if(op.confirm!==true)fail('CONFIRM_REQUIRED','删除需要确认');
        const children=Object.values(draft.nodes).filter(n=>!n.deleted&&n.parentId===id);
        if(children.length&&!['detach','subtree'].includes(op.childPolicy||''))fail('CONFIRM_REQUIRED','请选择移出子节点或删除子树');
        const ids=new Set([id]);if(op.childPolicy==='subtree'){let changed=true;while(changed){changed=false;for(const n of Object.values(draft.nodes))if(!n.deleted&&n.parentId!==null&&ids.has(n.parentId)&&!ids.has(n.id)){ids.add(n.id);changed=true;}}}
        else for(const child of children)update('nodes',child.id,{parentId:node.parentId});
        for(const target of ids)update('nodes',target,{deleted:true});
        for(const edge of Object.values(draft.edges))if(!edge.deleted&&(ids.has(edge.from)||ids.has(edge.to)))update('edges',edge.id,{deleted:true});
      }else if(op.op==='edge.create'){
        update('edges',randomUUID(),{from:resolve(op.value?.from),to:resolve(op.value?.to),type:op.value?.type||'next',label:op.value?.label||'',deleted:false});
      }else if(op.op==='edge.update'){
        const id=resolve(op.id),edge=entity(draft.edges,id);check(edge,op.expectedRevision);if(edge.deleted)fail('DELETED','关系已删除');
        update('edges',id,Object.fromEntries((['from','to','type','label'] as const).filter(k=>op.value?.[k]!==undefined).map(k=>[k,k==='from'||k==='to'?resolve(op.value![k]):op.value![k]])));
      }else if(op.op==='edge.delete'){
        const id=resolve(op.id);check(entity(draft.edges,id),op.expectedRevision);if(op.confirm!==true)fail('CONFIRM_REQUIRED','删除关系需要确认');update('edges',id,{deleted:true});
      }else fail('INVALID_INPUT',`不支持的规划操作`);
    }
  }
  validatePlanning(draft,novel);
  const transaction={id:randomUUID(),sequence:board.sequence+1,...stamp(),reason:typeof args.reason==='string'?args.reason:'调整规划',changes:[...touched.values()].map(c=>({...c,after:copy(draft[c.collection][c.id])}))};
  draft.sequence=transaction.sequence;draft.transactions.push(transaction);novel.planning=draft;
  return {transactionId:transaction.id,sequence:draft.sequence,mapping,changed:transaction.changes.map(c=>({id:c.id,collection:c.collection,revision:c.after.revision}))};
}
function pickNode(value:Partial<PlanningNode>={}):Partial<PlanningNode> {return Object.fromEntries((['title','summary','content','scope','status','parentId','groupId','pageId','position','threads','chapterRefs','memoryRefs'] as const).filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));}
function pickDecoration(value:Partial<Decoration>={}):Partial<Decoration>{return Object.fromEntries((['pageId','kind','title','content','position','width','height','color','fontSize','fontFamily'] as const).filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));}
