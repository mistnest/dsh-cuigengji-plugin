import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionPolicy, novelToolDenial } from '../src/assistant/session.js';
import { registerPrompt } from '../src/assistant/prompt.js';

test('session policy permits unbound binding inspection and guards only real bypass tools', async () => {
  const calls = [];
  const store = { dispatch: async (action, args, actor) => {
    calls.push({ action, args, actor });
    if (action === 'binding.get') return null;
    return { ok: true };
  } };
  const policy = createSessionPolicy({ store, audit: async () => {} });
  assert.equal(await policy.dispatch('binding.get', {}, { kind: 'agent', sessionId: 's1' }), null);
  await assert.rejects(policy.dispatch('novel.get', {}, { kind: 'agent', sessionId: 's1' }), /先在催更姬/);
  assert.match(novelToolDenial('bash'), /cuigengji/);
  assert.match(novelToolDenial('str_replace_editor'), /cuigengji/);
  assert.match(novelToolDenial('subagent'), /单 Agent/);
  assert.match(novelToolDenial('spawn_teammate'), /单 Agent/);
  assert.match(novelToolDenial('cordis_run'), /cuigengji/);
  assert.equal(novelToolDenial('run_code'), undefined);
  assert.equal(novelToolDenial('cuigengji_project'), undefined);
  assert.match(novelToolDenial('unknown_plugin_writer'), /未启用此工具/);
  assert.equal(calls[0].actor.sessionId, 's1');
});

test('prompt adds persona and context only for a bound agent', async () => {
  const listeners = {};
  const ctx = { on: (name, fn) => { listeners[name] = fn; } };
  const store = { dispatch: async (action) => action === 'context.get' ? { novel: 'n1', items:[] } : { novelId: 'n1' } };
  const audited = [];
  registerPrompt(ctx, { store, contextChars: 2000, audit: async (...args) => audited.push(args), resolveBinding: async id => id === 'bound' ? { novelId: 'n1' } : null });
  const next = async () => ({ sections: [{ name: 'base', text: 'base' }], contexts: [], tools: [], variables: {} });
  const unbound = await listeners['system-prompt/assemble']({ sections: [], contexts: [] }, { agent: { id: 'none' } }, next);
  assert.equal(unbound.sections.length, 1);
  const bound = await listeners['system-prompt/assemble']({ sections: [], contexts: [] }, { agent: { id: 'bound' } }, next);
  assert.equal(bound.sections.some(section => section.name === 'cuigengji:writing'), true);
  assert.equal(bound.contexts[0].name, 'cuigengji:novel');
  assert.equal(audited.length, 1);
});
