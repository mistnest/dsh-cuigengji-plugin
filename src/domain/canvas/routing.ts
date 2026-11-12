import {portPoint,anchorVector,type AnchorSide,type Box,type CanvasEdge} from './model.ts';
import type {Point} from '../../contracts/planning.ts';
interface JunctionRef {id:string;point:Point;kind:'split'|'merge'}
export interface Route {id:string;from:string;to:string;points:Point[];path:string;blocked:boolean;startSide:AnchorSide;endSide:AnchorSide;junctions?:JunctionRef[];labelPoints?:Point[];labelAnchors?:Point[];hitPath?:string}
const near=(a:number,b:number)=>Math.abs(a-b)<.01;
export function segmentClear(a:Point,b:Point,boxes:Box[],padding=0):boolean {
  return !boxes.some(r=>near(a.x,b.x)?a.x>r.x-padding+.01&&a.x<r.x+r.width+padding-.01&&Math.max(a.y,b.y)>r.y-padding+.01&&Math.min(a.y,b.y)<r.y+r.height+padding-.01
    :near(a.y,b.y)?a.y>r.y-padding+.01&&a.y<r.y+r.height+padding-.01&&Math.max(a.x,b.x)>r.x-padding+.01&&Math.min(a.x,b.x)<r.x+r.width+padding-.01:true);
}
function simplify(points:Point[]):Point[]{
  const result:Point[]=[];
  for(const p of points){if(result.length&&near(p.x,result.at(-1)!.x)&&near(p.y,result.at(-1)!.y))continue;result.push(p);while(result.length>2){const [a,b,c]=result.slice(-3);if(near(a.x,b.x)&&near(b.x,c.x)||near(a.y,b.y)&&near(b.y,c.y))result.splice(-2,1);else break;}}
  return result;
}
export function roundedPath(points:Point[]):string {
  if(points.length<2)return '';
  let d=`M ${points[0].x} ${points[0].y}`;
  for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],ab=Math.hypot(b.x-a.x,b.y-a.y),bc=Math.hypot(c.x-b.x,c.y-b.y),r=Math.min(14,ab/2,bc/2);if(!ab||!bc)continue;d+=` L ${b.x+(a.x-b.x)*r/ab} ${b.y+(a.y-b.y)*r/ab} Q ${b.x} ${b.y} ${b.x+(c.x-b.x)*r/bc} ${b.y+(c.y-b.y)*r/bc}`;}
  return d+` L ${points.at(-1)!.x} ${points.at(-1)!.y}`;
}
interface Search {key:number;cost:number;rank:number}
class Heap {
  items:Search[]=[];
  push(item:Search){const a=this.items;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].rank<=item.rank)break;a[i]=a[p];i=p;}a[i]=item;}
  pop(){const a=this.items,first=a[0],last=a.pop()!;if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].rank<a[c].rank)c++;if(a[c].rank>=last.rank)break;a[i]=a[c];i=c;}a[i]=last;}return first;}
}
function crossingCost(a:Point,b:Point,used:Route[]):number {
  let cost=0;
  for(const r of used)for(let j=1;j<r.points.length;j++){
    const u=r.points[j-1],v=r.points[j],horizontal=near(a.y,b.y),otherHorizontal=near(u.y,v.y);
    if(horizontal===otherHorizontal){const same=horizontal?near(a.y,u.y):near(a.x,u.x),overlap=horizontal?Math.min(Math.max(a.x,b.x),Math.max(u.x,v.x))-Math.max(Math.min(a.x,b.x),Math.min(u.x,v.x)):Math.min(Math.max(a.y,b.y),Math.max(u.y,v.y))-Math.max(Math.min(a.y,b.y),Math.min(u.y,v.y));if(same&&overlap>8)cost+=Math.min(80,overlap*.4);}
    else if(horizontal?u.x>Math.min(a.x,b.x)&&u.x<Math.max(a.x,b.x)&&a.y>Math.min(u.y,v.y)&&a.y<Math.max(u.y,v.y):a.x>Math.min(u.x,v.x)&&a.x<Math.max(u.x,v.x)&&u.y>Math.min(a.y,b.y)&&u.y<Math.max(a.y,b.y))cost+=40;
  }
  return cost;
}
type EndLegFilter=(a:Point,b:Point,end:'start'|'end')=>boolean;
function search(start:Point,end:Point,all:Box[],used:Route[],lane:number,leg?:EndLegFilter):Point[]|null {
  // A bounded visibility grid keeps pointer moves cheap. Every object touching this
  // corridor participates; paths never silently ignore a distant obstacle.
  const margin=240,left=Math.min(start.x,end.x)-margin,right=Math.max(start.x,end.x)+margin,top=Math.min(start.y,end.y)-margin,bottom=Math.max(start.y,end.y)+margin;
  const boxes=all.filter(r=>r.x-14<right&&r.x+r.width+14>left&&r.y-14<bottom&&r.y+r.height+14>top);
  const offset=18+lane*7,unique=(v:number[],low:number,high:number)=>[...new Set(v.filter(x=>x>=low&&x<=high))].sort((a,b)=>a-b);
  const xs=unique([left,right,start.x,end.x,...boxes.flatMap(r=>[r.x-offset,r.x+r.width+offset])],left,right),ys=unique([top,bottom,start.y,end.y,...boxes.flatMap(r=>[r.y-offset,r.y+r.height+offset])],top,bottom);
  const nx=xs.length,ny=ys.length,point=(k:number):Point=>({x:xs[k%nx],y:ys[Math.floor(k/nx)]});
  const si=ys.indexOf(start.y)*nx+xs.indexOf(start.x),ti=ys.indexOf(end.y)*nx+xs.indexOf(end.x);
  const validity=new Int8Array(nx*ny),valid=(k:number)=>{if(!validity[k]){const p=point(k);validity[k]=boxes.some(r=>p.x>r.x-12+.01&&p.x<r.x+r.width+12-.01&&p.y>r.y-12+.01&&p.y<r.y+r.height+12-.01)?-1:1;}return validity[k]>0;};
  if(!valid(si)||!valid(ti))return null;
  const dist=new Map<number,number>([[si*3,0]]),previous=new Map<number,number>(),heap=new Heap();heap.push({key:si*3,cost:0,rank:0});
  for(let steps=0;heap.items.length&&steps<50000;steps++){
    const current=heap.pop(),k=Math.floor(current.key/3),dir=current.key%3;
    if(current.cost>(dist.get(current.key)??Infinity))continue;
    if(k===ti){const points:Point[]=[];let cursor:number|undefined=current.key;while(cursor!==undefined){points.push(point(Math.floor(cursor/3)));cursor=previous.get(cursor);}return points.reverse();}
    const x=k%nx,y=Math.floor(k/nx),a=point(k);
    for(const [xx,yy,d] of [[x-1,y,1],[x+1,y,1],[x,y-1,2],[x,y+1,2]]){
      if(xx<0||xx>=nx||yy<0||yy>=ny)continue;
      const next=yy*nx+xx;if(!valid(next))continue;const b=point(next);if(!segmentClear(a,b,boxes,12)||leg&&(k===si&&!leg(a,b,'start')||next===ti&&!leg(a,b,'end')))continue;
      const cost=current.cost+Math.abs(b.x-a.x)+Math.abs(b.y-a.y)+(dir&&dir!==d?28:0)+crossingCost(a,b,used),key=next*3+d;
      if(cost>=(dist.get(key)??Infinity))continue;dist.set(key,cost);previous.set(key,current.key);heap.push({key,cost,rank:cost+Math.abs(b.x-end.x)+Math.abs(b.y-end.y)});
    }
  }
  return null;
}
function routeCost(points:Point[],used:Route[]):number {
  return points.slice(1).reduce((sum,b,i)=>sum+Math.abs(b.x-points[i].x)+Math.abs(b.y-points[i].y)+crossingCost(points[i],b,used),0)+Math.max(0,points.length-2)*36;
}
/** Try a few legible corridors before a visibility search. No ID-based random offsets. */
function corridors(s:Point,t:Point,boxes:Box[],used:Route[],lane:number,start:Point,end:Point,leg?:EndLegFilter):Point[]|null {
  const local=boxes.filter(b=>b.x<Math.max(s.x,t.x)+40&&b.x+b.width>Math.min(s.x,t.x)-40&&b.y<Math.max(s.y,t.y)+40&&b.y+b.height>Math.min(s.y,t.y)-40);
  const gap=24+lane*10;
  const xs=[(s.x+t.x)/2+lane*10,s.x,t.x,...(leg?[s.x+(t.x-s.x)*.35,s.x+(t.x-s.x)*.65]:[]),Math.min(s.x,t.x,...local.map(b=>b.x))-gap,Math.max(s.x,t.x,...local.map(b=>b.x+b.width))+gap];
  const ys=[(s.y+t.y)/2+lane*10,s.y,t.y,...(leg?[s.y+(t.y-s.y)*.35,s.y+(t.y-s.y)*.65]:[]),...(lane?[s.y+(lane%2?1:-1)*Math.ceil(lane/2)*30]:[]),Math.min(s.y,t.y,...local.map(b=>b.y))-gap,Math.max(s.y,t.y,...local.map(b=>b.y+b.height))+gap];
  const candidates=[...xs.map(x=>[s,{x,y:s.y},{x,y:t.y},t]),...ys.map(y=>[s,{x:s.x,y},{x:t.x,y},t])].map(simplify);
  const clear=candidates.filter(points=>(!leg||points.length<2||leg(points[0],points[1],'start')&&leg(points.at(-2)!,points.at(-1)!,'end'))&&points.slice(1).every((b,i)=>segmentClear(points[i],b,boxes,12)));
  const distinct=clear.filter(points=>!used.some(r=>r.path===roundedPath(simplify([start,...points,end]))));
  return (distinct.length?distinct:clear).map(points=>({points,cost:routeCost(points,used)})).sort((a,b)=>a.cost-b.cost)[0]?.points||null;
}
export function routeEdges(boxes:Box[],edges:(CanvasEdge&{id:string})[],mode:'flow'|'relation'='flow'):Route[]{
  const lookup=new Map(boxes.map(r=>[r.id,r])),routes:Route[]=[];
  // Short links first. Separate lanes and a crossing penalty keep unrelated links distinguishable.
  const distance=(e:CanvasEdge)=>{const a=lookup.get(e.from),b=lookup.get(e.to);return a&&b?Math.abs(a.x-b.x)+Math.abs(a.y-b.y):Infinity;};
  const ordered=[...edges].sort((a,b)=>distance(a)-distance(b)||a.from.localeCompare(b.from)||a.to.localeCompare(b.to)||a.id.localeCompare(b.id));
  for(const edge of ordered){
    const a=lookup.get(edge.from),b=lookup.get(edge.to);if(!a||!b)continue;
    const siblings=ordered.filter(e=>e.from===edge.from&&e.to===edge.to),lane=siblings.findIndex(e=>e.id===edge.id);
    const horizontal: [AnchorSide,AnchorSide]=b.x+b.width/2>=a.x+a.width/2?['right','left']:['left','right'];
    const vertical: [AnchorSide,AnchorSide]=b.y+b.height/2>=a.y+a.height/2?['bottom','top']:['top','bottom'];
    const pairs:[AnchorSide,AnchorSide][]=mode==='flow'?[['right','left']]:[horizontal,vertical];
    const options=pairs.map(([startSide,endSide])=>{
      const start=portPoint(a,startSide,mode),end=portPoint(b,endSide,mode),sv=anchorVector[startSide],tv=anchorVector[endSide];
      const s={x:start.x+sv.x*22,y:start.y+sv.y*22},t={x:end.x+tv.x*22,y:end.y+tv.y*22};
      const clear=segmentClear(start,s,boxes.filter(r=>r.id!==a.id),2)&&segmentClear(t,end,boxes.filter(r=>r.id!==b.id),2);
      const used=routes.slice(-40),inner=clear?(corridors(s,t,boxes,used,lane,start,end)||search(s,t,boxes,used,lane)):null;
      const points=inner?simplify([start,...inner,end]):[];
      return {id:edge.id,from:edge.from,to:edge.to,points,path:roundedPath(points),blocked:!inner,startSide,endSide};
    });
    options.sort((a,b)=>Number(a.blocked)-Number(b.blocked)||routeCost(a.points,routes)-routeCost(b.points,routes));
    routes.push(options[0]);
  }
  return bundleRoutes(boxes,routes,mode);
}
/** Only actual shared endpoints form a junction. Crossing lines never do.
 * This projection changes neither edge IDs nor story relationships. */
function bundleRoutes(boxes:Box[],routes:Route[],mode:'flow'|'relation'):Route[]{
  const lookup=new Map(boxes.map(box=>[box.id,box]));
  const groups=new Map<string,{nodeId:string;side:AnchorSide;end:'start'|'end';routes:Route[]}>();
  for(const route of routes){
    if(route.blocked)continue;
    for(const end of ['start','end'] as const){
      const id=end==='start'?route.from:route.to,side=end==='start'?route.startSide:route.endSide;
      const key=JSON.stringify([end,id,side]);
      if(!groups.has(key))groups.set(key,{nodeId:id,side,end,routes:[]});
      groups.get(key)!.routes.push(route);
    }
  }
  const assignments=new Map<string,{start?:JunctionRef;end?:JunctionRef}>();
  for(const [id,group] of groups){
    if(new Set(group.routes.map(row=>group.end==='start'?row.to:row.from)).size<2)continue;
    const box=lookup.get(group.nodeId)!,v=anchorVector[group.side],port=portPoint(box,group.side,mode);
    const gaps=group.routes.map(route=>lookup.get(group.end==='start'?route.to:route.from)!).map(other=>v.x>0?other.x-port.x:v.x<0?port.x-other.x-other.width:v.y>0?other.y-port.y:port.y-other.y-other.height).filter(gap=>gap>0);
    // Leave room for a hub at both ends of compact links. A fixed 50px stub
    // could overlap the opposite hub, or swallow an aligned branch entirely.
    const limit=Math.min(50,...gaps.map(gap=>(gap-12)/2));
    const distance=[limit,36,24,16].find(distance=>distance>=16&&distance<=limit&&segmentClear(port,{x:port.x+v.x*distance,y:port.y+v.y*distance},boxes.filter(row=>row.id!==group.nodeId),14));
    if(distance===undefined)continue;
    const ref:JunctionRef={id,point:{x:port.x+v.x*distance,y:port.y+v.y*distance},kind:group.end==='start'?'split':'merge'};
    for(const route of group.routes){if(!assignments.has(route.id))assignments.set(route.id,{});assignments.get(route.id)![group.end]=ref;}
  }
  const result:Route[]=[];
  for(const original of routes){
    const hubs=assignments.get(original.id);
    if(!hubs){result.push(original);continue;}
    const start=original.points[0],end=original.points.at(-1)!,sv=anchorVector[original.startSide],tv=anchorVector[original.endSide];
    const s=hubs.start?.point||{x:start.x+sv.x*22,y:start.y+sv.y*22},t=hubs.end?.point||{x:end.x+tv.x*22,y:end.y+tv.y*22};
    const siblings=routes.filter(row=>row.from===original.from&&row.to===original.to),lane=siblings.findIndex(row=>row.id===original.id);
    // Branch legs turn at the visible hub instead of sharing an unmarked
    // stretch beyond it. Each edge retains its own hit path and identity.
    const leg:EndLegFilter=(a,b,end)=>{
      if(!hubs[end])return true;
      const v=end==='start'?sv:tv,delta=end==='start'?{x:b.x-a.x,y:b.y-a.y}:{x:a.x-b.x,y:a.y-b.y};
      const along=delta.x*v.x+delta.y*v.y,cross=(t.x-s.x)*v.y-(t.y-s.y)*v.x;
      return along>=-.01&&(near(cross,0)||near(along,0));
    };
    const used=result.slice(-40),inner=corridors(s,t,boxes,used,lane,start,end,leg)||search(s,t,boxes,used,lane,leg);
    if(!inner){result.push(original);continue;}
    const points=simplify([start,...inner,end]);
    // Keep a real corner at the junction, with rounded inner corridor bends.
    const path=`M ${start.x} ${start.y} L ${s.x} ${s.y}`+roundedPath(inner).replace(/^M [^ ]+ [^ ]+/,'')+` L ${end.x} ${end.y}`;
    result.push({...original,points,path,junctions:[hubs.start,hubs.end].filter((ref):ref is JunctionRef=>Boolean(ref)),labelPoints:inner,hitPath:roundedPath(inner)});
  }
  return result;
}
export function routeJunctions(routes:Route[]):{id:string;point:Point;kind:'split'|'merge';edgeIds:string[]}[]{
  const map=new Map<string,{id:string;point:Point;kind:'split'|'merge';edgeIds:string[]}>();
  for(const route of routes)for(const ref of route.junctions||[]){if(!map.has(ref.id))map.set(ref.id,{...ref,edgeIds:[]});map.get(ref.id)!.edgeIds.push(route.id);}
  return [...map.values()].filter(row=>row.edgeIds.length>=2).sort((a,b)=>a.id.localeCompare(b.id));
}
/** Labels stay on a real segment and avoid cards/other labels; omitted at distant zoom. */
export function placeLabel(points:Point[],width:number,height:number,occupied:Box[]):Box|null {
  const segments=points.slice(1).map((b,i)=>{const a=points[i];return {a,b,length:Math.hypot(b.x-a.x,b.y-a.y),horizontal:near(a.y,b.y)};}).sort((a,b)=>Number(b.horizontal)-Number(a.horizontal)||b.length-a.length);
  for(const s of segments){if(s.length<(s.horizontal?width:height)+16)continue;for(const fraction of [.5,.3,.7]){const box={id:'label',x:s.a.x+(s.b.x-s.a.x)*fraction-width/2,y:s.a.y+(s.b.y-s.a.y)*fraction-height/2,width,height};if(!occupied.some(r=>box.x<r.x+r.width+6&&box.x+width+6>r.x&&box.y<r.y+r.height+6&&box.y+height+6>r.y))return box;}}
  return null;
}
