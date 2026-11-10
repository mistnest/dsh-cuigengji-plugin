import type {Board,PlanningNode,Transaction} from '../../contracts/planning.ts';

export const planningContentFields=['title','summary','content','scope','status','threads','chapterRefs','memoryRefs'] as const;
const tracked=[...planningContentFields,'parentId','groupId','pageId','position','deleted'] as const;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Reuse transaction snapshots, including the baseline of imported/older cards. */
export function planningNodeVersions(board:Board,current:PlanningNode) {
  const versions=new Map<number,{node:PlanningNode;transaction?:Transaction;reason:string}>();
  for(const transaction of board.transactions)for(const change of transaction.changes) {
    if(change.collection!=='nodes'||change.id!==current.id)continue;
    const before=change.before as PlanningNode|null;
    if(before&&!('pruned' in before)&&!versions.has(before.revision))versions.set(before.revision,{node:before,reason:'保留的初始版本'});
    const after=change.after as PlanningNode;
    if(!('pruned' in after))versions.set(after.revision,{node:after,transaction,reason:transaction.reason});
  }
  if(!versions.has(current.revision))versions.set(current.revision,{node:current,reason:'当前保留版本'});
  const ordered=[...versions.values()].sort((a,b)=>a.node.revision-b.node.revision);
  return ordered.map(({node,transaction,reason},index)=>{
    const previous=ordered[index-1]?.node;
    const changedFields=previous?tracked.filter(key=>!same(node[key],previous[key])):[];
    const kind=!previous?'baseline':changedFields.some(key=>[...planningContentFields,'deleted'].includes(key as any))?'content':changedFields.some(key=>key!=='position')?'organization':'layout';
    return {...node,reason,transactionId:transaction?.id??null,previousRevision:previous?.revision??null,changedFields,kind};
  });
}
