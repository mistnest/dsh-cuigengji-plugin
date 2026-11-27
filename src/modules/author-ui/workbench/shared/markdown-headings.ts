export function markdownHeadingId(text: string, index: number) {
  const clean = text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '');
  return `cg-md-${index}${clean ? '-' + clean.slice(0, 32) : ''}`;
}

export function extractMarkdownHeadings(markdown: string) {
  const headings: {id: string; level: 1 | 2 | 3; title: string}[] = [];
  let inFence = false, index = 0;
  for (const raw of markdown.split(/\r?\n/)) {
    if (/^\s*(`{3,}|~{3,})/.test(raw)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+?)\s*#*$/.exec(raw);
    if (!m) continue;
    const title = m[2].replace(/[*_`~]/g, '').trim();
    if (!title) continue;
    headings.push({id: markdownHeadingId(title, ++index), level: m[1].length as 1 | 2 | 3, title});
  }
  return headings;
}
