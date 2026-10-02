import test from 'node:test';
import assert from 'node:assert/strict';
import { manuscriptClipboard } from '../src/client/features/chapters/clipboard.ts';

test('copy keeps literal text, indentation, blank lines, and only real line breaks', () => {
  const selected='　　第一段。\r\n\r\n  A & B <正文> "引号"\n';
  const result=manuscriptClipboard(selected);
  assert.equal(result.plain,selected);
  assert.equal((result.html.match(/<p /g)||[]).length,4);
  assert.equal((result.html.match(/<br>/g)||[]).length,2);
  assert.ok(result.html.includes('　　第一段。'));
  assert.ok(result.html.includes('&nbsp;&nbsp;A &amp; B &lt;正文&gt;'));
  assert.ok(!result.html.includes('<正文>'));
  assert.equal((manuscriptClipboard('文'.repeat(500)).html.match(/<p /g)||[]).length,1);
  assert.ok(manuscriptClipboard('An ordinary English sentence.').html.includes('An ordinary English sentence.'));
});

test('copied text cannot become executable HTML in the destination', () => {
  const text='<img src=x onerror="alert(1)"><script>bad()</script>';
  const result=manuscriptClipboard(text);
  assert.equal(result.plain,text);
  assert.ok(!result.html.includes('<img'));
  assert.ok(!result.html.includes('<script'));
});
