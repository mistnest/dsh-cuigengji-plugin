/** Accept the UTF-8 signature produced by Windows PowerShell 5.1. Keep the
 * original text at callers: transaction hashes and backups cover its raw bytes. */
export function parseJsonFile(text: string, path: string): any {
  const source = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  try { return JSON.parse(source); }
  catch (cause) {
    if (!(cause instanceof SyntaxError)) throw cause;
    const native = cause.message;
    const position = /\bat position (\d+)\b/.exec(native);
    const coordinates = /\bline (\d+) column (\d+)\b/.exec(native);
    // V8 omits a position for some errors. Report only a location it provides,
    // or the exact end for a truncated document; never guess from quoted text.
    const offset = position ? Number(position[1]) : /Unexpected end of JSON input/.test(native) ? source.length : undefined;
    const prefix = offset === undefined ? undefined : source.slice(0, offset);
    const line = coordinates ? Number(coordinates[1]) : prefix === undefined ? undefined : prefix.split('\n').length;
    const column = coordinates ? Number(coordinates[2]) : prefix === undefined ? undefined : prefix.length - prefix.lastIndexOf('\n');
    const location = line === undefined ? '' : `（第 ${line} 行，第 ${column} 列）`;
    throw Object.assign(new Error(`小说数据文件无法解析：${path}${location}：${native}`, {cause}), {
      code: 'CORRUPT_STORE',
      details: {path, reason: native, ...(line === undefined ? {} : {line, column}), ...(offset === undefined ? {} : {offset})},
    });
  }
}
