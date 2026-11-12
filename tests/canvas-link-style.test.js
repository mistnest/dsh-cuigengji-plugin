import test from 'node:test';
import assert from 'node:assert/strict';
import {canvasLinkRoutes,placeRouteLabel} from '../src/domain/canvas/link-style.ts';
import {objectBox,portPoint} from '../src/domain/canvas/model.ts';
import {routeEdges,routeJunctions} from '../src/domain/canvas/routing.ts';

test('changing link style preserves every relationship and layout; organized remains the default',()=>{
  const boxes=[['s',0,220],['a',400,0],['b',400,440],['end',800,220]].map(([id,x,y])=>objectBox({id,position:{x,y}}));
  const edges=[{id:'sa',from:'s',to:'a'},{id:'sb',from:'s',to:'b'},{id:'ae',from:'a',to:'end'},{id:'be',from:'b',to:'end'}];
  const original=structuredClone({boxes,edges});
  for(const mode of ['flow','relation']){
    const organized=canvasLinkRoutes(boxes,edges,mode),classic=canvasLinkRoutes(boxes,edges,mode,'classic');
    assert.deepEqual(organized,routeEdges(boxes,edges,mode));
    assert.deepEqual(classic.map(r=>[r.id,r.from,r.to]).sort(),edges.map(e=>[e.id,e.from,e.to]).sort());
    assert.deepEqual(routeJunctions(classic),[]);
    assert.ok(classic.every(r=>r.path.includes(' C')&&!r.blocked));
    assert.deepEqual(canvasLinkRoutes([...boxes].reverse(),[...edges].reverse(),mode,'classic'),classic);
  }
  assert.deepEqual({boxes,edges},original);
});

test('classic relations keep usable facing ports, distinct parallel hits and labels on the actual curve',()=>{
  const a=objectBox({id:'a',position:{x:0,y:0}});
  for(const [x,y,startSide,endSide] of [[600,0,'right','left'],[-600,0,'left','right'],[0,500,'bottom','top'],[0,-500,'top','bottom']]){
    const b=objectBox({id:'b',position:{x,y}}),[route]=canvasLinkRoutes([a,b],[{id:'ab',from:'a',to:'b'}],'relation','classic');
    assert.equal(route.startSide,startSide);assert.equal(route.endSide,endSide);
    assert.deepEqual(route.points[0],portPoint(a,startSide));assert.deepEqual(route.points.at(-1),portPoint(b,endSide));
    const label=placeRouteLabel(route,80,24,[a,b]);assert.ok(label);
    assert.deepEqual({x:label.x+40,y:label.y+12},route.labelAnchors[0]);
  }
  const b=objectBox({id:'b',position:{x:600,y:240}}),edges=['one','two','three'].map(id=>({id,from:'a',to:'b'}));
  const routes=canvasLinkRoutes([a,b],edges,'relation','classic');
  assert.equal(new Set(routes.map(r=>r.path)).size,3);
  assert.deepEqual(canvasLinkRoutes([b,a],[...edges].reverse(),'relation','classic'),routes);
  const twoWay=canvasLinkRoutes([a,b],[{id:'ab',from:'a',to:'b'},{id:'ba',from:'b',to:'a'}],'relation','classic');
  assert.notDeepEqual(twoWay[0].labelAnchors[0],twoWay[1].labelAnchors[0]);
  assert.equal(placeRouteLabel(routes[0],80,24,[{id:'cover',x:-1000,y:-1000,width:3000,height:3000}]),null);
});
