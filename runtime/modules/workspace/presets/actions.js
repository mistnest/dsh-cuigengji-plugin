import { isDeepStrictEqual } from "node:util";
import { validatePreset } from "./index.js";
import { importPresetDocument, presetDocument, updatePresetDocument, validatePresetCommand } from "./maintenance.js";
import { previewPresetInput } from "./preview.js";
import { cas, clone, fail, record, touch } from "../operations/records.js";
function savePreset(novel, value) {
  const previous = novel.preset;
  novel.preset = record({
    name: value.name,
    enabled: value.enabled,
    blocks: clone(value.blocks),
    raw: clone(value.raw ?? null),
    warnings: clone(value.warnings ?? []),
    ...value.importFormat ? { importFormat: value.importFormat } : {},
    ...previous?.id ? { id: previous.id } : {},
    ...previous?.createdAt ? { createdAt: previous.createdAt } : {},
    revision: (previous?.revision || 0) + 1
  });
  touch(novel);
  return novel.preset;
}
function presetAction(n, action, a, actor, binding, readPreset) {
  if (action === "preset.get") return actor.kind === "human" && a.identifier === void 0 ? n.preset || null : { novelId: n.id, ...presetDocument(n.preset, a.identifier) };
  if (action === "preset.read") {
    if (Object.hasOwn(n, "creativeMemory")) return { enabled: false, name: "", revision: 0, content: "", replacedBy: "creativeMemory.read" };
    const focusedChapter = (binding?.activeNovelId || binding?.novelId) === n.id ? binding?.chapterId : null;
    return readPreset(n, a, actor, a.chapterId || focusedChapter);
  }
  if (action === "preset.preview") {
    const preset = previewPresetInput(a);
    return actor.kind === "human" ? preset : { novelId: n.id, ...presetDocument({ ...preset, revision: n.preset?.revision || 0 }, void 0) };
  }
  if (action === "preset.import" || action === "preset.update") {
    validatePresetCommand(action, a);
    cas(n.preset || { revision: 0 }, a);
    const previous = n.preset;
    const result = action === "preset.import" ? importPresetDocument(previous, a, previewPresetInput(a)) : { preset: updatePresetDocument(previous, a) };
    const fields = ["name", "enabled", "blocks", "raw", "warnings", "importFormat"];
    const changedFields = fields.filter((field) => !isDeepStrictEqual(previous?.[field], result.preset[field]));
    const saved = changedFields.length ? savePreset(n, result.preset) : previous;
    return {
      novelId: n.id,
      ...presetDocument(saved, void 0),
      changed: changedFields.length > 0,
      changedFields,
      previousRevision: previous?.revision || 0,
      ..."mapping" in result && result.mapping ? { mapping: result.mapping } : {}
    };
  }
  if (action === "preset.set") {
    if (actor.kind !== "human") fail("HUMAN_REQUIRED", "\u6574\u5957\u9884\u8BBE\u4FDD\u5B58\u7531\u4F5C\u8005\u9875\u9762\u4F7F\u7528\uFF1BAI \u8BF7\u7528 preset.import \u6216 preset.update \u7EF4\u62A4");
    if (n.preset) cas(n.preset, a);
    else if (a.expectedRevision !== 0) fail("CONFLICT", "\u9884\u8BBE\u7248\u672C\u4E0D\u5339\u914D\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6");
    const value = validatePreset(a.preset);
    return savePreset(n, value);
  }
  fail("UNKNOWN_ACTION", `\u672A\u77E5\u64CD\u4F5C\uFF1A${action}`);
}
export {
  presetAction
};
