import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCanvasScrollAction,wheelCamera} from '../src/client/shared/graph-wheel.ts';
import {toWorld} from '../src/client/shared/graph-geometry.ts';

const camera={x:240,y:-80,zoom:.75},anchor={x:350,y:260},view={width:800,height:600};
const input=overrides=>({deltaX:0,deltaY:0,deltaMode:0,ctrlKey:false,metaKey:false,shiftKey:false,...overrides});
const move=(event,action='pan',current=camera)=>wheelCamera(current,input(event),anchor,view,action);

test('two-finger scrolling pans in both axes with fractional precision at any zoom',()=>{
  for(const zoom of [.35,.75,1.8]){
    assert.deepEqual(move({deltaX:12.25,deltaY:-8.5},'pan',{...camera,zoom}),{x:227.75,y:-71.5,zoom});
    assert.deepEqual(move({deltaX:-6.5},'pan',{...camera,zoom}),{...camera,zoom,x:246.5});
  }
  let current=camera;
  for(let i=0;i<240;i++)current=move({deltaX:.125,deltaY:.25},'pan',current);
  assert.deepEqual(current,{x:210,y:-140,zoom:.75});
});

test('wheel units and Shift scrolling normalize without doubling a native horizontal delta',()=>{
  assert.deepEqual(move({deltaX:1,deltaY:2,deltaMode:1}),move({deltaX:16,deltaY:32}));
  assert.deepEqual(move({deltaX:1,deltaY:-1,deltaMode:2}),move({deltaX:800,deltaY:-600}));
  assert.deepEqual(move({deltaY:30,shiftKey:true}),move({deltaX:30}));
  assert.deepEqual(move({deltaX:30,shiftKey:true}),move({deltaX:30}));
});

test('pinch and modified scroll zoom around the pointer in both scroll preferences',()=>{
  for(const action of ['pan','zoom'])for(const modifier of ['ctrlKey','metaKey']){
    const zoomed=move({deltaX:3,deltaY:-2,[modifier]:true},action);
    assert.ok(zoomed.zoom>camera.zoom);
    const before=toWorld(anchor,camera),after=toWorld(anchor,zoomed);
    assert.ok(Math.abs(before.x-after.x)<1e-8&&Math.abs(before.y-after.y)<1e-8);
    const reversed=move({deltaY:2,[modifier]:true},action,zoomed);
    assert.ok(Math.abs(reversed.zoom-camera.zoom)<1e-8);
  }
  assert.ok(move({deltaY:-10000,ctrlKey:true}).zoom<camera.zoom*1.3);
  let current=camera;
  for(let i=0;i<100;i++)current=move({deltaY:-10,ctrlKey:true},'pan',current);
  assert.equal(current.zoom,1.8);
  for(let i=0;i<100;i++)current=move({deltaY:10,ctrlKey:true},'pan',current);
  assert.equal(current.zoom,.35);
});

test('mouse wheel keeps its default zoom behavior, including native horizontal panning',()=>{
  assert.ok(move({deltaY:120},defaultCanvasScrollAction).zoom<camera.zoom);
  assert.ok(move({deltaY:-120},defaultCanvasScrollAction).zoom>camera.zoom);
  assert.deepEqual(move({deltaX:12},defaultCanvasScrollAction),{...camera,x:228});
});

test('empty and non-finite input never corrupts the camera',()=>{
  for(const event of [{},{deltaY:NaN},{deltaX:Infinity},{deltaY:-Infinity}])assert.equal(move(event),null);
});
