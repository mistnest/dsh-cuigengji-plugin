import { loadActionRecords } from '../modules/workspace/operations/read.ts';
import type { Row, Workspace } from '../modules/workspace/operations/record-reader.ts';
import { runWorkspaceTransaction } from '../modules/library/transactions/workspace-transaction.ts';
import { ProjectStore } from '../modules/library/records/project-store.ts';
import { importNovel, validateMigration } from '../modules/workspace/novels/import.ts';
import { executeOperation } from '../modules/workspace/operations/execute.ts';
import { workspaceCommand } from '../modules/workspace/operations/command.ts';
import { fail } from '../modules/workspace/operations/records.ts';
import { readSessionPreset } from '../modules/workspace/presets/session.ts';
import { bindingAction } from '../modules/workspace/novels/session/actions.ts';
import { presetAction } from '../modules/workspace/presets/actions.ts';

export { StoreError } from '../modules/workspace/operations/records.ts';

const empty = () => ({ schemaVersion: 1, novels: {}, bindings: {}, requests: {} });

/** Lock, load, and commit one operation on a project workspace. */
export class Store extends ProjectStore {
  constructor(root: string, options = {}) {
    super(
      root,
      empty,
      (state: unknown): asserts state is Workspace => {
        const value = state as Partial<Workspace> | null;
        if (!value || value.schemaVersion !== 1 || !value.novels || !value.bindings || !value.requests)
          fail('CORRUPT_STORE', '不支持的数据格式');
      },
      options,
    );
  }

  loadForAction(action: string, args: Row, actor: Row) {
    return this.openRecords(false).then((read) => loadActionRecords(read, action, args, actor));
  }

  loadForQuery(action: string, args: Row) {
    return this.openRecords(true).then((read) => loadActionRecords(read, action, args, {}));
  }

  withQuerySnapshot<Result>(action: string, args: Row, read: (state: Workspace) => Promise<Result>) {
    return this.withLock(async () => read(await this.loadForQuery(action, args)));
  }

  openSibling(root: string) {
    return new Store(root, { allowCreate: false });
  }

  validateMigration(state: Workspace) {
    validateMigration(state);
  }

  validateProject(novel: Row) {
    this.importNovel({ novels: {} }, { backup: { format: 'cuigengji', schemaVersion: 2, novel } });
  }

  importNovel(state: Pick<Workspace, 'novels'>, args: Row) {
    return importNovel(state, args);
  }

  async readSessionBinding(sessionId: string, onBinding?: (binding: Row | null) => void): Promise<Row | null> {
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      const fallback = await this.dispatch('binding.get', {}, { kind: 'agent', sessionId });
      onBinding?.(fallback);
      return fallback;
    }
    const narrow = await this.readNarrowSessionState(sessionId, false, ({ library, bindings }) => {
      const state = { ...library.metadata, schemaVersion: 1, novels: library.novels, bindings, requests: {} } as Workspace;
      const binding = bindingAction(state, 'binding.get', {}, { kind: 'agent', sessionId }) as Row | null;
      onBinding?.(binding);
      return binding;
    });
    if (narrow.hit) return narrow.value;
    const fallback = await this.dispatch('binding.get', {}, { kind: 'agent', sessionId });
    onBinding?.(fallback);
    return fallback;
  }

  async readSessionPrompt(
    sessionId: string,
    onBinding?: (binding: Row | null) => void,
  ): Promise<{ binding: Row | null; guidanceEnabled: boolean; preset: Row | null }> {
    const actor = { kind: 'agent', sessionId };
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      const binding = await this.dispatch('binding.get', {}, actor);
      onBinding?.(binding);
      const guidance = await this.dispatch('guidance.get', {}, actor);
      if (!guidance?.enabled) return { binding, guidanceEnabled: false, preset: null };
      const preset = binding ? await this.dispatch('preset.read', {}, actor) : null;
      return { binding, guidanceEnabled: true, preset };
    }
    const narrow = await this.readNarrowSessionState(
      sessionId,
      true,
      async ({ library, bindings, novel, loadSnapshot, saveSnapshot }) => {
        const state = { ...library.metadata, schemaVersion: 1, novels: library.novels, bindings, requests: {} } as Workspace;
        const binding = bindingAction(state, 'binding.get', {}, actor) as Row | null;
        onBinding?.(binding);
        const guidance = bindingAction(state, 'guidance.get', {}, actor) as { enabled: boolean };
        if (!guidance?.enabled || !binding || !novel) {
          return { binding, guidanceEnabled: Boolean(guidance?.enabled), preset: null };
        }
        const preset = (await presetAction(novel, 'preset.read', {}, actor, binding, (targetNovel, input, reader, chapterId) =>
          readSessionPreset(targetNovel, input, reader, chapterId, {
            loadSnapshot: loadSnapshot!,
            saveSnapshot: saveSnapshot!,
          }),
        )) as Row;
        return { binding, guidanceEnabled: true, preset };
      },
    );
    if (narrow.hit) return narrow.value;
    const binding = await this.dispatch('binding.get', {}, actor);
    onBinding?.(binding);
    const guidance = await this.dispatch('guidance.get', {}, actor);
    if (!guidance?.enabled) return { binding, guidanceEnabled: false, preset: null };
    const preset = binding ? await this.dispatch('preset.read', {}, actor) : null;
    return { binding, guidanceEnabled: true, preset };
  }

  async dispatch(
    action: string,
    args: Row = {},
    actor: Row = {},
    beforeExecute?: (state: Workspace) => void,
  ) {
    if (
      !beforeExecute &&
      args &&
      typeof args === 'object' &&
      !Array.isArray(args) &&
      args.requestId === undefined &&
      (action === 'binding.get' || action === 'guidance.get')
    ) {
      const sid = action === 'binding.get' ? actor.sessionId || args.sessionId : actor.sessionId;
      if (typeof sid === 'string' && sid.trim()) {
        const narrow = await this.readNarrowSessionState(sid, false, ({ library, bindings }) => {
          const state = { ...library.metadata, schemaVersion: 1, novels: library.novels, bindings, requests: {} } as Workspace;
          return structuredClone(bindingAction(state, action, args, actor));
        });
        if (narrow.hit) return narrow.value;
      }
    }
    return runWorkspaceTransaction(this, workspaceCommand(this, action, args, actor, beforeExecute));
  }

  execute(state: Workspace, action: string, args: Row, actor: Row): any {
    return executeOperation(state, action, args, actor, {
      readPreset: (novel: Row, input: Row, reader: Row, chapterId?: string) =>
        readSessionPreset(novel, input, reader, chapterId, {
          loadSnapshot: (novelId: string, sessionId?: string) =>
            this.loadPresetForRead(state, novelId, sessionId),
          saveSnapshot: (path: string, value: unknown) =>
            this.transaction.commit(new Map([[path, JSON.stringify(value)]])),
        }),
      validateProject: (novel: Row) => this.validateProject(novel),
    });
  }
}

export default Store;
