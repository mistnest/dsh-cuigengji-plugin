/** Format existing prose paragraphs without guessing sentence boundaries. */
export function formatProse(content: string): string {
  return content.replace(/\r\n?/g, '\n').split('\n')
    .map(line => line.trim()).filter(Boolean)
    .map(line => `　　${line}`).join('\n\n');
}
