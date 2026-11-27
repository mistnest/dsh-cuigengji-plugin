import {createHash, randomUUID} from 'node:crypto';

import {fail} from '../../../platform/errors.ts';
export {StoreError, fail} from '../../../platform/errors.ts';
export const clone = <T>(value: T): T => structuredClone(value);
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const now = () => new Date().toISOString();
export const source = (actor: {kind?: string; sessionId?: string}) => ({kind: actor.kind === 'human' ? 'human' : 'agent', sessionId: actor.sessionId || null});
export const own = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key);
export const get = <T>(object: Record<string, T>, key: string, label: string) => own(object, key) ? object[key] : fail('NOT_FOUND', `${label}不存在：${key}`);
export function text(value: unknown, name: string, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) fail('INVALID_INPUT', `${name}必须是${allowEmpty ? '' : '非空'}文本`);
  return value;
}
export function cas(entity: {revision: number; contentHash?: string}, args: {expectedRevision?: number; expectedHash?: string}) {
  if (!Number.isSafeInteger(args.expectedRevision)) fail('REVISION_REQUIRED', '修改前请读取对象并提供 expectedRevision');
  if (entity.revision !== args.expectedRevision) fail('CONFLICT', `版本已变化，当前版本 ${entity.revision}`);
  if (args.expectedHash !== undefined && args.expectedHash !== entity.contentHash) fail('CONFLICT', '正文内容哈希已变化');
}
export function touch(entity: {revision: number; updatedAt?: string}) { entity.revision++; entity.updatedAt = now(); }
export function record<T extends object>(fields: T) { return { id: randomUUID(), revision: 1, createdAt: now(), updatedAt: now(), ...fields }; }
