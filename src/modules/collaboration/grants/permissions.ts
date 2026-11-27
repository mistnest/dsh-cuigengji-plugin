import { READER_MODULES, type ReaderModule } from '../../workspace/queries/reader-modules.ts';

export const accessLabels = { none: '无权限', read: '只读', write: '读写' } as const;
export type AccessLevel = keyof typeof accessLabels;
export type Permissions = Record<ReaderModule, AccessLevel>;
export function grantLevels(read: readonly ReaderModule[], write: readonly ReaderModule[] = []): Permissions {
  return Object.fromEntries(
    READER_MODULES.map((m) => [m, write.includes(m) ? 'write' : read.includes(m) ? 'read' : 'none']),
  ) as Permissions;
}
export function parseLevels(input: unknown, base: Permissions) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    !Object.keys(input).length ||
    Object.entries(input).some(
      ([k, v]) =>
        !READER_MODULES.includes(k as ReaderModule) || typeof v !== 'string' || !Object.hasOwn(accessLabels, v),
    )
  ) {
    throw Object.assign(new Error('请按模块指定 none、read 或 write'), { code: 'INVALID_INPUT' });
  }
  const levels = { ...base, ...input };
  return {
    modules: READER_MODULES.filter((m) => levels[m] !== 'none'),
    writableModules: READER_MODULES.filter((m) => levels[m] === 'write'),
  };
}
