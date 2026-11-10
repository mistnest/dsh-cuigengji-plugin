import test from 'node:test';
import assert from 'node:assert/strict';
import {panelGeometry,resizePanel} from '../src/client/shared/workspace-panels.ts';
test('panels consume the gap, push on contact and separate in either direction',()=>{
  let stored={directory:232,detail:420,split:null};
  const g=()=>panelGeometry(1100,true,true,stored);
  stored=resizePanel(g(),'directory',700);assert.equal(stored.detail,400);assert.ok(stored.split);
  stored=resizePanel(g(),'directory',600);assert.equal(stored.directory,600);assert.equal(stored.detail,400);assert.equal(stored.split,null);
  stored=resizePanel(g(),'detail',600);assert.equal(stored.directory,500);assert.equal(stored.detail,600);
  stored=resizePanel(g(),'detail',450);assert.equal(stored.directory,500);assert.equal(stored.detail,450);assert.equal(stored.split,null);
  stored=resizePanel(g(),'directory',5000);assert.equal(stored.directory,820);assert.equal(stored.detail,280);
  stored=resizePanel(g(),'detail',5000);assert.equal(stored.directory,180);assert.equal(stored.detail,920);
  const narrow=panelGeometry(600,true,true,stored);assert.equal(narrow.directory,180);assert.equal(narrow.detail,420);
  const small=panelGeometry(320,true,true,stored);assert.equal(small.directory,0);assert.equal(small.detail,320);
});
