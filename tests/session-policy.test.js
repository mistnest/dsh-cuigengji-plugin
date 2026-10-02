import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionPolicy } from '../src/assistant/session.js';
import { registerPrompt } from '../src/assistant/prompt.js';

test('session policy scopes novel data access without restricting host tools', async () => {
  const calls = [];
  const store = { dispatch: async (action, args, actor) => {
    calls.push({ action, args, actor });
    if (action === 'binding.get') return null;
    return { ok: true };
  } };
  const policy = createSessionPolicy({ store, audit: async () => {} });
  assert.equal(await policy.dispatch('binding.get', {}, { kind: 'agent', sessionId: 's1' }), null);
  await assert.rejects(policy.dispatch('novel.get', {}, { kind: 'agent', sessionId: 's1' }), /先在催更姬/);
  assert.equal(calls[0].actor.sessionId, 's1');
});

test('binding a novel does not register a host tool guard', () => {
  const listeners = {};
  let guards = 0;
  const ctx = {
    on: (name, fn) => { listeners[name] = fn; },
    tools: { guard: () => { guards++; } },
  };
  const policy = createSessionPolicy({ store: { dispatch: async () => null }, audit: async () => {} });
  policy.register(ctx, { disconnect: async () => {} });
  assert.equal(guards, 0);
  assert.ok(listeners['agent/pre-step']);
});

test('prompt only reads the bound writing preset, without fetching story context', async () => {
  const listeners = {};
  const ctx = { on: (name, fn) => { listeners[name] = fn; } };
  const calls = [];
  const store = { dispatch: async action => calls.push(action) };
  const audited = [];
  registerPrompt(ctx, { store, contextChars: 2000, audit: async (...args) => audited.push(args), resolveBinding: async id => id === 'bound' ? { novelId: 'n1' } : null });
  const next = async () => ({ sections: [{ name: 'base', text: 'base' }], contexts: [], tools: [], variables: {} });
  const unbound = await listeners['system-prompt/assemble']({ sections: [], contexts: [] }, { agent: { id: 'none' } }, next);
  assert.equal(unbound.sections.length, 2);
  const bound = await listeners['system-prompt/assemble']({ sections: [], contexts: [] }, { agent: { id: 'bound' } }, next);
  assert.equal(bound.sections.some(section => section.name === 'cuigengji:writing'), true);
  assert.equal(bound.contexts.length, 0);
  assert.equal(bound.sections.some(section => section.name === 'cuigengji:handoff'), false);
  assert.deepEqual(audited, []);
  assert.deepEqual(calls, ['preset.read']);
});

test('reassembly removes old plugin content and preserves host entries', async () => {
  let assemble;
  registerPrompt({ on: (_, handler) => { assemble = handler; } });
  const hostSection = { name: 'host', text: '宿主提示词' };
  const hostContext = { name: 'host-data', text: '用户附件' };
  const original = {
    sections: [hostSection, { name: 'cuigengji:preset', text: 'OLD_PRESET' }, { name: 'cuigengji:writing', text: 'OLD_WRITING' }],
    contexts: [hostContext, { name: 'cuigengji:novel', text: 'OLD_PROSE' }],
    tools: [{ name: 'shell' }, { name: 'delegate' }], variables: { host: true },
  };
  const before = structuredClone(original);
  const context = { agent: { id: 'bound' } };
  const first = await assemble({}, context, async () => original);
  const second = await assemble({}, context, async () => first);
  assert.deepEqual(second, first);
  assert.deepEqual(original, before);
  assert.equal(first.sections[0], hostSection);
  assert.deepEqual(first.contexts, [hostContext]);
  assert.equal(first.tools, original.tools);
  assert.equal(first.variables, original.variables);
  assert.doesNotMatch(JSON.stringify(first), /OLD_/);
  const unbound = await assemble({}, context, async () => second);
  assert.equal(unbound.sections.filter(section => section.name === 'cuigengji:writing').length, 1);
  assert.deepEqual(unbound.contexts, [hostContext]);
});
