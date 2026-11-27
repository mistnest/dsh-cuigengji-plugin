import type {ProjectStore} from '../records/project-store.ts';
import type {Workspace} from '../../workspace/operations/record-reader.ts';
import {fail} from '../../../platform/errors.ts';
import {digest} from './file-transaction.ts';

interface Transaction<T, Target> {
  load(): Promise<Workspace>;
  guard?(state: Workspace): void;
  requestId?: unknown;
  signature(): string;
  prepare(state: Workspace): Promise<Target>;
  apply(state: Workspace, target: Target): Promise<{result: T; novelId?: string}>;
}

/** Hold one lock across the fresh authorization check, receipt lookup and commit. */
type TransactionStore = Pick<ProjectStore, 'withLock' | 'hasGeneratedSettingHistory' | 'clearGeneratedSettingHistory' | 'save'>;

export async function runWorkspaceTransaction<T, Target>(store: TransactionStore, operation: Transaction<T, Target>): Promise<T> {
  return store.withLock(async () => {
    const state = await operation.load();
    operation.guard?.(state);
    let key: string | undefined;
    let signature: string | undefined;
    if (operation.requestId !== undefined) {
      if (typeof operation.requestId !== 'string' || !operation.requestId.trim()) fail('INVALID_INPUT', 'requestId必须是非空文本');
      key = digest(operation.requestId);
      signature = operation.signature();
      if (Object.hasOwn(state.requests, key)) {
        const previous = state.requests[key];
        if (previous.signature !== signature) fail('REQUEST_ID_REUSED', 'requestId 已用于其他请求');
        if (previous.cleaned) fail('REQUEST_EXPIRED', '此操作的结果已随历史清理，请重新读取当前内容；旧请求不会重复执行');
        return structuredClone(previous.result);
      }
    }

    const target = await operation.prepare(state);
    const before = JSON.stringify(state);
    // Activity is intentionally non-enumerable on the public workspace snapshot.
    const activityBefore = JSON.stringify(state.activity || {});
    const {result, novelId} = await operation.apply(state, target);
    if (key) {
      state.requests[key] = {signature, result: structuredClone(result), timestamp: new Date().toISOString(), ...(novelId ? {novelId} : {})};
    }
    if (JSON.stringify(state) !== before || JSON.stringify(state.activity || {}) !== activityBefore || store.hasGeneratedSettingHistory(state)) {
      await store.save(state);
      store.clearGeneratedSettingHistory(state);
    }
    return structuredClone(result);
  });
}
