import {arrangeCanvas,placeBeside} from '../../domain/canvas/layout.ts';
import {frameMembers,foldProjection,objectBox,type CanvasObject,type CanvasEdge,type LayoutPoint} from '../../domain/canvas/model.ts';
import {ensurePlanning,planningAction} from '../../domain/planning/index.ts';
import type {PlanningNovel,Operation} from '../../contracts/planning.ts';
import {planningStructure} from '../../domain/planning/hierarchy.ts';
import {arrangeFolders} from '../../domain/canvas/folder-layout.ts';
import type {CanvasFolder} from '../../domain/canvas/folders.ts';
import {groupMatches} from '../../domain/directory/groups.ts';
interface Args {scopeGroupId?:string|null;requestId?:string;expectedSequence?:number;pageId?:string|null;nodeIds?:string[];mode?:'missing'|'all';grouped?:boolean;foldedIds?:string[];members?:{id:string;expectedRevision:number}[]}
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
function mode(args:Args){if(args.mode!==undefined&&!['missing','all'].includes(args.mode))fail('INVALID_INPUT','布局模式须为 missing 或 all');return args.mode??'missing';}
export async function layoutPlanning(novel:PlanningNovel,args:Args,actor:{kind?:string;sessionId?:string},preview=false){
  const board=ensurePlanning(novel),pageId=args.pageId??null;
  if(!preview&&(typeof args.requestId!=='string'||!args.requestId))fail('INVALID_INPUT','整理须提供唯一 requestId');
  if(args.expectedSequence!==board.sequence)fail('CONFLICT','整理前请读取当前规划的 sequence；结构已变化时重新读取');
  if(pageId&&(!Object.hasOwn(board.pages||{},pageId)||board.pages[pageId].deleted))fail('NOT_FOUND','规划页面不存在');
  const objects=[...Object.values(board.nodes),...Object.values(board.decorations||{})].filter(n=>!n.deleted&&(n.pageId??null)===pageId);
  const tree=planningStructure(Object.values(board.nodes).filter(n=>!n.deleted&&(n.pageId??null)===pageId),Object.values(board.decorations||{}).filter(d=>!d.deleted&&(d.pageId??null)===pageId),Object.values(board.groups).filter(g=>!g.deleted&&(g.pageId??null)===pageId));
  const folders=tree.folders;
  if(folders.length&&mode(args)==='all'){
    if(args.nodeIds!==undefined&&(!Array.isArray(args.nodeIds)||!args.nodeIds.length||new Set(args.nodeIds).size!==args.nodeIds.length||args.nodeIds.some(id=>![...objects,...folders].some(n=>n.id===id))))fail('INVALID_INPUT','请选择当前画布的有效内容');
    const selected=new Set(args.nodeIds??[...objects,...folders].map(n=>n.id));
    const members=tree.objects;
    for(const f of folders.filter(g=>selected.has(g.id))){
      for(const n of members.filter(groupMatches(folders,f.id)))selected.add(n.id);
      for(const g of folders.filter(g=>groupMatches(folders,f.id)({groupId:g.parentId})))selected.add(g.id);
    }
    for(const d of objects.filter(n=>'kind' in n&&n.kind==='frame'&&selected.has(n.id)))for(const id of frameMembers(d,objects))selected.add(id);
    const chosen=members.filter(n=>selected.has(n.id));
    const included=folders.filter(g=>selected.has(g.id));
    if(chosen.length+included.length>200)fail('INVALID_INPUT','一次整理最多 200 项，请选择局部区域');
    const positions=placeBeside(await arrangeFolders(chosen,Object.values(board.edges).filter(e=>!e.deleted),included,args.foldedIds),objects,Object.values(board.edges).filter(e=>!e.deleted),true);
    if(preview)return {positions};
    const operations:Operation[]=Object.entries(positions).map(([id,p])=>board.groups[id]?{op:'group.update',id,expectedRevision:board.groups[id].revision,value:{position:{x:p.x,y:p.y}}}:board.decorations?.[id]?{op:'decoration.update',id,expectedRevision:board.decorations[id].revision,value:{position:{x:p.x,y:p.y},...(p.width?{width:p.width,height:p.height}:{})}}:{op:'node.update',id,expectedRevision:board.nodes[id].revision,value:{position:{x:p.x,y:p.y}}});
    if(!operations.length)return {sequence:board.sequence,changed:[],positions};
    return {...planningAction(novel,'planning.apply',{requestId:args.requestId,expectedSequence:args.expectedSequence,operations,reason:'整理画布与文件夹'},actor) as object,positions};
  }
  if(args.nodeIds!==undefined&&(!Array.isArray(args.nodeIds)||!args.nodeIds.length||new Set(args.nodeIds).size!==args.nodeIds.length||args.nodeIds.some(id=>!objects.some(n=>n.id===id))))fail('INVALID_INPUT','请选择当前页中不重复的有效画布对象');
  const selected=new Set(args.nodeIds??objects.map(n=>n.id));
  for(const frame of objects.filter(n=>'kind' in n&&n.kind==='frame'&&selected.has(n.id)))for(const id of frameMembers(frame,objects))selected.add(id);
  const requested=objects.filter(n=>selected.has(n.id));
  const chosen=requested.filter(n=>mode(args)==='all'||!n.position||('layoutPending' in n&&n.layoutPending));
  if(!chosen.length)return {sequence:board.sequence,changed:[],positions:{}};
  if(chosen.length>200)fail('INVALID_INPUT','一次整理最多支持 200 个画布对象，请选择局部区域（讨论框内的成员也计入）');
  const edges=Object.values(board.edges).filter(e=>!e.deleted);
  const wrapping=mode(args)==='missing'?chosen.filter(n=>'kind' in n&&n.kind==='frame'&&frameMembers(n,objects).some(id=>!chosen.some(m=>m.id===id))):[];
  const layoutObjects=chosen.filter(n=>!wrapping.includes(n));
  const projection=preview?foldProjection(layoutObjects,edges,args.foldedIds??[]):{objects:layoutObjects,edges};
  const saved=chosen.filter(n=>n.position),origin=mode(args)==='all'&&saved.length?{x:Math.min(...saved.map(n=>n.position!.x)),y:Math.min(...saved.map(n=>n.position!.y))}:{x:40,y:60};
  let positions=await arrangeCanvas(projection.objects,projection.edges,origin);
  if(preview)for(const f of chosen.filter(n=>args.foldedIds?.includes(n.id))){const p=positions[f.id];if(!p)continue;for(const id of frameMembers(f,chosen)){const old=objects.find(n=>n.id===id)?.position;if(old&&f.position)positions[id]={x:old.x+p.x-f.position.x,y:old.y+p.y-f.position.y};}}
  positions=placeBeside(positions,objects,edges,mode(args)==='all');
  for(const f of wrapping){const rects=frameMembers(f,objects).map(id=>objectBox(objects.find(n=>n.id===id)!,positions));if(!rects.length)continue;const x=Math.min(...rects.map(r=>r.x))-24,y=Math.min(...rects.map(r=>r.y))-80;positions[f.id]={x,y,width:Math.max(280,...rects.map(r=>r.x+r.width-x+24)),height:Math.max(160,...rects.map(r=>r.y+r.height-y+24))};}
  if(preview)return {positions};
  const operations:Operation[]=Object.entries(positions).map(([id,p])=>{
    const decoration=board.decorations?.[id];
    return decoration?{op:'decoration.update',id,expectedRevision:decoration.revision,value:{position:{x:p.x,y:p.y},...(p.width?{width:p.width,height:p.height}:{}),...(decoration.kind==='frame'&&decoration.members===undefined?{members:frameMembers(decoration,objects)}:{})}}
      :{op:'node.update',id,expectedRevision:board.nodes[id].revision,value:{position:{x:p.x,y:p.y}}};
  });
  const result=planningAction(novel,'planning.apply',{requestId:args.requestId,expectedSequence:args.expectedSequence,operations,reason:'整理共享画布'},actor) as object;
  return {...result,positions};
}
export async function layoutSettings(nodes:Record<string,CanvasObject&{revision:number;deleted?:boolean}>,edges:CanvasEdge[],args:Args,groups:CanvasFolder[]=[]):Promise<Record<string,LayoutPoint>>{
  if(!Array.isArray(args.members)||!args.members.length||args.members.length>200||new Set(args.members.map(m=>m.id)).size!==args.members.length)fail('INVALID_INPUT','整理需要 1–200 个不重复的 members:[{id,expectedRevision}]');
  for(const m of args.members!){const node=nodes[m.id];if(!Object.hasOwn(nodes,m.id)||!node||node.deleted)return fail('NOT_FOUND','设定已删除或不存在');if(node.revision!==m.expectedRevision)fail('CONFLICT','设定已有新版本，整理前请重新读取');}
  if(args.scopeGroupId){const descendant=groupMatches(groups,args.scopeGroupId);groups=groups.filter(g=>g.id!==args.scopeGroupId&&descendant({groupId:g.parentId})).map(g=>({...g,parentId:g.parentId===args.scopeGroupId?null:g.parentId}));}
  const all=Object.values(nodes).filter(n=>!n.deleted&&(args.pageId===undefined||((n as CanvasObject&{pageId?:string|null}).pageId??null)===args.pageId));
  if(args.members!.some(m=>!all.some(n=>n.id===m.id)))fail('INVALID_INPUT','只能整理当前画布的设定');
  const chosen=all.filter(n=>args.members!.some(m=>m.id===n.id)&&(mode(args)==='all'||!n.position));
  if(groups.length&&mode(args)==='all'){
    const selected=new Set(chosen.map(n=>n.id)),included=groups.filter(g=>{const members=all.filter(groupMatches(groups,g.id));return members.length&&members.every(n=>selected.has(n.id));});
    if(chosen.length+included.length>200)fail('INVALID_INPUT','一次整理最多 200 项，请选择局部区域');
    return placeBeside(await arrangeFolders(chosen.map(n=>({...n,groupId:n.groupId===args.scopeGroupId?null:n.groupId})),edges,included,args.foldedIds),all,edges,true);
  }
  const saved=chosen.filter(n=>n.position),origin=mode(args)==='all'&&saved.length?{x:Math.min(...saved.map(n=>n.position!.x)),y:Math.min(...saved.map(n=>n.position!.y))}:{x:40,y:60};
  return placeBeside(await arrangeCanvas(chosen,edges,origin),all,edges,mode(args)==='all');
}
