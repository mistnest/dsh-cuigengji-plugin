import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProse } from '../src/client/features/chapters/format.ts';

test('prose formatting preserves words, punctuation and paragraph order and is idempotent', () => {
  const original = '\r\n  她说：“Hello, world!”  \r\n\r\n\r\n\t他没有回答……\r第二天。\t\r\n';
  const result = formatProse(original);
  assert.equal(result, '　　她说：“Hello, world!”\n\n　　他没有回答……\n\n　　第二天。');
  assert.equal(result.replace(/\s/g, ''), original.replace(/\s/g, ''));
  assert.equal(formatProse(result), result);
  assert.equal(formatProse(' \t\n　'), '');
});
