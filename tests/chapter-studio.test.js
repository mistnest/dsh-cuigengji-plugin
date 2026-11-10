import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {diffProse,highlightProseLine} from '../src/domain/chapters/diff.ts';
import {manuscriptLineAt,manuscriptLineRange,manuscriptLineStarts} from '../src/client/features/chapters/lines.ts';
import {Store} from '../src/application/store.js';

const reconstruct=(chunks,side)=>chunks.flatMap(chunk=>chunk[side]).join('\n');
test('diff reconstructs both documents with repeated paragraphs, blank lines, insertions and deletions',()=>{
  let seed=891;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let run=0;run<140;run++){
    const before=Array.from({length:random()%35},()=>['甲','乙','重复段落','','🙂','<script>普通文本</script>'][random()%6]).join('\n');
    const after=Array.from({length:random()%35},()=>['甲','乙','重复段落','','🙂','<script>普通文本</script>'][random()%6]).join('\n');
    const chunks=diffProse(before,after);
    assert.equal(reconstruct(chunks,'before'),before);assert.equal(reconstruct(chunks,'after'),after);
    for(const chunk of chunks.filter(chunk=>chunk.kind==='same'))assert.deepEqual(chunk.before,chunk.after);
    assert.deepEqual(chunks.filter(chunk=>chunk.change!==null).map(chunk=>chunk.change),Array.from({length:chunks.filter(chunk=>chunk.change!==null).length},(_,i)=>i));
  }
  assert.equal(diffProse('第一行\r\n第二行\r\n','第一行\n第二行\n').filter(chunk=>chunk.kind==='change').length,0);
});

test('large anchored changes stay separate; a wholesale rewrite remains reconstructable with bounded memory',()=>{
  const source=Array.from({length:6000},(_,i)=>`第 ${i} 行，一句完整的正文。`),target=[...source];
  target[100]='第一处改写';target[5900]='第二处改写';
  const chunks=diffProse(source.join('\n'),target.join('\n'));
  assert.equal(chunks.filter(chunk=>chunk.kind==='change').length,2);
  assert.equal(reconstruct(chunks,'before'),source.join('\n'));assert.equal(reconstruct(chunks,'after'),target.join('\n'));
  const replacement=diffProse(Array(5000).fill('旧正文').join('\n'),Array(5000).fill('全新正文').join('\n'));
  assert.equal(replacement.length,1);assert.equal(replacement[0].before.length,5000);assert.equal(replacement[0].after.length,5000);
});

test('inline highlighting retains multiple separated edits, Unicode code points and very long lines',()=>{
  const before='🙂她在旧港找到红色来信，再次看向灯塔。',after='🙂她在新港找到蓝色来信，最后看向灯塔。';
  const diff=highlightProseLine(before,after);
  assert.equal(diff.before.map(part=>part.text).join(''),before);assert.equal(diff.after.map(part=>part.text).join(''),after);
  assert.ok(diff.before.filter(part=>part.kind==='remove').length>=2);
  assert.equal(diff.after[0].text.startsWith('🙂'),true);
  const large=highlightProseLine('甲'.repeat(180000)+'旧尾','甲'.repeat(180000)+'新尾');
  assert.equal(large.before.map(part=>part.text).join(''),'甲'.repeat(180000)+'旧尾');
  assert.equal(large.after.map(part=>part.text).join(''),'甲'.repeat(180000)+'新尾');
});

test('logical line positions include blank/trailing lines and use DOM UTF-16 offsets',()=>{
  const text='🙂第一行\n\n末行\n',starts=manuscriptLineStarts(text);
  assert.deepEqual(starts,[0,6,7,10]);
  assert.equal(manuscriptLineAt(starts,5),1);assert.equal(manuscriptLineAt(starts,7),3);
  assert.deepEqual(manuscriptLineRange(text,2),{start:6,end:6});
  assert.deepEqual(manuscriptLineRange(text,3),{start:7,end:9});
  assert.deepEqual(manuscriptLineRange(text,4),{start:10,end:10});
  for(const line of [0,5,1.2,NaN])assert.equal(manuscriptLineRange(text,line),null);
  assert.deepEqual(manuscriptLineRange('',1),{start:0,end:0});
});

test('chapter history can read one snapshot without changing current prose or legacy full-history calls',async t=>{
  const root=await mkdtemp(join(tmpdir(),'cuigengji-chapter-compare-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new Store(root),actor={kind:'human',sessionId:'comparison-test'};
  const novelId=(await store.dispatch('novel.create',{title:'比较测试'},actor)).id;
  const chapter=await store.dispatch('chapter.create',{novelId,title:'初稿',content:'原文。'},actor);
  await store.dispatch('chapter.update',{novelId,chapterId:chapter.id,expectedRevision:1,content:'润色后的正文。'},actor);
  const args={novelId,chapterId:chapter.id};
  const before=await store.dispatch('chapter.get',args,actor);
  const summaries=await store.dispatch('chapter.history',args,actor);assert.equal(summaries.length,2);assert.ok(summaries.every(version=>version.content===undefined));
  const selected=await store.dispatch('chapter.history',{...args,revision:1,includeContent:true},actor);
  assert.equal(selected.length,1);assert.equal(selected[0].content,'原文。');
  const legacy=await store.dispatch('chapter.history',{...args,includeContent:true},actor);assert.equal(legacy.length,2);assert.equal(legacy[1].content,'润色后的正文。');
  await assert.rejects(()=>store.dispatch('chapter.history',{...args,revision:0},actor),/revision/);
  await assert.rejects(()=>store.dispatch('chapter.history',{...args,revision:99,includeContent:true},actor),/不存在/);
  assert.deepEqual(await store.dispatch('chapter.get',args,actor),before);
});
