import type { Board, PlanningNovel } from '../../contracts/planning.ts';
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
const copy=<T>(v:T):T=>structuredClone(v);
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(map:object,id:string)=>Object.prototype.hasOwnProperty.call(map,id);
export function ensurePlanning(novel:PlanningNovel):Board {
  if(novel.planning){
    novel.planning.groups ??= {};
    return novel.planning;
  }
  const board:Board={formatVersion:2,nodes:{},edges:{},groups:{},pages:{},decorations:{},sequence:0,transactions:[]};
  if(novel.plan){const id=`legacy-plan-${novel.plan.id}`;board.nodes[id]={id,revision:1,title:'原有规划',summary:'从旧规划完整迁移',content:novel.plan.content,scope:'unspecified',status:'idea',parentId:null,threads:[],chapterRefs:[],memoryRefs:[],deleted:false,updatedAt:novel.plan.updatedAt||new Date().toISOString(),actor:{kind:'migration'}};board.legacy=copy(novel.plan);}
  novel.planning=board;return board;
}
function cycle(nodes:{id:string}[],edges:[string,string][]) {
  const adjacency=new Map<string,string[]>();for(const [from,to] of edges){if(!adjacency.has(from))adjacency.set(from,[]);adjacency.get(from)!.push(to);}
  const done=new Set(),active=new Set();
  const visit=(id:string)=>{if(active.has(id))fail('INVALID_PLANNING','层级或关系不能形成循环');if(done.has(id))return;active.add(id);for(const next of adjacency.get(id)||[])visit(next);active.delete(id);done.add(id);};
  for(const node of nodes)visit(node.id);
}
export function validatePlanning(board:Board,novel:PlanningNovel):void {
  if(!board||![1,2].includes(board.formatVersion)||!record(board.nodes)||!record(board.edges)||!Array.isArray(board.transactions)||(!Number.isSafeInteger(board.sequence)||board.sequence<0))fail('INVALID_PLANNING','规划数据格式无效');
  board.groups ??= {};
  const pages=board.pages??{},decorations=board.decorations??{};
  if(!record(pages)||!record(decorations))fail('INVALID_PLANNING','页面或批注格式无效');
  const validPage=(id:unknown)=>id===undefined||id===null||(typeof id==='string'&&own(pages,id)&&!pages[id].deleted);
  for(const [id,p] of Object.entries(pages))if(!record(p)||id!==p.id||typeof p.name!=='string'||!p.name.trim()||typeof p.summary!=='string'||typeof p.deleted!=='boolean'||!Number.isSafeInteger(p.revision)||p.revision<1)fail('INVALID_PLANNING','规划页面无效');
  for(const [id,d] of Object.entries(decorations)){
    if(!record(d)||id!==d.id||!Number.isSafeInteger(d.revision)||d.revision<1||typeof d.deleted!=='boolean'||!['note','frame'].includes(d.kind)||typeof d.title!=='string'||typeof d.content!=='string'||(!d.deleted&&!validPage(d.pageId)))fail('INVALID_PLANNING','画布批注无效');
    if(!record(d.position)||!Number.isFinite(d.position.x)||!Number.isFinite(d.position.y)||!Number.isFinite(d.width)||d.width<160||d.width>6000||!Number.isFinite(d.height)||d.height<80||d.height>6000||![14,18,24,32].includes(d.fontSize)||!['sans','serif'].includes(d.fontFamily)||!['neutral','sand','sage','sky','rose'].includes(d.color)||(d.moveContents!==undefined&&typeof d.moveContents!=='boolean'))fail('INVALID_PLANNING','批注样式或位置无效');
  }
  if(!record(board.groups))fail('INVALID_PLANNING','规划分组无效');
  for(const [id,g] of Object.entries(board.groups)) if(!record(g)||id!==g.id||typeof g.name!=='string'||!g.name.trim()||typeof g.summary!=='string'||!Number.isSafeInteger(g.revision)||g.revision<1) fail('INVALID_PLANNING','规划分组无效');
  if([...Object.values(board.nodes),...Object.values(board.edges)].some(v=>!record(v)))fail('INVALID_PLANNING','规划对象无效');
  const nodes=Object.values(board.nodes).filter(n=>!n.deleted),edges=Object.values(board.edges).filter(e=>!e.deleted);
  for(const [id,n] of Object.entries(board.nodes)){
    if(!n.deleted&&!validPage(n.pageId))fail('INVALID_PLANNING','所属页面不存在或已删除');
    if(n.position!==undefined&&n.position!==null&&(!record(n.position)||!Number.isFinite(n.position.x)||!Number.isFinite(n.position.y)))fail('INVALID_PLANNING','画布位置无效');
    if(!n.deleted&&n.groupId&&board.groups[n.groupId]?.deleted)fail('INVALID_PLANNING','所属分组已删除');
    if(typeof n.deleted!=='boolean'||(n.parentId!==null&&typeof n.parentId!=='string')||id!==n.id||!Number.isSafeInteger(n.revision)||n.revision<1||typeof n.title!=='string'||!n.title.trim()||typeof n.content!=='string'||typeof n.summary!=='string'||(n.groupId!==null&&n.groupId!==undefined&&!Object.hasOwn(board.groups,n.groupId)))fail('INVALID_PLANNING','规划标题、内容或版本无效');
    if(!['long','phase','near','unspecified'].includes(n.scope)||!['idea','selected','written','dropped'].includes(n.status))fail('INVALID_PLANNING','规划范围或状态无效');
    if(!Array.isArray(n.threads)||n.threads.some(t=>typeof t!=='string')||!Array.isArray(n.chapterRefs)||!Array.isArray(n.memoryRefs))fail('INVALID_PLANNING','关联字段无效');
    if(!n.deleted&&n.parentId&&(!own(board.nodes,n.parentId)||board.nodes[n.parentId].deleted))fail('INVALID_PLANNING','父规划不存在');
    if(!n.deleted&&n.parentId&&(n.pageId??null)!==(board.nodes[n.parentId].pageId??null))fail('INVALID_PLANNING','父子规划须在同一页面');
    for(const ref of n.chapterRefs)if(!record(ref)||!own(novel.chapters,ref.chapterId)||!novel.chapters[ref.chapterId]?.versions.some(v=>v.revision===ref.revision))fail('INVALID_PLANNING','关联的正文版本不存在');
    for(const id of n.memoryRefs)if(!own(novel.nodes,id))fail('INVALID_PLANNING','关联设定不存在');
    if(!n.deleted&&n.status==='written'&&!n.chapterRefs.length)fail('INVALID_PLANNING','已写入正文的规划至少需要一个正文版本关联');
  }
  const duplicates=new Set();
  for(const [id,e] of Object.entries(board.edges)){
    if(typeof e.deleted!=='boolean'||id!==e.id||!Number.isSafeInteger(e.revision)||e.revision<1||!['next','requires','alternative'].includes(e.type)||typeof e.label!=='string')fail('INVALID_PLANNING','关系无效');
    if(e.deleted)continue;
    if(e.from===e.to||!own(board.nodes,e.from)||!own(board.nodes,e.to)||board.nodes[e.from].deleted||board.nodes[e.to].deleted)fail('INVALID_PLANNING','关系端点无效');
    if((board.nodes[e.from].pageId??null)!==(board.nodes[e.to].pageId??null))fail('INVALID_PLANNING','不同页面不能直接连线，请先移动规划或移除跨页连线');
    const key=JSON.stringify([e.from,e.to,e.type]);if(duplicates.has(key))fail('INVALID_PLANNING','重复关系');duplicates.add(key);
  }
  for(const tx of board.transactions){if(typeof tx.id!=='string'||!Number.isSafeInteger(tx.sequence)||!Array.isArray(tx.changes))fail('INVALID_PLANNING','规划历史无效');for(const change of tx.changes)if(!['nodes','edges','groups','pages','decorations'].includes(change.collection)||typeof change.id!=='string'||change.after?.id!==change.id||!Number.isSafeInteger(change.after.revision)||change.after.revision<1||(change.before&&change.before.id!==change.id))fail('INVALID_PLANNING','规划历史快照无效');}
  cycle(nodes,edges.filter(e=>e.type==='next'||e.type==='alternative').map(e=>[e.from,e.to]));
  cycle(nodes,nodes.filter(n=>n.parentId).map(n=>[n.parentId!,n.id]));
  for(const type of ['next','requires','alternative'])cycle(nodes,edges.filter(e=>e.type===type).map(e=>[e.from,e.to]));
}
