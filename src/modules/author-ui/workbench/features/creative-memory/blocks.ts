import {markdownHeadingId} from '../../shared/markdown-headings.ts';

export interface MemoryBlock {
  index: number;
  headingId: string | null;
  title: string;
  raw: string;
}

export interface InlineEditSession {
  mode: 'block' | 'full';
  index: number;
  headingId: string | null;
  before: string;
  raw: string;
  originalRaw?: string;
  after: string;
  selectHeading: boolean;
}

/** Split Markdown into top-level heading sections while ignoring `#` inside fenced code blocks. */
export function splitMemoryBlocks(source: string): MemoryBlock[] {
  if (!source.trim()) return [];
  const lines = source.split('\n');
  const starts: {offset: number; title: string; headingId: string | null}[] = [];
  let inFence = false;
  let offset = 0;
  let headingIndex = 0;
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (/^(`{3,}|~{3,})/.test(trimmed)) inFence = !inFence;
    else if (!inFence) {
      const m = /^(#{1,3})\s+(.+?)\s*#*$/.exec(trimmed);
      if (m) {
        const clean = m[2].replace(/[*_`~]/g, '').trim();
        const headingId = clean ? markdownHeadingId(clean, ++headingIndex) : null;
        starts.push({offset, title: clean || '未命名条目', headingId});
      }
    }
    offset += line.length + 1;
  }
  if (!starts.length) {
    return [{index: 0, headingId: null, title: '正文', raw: source.replace(/\s+$/, '')}];
  }
  const blocks: MemoryBlock[] = [];
  if (starts[0].offset > 0) {
    const intro = source.slice(0, starts[0].offset).replace(/\s+$/, '');
    if (intro.trim()) blocks.push({index: 0, headingId: null, title: '导言', raw: intro});
  }
  for (let i = 0; i < starts.length; i++) {
    const current = starts[i];
    const nextOffset = i + 1 < starts.length ? starts[i + 1].offset : source.length;
    const raw = source.slice(current.offset, nextOffset).replace(/\s+$/, '');
    blocks.push({index: blocks.length, headingId: current.headingId, title: current.title, raw});
  }
  return blocks;
}

export function joinParts(before: string, raw: string, after: string): string {
  return [before.replace(/\s+$/, ''), raw.replace(/^\s+|\s+$/g, ''), after.replace(/^\s+|\s+$/g, '')]
    .filter(part => part.length > 0)
    .join('\n\n');
}

export function relocateBlockSession(
  session: InlineEditSession,
  nextContent: string,
  options?: {dirty?: boolean},
): InlineEditSession | null {
  if (session.mode === 'full') return {...session, raw: nextContent, originalRaw: nextContent, before: '', after: ''};
  const nextBlocks = splitMemoryBlocks(nextContent);
  if (!nextBlocks.length) return null;

  const trimmedRaw = session.raw.replace(/^\s+|\s+$/g, '');
  const trimmedOriginal = (session.originalRaw ?? session.raw).replace(/^\s+|\s+$/g, '');
  const dirty = options?.dirty ?? (trimmedRaw !== trimmedOriginal || session.originalRaw === undefined);
  const headingMatch = /^(?:#{1,3})\s+(.+?)\s*#*$/m.exec(trimmedRaw);
  const currentTitle = headingMatch ? headingMatch[1].replace(/[*_`~]/g, '').trim() : null;
  const prevBeforeBlocks = session.before ? splitMemoryBlocks(session.before) : [];
  const prevAfterBlocks = session.after ? splitMemoryBlocks(session.after) : [];
  const prevSiblings = [...prevBeforeBlocks, ...prevAfterBlocks];
  const prevBeforeCount = prevBeforeBlocks.length;
  const beforeRawSet = new Set(prevBeforeBlocks.map(b => b.raw));
  const afterRawSet = new Set(prevAfterBlocks.map(b => b.raw));
  const siblingRawSet = new Set([...beforeRawSet, ...afterRawSet]);

  const beforeTitleCounts = new Map<string, number>();
  for (const b of prevBeforeBlocks) {
    if (b.headingId !== null) beforeTitleCounts.set(b.title, (beforeTitleCounts.get(b.title) ?? 0) + 1);
  }
  const afterTitleCounts = new Map<string, number>();
  for (const b of prevAfterBlocks) {
    if (b.headingId !== null) afterTitleCounts.set(b.title, (afterTitleCounts.get(b.title) ?? 0) + 1);
  }

  const preservesOrder = (i: number) => {
    const beforeSlice = nextBlocks.slice(0, i);
    const afterSlice = nextBlocks.slice(i + 1);
    const crossedAfterRaw = beforeSlice.some(b => afterRawSet.has(b.raw) && !beforeRawSet.has(b.raw));
    const crossedBeforeRaw = afterSlice.some(b => beforeRawSet.has(b.raw) && !afterRawSet.has(b.raw));
    if (crossedAfterRaw || crossedBeforeRaw) return false;
    for (const [title, afterCount] of afterTitleCounts) {
      if (!beforeTitleCounts.has(title)) {
        const remainingAfter = afterSlice.filter(b => b.headingId !== null && b.title === title).length;
        const appearedBefore = beforeSlice.some(b => b.headingId !== null && b.title === title);
        if (appearedBefore && remainingAfter < afterCount) return false;
      }
    }
    for (const [title, beforeCount] of beforeTitleCounts) {
      if (!afterTitleCounts.has(title)) {
        const remainingBefore = beforeSlice.filter(b => b.headingId !== null && b.title === title).length;
        const appearedAfter = afterSlice.some(b => b.headingId !== null && b.title === title);
        if (appearedAfter && remainingBefore < beforeCount) return false;
      }
    }
    return true;
  };

  const pickBest = (indices: number[]) => {
    if (indices.length === 1) return indices[0];
    const afterMatch = indices.find(i => nextBlocks.slice(i + 1).map(b => b.raw).join('\n\n') === session.after);
    if (afterMatch !== undefined) return afterMatch;
    const beforeMatch = indices.find(i => nextBlocks.slice(0, i).map(b => b.raw).join('\n\n') === session.before);
    if (beforeMatch !== undefined) return beforeMatch;
    return indices.reduce((best, cur) => Math.abs(cur - prevBeforeCount) < Math.abs(best - prevBeforeCount) ? cur : best, indices[0]);
  };

  let idx = -1;
  const rawMatches = nextBlocks.filter(b => b.raw === trimmedRaw).map(b => b.index).filter(preservesOrder);
  const prevSameRawCount = 1 + prevSiblings.filter(b => b.raw === trimmedRaw).length;
  if (rawMatches.length) {
    // If duplicate identical-body blocks existed and one was deleted, exit safely rather than guessing which twin survived.
    if (rawMatches.length >= prevSameRawCount) {
      idx = pickBest(rawMatches);
    }
  } else if (dirty && currentTitle) {
    const titleMatches = nextBlocks.filter(b => b.title === currentTitle).map(b => b.index);
    const prevSameTitleCount = 1 + prevSiblings.filter(b => b.title === currentTitle).length;
    // Never guess by title across duplicate headings; only relocate a unique-title section with active local edits.
    if (prevSameTitleCount === 1 && titleMatches.length === 1) {
      const candidate = titleMatches[0];
      const nextBody = nextBlocks[candidate].raw;
      const localBodyLines = trimmedRaw.split('\n').slice(1).map(l => l.trim()).filter(Boolean);
      const bodyRelated = localBodyLines.length === 0 || localBodyLines.some(line => nextBody.includes(line));
      if (!siblingRawSet.has(nextBody) && preservesOrder(candidate) && bodyRelated) {
        idx = candidate;
      }
    }
  } else if (dirty && session.headingId === null && nextBlocks[0]?.headingId === null) {
    const prevUntitledCount = 1 + prevSiblings.filter(b => b.headingId === null).length;
    const nextUntitledCount = nextBlocks.filter(b => b.headingId === null).length;
    if (prevUntitledCount === 1 && nextUntitledCount === 1 && !siblingRawSet.has(nextBlocks[0].raw) && preservesOrder(0)) {
      idx = 0;
    }
  }
  // If the edited section was deleted externally, exit inline block editing instead of hijacking an adjacent or same-title sibling section.
  if (idx < 0) return null;

  const nextRaw = nextBlocks[idx].raw === trimmedRaw ? session.raw : nextBlocks[idx].raw;
  return {
    mode: 'block',
    index: idx,
    headingId: nextBlocks[idx].headingId,
    before: nextBlocks.slice(0, idx).map(b => b.raw).join('\n\n'),
    raw: nextRaw,
    originalRaw: nextBlocks[idx].raw,
    after: nextBlocks.slice(idx + 1).map(b => b.raw).join('\n\n'),
    selectHeading: false,
  };
}
