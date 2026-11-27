import { parseQuery, queryAllowed } from "./catalog.js";
import { queryFail } from "./common.js";
import { memoryRead } from "../creative-memory/document.js";
import { workspaceQuery } from "../novels/query.js";
import { manuscriptQuery } from "../chapters/query.js";
import { settingsQuery } from "../settings/query.js";
import { planningQuery } from "../planning/query.js";
import { readerGuidance, readerPreset } from "./guidance.js";
import { authorizeReadItems, parseReadItems } from "./batch-input.js";
import { readBatch } from "./batch.js";
class QueryService {
  #readSnapshot;
  constructor(source) {
    this.#readSnapshot = source.withQuerySnapshot.bind(source);
  }
  async query(action, input, reader, modules, scope = {}) {
    const { capability, args } = parseQuery(action, input);
    if (!queryAllowed(capability, modules)) queryFail("CAPABILITY_DENIED", "\u8FD9\u4E2A\u8FDE\u63A5\u672A\u5F00\u653E\u6240\u9700\u7684\u67E5\u8BE2\u6A21\u5757");
    if (args.novelId && scope.novelIds && !scope.novelIds.includes(args.novelId)) queryFail("CAPABILITY_DENIED", "\u8FD9\u90E8\u4F5C\u54C1\u672A\u6388\u6743\u7ED9\u6B64\u8FDE\u63A5");
    const batch = action === "context.readMany" ? parseReadItems(args.items) : void 0;
    if (batch) authorizeReadItems(batch, modules);
    if (action === "guidance.read" && !args.novelId) return readerGuidance(args.section || "core", modules, void 0, scope.writableModules);
    return this.#readSnapshot(capability.loadAction || "preset.get", args, async (state) => {
      const novel = args.novelId && Object.hasOwn(state.novels, args.novelId) ? state.novels[args.novelId] : void 0;
      if (args.novelId && (!novel || novel.archived)) queryFail("NOT_FOUND", "\u4F5C\u54C1\u4E0D\u5B58\u5728\u6216\u5DF2\u5728\u56DE\u6536\u7AD9");
      if (batch) return readBatch(novel, batch);
      if (action === "preset.read") return { novelId: novel.id, ...await readerPreset(novel, reader) };
      if (action === "guidance.read") return readerGuidance(args.section || "core", modules, ["preset", "all"].includes(args.section) ? await readerPreset(novel, reader) : void 0, scope.writableModules);
      if (action === "creativeMemory.read") return memoryRead(novel, args);
      if (action.startsWith("novel.")) return workspaceQuery(state, novel, action, { ...args, includeCreativeMemory: modules.includes("guidance") }, scope.novelIds);
      if (capability.module === "manuscript") return manuscriptQuery(novel, action, args);
      if (capability.module === "settings") return settingsQuery(novel, action, args);
      if (capability.module === "planning") {
        const result = planningQuery(novel, action, args);
        if (action === "planning.get" && !modules.includes("settings")) result.resources = { items: [], total: 0, nextOffset: null };
        return result;
      }
      return queryFail("UNKNOWN_ACTION", "\u67E5\u8BE2\u6A21\u5757\u5C1A\u672A\u5B9E\u73B0");
    });
  }
}
export {
  QueryService
};
