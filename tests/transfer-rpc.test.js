import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/composition/store.ts';
import {TransferService} from '../src/modules/library/archives/transfer-service.ts';
import {registerRpcRoute} from '../src/modules/access/rpc/route.ts';
import {TOOL_ACTIONS} from '../src/modules/access/catalog/actions.ts';

test('transfer RPC works before binding a session, validates envelopes and stays off Agent tool actions', async t => {
  const root = await mkdtemp(join(tmpdir(), 'cuigengji-transfer-rpc-')); t.after(() => rm(root, {recursive: true, force: true}));
  const store = new Store(root), transfer = new TransferService(store);
  let route; registerRpcRoute({connection: {fetch: {register: value => {route = value;}}}}, {dispatch: (...args) => store.dispatch(...args), dataRoot: root, transfer});
  const call = async (action, args = {}) => {const response = await route.fetch(new Request('http://localhost/api/cuigengji/dispatch', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({type: 'client-request', method: 'cuigengji/dispatch', rpcId: 'test', payload: {action, args}})})); return (await response.json()).result;};
  const file = {name: '章节.txt', text: '第一章 来信\n\n　　她打开信封。'};
  assert.equal((await call('transfer.catalog')).ok, true);
  const inspect = await call('transfer.inspect', {file}); assert.equal(inspect.ok, true); assert.equal(inspect.value.kind, 'chapters');
  const options = {mode: 'copy', title: '新小说'}, preview = await call('transfer.preview', {file, options});
  const imported = await call('transfer.import', {file, options, proof: preview.value.proof, requestId: randomUUID()});
  assert.equal(imported.ok, true); assert.equal((await call('transfer.catalog')).value.books[0].title, '新小说');
  assert.equal((await call('transfer.unknown')).ok, false);
  assert.equal(Object.values(TOOL_ACTIONS).flat().some(a => a.startsWith('transfer.')), false);
});
