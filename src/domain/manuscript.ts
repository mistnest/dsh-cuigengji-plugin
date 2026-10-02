/** Display count: Unicode characters including punctuation, excluding whitespace. */
export function countManuscript(content: string): number {
  return Array.from(content.replace(/\s/gu, '')).length;
}
