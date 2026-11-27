import {createHash} from 'node:crypto';

export const fileId = (id: string) => /^[a-z0-9][a-z0-9_-]{0,120}$/i.test(id) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id)
  ? id : '~' + createHash('sha256').update(id).digest('hex');
export const shortFileId = (id: string) => createHash('sha256').update(id).digest('hex').slice(0, 8);

const invalidFileCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const invalidFileCharacterTest = /[<>:"/\\|?*\u0000-\u001f\u007f]/;
const reservedFileStem = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;
export const managedFileKey = (name: string) => name.normalize('NFC').toLowerCase();

function shortenFileStem(stem: string, suffix: string) {
  let result = '';
  for (const character of stem) {
    if (result.length + character.length + suffix.length > 120) break;
    result += character;
  }
  return (result.replace(/[ .]+$/g, '') || '未命名') + suffix;
}

function safeFileStem(label: unknown, fallback: string) {
  let stem = typeof label === 'string' ? label.normalize('NFC').replace(invalidFileCharacters, '_').trim() : '';
  stem = stem.replace(/[ .]+$/g, '');
  if (!stem) stem = fallback;
  if (reservedFileStem.test(stem)) stem = '条目_' + stem;
  return stem;
}

export function uniqueFileName(label: unknown, id: string, fallback: string, used: Set<string>, suffixId = shortFileId(id)) {
  const suffix = '--' + suffixId + '.json', stem = safeFileStem(label, fallback);
  let candidate = shortenFileStem(stem, suffix), number = 2;
  // Keep the collision number outside the truncation budget, even for long titles.
  while (used.has(managedFileKey(candidate))) candidate = shortenFileStem(stem, '（' + number++ + '）' + suffix);
  used.add(managedFileKey(candidate));
  return candidate;
}

/** Human-readable managed filenames retain a short stable suffix for recovery and collisions. */
export const readableFileName = (label: unknown, id: string, fallback = '未命名') => uniqueFileName(label, id, fallback, new Set());
export const validManagedFileName = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/--(?:[a-f0-9]{8}|main)\.json$/.test(value) || value.length > 120 || value.includes('/') || value.includes('\\')) return false;
  const stem = value.slice(0, -5);
  return !!stem && !invalidFileCharacterTest.test(stem) && !/[ .]$/.test(stem) && !reservedFileStem.test(stem);
};

export const pageKey = (id: string | null) => id === null ? '~main' : fileId(id);
