import { readFileSync } from "node:fs";
import { HUMAN_ACTIONS } from "../catalog/actions.js";
import { convertLegacyExport } from "../../workspace/transfer/formats/legacy.js";
import { errorInfo } from "../../../platform/errors.js";
const manifest = JSON.parse(readFileSync(new URL("../../../../package.json", import.meta.url), "utf8"));
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const invalid = (message) => Object.assign(new Error(message), { code: "INVALID_INPUT" });
function failure(error) {
  return {
    ok: false,
    error: errorInfo(error)
  };
}
function createHumanDispatcher(ctx, services) {
  const { dispatch, workData, transfer, maintenance, desktopPet, libraries, usage, external } = services;
  const ensureReady = () => maintenance?.ensureReady();
  const dispatchRpc = async (payload, signal, admitted = false) => {
    if (libraries && !admitted && !String(record(payload) ? payload.action : "").startsWith("library.") && !String(record(payload) ? payload.action : "").startsWith("usage.")) return libraries.use(() => dispatchRpc(payload, signal, true)).catch(failure);
    try {
      signal.throwIfAborted();
      if (!record(payload) || !HUMAN_ACTIONS.includes(payload.action)) throw invalid("\u65E0\u6548\u7684\u50AC\u66F4\u59EC\u64CD\u4F5C");
      const { action, args: input = {}, sessionId } = payload;
      const args = record(input) ? { ...input } : input;
      if (!record(args)) throw invalid("args \u5FC5\u987B\u662F\u5BF9\u8C61");
      if (action.startsWith("usage.")) {
        if (!usage) throw invalid("\u8BB0\u8D26\u670D\u52A1\u5C1A\u672A\u5C31\u7EEA");
        delete args.__libraryRoot;
        return { ok: true, value: await usage.dispatch(action, args) };
      }
      if (args.__libraryRoot && args.__libraryRoot !== services.dataRoot) throw Object.assign(new Error("\u4F5C\u54C1\u5E93\u5DF2\u5207\u6362\uFF0C\u65E7\u9875\u9762\u7684\u7F16\u8F91\u5DF2\u4FDD\u7559\uFF0C\u8BF7\u5237\u65B0\u540E\u7EE7\u7EED"), { code: "LIBRARY_CHANGED" });
      delete args.__libraryRoot;
      if (action.startsWith("external.")) {
        if (!external) throw invalid("\u5916\u90E8\u8FDE\u63A5\u670D\u52A1\u5C1A\u672A\u5C31\u7EEA");
        if (action === "external.create") await ensureReady();
        if (action === "external.status") return { ok: true, value: await external.status() };
        const methods = { "external.create": "create", "external.update": "update", "external.revoke": "revoke", "external.records": "records" };
        const method = methods[action];
        if (!method) throw invalid("\u65E0\u6548\u7684\u5916\u90E8\u8FDE\u63A5\u64CD\u4F5C");
        return { ok: true, value: await external[method](args) };
      }
      if (sessionId !== void 0 && (typeof sessionId !== "string" || !sessionId.trim() || sessionId.length > 512)) {
        throw invalid("sessionId \u5FC5\u987B\u662F\u6709\u6548\u7684\u4F1A\u8BDD\u6807\u8BC6");
      }
      if (!action.startsWith("library.") && !action.startsWith("transfer.") && !["activity.today", "activity.stats", "pet.desktop", "novel.list", "novel.create", "novel.import", "legacy.preview", "settings.get", "maintenance.status", "maintenance.verify", "workspace.status", "workspace.export", "workspace.preview", "workspace.import"].includes(action) && !sessionId) {
        throw Object.assign(new Error("\u8BF7\u9009\u62E9\u4E00\u4E2A DSH \u4F1A\u8BDD"), { code: "SESSION_REQUIRED" });
      }
      if (action === "settings.get") {
        return { ok: true, value: { dataRoot: services.dataRoot, pluginVersion: manifest.version, supportedDsh: manifest.peerDependencies["@deepseek-ai/dsh-tools"] } };
      }
      if (action.startsWith("library.")) {
        if (!libraries) throw invalid("\u4F5C\u54C1\u5E93\u7BA1\u7406\u670D\u52A1\u672A\u521D\u59CB\u5316");
        if (action === "library.restoreIndex") return { ok: true, value: await libraries.use(() => libraries.current.store.restoreIndexCopy(args.confirm === true)) };
        if (action === "library.pick") {
          const picker = ctx.get?.("directoryPicker");
          const capability = picker?.capability();
          return { ok: true, value: { path: capability?.kind === "native" ? await capability.pick(signal) : null, manual: capability?.kind !== "native" } };
        }
        return { ok: true, value: action === "library.status" ? await libraries.status() : action === "library.inspect" ? await libraries.inspect(args.path) : await libraries.change(args) };
      }
      if (action === "legacy.preview") return { ok: true, value: convertLegacyExport(args.input) };
      if (action === "maintenance.status") {
        if (!maintenance) throw invalid("\u7EF4\u62A4\u670D\u52A1\u672A\u521D\u59CB\u5316");
        return { ok: true, value: await maintenance.status() };
      }
      if (action === "maintenance.verify") {
        if (!maintenance) throw invalid("\u7EF4\u62A4\u670D\u52A1\u672A\u521D\u59CB\u5316");
        return { ok: true, value: await maintenance.verify(args) };
      }
      if (action.startsWith("transfer.")) {
        await ensureReady();
        if (!transfer) throw invalid("\u5BFC\u5165 / \u5BFC\u51FA\u670D\u52A1\u672A\u521D\u59CB\u5316");
        switch (action) {
          case "transfer.catalog":
            return { ok: true, value: await transfer.catalog() };
          case "transfer.inspect":
            return { ok: true, value: transfer.inspect(args) };
          case "transfer.preview":
            return { ok: true, value: await transfer.preview(args) };
          case "transfer.import":
            return { ok: true, value: await transfer.import(args, { sessionId }) };
          case "transfer.exportPreview":
            return { ok: true, value: await transfer.exportPreview(args) };
          case "transfer.export":
            return { ok: true, value: await transfer.export(args) };
          default:
            throw invalid("\u65E0\u6548\u7684\u5BFC\u5165\u5BFC\u51FA\u64CD\u4F5C");
        }
      }
      if (action.startsWith("workspace.")) {
        await ensureReady();
        if (!workData) throw invalid("\u5DE5\u4F5C\u6570\u636E\u670D\u52A1\u672A\u521D\u59CB\u5316");
        if (action === "workspace.status") return { ok: true, value: await workData.status() };
        if (action === "workspace.export") return { ok: true, value: await workData.export() };
        return { ok: true, value: action === "workspace.preview" ? await workData.preview(args.backup) : await workData.import(args.backup) };
      }
      await ensureReady();
      if (action === "pet.desktop") {
        return { ok: true, value: desktopPet ? await desktopPet.sync({ ...args, sessionId: sessionId || "" }) : { supported: false, available: false } };
      }
      return { ok: true, value: await dispatch(action, args, { kind: "human", sessionId }) };
    } catch (error) {
      return failure(error);
    }
  };
  return dispatchRpc;
}
export {
  createHumanDispatcher,
  failure,
  invalid,
  record
};
