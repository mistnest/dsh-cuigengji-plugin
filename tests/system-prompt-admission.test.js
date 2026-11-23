import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import Projections from '@deepseek-ai/dsh-session-projection';
import Sessions from '@deepseek-ai/dsh-session';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import {registerPrompt} from '../src/adapters/dsh/prompt.js';

test('DSH admits, replaces and retires the writing instructions in real session events', async t => {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  await ctx.plugin(Projections);
  await ctx.plugin(Sessions);
  await ctx.plugin(SystemPrompt, {includeHarnessIdentity: false, includeRuntimeContext: false});
  let enabled = true;
  let content = '第一本书的创作要求';
  const store = {dispatch(action) {
    if (action === 'guidance.get') return {enabled};
    if (action === 'binding.get') return {novelId: 'book'};
    if (action === 'preset.read') return {enabled: true, content};
    throw Error(action);
  }};
  registerPrompt(ctx, {store});
  const session = ctx.sessions.create();
  async function admit() {
    const assembly = await ctx.systemPrompt.assemble({session, agent: {id: session.id}});
    const updates = assembly.systemUpdates(false);
    for (const {message, intent} of updates) {
      session.append('system/message', {turn: 0, step: 0, message}, intent);
    }
    return updates.flatMap(({message}) => message.source.sections);
  }
  assert.deepEqual((await admit()).map(s => s.name), ['cuigengji:writing', 'cuigengji:preset']);
  assert.deepEqual(await admit(), []);
  content = '第二本书的创作要求';
  assert.deepEqual((await admit()).map(s => s.name), ['cuigengji:preset']);
  content = '';
  assert.deepEqual((await admit()).map(s => [s.name, s.state]), [['cuigengji:preset', 'retired']]);
  enabled = false;
  assert.deepEqual((await admit()).map(s => [s.name, s.state]), [['cuigengji:writing', 'retired']]);
  assert.deepEqual(await admit(), []);
  enabled = true;
  assert.deepEqual((await admit()).map(s => s.name), ['cuigengji:writing']);
});
