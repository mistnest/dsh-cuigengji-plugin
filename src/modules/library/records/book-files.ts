import {managedFileKey, validManagedFileName} from './file-names.ts';
import {validManagedPath} from './tree-layout.ts';
import type {Row, StorageVersion} from './project-layout.ts';

/** Relative to the saved book directory. Reads share the transaction's baseline. */
export interface BookRecordSource {
  version: StorageVersion;
  read(path: string, optional?: boolean): Promise<any>;
}

/** Relative to the destination directory, including when the book is renamed. */
export interface BookRecordChanges {
  put(path: string, value: unknown): Promise<void>;
  remove(path: string): void;
}

export function corrupt(message: string): never {
  throw Object.assign(new Error(message), {code: 'CORRUPT_STORE'});
}

export function isRecord(value: unknown): value is Row {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function checkFileNames(names: unknown[], version: StorageVersion) {
  const valid = version >= 5 ? validManagedPath : validManagedFileName;
  const used = new Set<string>();
  for (const name of names) {
    if (!valid(name)) corrupt('内容文件映射包含无效文件名');
    const key = managedFileKey(name);
    if (used.has(key)) corrupt('内容文件映射重复');
    used.add(key);
  }
}
