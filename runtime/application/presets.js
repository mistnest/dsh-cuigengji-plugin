import { previewPresetImport } from "../domain/preset/maintenance.js";
import { validatePreset } from "../domain/preset/index.js";
import { recognize } from "./transfer/recognize.js";
function previewPresetInput(args) {
  let value = args.input;
  if (typeof value === "string" && !/\.(txt|md)$/i.test(args.fileName || "")) {
    try {
      value = JSON.parse(value.replace(/^\uFEFF/, ""));
    } catch {
    }
  }
  if (!value || typeof value !== "object" || !["cuigengji-package", "cuigengji", "cuigengji-workspace"].includes(value.format)) return previewPresetImport(args);
  const result = recognize({ name: args.fileName || "preset.json", json: value }, { intent: "preset", orderId: args.orderId });
  const candidates = result.projects.filter((project) => project.preset);
  const selected = args.sourceNovelId === void 0 && candidates.length === 1 ? candidates[0] : candidates.find((project) => project.id === args.sourceNovelId);
  if (!selected) throw Object.assign(new Error(`\u8BF7\u63D0\u4F9B sourceNovelId \u9009\u62E9\u5907\u4EFD\u4E2D\u7684\u9884\u8BBE\uFF1A${candidates.map((project) => `${project.title} (${project.id})`).join("\u3001")}`), { code: "INVALID_PRESET" });
  return { ...structuredClone(validatePreset(selected.preset)), enabled: false };
}
export {
  previewPresetInput
};
