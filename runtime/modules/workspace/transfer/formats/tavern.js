import { createHash } from "node:crypto";
const MAX_TAVERN_BYTES = 20 * 1024 * 1024;
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function fail(message) {
  throw Object.assign(new Error(message), { code: "INVALID_TAVERN_FILE" });
}
const hash = (value) => createHash("sha256").update(value).digest("hex");
const strings = (value) => Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
function crc32(bytes) {
  let crc = 4294967295;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ 3988292384 & -(crc & 1);
  }
  return (crc ^ 4294967295) >>> 0;
}
function parseTavernFile({ json, pngBase64 } = {}) {
  if (pngBase64 === void 0) {
    if (!object(json) || Buffer.byteLength(JSON.stringify(json)) > MAX_TAVERN_BYTES)
      fail("\u8BF7\u9009\u62E9\u6709\u6548\u7684\u89D2\u8272\u5361\u6216\u4E16\u754C\u4E66 JSON\uFF08\u6700\u5927 20 MB\uFF09");
    return json;
  }
  if (typeof pngBase64 !== "string" || pngBase64.length > Math.ceil(MAX_TAVERN_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(pngBase64))
    fail("PNG \u6587\u4EF6\u65E0\u6548\u6216\u8D85\u8FC7 20 MB");
  const bytes = Buffer.from(pngBase64, "base64");
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) fail("\u4E0D\u662F PNG \u6587\u4EF6");
  const cards = /* @__PURE__ */ new Map();
  let ended = false;
  for (let offset = 8; offset < bytes.length; ) {
    if (offset + 12 > bytes.length) fail("PNG \u6587\u4EF6\u5DF2\u622A\u65AD");
    const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
    if (end > bytes.length) fail("PNG \u6570\u636E\u5757\u5DF2\u622A\u65AD");
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4))
      fail("PNG \u6821\u9A8C\u5931\u8D25\uFF0C\u6587\u4EF6\u53EF\u80FD\u635F\u574F");
    if (type === "tEXt") {
      const data = bytes.subarray(offset + 8, end - 4), split = data.indexOf(0);
      const key = data.subarray(0, split).toString("latin1").toLowerCase();
      if (split > 0 && ["chara", "ccv3"].includes(key))
        cards.set(key, data.subarray(split + 1).toString("ascii"));
    }
    offset = end;
    if (type === "IEND") {
      ended = true;
      break;
    }
  }
  if (!ended) fail("PNG \u7F3A\u5C11\u7ED3\u675F\u6570\u636E\u5757");
  const encoded = cards.get("ccv3") ?? cards.get("chara");
  if (!encoded) fail("\u8FD9\u662F\u4E00\u5F20\u666E\u901A PNG\uFF0C\u6CA1\u6709\u9152\u9986\u89D2\u8272\u5361\u6570\u636E");
  try {
    return parseTavernFile({ json: JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) });
  } catch (error) {
    fail(`\u89D2\u8272\u5361\u6570\u636E\u65E0\u6CD5\u89E3\u6790\uFF1A${error instanceof Error ? error.message : String(error)}`);
  }
}
function previewTavern(args) {
  const raw = parseTavernFile(args);
  if (raw.spec && !["chara_card_v2", "chara_card_v3"].includes(raw.spec))
    fail(`\u4E0D\u652F\u6301\u7684\u89D2\u8272\u5361\u89C4\u8303\uFF1A${raw.spec}`);
  const data = raw.spec ? raw.data : raw;
  if (!object(data)) fail("\u89D2\u8272\u5361\u7F3A\u5C11 data \u5BF9\u8C61");
  const card = !!raw.spec || data.entries === void 0 && typeof data.name === "string" && typeof data.description === "string";
  const nodes = [];
  let sourceIndex = 0;
  const warnings = [
    "\u5BFC\u5165\u7684\u662F\u5199\u4F5C\u8D44\u6599\u3002\u9152\u9986\u7684\u5173\u952E\u8BCD\u89E6\u53D1\u3001\u6982\u7387\u3001\u9012\u5F52\u626B\u63CF\u3001\u63D2\u5165\u4F4D\u7F6E\u3001\u5B8F\u548C\u6269\u5C55\u811A\u672C\u4E0D\u5728 DSH \u4E2D\u6267\u884C\u3002",
    "\u539F\u59CB JSON \u548C\u6269\u5C55\u5B57\u6BB5\u968F\u5B8C\u6574\u5907\u4EFD\u4FDD\u7559\uFF1B\u7CFB\u7EDF\u63D0\u793A\u8BCD\u4E0D\u4F1A\u66FF\u6362 DSH \u7684\u7CFB\u7EDF\u6307\u4EE4\u3002PNG \u56FE\u7247\u672C\u8EAB\u4E0E\u5916\u90E8\u7D20\u6750\u4E0D\u4FDD\u5B58\u3002"
  ];
  const add = (type, name, content, aliases = [], status = "unconfirmed") => {
    nodes.push({
      sourceIndex: sourceIndex++,
      type,
      name,
      content,
      aliases,
      status,
      factType: "unconfirmed",
      summary: "",
      sources: [],
      knownBy: [],
      dependsOn: [],
      storyTime: ""
    });
  };
  function book(value, fallback) {
    if (!object(value) || !(Array.isArray(value.entries) || object(value.entries)))
      fail("\u4E16\u754C\u4E66\u7F3A\u5C11 entries \u6570\u7EC4\u6216\u5BF9\u8C61");
    const entries = Object.values(value.entries);
    if (entries.length > 2e3) fail("\u5355\u672C\u4E16\u754C\u4E66\u6700\u591A\u652F\u6301 2000 \u6761\u6761\u76EE");
    if (typeof value.description === "string" && value.description.trim())
      add(
        "world_entry",
        typeof value.name === "string" && value.name.trim() ? value.name : fallback,
        value.description
      );
    else sourceIndex++;
    for (const [index, entry] of entries.entries()) {
      if (!object(entry) || typeof entry.content !== "string")
        fail(`\u4E16\u754C\u4E66\u7B2C ${index + 1} \u6761\u7F3A\u5C11\u6587\u672C content`);
      const keys = strings(entry.keys ?? entry.key);
      const name = [entry.name, entry.comment, keys[0]].find((v) => typeof v === "string" && v.trim()) || `\u4E16\u754C\u6761\u76EE ${index + 1}`;
      add(
        "world_entry",
        name,
        entry.content,
        keys,
        entry.disable === true || entry.enabled === false ? "retired" : "unconfirmed"
      );
    }
  }
  if (card) {
    if (typeof data.name !== "string" || !data.name.trim()) fail("\u89D2\u8272\u5361\u7F3A\u5C11\u89D2\u8272\u540D\u79F0");
    const sections = [
      ["description", "\u89D2\u8272\u63CF\u8FF0"],
      ["personality", "\u6027\u683C"],
      ["scenario", "\u573A\u666F"],
      ["first_mes", "\u5F00\u573A\u767D"],
      ["mes_example", "\u5BF9\u8BDD\u793A\u4F8B"]
    ];
    const content = sections.filter(([key]) => typeof data[key] === "string" && data[key]).map(([key, label]) => `## ${label}

${data[key]}`);
    if (strings(data.alternate_greetings).length)
      content.push(`## \u5176\u4ED6\u5F00\u573A\u767D

${data.alternate_greetings.join("\n\n")}`);
    add("character_card", data.name, content.join("\n\n"));
    if (data.character_book) book(data.character_book, `${data.name}\u7684\u4E16\u754C\u4E66`);
    if (raw.spec === "chara_card_v3")
      warnings.push("V3 \u4EC5\u6620\u5C04\u901A\u7528\u6587\u672C\u548C\u5185\u5D4C\u4E16\u754C\u4E66\uFF1Bassets\u3001\u989D\u5916\u95EE\u5019\u4E0E\u5176\u4ED6\u4E13\u5C5E\u5B57\u6BB5\u4EC5\u4FDD\u5B58\u5728\u539F\u59CB JSON \u4E2D\u3002");
  } else book(data, typeof args.fileName === "string" ? args.fileName.replace(/\.json$/i, "") : "\u5BFC\u5165\u4E16\u754C\u4E66");
  return {
    format: card ? raw.spec || "chara_card_v1" : "world_info",
    fingerprint: hash(JSON.stringify(raw)),
    nodes,
    warnings,
    raw
  };
}
export {
  MAX_TAVERN_BYTES,
  crc32,
  parseTavernFile,
  previewTavern
};
