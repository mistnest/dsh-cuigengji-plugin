// Static integration guards for the story workbench. No browser is required:
// these read the shipped sources and the built client bundle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';

const root = new URL('../', import.meta.url);
const read = async path => readFile(new URL(path, root), 'utf8');
const storyDir = new URL('src/client/features/story/', root);

test('the story workbench is reachable from the book navigation and renders real story data', async () => {
  const header = await read('src/client/shared/WorkbenchHeader.tsx');
  assert.match(header, /\['story', '创作'\]/, 'the header must offer the 创作 tab');
  const shell = await read('src/client/WorkbenchShell.tsx');
  assert.match(shell, /import \{ Story \} from '\.\/features\/story\/index\.tsx'/);
  assert.match(shell, /tab==='story' && <Story \{\.\.\.\{call,novelId,tick,run,busy\}\} onChapter=/);
  assert.match(shell, /showTabs=\{\['story','chapters','plan','memory'\]\.includes\(tab\)\}/);
  assert.match(shell, /story:'创作'/, 'returning from a reference must name the tab');
  const navigation = await read('src/client/shell/useWorkbenchNavigation.ts');
  assert.match(navigation, /export type BookPage='story'\|'chapters'\|'plan'\|'memory'/);
  assert.match(navigation, /story:'创作'/);
  const entry = await read('src/client/features/story/index.tsx');
  assert.match(entry, /call\('story\.get'|useStoryWorkspace/, 'the page must read the native story API');
  assert.doesNotMatch(entry, /preview|mock|fixture/i, 'the page must not ship mock data');
});

test('story writes use the atomic apply path with a version and request identity', async () => {
  const model = await read('src/client/features/story/model.ts');
  assert.match(model, /story\.apply/);
  assert.match(model, /expectedRevision/);
  assert.match(model, /requestId/);
  const chapterDesk = await read('src/client/features/story/ChapterDesk.tsx');
  const reviewDesk = await read('src/client/features/story/ReviewDesk.tsx');
  assert.match(chapterDesk, /expectedChapterRevision/, 'chapter facts must carry the prose version they describe');
  assert.match(reviewDesk, /expectedChapterRevision/, 'review evidence must carry the prose version it quotes');
  const workspace = await read('src/client/features/story/useStoryWorkspace.ts');
  assert.match(workspace, /isConflict/, 'conflicts must be handled without discarding the author draft');
  assert.match(workspace, /pending/);
});

test('story UI keeps the harness boundary: no client package imports and no literal colors', async () => {
  const files = (await readdir(storyDir)).filter(name => /\.(ts|tsx)$/.test(name));
  assert.ok(files.length >= 8);
  const style = await read('src/client/features/story/style.ts');
  // Token fallbacks such as var(--dsw-alias-label-secondary,#737780) follow the
  // repository convention; only colors outside a token reference are literals.
  const withoutFallbacks = style.replace(/var\(--dsw-[a-z0-9-]+,#[0-9a-fA-F]{3,8}\)/g, 'var(--token)');
  const literals = [...withoutFallbacks.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(match => match[0]);
  const allowed = new Set(['#fff', '#ffffff']);
  assert.deepEqual(literals.filter(value => !allowed.has(value.toLowerCase())), [],
    'new styles must use theme tokens, not hard-coded colors');
  assert.match(style, /--dsw-alias-/, 'new styles must reference harness theme tokens');
  assert.match(style, /@container\(max-width:759px\)/, 'the narrow layout must stay usable');
  for (const name of files) {
    const text = await readFile(join(storyDir.pathname.replace(/^\//, ''), name), 'utf8');
    assert.doesNotMatch(text, /@deepseek-ai\/dsh-client/, `${name} must not import harness client packages`);
    assert.doesNotMatch(text, /document\.body/, `${name} must not append DOM outside its component`);
  }
  const aggregate = await read('src/client/style.ts');
  assert.match(aggregate, /\+ storyStyles;/);
});

test('built client bundle contains the story tab so a packaged install exposes it', async () => {
  // esbuild escapes non-ASCII text, so assert on stable ASCII markers.
  const bundle = await read('lib/client.js');
  assert.match(bundle, /story-workspace/);
  assert.match(bundle, /story\.get/);
  assert.match(bundle, /story\.apply/);
  const runtime = await read('runtime/domain/story/index.js');
  assert.match(runtime, /story\.apply/);
});
