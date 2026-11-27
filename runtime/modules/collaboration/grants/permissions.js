import { READER_MODULES } from "../../workspace/queries/reader-modules.js";
const accessLabels = { none: "\u65E0\u6743\u9650", read: "\u53EA\u8BFB", write: "\u8BFB\u5199" };
function grantLevels(read, write = []) {
  return Object.fromEntries(
    READER_MODULES.map((m) => [m, write.includes(m) ? "write" : read.includes(m) ? "read" : "none"])
  );
}
function parseLevels(input, base) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length || Object.entries(input).some(
    ([k, v]) => !READER_MODULES.includes(k) || typeof v !== "string" || !Object.hasOwn(accessLabels, v)
  )) {
    throw Object.assign(new Error("\u8BF7\u6309\u6A21\u5757\u6307\u5B9A none\u3001read \u6216 write"), { code: "INVALID_INPUT" });
  }
  const levels = { ...base, ...input };
  return {
    modules: READER_MODULES.filter((m) => levels[m] !== "none"),
    writableModules: READER_MODULES.filter((m) => levels[m] === "write")
  };
}
export {
  accessLabels,
  grantLevels,
  parseLevels
};
