/** Native insertion retains Chromium/Electron's Undo/Redo stack. */
export function replaceManuscriptRange(element: HTMLTextAreaElement, start: number, end: number, replacement: string): string {
  element.focus({preventScroll: true});
  element.setSelectionRange(start, end);
  const before = element.value;
  const expected = before.slice(0, start) + replacement + before.slice(end);
  if (expected === before) return before;
  element.ownerDocument.execCommand('insertText', false, replacement);
  if (element.value !== expected) throw new Error('替换未完成，请重试。原文仍可通过撤销或「改动对比」找回。');
  element.setSelectionRange(start, start + replacement.length);
  return element.value;
}

/** The editor autosizes, so scroll its parent to the measured text, not its top. */
export function revealManuscriptRange(element: HTMLTextAreaElement, scroll: HTMLElement, start: number, end: number) {
  element.focus({preventScroll: true});
  element.setSelectionRange(start, end);
  const mirror = element.ownerDocument.createElement('div');
  const style = getComputedStyle(element);
  mirror.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;height:auto;min-height:0;max-height:none;';
  for (const property of ['box-sizing','width','padding','border','font-family','font-size','font-weight','font-style','line-height','letter-spacing','word-spacing','text-indent','text-transform','text-align','white-space','word-break','overflow-wrap','tab-size']) mirror.style.setProperty(property, style.getPropertyValue(property));
  mirror.append(element.value.slice(0, start));
  const marker = element.ownerDocument.createElement('span');
  marker.textContent = element.value.slice(start, end) || '\u200b';
  mirror.append(marker); element.ownerDocument.body.append(mirror);
  try {
    const top = marker.getBoundingClientRect().top - mirror.getBoundingClientRect().top;
    scroll.scrollTop += element.getBoundingClientRect().top - scroll.getBoundingClientRect().top + top - scroll.clientHeight / 2;
  } finally {mirror.remove();}
}
export function domOffset(content: string, offset: number): number {return content.slice(0, offset).replace(/\r\n?/g, '\n').length;}
