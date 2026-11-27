import { managedFileKey, validManagedFileName } from "./file-names.js";
import { validManagedPath } from "./tree-layout.js";
function corrupt(message) {
  throw Object.assign(new Error(message), { code: "CORRUPT_STORE" });
}
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function checkFileNames(names, version) {
  const valid = version >= 5 ? validManagedPath : validManagedFileName;
  const used = /* @__PURE__ */ new Set();
  for (const name of names) {
    if (!valid(name)) corrupt("\u5185\u5BB9\u6587\u4EF6\u6620\u5C04\u5305\u542B\u65E0\u6548\u6587\u4EF6\u540D");
    const key = managedFileKey(name);
    if (used.has(key)) corrupt("\u5185\u5BB9\u6587\u4EF6\u6620\u5C04\u91CD\u590D");
    used.add(key);
  }
}
export {
  checkFileNames,
  corrupt,
  isRecord,
  sameJson
};
