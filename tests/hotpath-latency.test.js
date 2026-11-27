import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UsageService } from '../src/modules/usage/reports/service.ts';
import { registerUsage } from '../src/modules/access/dsh/usage.ts';
import { usageDay } from '../src/modules/usage/pricing/settings.ts';
import { Store } from '../src/composition/store.ts';
import { createSessionPolicy } from '../src/modules/access/dsh/session-policy.ts';
import { registerPrompt } from '../src/modules/access/guidance/prompt.ts';
import { importPreset } from '../src/modules/workspace/presets/index.ts';

const stamp = Date.parse('2026-11-25T12:00:00+08:00');
const day = usageDay(stamp);
const sample = { inputTokens: 1200, outputTokens: 200, cacheReadTokens: 800, cacheWriteTokens: 0, totalTokens: 2200 };
const route = { provider: 'deepseek', model: 'deepseek-flash' };

test('live session/flush checkpoints never block on hung catchup replays and skip disk writes on non-settlement events', async t => {
  const root = await mkdtemp(join(tmpdir(), 'cg-hotpath-usage-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const service = new UsageService(root);
  let metaSaves = 0;
  const origSave = service.store.metadata.save.bind(service.store.metadata);
  service.store.metadata.save = async state => {
    metaSaves++;
    return origSave(state);
  };

  const hungReplay = Promise.withResolvers();
  const handlers = {};
  let dispose;
  const ctx = {
    on: (name, fn) => { handlers[name] = fn; },
    get: name => name === 'sessionPersistence' ? {
      open: async id => {
        if (id === 'hung-history') await hungReplay.promise;
        return {
          inheritedEventCount: 0,
          read: async () => ({ events: [] }),
          close: async () => {},
        };
      },
      list: async () => [{ header: { id: 'hung-history' } }],
    } : undefined,
    effect: fn => { dispose = fn(); },
    logger: { warn: () => {} },
  };

  registerUsage(ctx, service);
  t.after(async () => {
    hungReplay.resolve();
    await dispose?.();
  });

  // Start a hung replay on another session and initialize our live session once.
  handlers['session/created']({ id: 'hung-history', inheritedEventCount: 0 });
  handlers['session/created']({ id: 'live-chat', inheritedEventCount: 0 });
  await handlers['session/flush']({ id: 'live-chat' });

  const savesBeforeTurn = metaSaves;

  // Step preparation & request header events must buffer in memory with 0 disk writes
  // and 0 blocking on hung-history during DSH's pre-step and llm/stream checkpoints.
  for (const [seq, type, data] of [
    [0, 'turn/start', { turn: 1 }],
    [1, 'step/start', { turn: 1, step: 1 }],
    [2, 'system/message', { turn: 1, step: 1 }],
    [3, 'request/header', { header: {} }],
  ]) {
    handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, { seq, time: stamp, type, data });
  }

  const flushStart = performance.now();
  await handlers['session/flush']({ id: 'live-chat' });
  assert.ok(performance.now() - flushStart < 200, 'checkpoint before llm/stream must not wait on hung session');
  assert.equal(metaSaves, savesBeforeTurn, 'non-settlement step events must not write UsageStore metadata');

  // First assistant message initializes pricingVersion once (1 save) + journaled page commit (2 saves) = 3 saves.
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 4,
    time: stamp,
    type: 'assistant/message',
    data: { turn: 1, step: 1, usage: sample, message: { source: route, content: [{ type: 'text', text: 'x'.repeat(50_000) }] } },
  });
  await handlers['session/flush']({ id: 'live-chat' });
  const savesAfterFirstMessage = metaSaves;
  assert.equal(savesAfterFirstMessage - savesBeforeTurn, 3);

  // Tool call / result / step end / next step prep buffer in memory with 0 disk writes.
  for (const [seq, type, data] of [
    [5, 'tool/call', { turn: 1, step: 1 }],
    [6, 'tool/result', { turn: 1, step: 1 }],
    [7, 'step/end', { turn: 1, step: 1 }],
    [8, 'step/start', { turn: 1, step: 2 }],
    [9, 'request/header', { header: {} }],
  ]) {
    handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, { seq, time: stamp, type, data });
  }
  await handlers['session/flush']({ id: 'live-chat' });
  assert.equal(metaSaves, savesAfterFirstMessage);

  // Second assistant message uses cached pricingVersion: exactly 2 saves (pending journal + final metadata).
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 10,
    time: stamp,
    type: 'assistant/message',
    data: { turn: 1, step: 2, usage: sample, message: { source: route } },
  });
  await handlers['session/flush']({ id: 'live-chat' });
  const savesAfterSecondMessage = metaSaves;
  assert.equal(savesAfterSecondMessage - savesAfterFirstMessage, 2, 'subsequent record page commit uses 2 saves');

  // Turn completion without page changes saves metadata once (not twice).
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 11,
    time: Date.now(),
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  });
  await handlers['session/flush']({ id: 'live-chat' });
  assert.equal(metaSaves - savesAfterSecondMessage, 1, 'metadata-only notification commit saves metadata once');

  const report = await service.report({ from: day, to: day, details: true });
  assert.equal(report.total.calls, 2);
  assert.equal(report.total.tokens, 4400);
  assert.deepEqual(report.records.map(r => r.step).sort(), [1, 2]);

  // Synchronous assistant/message + step/start + assistant/message without intermediate flush must preserve strict seq order and never drop calls.
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 12,
    time: stamp,
    type: 'assistant/message',
    data: { turn: 2, step: 0, usage: sample, message: { source: route } },
  });
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 13,
    time: stamp,
    type: 'step/start',
    data: { turn: 2, step: 1 },
  });
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 14,
    time: stamp,
    type: 'assistant/message',
    data: { turn: 2, step: 1, usage: sample, message: { source: route } },
  });
  await handlers['session/flush']({ id: 'live-chat' });
  const reportAfterBurst = await service.report({ from: day, to: day, details: true });
  assert.equal(reportAfterBurst.total.calls, 4);
  assert.equal(reportAfterBurst.total.tokens, 8800);

  // Transient EIO during usage.ingest must retain buffered events so a subsequent batch never advances cursor past the failed settlement.
  const origIngest = service.ingest.bind(service);
  let injectEio = true;
  service.ingest = async (...args) => {
    if (injectEio) {
      injectEio = false;
      const err = new Error('EIO: simulated journal write failure');
      err.code = 'EIO';
      throw err;
    }
    return origIngest(...args);
  };
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 15,
    time: stamp,
    type: 'assistant/message',
    data: { turn: 3, step: 0, usage: sample, message: { source: route } },
  });
  await handlers['session/flush']({ id: 'live-chat' });
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 16,
    time: stamp,
    type: 'step/start',
    data: { turn: 3, step: 1 },
  });
  handlers['session/event']({ id: 'live-chat', inheritedEventCount: 0 }, {
    seq: 17,
    time: stamp,
    type: 'assistant/message',
    data: { turn: 3, step: 1, usage: sample, message: { source: route } },
  });
  await handlers['session/flush']({ id: 'live-chat' });
  const reportAfterEio = await service.report({ from: day, to: day, details: true });
  assert.equal(reportAfterEio.total.calls, 6);
  assert.equal(reportAfterEio.total.tokens, 13200);
});

test('combined prompt + pre-step narrow read uses one lock per step and sees external Store updates while preserving pinned templates', async t => {
  const root = await mkdtemp(join(tmpdir(), 'cg-hotpath-prompt-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const store = new Store(root);
  const human = { kind: 'human', sessionId: 'author-session' };
  const novel = await store.dispatch('novel.create', { title: '热路径验证作品' }, human);
  await store.dispatch('variables.configure', { novelId: novel.id, baseRevision: 0, enabled: true }, human);
  await store.dispatch('variables.patch', {
    novelId: novel.id,
    baseRevision: 1,
    anchor: { kind: 'initial' },
    operations: [{ op: 'set', path: '/天气', value: '细雨' }],
    requestId: 'init-weather',
  }, human);
  const preset = await store.dispatch('preset.set', {
    novelId: novel.id,
    expectedRevision: 0,
    preset: { ...importPreset({ content: '窗外天气：{{var::天气}}' }), enabled: true },
  }, human);

  let locks = 0;
  const origAcquire = store.acquire.bind(store);
  store.acquire = async () => {
    locks++;
    return origAcquire();
  };

  const listeners = {};
  const ctx = { on: (name, fn) => { listeners[name] = fn; } };
  const policy = createSessionPolicy({ store, audit: async () => {} });
  policy.register(ctx, { disconnect: async () => {} });
  registerPrompt(ctx, {
    store,
    resolveBinding: policy.resolveBinding,
    readPromptState: policy.readPromptState,
  });

  const runStepHooks = async sessionId => {
    const base = { sections: [{ name: 'host', text: 'DSH' }], contexts: [], tools: [], variables: {} };
    const assembled = await listeners['system-prompt/assemble'](base, { agent: { id: sessionId } }, async () => base);
    await listeners['agent/pre-step']({ agent: { id: sessionId } }, async () => ({ kind: 'enter', messages: [] }));
    return assembled;
  };

  // Unbound session: 1 lock total across assemble + pre-step!
  locks = 0;
  const unbound = await runStepHooks('fresh-chat');
  assert.equal(locks, 1, 'unbound assemble + pre-step should acquire Store lock once');
  assert.ok(unbound.sections.some(s => s.name === 'cuigengji:writing'));
  assert.ok(!unbound.sections.some(s => s.name === 'cuigengji:preset'));
  listeners['agent/status']({ agent: { id: 'fresh-chat' }, status: 'idle' });

  // Bind author-session and run step 1: 1 lock total, captures preset snapshot & protects active novel!
  await store.dispatch('binding.set', { novelId: novel.id }, human);
  locks = 0;
  const step1 = await runStepHooks('author-session');
  assert.equal(locks, 1, 'bound assemble + pre-step should acquire Store lock once');
  assert.equal(step1.sections.find(s => s.name === 'cuigengji:preset').text, '作者的写作要求：\n窗外天气：细雨');

  const bookBefore = (await store.dispatch('novel.list', {}, human))[0];
  await assert.rejects(
    policy.dispatch('novel.archive', { novelId: novel.id, expectedRevision: bookBefore.revision, confirm: true }, { kind: 'human', sessionId: 'other' }),
    { code: 'NOVEL_BUSY' },
  );

  // External Store instance mutates both preset template and story variables between step 1 and step 2.
  const externalStore = new Store(root);
  await externalStore.dispatch('preset.set', {
    novelId: novel.id,
    expectedRevision: preset.revision,
    preset: { ...preset, blocks: [{ ...preset.blocks[0], content: '全新模板不应覆盖已捕获会话' }] },
  }, human);
  const varRevision = (await externalStore.dispatch('variables.config', { novelId: novel.id }, human)).revision;
  await externalStore.dispatch('variables.patch', {
    novelId: novel.id,
    baseRevision: varRevision,
    anchor: { kind: 'initial' },
    operations: [{ op: 'set', path: '/天气', value: '暴雪' }],
    requestId: 'next-weather',
  }, human);

  // Step 2 sees the external variable update in 1 lock while keeping the session's pinned template!
  locks = 0;
  const step2 = await runStepHooks('author-session');
  assert.equal(locks, 1);
  assert.equal(step2.sections.find(s => s.name === 'cuigengji:preset').text, '作者的写作要求：\n窗外天气：暴雪');

  listeners['agent/status']({ agent: { id: 'author-session' }, status: 'idle' });
});
