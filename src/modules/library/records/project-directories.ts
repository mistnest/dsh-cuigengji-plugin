export type ProjectDirectories = Record<string, string>;
export type ProjectDirectoryMove = {from: string; to: string; novelId: string};
type Book = {title?: string};
const invalid = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const reserved = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;
export const directoryKey = (name: string) => name.normalize('NFC').toLowerCase();

function shorten(name: string, suffix = '') {
  let shortened = '';
  for (const character of name) {
    if (shortened.length + character.length + suffix.length > 64) break;
    shortened += character;
  }
  return (shortened.replace(/[ .]+$/g, '') || '未命名作品') + suffix;
}

/** Titles remain unchanged in business records; only the Windows directory is sanitized. */
export function projectDirectoryName(title: string) {
  let name = title.normalize('NFC').replace(invalid, '_').trim().replace(/[ .]+$/g, '');
  if (!name) name = '未命名作品';
  if (reserved.test(name)) name = '作品_' + name;
  return shorten(name);
}

export function validProjectDirectory(name: unknown): name is string {
  return typeof name === 'string' && !!name && name.length <= 120 && name !== '.' && name !== '..'
    && !/[<>:"/\\|?*\u0000-\u001f\u007f]/.test(name) && !/[ .]$/.test(name) && !reserved.test(name);
}

/** Retain established names, reserve unowned paths and never overwrite another book. */
export function planProjectDirectories(books: Record<string, Book>, previous: ProjectDirectories = {}, previousBooks: Record<string, Book> = {}, occupied: string[] = []) {
  const used = new Set([...Object.values(previous), ...occupied].map(directoryKey));
  const directories: ProjectDirectories = {}, moves: ProjectDirectoryMove[] = [];
  for (const [id, book] of Object.entries(books)) {
    if (typeof book.title !== 'string') throw Object.assign(new Error('作品书名无效，无法建立目录映射'), {code: 'CORRUPT_STORE'});
    const current = previous[id], name = projectDirectoryName(book.title);
    if (current && (previousBooks[id]?.title === book.title || directoryKey(current) === directoryKey(name)
      || (typeof previousBooks[id]?.title === 'string' && projectDirectoryName(previousBooks[id].title!) === name))) {
      directories[id] = current; continue;
    }
    let destination = name, number = 2;
    while (used.has(directoryKey(destination))) destination = shorten(name, `（${number++}）`);
    used.add(directoryKey(destination)); directories[id] = destination;
    if (current) moves.push({from: `novels/${current}`, to: `novels/${destination}`, novelId: id});
  }
  return {directories, moves};
}
