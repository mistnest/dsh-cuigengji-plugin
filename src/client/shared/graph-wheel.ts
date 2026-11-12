import {zoomAt,type Camera} from './graph-geometry.ts';
import type {Point} from '../../contracts/planning.ts';

export type CanvasScrollAction='pan'|'zoom';
export const defaultCanvasScrollAction:CanvasScrollAction='zoom';
type WheelInput=Pick<WheelEvent,'deltaX'|'deltaY'|'deltaMode'|'ctrlKey'|'metaKey'|'shiftKey'>;

/** WheelEvent does not identify the physical input device. Use an explicit
 * scroll preference, while recognizing the browser's Ctrl+wheel pinch stream. */
export function wheelCamera(camera:Camera,event:WheelInput,anchor:Point,viewport:{width:number;height:number},action:CanvasScrollAction):Camera|null {
  const unitX=event.deltaMode===1?16:event.deltaMode===2?viewport.width:1;
  const unitY=event.deltaMode===1?16:event.deltaMode===2?viewport.height:1;
  let x=event.deltaX*unitX,y=event.deltaY*unitY;
  if(!Number.isFinite(x)||!Number.isFinite(y)||(!x&&!y))return null;
  const modified=event.ctrlKey||event.metaKey;
  if(modified||(action==='zoom'&&y)){
    if(!y)return null;
    // Pinch streams contain small pixel deltas; bound unusually large wheel
    // steps so one packet cannot jump across the entire zoom range.
    const delta=-y*(modified ? .01 : .0015);
    const exponent=modified?Math.max(-.25,Math.min(.25,delta)):delta;
    return zoomAt(camera,camera.zoom*Math.exp(exponent),anchor);
  }
  // Chromium may already move Shift+wheel to deltaX. Only remap a Y-only event.
  if(event.shiftKey&&!x){x=y;y=0;}
  return {...camera,x:camera.x-x,y:camera.y-y};
}
