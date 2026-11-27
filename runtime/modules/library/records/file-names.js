import { createHash } from "node:crypto";
const fileId = (id) => /^[a-z0-9][a-z0-9_-]{0,120}$/i.test(id) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id) ? id : "~" + createHash("sha256").update(id).digest("hex");
const shortFileId = (id) => createHash("sha256").update(id).digest("hex").slice(0, 8);
const invalidFileCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const invalidFileCharacterTest = /[<>:"/\\|?*\u0000-\u001f\u007f]/;
const reservedFileStem = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;
const managedFileKey = (name) => name.normalize("NFC").toLowerCase();
function shortenFileStem(stem, suffix) {
  let result = "";
  for (const character of stem) {
    if (result.length + character.length + suffix.length > 120) break;
    result += character;
  }
  return (result.replace(/[ .]+$/g, "") || "\u672A\u547D\u540D") + suffix;
}
function safeFileStem(label, fallback) {
  let stem = typeof label === "string" ? label.normalize("NFC").replace(invalidFileCharacters, "_").trim() : "";
  stem = stem.replace(/[ .]+$/g, "");
  if (!stem) stem = fallback;
  if (reservedFileStem.test(stem)) stem = "\u6761\u76EE_" + stem;
  return stem;
}
function uniqueFileName(label, id, fallback, used, suffixId = shortFileId(id)) {
  const suffix = "--" + suffixId + ".json", stem = safeFileStem(label, fallback);
  let candidate = shortenFileStem(stem, suffix), number = 2;
  while (used.has(managedFileKey(candidate))) candidate = shortenFileStem(stem, "\uFF08" + number++ + "\uFF09" + suffix);
  used.add(managedFileKey(candidate));
  return candidate;
}
const readableFileName = (label, id, fallback = "\u672A\u547D\u540D") => uniqueFileName(label, id, fallback, /* @__PURE__ */ new Set());
const validManagedFileName = (value) => {
  if (typeof value !== "string" || !/--(?:[a-f0-9]{8}|main)\.json$/.test(value) || value.length > 120 || value.includes("/") || value.includes("\\")) return false;
  const stem = value.slice(0, -5);
  return !!stem && !invalidFileCharacterTest.test(stem) && !/[ .]$/.test(stem) && !reservedFileStem.test(stem);
};
const pageKey = (id) => id === null ? "~main" : fileId(id);
export {
  fileId,
  managedFileKey,
  pageKey,
  readableFileName,
  shortFileId,
  uniqueFileName,
  validManagedFileName
};
