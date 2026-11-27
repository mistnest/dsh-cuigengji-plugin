export interface ChapterPage {
  revision: number;
  content: string;
  nextStart: number | null;
}

interface PageRequest {
  maxChars: number;
  start?: number;
  expectedRevision?: number;
}

/** Assemble one saved revision for the editor or for comparison with a submitted draft. */
export async function readFullChapter<T extends ChapterPage>(readPage: (request: PageRequest) => Promise<T>) {
  const maxChars = 200_000;
  const first = await readPage({maxChars});
  let page = first;
  const parts = [first.content];
  while (page.nextStart !== null) {
    page = await readPage({start: page.nextStart, maxChars, expectedRevision: first.revision});
    if (page.revision !== first.revision) {
      throw Object.assign(new Error('读取期间正文发生变化，请重试。'), {code: 'CONFLICT'});
    }
    parts.push(page.content);
  }
  const content = parts.join('');
  return {...first, content, end: content.length, nextStart: null};
}
