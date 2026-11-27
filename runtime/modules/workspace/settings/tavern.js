import { previewTavern } from "../transfer/formats/tavern.js";
import { fail, own, record, touch } from "../operations/records.js";
import { memoryVersion } from "./records.js";
function tavernAction(n, action, a, actor) {
  if (actor.kind !== "human") fail("HUMAN_REQUIRED", "\u9152\u9986\u6587\u4EF6\u5BFC\u5165\u9700\u8981\u4F5C\u8005\u64CD\u4F5C");
  const preview = previewTavern(a);
  if (action === "tavern.preview") {
    const { raw, ...result } = preview;
    return result;
  }
  if (a.confirm !== true) fail("CONFIRM_REQUIRED", "\u8BF7\u5148\u9884\u89C8\u5E76\u786E\u8BA4\u5BFC\u5165");
  if (a.fingerprint !== preview.fingerprint) fail("CONFLICT", "\u6587\u4EF6\u4E0E\u9884\u89C8\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8");
  const selected = a.selected ?? preview.nodes.map((_, index) => index);
  if (!Array.isArray(selected) || !selected.length || selected.some((i) => !Number.isInteger(i) || !preview.nodes[i]))
    fail("INVALID_INPUT", "\u8BF7\u9009\u62E9\u6709\u6548\u7684\u5BFC\u5165\u6761\u76EE");
  const imported = [], skipped = [];
  for (const index of new Set(selected)) {
    const sourceIndex = preview.nodes[index].sourceIndex ?? index;
    const id = `tavern-${preview.fingerprint}-${sourceIndex}`;
    if (own(n.nodes, id)) {
      skipped.push(id);
      continue;
    }
    n.nodes[id] = record({
      ...preview.nodes[index],
      id,
      deleted: false,
      tavern: { fingerprint: preview.fingerprint, format: preview.format, index: sourceIndex }
    });
    n.nodes[id].versions = [memoryVersion(n.nodes[id], actor, "\u9152\u9986\u5BFC\u5165\u8BBE\u5B9A")];
    imported.push(id);
  }
  if (imported.length) {
    n.tavernSources ??= {};
    n.tavernSources[preview.fingerprint] = { format: preview.format, raw: preview.raw };
    touch(n);
  }
  return { imported: imported.length, skipped: skipped.length, nodeIds: imported };
}
export {
  tavernAction
};
