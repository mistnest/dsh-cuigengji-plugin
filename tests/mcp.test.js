import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryBridge } from '../src/mcp/client.js';
import { Store } from '../src/core/store.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function fixture(options = {}) {
  const bindings = new Map([['session-a', 'novel-a'], ['session-b', 'novel-b']]);
  const calls = [];
  const store = {
    async dispatch(action, args, actor) {
      if (action === 'binding.get') return { novelId: bindings.get(actor.sessionId) };
      calls.push({ action, args, actor });
      return { action, args, actor };
    },
  };
  return { bridge: new MemoryBridge(store, options), calls, bindings };
}

test('SDK stdio roundtrip pins actor and novel to the host session', async t => {
  const { bridge, calls } = fixture();
  t.after(() => bridge.close());
  const result = await bridge.call('session-a', 'graph.create', {
    name: '许宁', content: '人物正文', actor: { kind: 'human' }, sessionId: 'session-b',
  });
  assert.equal(result.args.novelId, 'novel-a');
  assert.equal(result.args.content, '人物正文');
  assert.deepEqual(result.actor, { kind: 'agent', sessionId: 'session-a' });
  assert.equal(result.args.actor, undefined);
  assert.equal(result.args.sessionId, undefined);
  assert.equal(calls.length, 1);
  await assert.rejects(bridge.call('session-a', 'graph.list', { novelId: 'novel-b' }), /其他小说/);
  await assert.rejects(bridge.call('session-a', 'chapter.update', {}), /不允许/);
  await assert.rejects(bridge.call('unbound', 'graph.list', {}), /尚未绑定/);
});

test('separate sessions, binding updates, token revocation and child restart', async t => {
  const { bridge, bindings } = fixture();
  t.after(() => bridge.close());
  const first = await bridge.call('session-a', 'graph.list');
  const second = await bridge.call('session-b', 'edge.list');
  assert.equal(first.args.novelId, 'novel-a');
  assert.equal(second.args.novelId, 'novel-b');
  const connection = await bridge.connection('session-a');
  const oldToken = connection.token;
  await connection.client.close();
  const denied = await fetch(bridge.endpoint, {
    method: 'POST', headers: { authorization: `Bearer ${oldToken}` },
    body: JSON.stringify({ action: 'graph.list' }),
  });
  assert.equal(denied.status, 401);
  bindings.set('session-a', 'novel-c');
  const restarted = await bridge.call('session-a', 'context.get');
  assert.equal(restarted.args.novelId, 'novel-c');
  assert.notEqual((await bridge.connection('session-a')).token, oldToken);
});

test('bridge rejects unscoped HTTP calls and cancellation; disposal revokes connections', async () => {
  const { bridge } = fixture();
  await bridge.start();
  const unauthorized = await fetch(bridge.endpoint, { method: 'POST', body: '{}' });
  assert.equal(unauthorized.status, 401);
  const controller = new AbortController();
  controller.abort(new Error('停止写作'));
  await assert.rejects(bridge.call('session-a', 'graph.list', {}, { signal: controller.signal }), /停止写作/);
  await bridge.close();
  assert.equal(bridge.tokens.size, 0);
  await assert.rejects(bridge.call('session-a', 'graph.list'), /已关闭/);
});

test('real persistent store CRUD over MCP preserves revision conflicts and delete confirmation', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'cuigengji-mcp-'));
  const store = new Store(directory);
  const bridge = new MemoryBridge(store);
  t.after(async () => { await bridge.close(); await rm(directory, { recursive: true, force: true }); });
  const actor = { kind: 'human', sessionId: 'real-session' };
  const novel = await store.dispatch('novel.create', { title: '都市夜谈' }, actor);
  await store.dispatch('binding.set', { novelId: novel.id }, actor);
  const node = await bridge.call('real-session', 'graph.create', {
    type: 'character_card', name: '许宁', summary: '深夜归人', content: '正文设定',
  });
  const updated = await bridge.call('real-session', 'graph.update', {
    nodeId: node.id, expectedRevision: node.revision, summary: '发现都市传说的人',
  });
  assert.equal(updated.revision, node.revision + 1);
  const edge = await bridge.call('real-session', 'edge.create', {
    from: node.id, to: node.id, name: '自省',
  });
  assert.deepEqual(await bridge.call('real-session', 'edge.get', { edgeId: edge.id }), edge);
  await assert.rejects(bridge.call('real-session', 'graph.update', {
    nodeId: node.id, expectedRevision: node.revision, content: '不应覆盖',
  }), /版本已变化/);
  await assert.rejects(bridge.call('real-session', 'graph.delete', {
    nodeId: node.id, expectedRevision: updated.revision,
  }), /confirm/);
  const deleted = await bridge.call('real-session', 'graph.delete', {
    nodeId: node.id, expectedRevision: updated.revision, confirm: true,
  });
  assert.equal(deleted.deleted, true);
  assert.deepEqual(await bridge.call('real-session', 'graph.list'), []);
  assert.equal((await bridge.call('real-session', 'graph.get', { nodeId: node.id })).content, '正文设定');
});
