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
  assert.doesNotMatch(entry, /mock|fixture/i, 'the page must not ship mock data');
  assert.match(entry, /story\.context\.get/, 'the context preview must read the host projection, not a local approximation');
});

test('the four visual additions read real data and never invent a score', async () => {
  const entry = await read('src/client/features/story/index.tsx');
  for (const [section, label] of [['units', '卷纲与单元'], ['detect', '去 AI 味体检'], ['rhythm', '节奏热力图'], ['truth', '双时间线'], ['style', '文风对照'], ['reference', '拆文库与对标']]) {
    assert.match(entry, new RegExp(`${section}:'${label}'`), `the ${label} section must be reachable`);
  }
  const detect = await read('src/client/features/story/DetectBoard.tsx');
  // The board receives the loader from the page, which wraps story.detect.
  assert.match(entry, /story\.detect/, 'the page must read the host scan');
  assert.match(detect, /DetectorResult/, 'the board must render the host result type');
  // The detector is a candidate list, not a score. A number out of 100 would be
  // the one thing the upstream method forbids outright.
  assert.doesNotMatch(detect, /AI\s*味\s*\d+\s*分/);
  assert.match(detect, /不是评分|不是分数|候选/, 'the board must state that hits are candidates');
  const units = await read('src/client/features/story/VolumeBoard.tsx');
  assert.match(units, /unit\.upsert/, 'units must be writable through story.apply');
  assert.match(units, /storyline\.upsert/);
  assert.match(units, /canCarryChapter|能独立扛章/, 'the line matrix must show whether a line can carry a chapter');
  const rhythm = await read('src/client/features/story/RhythmHeatmap.tsx');
  assert.match(rhythm, /rhythm\.upsert/, 'a tone record must be writable');
  assert.match(rhythm, /expectedChapterRevision/, 'a tone record must carry the prose version it describes');
  const style = await read('src/client/features/story/StyleBoard.tsx');
  assert.match(style, /style\.upsert/, 'the style dossier must be writable');
  // An unset target and a missing sample both yield a null deviation; neither
  // may be rendered as 0 or as "matched".
  assert.match(style, /data-state=/, 'the three deviation states must be distinguishable in the DOM');
  assert.match(style, /未设定目标/);
  assert.match(style, /样本不足/);
  const truth = await read('src/client/features/story/TimelineBoard.tsx');
  assert.match(truth, /authorTruth/);
  assert.match(truth, /readerKnown/);
  assert.match(truth, /信息差/, 'the board must separate what the author knows from what the reader knows');
  const review = await read('src/client/features/story/ReviewDesk.tsx');
  assert.match(review, /ReviewMatrix/, 'review distribution must be part of the review page');
  assert.match(await read('src/client/features/story/ReviewMatrix.tsx'), /categoryNames/);
  const reference = await read('src/client/features/story/ReferenceBoard.tsx');
  assert.match(reference, /story\.reference\.import/, 'reference import must call the host action');
  assert.match(reference, /reference\.remove/, 'removing a project reference must be possible');
  assert.match(reference, /对标节奏对照/, 'the reference rhythm comparison must be visible');
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
