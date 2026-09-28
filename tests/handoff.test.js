import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandoff } from '../src/core/handoff.js';
import { renderHandoff } from '../src/core/handoff-text.js';
import { registerSkills, skillSpecs } from '../src/assistant/skills.js';

function project() {
  return {
    id: 'novel', title: '标题'.repeat(500), description: '简介'.repeat(500), revision: 1,
    chapters: Object.fromEntries(Array.from({ length: 40 }, (_, order) => [String(order), {
      id: String(order), title: '章节'.repeat(500), order, revision: 1,
      content: 'PROSE_SECRET', versions: [{ content: 'HISTORY_SECRET' }], extra: 'FUTURE_FIELD_SECRET',
    }])),
    volumes: { late: { id: 'late', title: '后卷', order: 2 }, early: { id: 'early', title: '前卷', order: 1 } },
    nodes: { live: { content: 'MEMORY_SECRET' }, deleted: { deleted: true } },
    preset: { enabled: true, raw: 'RAW_SECRET', blocks: [{ content: 'PRESET_SECRET' }] },
    plan: { id: 'legacy', content: 'PLAN_SECRET' },
  };
}

test('handoff is bounded, content-free and pure even for legacy projects', () => {
  const novel = project();
  const binding = { novelId: novel.id, chapterId: '0', goal: '任务'.repeat(500), stage: 'write' };
  const before = structuredClone(novel);
  const value = createHandoff(novel, binding, { chapterLimit: 500 });
  assert.equal(value.chapters.length, 31);
  assert.equal(value.currentChapterStatus, 'available');
  assert.deepEqual(value.volumes.map(v => v.id), ['early', 'late']);
  assert.deepEqual(value.available, { preset: true, planning: 1, memory: 1 });
  assert.equal(value.novel.title.length, 121);
  assert.equal(value.novel.description.length, 501);
  assert.equal(value.binding.goal.length, 501);
  assert.doesNotMatch(JSON.stringify(value), /SECRET/);
  assert.deepEqual(novel, before);
  assert.match(renderHandoff(value), /…/);
  assert.ok(renderHandoff(value).length < 9000);
  assert.deepEqual(createHandoff(novel, binding, { chapterLimit: 0 }).chapters.map(c => c.id), ['0']);
  assert.deepEqual(createHandoff(novel, null, { chapterLimit: 0 }).chapters, []);
});

test('handoff excludes unrelated bindings and distinguishes missing from unselected chapters', () => {
  const novel = project();
  assert.equal(createHandoff(novel, { novelId: 'other', chapterId: '0' }).binding, null);
  assert.equal(createHandoff(novel, null).currentChapterStatus, 'unselected');
  for (const id of ['missing', '0']) {
    novel.chapters['0'].deleted = true;
    const value = createHandoff(novel, { novelId: novel.id, chapterId: id });
    assert.equal(value.currentChapterStatus, 'unavailable');
    assert.match(renderHandoff(value), /原参考章节已不可用/);
    assert.equal(value.chapters.some(c => c.id === id), false);
  }
});

test('each registered task skill includes the operational guide with one metadata header', () => {
  const skills = [];
  registerSkills({ skills: { register: skill => skills.push(skill) } });
  assert.equal(skills.length, skillSpecs.length);
  for (const skill of skills) {
    assert.match(skill.content, new RegExp(`^---\\r?\\nname: ${skill.name}\\r?\\n`));
    assert.equal(skill.content.match(/^name: cuigengji-/gm).length, 1);
    assert.match(skill.content, /cuigengji_project/);
    assert.match(skill.content, /preset.read/);
    assert.match(skill.content, /nextStart/);
    assert.match(skill.content, /expectedRevision/);
    assert.match(skill.content, /只读取了片段时不要用该片段替换整章/);
  }
});
