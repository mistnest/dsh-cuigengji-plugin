import test from 'node:test';
import assert from 'node:assert/strict';
import {searchDirectory} from '../src/domain/directory/search.ts';

const groups=[
  {id:'volume',name:'开篇'},
  {id:'family',name:'萧家',parentId:'volume'},
  {id:'hall',name:'议事厅',parentId:'family'},
  {id:'other',name:'远行'},
];
const items=[
  {id:'stage',title:'退婚风波',groupId:'hall'},
  {id:'conflict',title:'双方争执',parentId:'stage',groupId:'hall'},
  {id:'evidence',title:'出示凭据',summary:'交出婚书原件',parentId:'conflict',groupId:'hall'},
  {id:'exit',title:'离场',parentId:'stage',groupId:'hall'},
  {id:'journey',title:'动身',searchText:'主角成长线',groupId:'other'},
  {id:'loose',title:'根目录灵感'},
];

test('summary matches retain every folder and stage ancestor without promoting children or including siblings',()=>{
  const before=JSON.stringify({items,groups}),result=searchDirectory(items,groups,' 婚书原件 ');
  assert.deepEqual([...result.matches],['evidence']);
  assert.deepEqual([...result.itemIds],['evidence','conflict','stage']);
  assert.deepEqual([...result.groupIds],['hall','family','volume']);
  assert.equal(JSON.stringify({items,groups}),before);
});

test('matching a folder does not expand its unrelated descendants; empty folders can be found',()=>{
  const result=searchDirectory(items,[...groups,{id:'empty',name:'待议问题'}],'萧家');
  assert.deepEqual([...result.groupMatches],['family']);
  assert.deepEqual([...result.groupIds],['family','volume']);
  assert.equal(result.itemIds.size,0);
  assert.deepEqual([...searchDirectory(items,[...groups,{id:'empty',name:'待议问题'}],'待议').groupIds],['empty']);
});

test('blank queries restore the whole tree, while searches also cover story threads',()=>{
  const all=searchDirectory(items,groups,'  ');
  assert.equal(all.searching,false);
  assert.equal(all.itemIds.size,items.length);
  assert.equal(all.groupIds.size,groups.length);
  assert.deepEqual([...searchDirectory(items,groups,'成长线').matches],['journey']);
  assert.equal(searchDirectory(items,groups,'不存在').itemIds.size,0);
});

test('incomplete imported paths and cycles cannot trap directory search',()=>{
  const result=searchDirectory([{id:'a',title:'命中',parentId:'b',groupId:'x'},{id:'b',title:'父级',parentId:'a'}],[{id:'x',name:'一',parentId:'y'},{id:'y',name:'二',parentId:'x'}],'命中');
  assert.deepEqual([...result.itemIds],['a','b']);
  assert.deepEqual([...result.groupIds],['x','y']);
  assert.deepEqual([...searchDirectory([{id:'orphan',title:'命中',parentId:'missing',groupId:'missing'}],[],'命中').itemIds],['orphan']);
});
