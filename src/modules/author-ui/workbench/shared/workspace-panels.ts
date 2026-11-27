/** Panel widths never participate in canvas layout. Joined panels share a seam. */
export interface PanelWidths {directory:number;detail:number;split:number|null}
export type PanelSide='directory'|'detail';
export const panelMinimum={directory:180,detail:280};
const clamp=(value:number,min:number,max:number)=>Math.min(Math.max(value,min),Math.max(min,max));
export function panelGeometry(room:number,directory:boolean,detail:boolean,stored:PanelWidths) {
  room=Math.max(0,room);
  const both=directory&&detail&&room>=panelMinimum.directory+panelMinimum.detail;
  const safe=(value:number,fallback:number)=>Number.isFinite(value)?value:fallback;
  let left=directory?clamp(safe(stored.directory,232),Math.min(room,panelMinimum.directory),room):0;
  let right=detail?clamp(safe(stored.detail,420),Math.min(room,panelMinimum.detail),room):0;
  if(both) {
    if((stored.split!==null&&Number.isFinite(stored.split))||left+right>=room) {
      const split=stored.split!==null&&Number.isFinite(stored.split)?stored.split:left/(left+right);
      left=clamp(room*split,panelMinimum.directory,room-panelMinimum.detail);right=room-left;
    }
  } else if(directory&&detail) left=0;
  return {room,directory:left,detail:right,both,joined:both&&Math.abs(left+right-room)<.5};
}
export function resizePanel(geometry:ReturnType<typeof panelGeometry>,side:PanelSide,target:number):PanelWidths {
  const opposite=side==='directory'?geometry.detail:geometry.directory;
  const min=Math.min(geometry.room,panelMinimum[side]);
  const max=geometry.room-(geometry.both?panelMinimum[side==='directory'?'detail':'directory']:0);
  const next=clamp(target,min,max);
  // Resolve the widths currently on screen before deciding whether the seam
  // still touches. A previous joined state must never make it sticky.
  const state:PanelWidths={directory:geometry.directory,detail:geometry.detail,split:null};
  if(geometry.both&&next+opposite>=geometry.room-.5) {
    state.directory=side==='directory'?next:geometry.room-next;
    state.detail=geometry.room-state.directory;
    state.split=state.directory/geometry.room;
  } else state[side]=next;
  return state;
}
