import type { ClipboardEvent } from 'react';

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

/** Plain text remains exact; rich editors also receive explicit paragraph breaks. */
export function manuscriptClipboard(text: string): { plain: string; html: string } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const html = lines.map(line => {
    // Preserve indentation without turning ordinary word spaces into unbreakable runs.
    const content = escapeHtml(line)
      .replace(/^ +| +$/g, spaces => '&nbsp;'.repeat(spaces.length))
      .replace(/ {2,}/g, spaces => '&nbsp;'.repeat(spaces.length - 1) + ' ');
    return `<p style="margin:0; padding:0; white-space:pre-wrap; line-height:1.8;">${content || '<br>'}</p>`;
  }).join('');
  return { plain: text, html: `<div>${html}</div>` };
}

export function copyManuscriptSelection(event: ClipboardEvent<HTMLTextAreaElement>): void {
  const { value, selectionStart, selectionEnd } = event.currentTarget;
  if (selectionStart === selectionEnd || !event.clipboardData) return;
  const { plain, html } = manuscriptClipboard(value.slice(selectionStart, selectionEnd));
  event.clipboardData.setData('text/plain', plain);
  event.clipboardData.setData('text/html', html);
  event.preventDefault();
}
