import type {Point} from '../../contracts/planning.ts';
import {CARD_WIDTH,CARD_HEIGHT} from '../../domain/canvas/model.ts';
export interface Camera extends Point {zoom:number}
export interface Rect extends Point {width:number;height:number}
export {CARD_WIDTH,CARD_HEIGHT,PORT_Y} from '../../domain/canvas/model.ts';
export const clampZoom=(zoom:number)=>Math.max(.35,Math.min(1.8,zoom));
export const toWorld=(point:Point,camera:Camera):Point=>({x:(point.x-camera.x)/camera.zoom,y:(point.y-camera.y)/camera.zoom});
export const toScreen=(point:Point,camera:Camera):Point=>({x:point.x*camera.zoom+camera.x,y:point.y*camera.zoom+camera.y});
export function zoomAt(camera:Camera,zoom:number,anchor:Point):Camera {const world=toWorld(anchor,camera),next=clampZoom(zoom);return {x:anchor.x-world.x*next,y:anchor.y-world.y*next,zoom:next};}
export const contains=(outer:Rect,inner:Rect)=>inner.x>=outer.x&&inner.y>=outer.y&&inner.x+inner.width<=outer.x+outer.width&&inner.y+inner.height<=outer.y+outer.height;
export const intersects=(a:Rect,b:Rect)=>a.x<=b.x+b.width&&a.x+a.width>=b.x&&a.y<=b.y+b.height&&a.y+a.height>=b.y;
/** Toolbar creation starts near the viewport center without covering a card's ports. */
export function vacantCardPoint(center:Point,occupied:Rect[]):Point {
  const origin={x:center.x-CARD_WIDTH/2,y:center.y-CARD_HEIGHT/2},gap=96;
  const clear=(p:Point)=>!occupied.some(r=>p.x-gap<r.x+r.width&&p.x+CARD_WIDTH+gap>r.x&&p.y-gap<r.y+r.height&&p.y+CARD_HEIGHT+gap>r.y);
  if(clear(origin))return origin;
  for(let radius=1;radius<=8;radius++){
    const offsets:Point[]=[];
    for(let x=-radius;x<=radius;x++)for(let y=-radius;y<=radius;y++)if(Math.max(Math.abs(x),Math.abs(y))===radius)offsets.push({x,y});
    offsets.sort((a,b)=>a.x*a.x+a.y*a.y-b.x*b.x-b.y*b.y||b.x-a.x||a.y-b.y);
    for(const offset of offsets){const p={x:origin.x+offset.x*(CARD_WIDTH+gap),y:origin.y+offset.y*(CARD_HEIGHT+gap)};if(clear(p))return p;}
  }
  return {x:Math.max(origin.x,...occupied.map(r=>r.x+r.width))+gap+1,y:origin.y};
}
export function fitCamera(rects:Rect[],width:number,height:number):Camera|null {
  if(!rects.length||width<=0||height<=0)return null;
  const left=Math.min(...rects.map(r=>r.x)),top=Math.min(...rects.map(r=>r.y));
  const right=Math.max(...rects.map(r=>r.x+r.width)),bottom=Math.max(...rects.map(r=>r.y+r.height));
  const zoom=clampZoom(Math.min(1,(width-64)/Math.max(1,right-left),(height-80)/Math.max(1,bottom-top)));
  return {zoom,x:width<600?24-left*zoom:(width-(right-left)*zoom)/2-left*zoom,y:(height-(bottom-top)*zoom)/2-top*zoom};
}
export function curve(from:Point,to:Point){const reach=Math.max(50,Math.abs(to.x-from.x)*.42);return `M${from.x},${from.y} C${from.x+reach},${from.y} ${to.x-reach},${to.y} ${to.x},${to.y}`;}
