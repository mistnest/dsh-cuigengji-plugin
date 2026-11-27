import test from 'node:test';
import assert from 'node:assert/strict';
import {mapSelection} from '../src/modules/author-ui/workbench/features/chapters/selection.ts';

test('a selection stays attached to its prose when preceding text is inserted or removed', () => {
  const before = '她收起信。\n\n门外有人敲门。', prefix = '雨停了。\n\n';
  const selection = {start: before.indexOf('门外'), end: before.length, direction: 'backward'};
  const moved = mapSelection(before, prefix + before, selection);
  assert.deepEqual(moved, {...selection, start: selection.start + prefix.length, end: selection.end + prefix.length});
  assert.equal((prefix + before).slice(moved.start, moved.end), before.slice(selection.start, selection.end));
  assert.deepEqual(mapSelection(prefix + before, before, moved), selection);
});

test('later edits leave the caret alone; deleting its paragraph clamps it to the replacement', () => {
  assert.deepEqual(mapSelection('甲段。\n\n乙段。', '甲段。\n\n乙段改。', {start: 2, end: 2, direction: 'none'}), {start: 2, end: 2, direction: 'none'});
  assert.deepEqual(mapSelection('序章。被删除的段落。尾声。', '序章。尾声。', {start: 6, end: 9, direction: 'backward'}), {start: 3, end: 3, direction: 'backward'});
});
