import { loadActionRecords } from "../modules/workspace/operations/read.js";
import { runWorkspaceTransaction } from "../modules/library/transactions/workspace-transaction.js";
import { ProjectStore } from "../modules/library/records/project-store.js";
import { importNovel, validateMigration } from "../modules/workspace/novels/import.js";
import { executeOperation } from "../modules/workspace/operations/execute.js";
import { workspaceCommand } from "../modules/workspace/operations/command.js";
import { fail } from "../modules/workspace/operations/records.js";
import { readSessionPreset } from "../modules/workspace/presets/session.js";
import { bindingAction } from "../modules/workspace/novels/session/actions.js";
import { presetAction } from "../modules/workspace/presets/actions.js";
import { StoreError } from "../modules/workspace/operations/records.js";
const empty = () => ({ schemaVersion: 1, novels: {}, bindings: {}, requests: {} });
class Store extends ProjectStore {
  constructor(root, options = {}) {
    super(
      root,
      empty,
      (state) => {
        const value = state;
        if (!value || value.schemaVersion !== 1 || !value.novels || !value.bindings || !value.requests)
          fail("CORRUPT_STORE", "\u4E0D\u652F\u6301\u7684\u6570\u636E\u683C\u5F0F");
      },
      options
    );
  }
  loadForAction(action, args, actor) {
    return this.openRecords(false).then((read) => loadActionRecords(read, action, args, actor));
  }
  loadForQuery(action, args) {
    return this.openRecords(true).then((read) => loadActionRecords(read, action, args, {}));
  }
  withQuerySnapshot(action, args, read) {
    return this.withLock(async () => read(await this.loadForQuery(action, args)));
  }
  openSibling(root) {
    return new Store(root, { allowCreate: false });
  }
  validateMigration(state) {
    validateMigration(state);
  }
  validateProject(novel) {
    this.importNovel({ novels: {} }, { backup: { format: "cuigengji", schemaVersion: 2, novel } });
  }
  importNovel(state, args) {
    return importNovel(state, args);
  }
  async readSessionBinding(sessionId, onBinding) {
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      const fallback2 = await this.dispatch("binding.get", {}, { kind: "agent", sessionId });
      onBinding?.(fallback2);
      return fallback2;
    }
    const narrow = await this.readNarrowSessionState(sessionId, false, ({ library, bindings }) => {
      const state = { ...library.metadata, schemaVersion: 1, novels: library.novels, bindings, requests: {} };
      const binding = bindingAction(state, "binding.get", {}, { kind: "agent", sessionId });
      onBinding?.(binding);
      return binding;
    });
    if (narrow.hit) return narrow.value;
    const fallback = await this.dispatch("binding.get", {}, { kind: "agent", sessionId });
    onBinding?.(fallback);
    return fallback;
  }
  async readSessionPrompt(sessionId, onBinding) {
    const actor = { kind: "agent", sessionId };
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      const binding2 = await this.dispatch("binding.get", {}, actor);
      onBinding?.(binding2);
      const guidance2 = await this.dispatch("guidance.get", {}, actor);
      if (!guidance2?.enabled) return { binding: binding2, guidanceEnabled: false, preset: null };
      const preset2 = binding2 ? await this.dispatch("preset.read", {}, actor) : null;
      return { binding: binding2, guidanceEnabled: true, preset: preset2 };
    }
    const narrow = await this.readNarrowSessionState(
      sessionId,
      true,
      async ({ library, bindings, novel, loadSnapshot, saveSnapshot }) => {
        const state = { ...library.metadata, schemaVersion: 1, novels: library.novels, bindings, requests: {} };
        const binding2 = bindingAction(state, "binding.get", {}, actor);
        onBinding?.(binding2);
        const guidance2 = bindingAction(state, "guidance.get", {}, actor);
        if (!guidance2?.enabled || !binding2 || !novel) {
          return { binding: binding2, guidanceEnabled: Boolean(guidance2?.enabled), preset: null };
        }
        const preset2 = await presetAction(
          novel,
          "preset.read",
          {},
          actor,
          binding2,
          (targetNovel, input, reader, chapterId) => readSessionPreset(targetNovel, input, reader, chapterId, {
            loadSnapshot,
            saveSnapshot
          })
        );
        return { binding: binding2, guidanceEnabled: true, preset: preset2 };
      }
    );
    if (narrow.hit) return narrow.value;
    const binding = await this.dispatch("binding.get", {}, actor);
    onBinding?.(binding);
    const guidance = await this.dispatch("guidance.get", {}, actor);
    if (!guidance?.enabled) return { binding, guidanceEnabled: false, preset: null };
    const preset = binding ? await this.dispatch("preset.read", {}, actor) : null;
    return { binding, guidanceEnabled: true, preset };
  }
  async dispatch(action, args = {}, actor = {}, beforeExecute) {
    if (!beforeExecute && args && typeof args === "object" && !Array.isArray(args) && args.requestId === void 0 && (action === "binding.get" || action === "guidance.get")) {
      const sid = action === "binding.get" ? actor.sessionId || args.sessionId : actor.sessionId;
      if (typeof sid === "string" && sid.trim()) {
        const narrow = await this.readNarrowSessionState(sid, false, ({ library, bindings }) => {
          const state = { ...library.metadata, schemaVersion: 1, novels: library.novels, bindings, requests: {} };
          return structuredClone(bindingAction(state, action, args, actor));
        });
        if (narrow.hit) return narrow.value;
      }
    }
    return runWorkspaceTransaction(this, workspaceCommand(this, action, args, actor, beforeExecute));
  }
  execute(state, action, args, actor) {
    return executeOperation(state, action, args, actor, {
      readPreset: (novel, input, reader, chapterId) => readSessionPreset(novel, input, reader, chapterId, {
        loadSnapshot: (novelId, sessionId) => this.loadPresetForRead(state, novelId, sessionId),
        saveSnapshot: (path, value) => this.transaction.commit(/* @__PURE__ */ new Map([[path, JSON.stringify(value)]]))
      }),
      validateProject: (novel) => this.validateProject(novel)
    });
  }
}
var store_default = Store;
export {
  Store,
  StoreError,
  store_default as default
};
