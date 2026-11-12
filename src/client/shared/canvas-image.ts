import {routeJunctions} from '../../domain/canvas/routing.ts';
import {canvasLinkRoutes,placeRouteLabel,type CanvasLinkStyle} from '../../domain/canvas/link-style.ts';
import type {Box} from '../../domain/canvas/model.ts';
export interface ImageObject extends Box {
  role?:'stage';kind:'card'|'note'|'frame'|'fold';title:string;summary?:string;meta?:string;tone?:string;
}
export interface ImageEdge {id:string;from:string;to:string;label?:string;type?:string}
export interface CanvasImageScene {
  title:string;objects:ImageObject[];edges:ImageEdge[];directed:boolean;
  linkStyle?:CanvasLinkStyle;
  visibleIds:string[];selectedIds:string[];viewport:{x:number;y:number;width:number;height:number};
}
export type ImageRange='all'|'selection'|'viewport';
const palette={paper:'#ffffff',canvas:'#f8fafc',ink:'#252936',muted:'#747b89',line:'#dce1eb',edge:'#9ca5b5',accent:'#4d6bfe'};
const colors:Record<string,string>={character:'#8981c8',world:palette.accent,selected:palette.accent,written:palette.accent,idea:'#9199a8',dropped:'#a8a0a0',neutral:'#9199a8',sky:palette.accent,sage:'#67996d',rose:'#bb7a90',sand:'#c79b38'};
const xml=(text:unknown)=>String(text??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/[\uD800-\uDFFF]/gu,'�').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
const font='"Segoe UI", "Microsoft YaHei", sans-serif';
let measure:CanvasRenderingContext2D|null=null;
function wrap(text:string,width:number,size:number,lines:number,weight=400) {
  measure??=document.createElement('canvas').getContext('2d');
  if(measure)measure.font=`${weight} ${size}px ${font}`;
  const fits=(s:string)=>measure?measure.measureText(s).width<=width:Array.from(s).length*size<=width;
  const result:string[]=[];let line='';
  for(const char of Array.from(text.replace(/\r/g,''))){
    if(char==='\n'||!fits(line+char)){result.push(line);line=char==='\n'?'':char;}else line+=char;
  }
  result.push(line);
  if(result.length>lines){result.length=lines;let last=result[lines-1];while(last&&!fits(last+'…'))last=Array.from(last).slice(0,-1).join('');result[lines-1]=last+'…';}
  return result;
}
function text(value:string,x:number,y:number,width:number,size:number,lines=1,color=palette.ink,weight=400) {
  return `<text fill="${color}" font-size="${size}" font-weight="${weight}">${wrap(value,width,size,lines,weight).map((line,i)=>`<tspan x="${x}" y="${y+i*size*1.6}">${xml(line)}</tspan>`).join('')}</text>`;
}
export function imagePixelSize(width:number,height:number) {
  const scale=Math.min(2,8192/width,8192/height,Math.sqrt(24_000_000/width/height));
  return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
export function buildCanvasImage(scene:CanvasImageScene,range:ImageRange,withTitle:boolean) {
  const selected=new Set(scene.selectedIds);
  const ids=range==='all'?null:new Set(range==='selection'?scene.visibleIds.filter(id=>selected.has(id)):scene.visibleIds);
  const objects=scene.objects.filter(o=>!ids||ids.has(o.id));
  const objectIds=new Set(objects.map(o=>o.id)),edges=scene.edges.filter(e=>objectIds.has(e.from)&&objectIds.has(e.to));
  if(!objects.length)throw new Error('这个范围还没有可导出的内容。');
  const routes=canvasLinkRoutes(objects.filter(o=>o.kind!=='frame'||o.role==='stage').map(o=>o.kind==='frame'?{...o,height:48}:o),edges,scene.directed?'flow':'relation',scene.linkStyle);
  const allPoints=routes.flatMap(r=>r.points);
  const left=range==='viewport'?scene.viewport.x:Math.min(...objects.map(o=>o.x),...allPoints.map(p=>p.x));
  const top=range==='viewport'?scene.viewport.y:Math.min(...objects.map(o=>o.y),...allPoints.map(p=>p.y));
  const right=range==='viewport'?left+scene.viewport.width:Math.max(...objects.map(o=>o.x+o.width),...allPoints.map(p=>p.x));
  const bottom=range==='viewport'?top+scene.viewport.height:Math.max(...objects.map(o=>o.y+o.height),...allPoints.map(p=>p.y));
  const pad=40,header=withTitle?78:0,width=Math.max(320,Math.ceil(right-left+pad*2)),height=Math.max(200,Math.ceil(bottom-top+pad*2+header));
  const rect=(o:ImageObject,fill:string,stroke=palette.line,rx=12)=>`<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
  const decoration=(o:ImageObject)=>{
    const tone=colors[o.tone||'neutral']||palette.accent;
    return `${rect(o,o.kind==='frame'?tone+'08':tone+'16',tone+'55')}${text(o.title||'讨论区域',o.x+16,o.y+26,o.width-32,14,1,palette.ink,600)}${o.summary?text(o.summary,o.x+16,o.y+54,o.width-32,13,o.kind==='frame'?1:Math.max(1,Math.floor((o.height-70)/21)),palette.muted):''}`;
  };
  const card=(o:ImageObject)=>{
    const tone=colors[o.tone||'idea']||palette.accent;
    return `${rect(o,palette.paper)}${text(o.kind==='fold'?o.role==='stage'?'阶段 · 已收纳':'文件夹 · 已收纳':o.tone==='character'?'角色':o.tone==='world'?'世界':'情节',o.x+16,o.y+26,o.width-32,10,1,tone)}${text(o.title,o.x+16,o.y+56,o.width-32,15,o.kind==='fold'?1:2,palette.ink,600)}${o.summary?text(o.summary,o.x+16,o.y+(o.kind==='fold'?78:107),o.width-32,12,o.kind==='fold'?1:2,palette.muted):''}${o.meta?text(o.meta,o.x+16,o.y+o.height-16,o.width-32,10,1,tone):''}`;
  };
  const labels:string[]=[],occupied:Box[]=[...objects];
  for(const route of routes){const edge=edges.find(e=>e.id===route.id);if(!edge?.label)continue;const w=Math.min(150,Math.max(44,Array.from(edge.label).length*11+16)),box=placeRouteLabel(route,w,24,occupied);if(!box)continue;occupied.push({...box,id:edge.id});labels.push(`<rect x="${box.x}" y="${box.y}" width="${box.width}" height="24" rx="5" fill="${palette.canvas}"/>${text(edge.label,box.x+7,box.y+16,box.width-14,11,1,palette.muted)}`);}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xml(scene.title)}"><rect width="100%" height="100%" fill="${palette.canvas}"/><defs><marker id="arrow" viewBox="0 0 8 8" markerWidth="6" markerHeight="6" refX="7" refY="4" orient="auto"><path d="M1 1 L7 4 L1 7" fill="none" stroke="${palette.edge}" stroke-width="1.3"/></marker><clipPath id="view"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs><g font-family="${xml(font)}">${withTitle?text(scene.title,pad,34,width-pad*2,20,2,palette.ink,600):''}<g transform="translate(${pad-left} ${pad+header-top})" ${range==='viewport'?'clip-path="url(#view)"':''}>${objects.filter(o=>o.kind==='frame').map(decoration).join('')}<g fill="none" stroke="${palette.edge}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${routes.map(r=>`<path d="${r.path}" ${scene.directed?'marker-end="url(#arrow)"':''}/>`).join('')}</g>${routeJunctions(routes).map(row=>`<circle cx="${row.point.x}" cy="${row.point.y}" r="4" fill="${palette.edge}" stroke="${palette.canvas}" stroke-width="1.5"/>`).join('')}${labels.join('')}${objects.filter(o=>o.kind!=='frame').map(o=>o.kind==='note'?decoration(o):card(o)).join('')}</g></g></svg>`;
  return {svg,width,height,pixels:imagePixelSize(width,height),count:objects.length};
}
export function downloadImage(blob:Blob,name:string) {
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
export async function canvasImagePNG(result:ReturnType<typeof buildCanvasImage>):Promise<Blob> {
  const {width,height}=result.pixels;
  const svg=result.svg.replace(/width="\d+" height="\d+"/,`width="${width}" height="${height}"`);
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try {
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('暂时无法生成 PNG，请改用 SVG。');
    ctx.drawImage(image,0,0,width,height);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片过大，请改用 SVG。')),'image/png'));
  } finally {URL.revokeObjectURL(url);}
}
