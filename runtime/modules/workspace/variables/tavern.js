import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { jsonValue, valueAt, toPointer, pointer, variableError } from "./patch.js";
const stringify = (v) => typeof v === "string" ? v : JSON.stringify(v);
function renderVariables(text, story, local, names = {}) {
  if (text.length > 1e5) variableError("\u4E00\u6B21\u6700\u591A\u6E32\u67D3\u5341\u4E07\u5B57");
  const warnings = /* @__PURE__ */ new Set();
  const content = text.replace(/\{\{([^{}]+)\}\}/g, (raw, body) => {
    if (body === "user") return names.user || "\u4F5C\u8005";
    if (body === "char") {
      if (names.char) return names.char;
      warnings.add("\u672A\u63D0\u4F9B char\uFF0C\u4FDD\u7559\u539F\u5360\u4F4D\u7B26");
      return raw;
    }
    const [op, name] = body.split("::");
    let value;
    if (op === "var") value = valueAt(story, toPointer(name || ""));
    else if (op === "getvar") value = valueAt(name === "stat_data" || name?.startsWith("stat_data.") ? story : local, toPointer(name || ""));
    else if (op === "getglobalvar") value = valueAt(story, "/tavernGlobal" + toPointer(name || ""));
    else {
      warnings.add(/^(set|inc|dec|add).*var/.test(op) ? "\u5199\u5165\u5B8F\u4E0D\u5728\u8BFB\u53D6\u65F6\u6267\u884C\uFF1B\u8BF7\u5148\u89E3\u6790\u3001\u9884\u89C8\uFF0C\u518D\u901A\u8FC7\u53D8\u91CF\u8865\u4E01\u63D0\u4EA4" : "\u672A\u652F\u6301\u7684\u5B8F\uFF1A" + op);
      return raw;
    }
    if (value === void 0) {
      warnings.add("\u53D8\u91CF\u5C1A\u65E0\u503C\uFF1A" + name);
      return raw;
    }
    return stringify(value);
  });
  if (/<%|\{\{(?:eval|run)|<script\b/i.test(text)) warnings.add("EJS\u3001JavaScript \u548C\u6269\u5C55\u811A\u672C\u4E0D\u4F1A\u6267\u884C");
  return { content, warnings: [...warnings] };
}
function literal(text) {
  const value = text.trim();
  if (value.startsWith("'") && value.endsWith("'")) {
    let result = "";
    for (let i = 1; i < value.length - 1; i++) {
      const c = value[i];
      if (c === "\\") {
        const n = value[++i];
        if (n === void 0) variableError("\u5B57\u7B26\u4E32\u8F6C\u4E49\u4E0D\u5B8C\u6574");
        result += { n: "\n", r: "\r", t: "	", "'": "'", "\\": "\\", '"': '"' }[n] ?? variableError("\u4EC5\u652F\u6301 JSON \u5B57\u7B26\u4E32\u8F6C\u4E49");
      } else result += c;
    }
    return result;
  }
  try {
    const result = JSON.parse(value);
    jsonValue(result);
    return result;
  } catch {
    return variableError("\u66F4\u65B0\u547D\u4EE4\u7684\u503C\u5FC5\u987B\u662F JSON \u5B57\u9762\u91CF\uFF0C\u4E0D\u6267\u884C\u8868\u8FBE\u5F0F");
  }
}
function argumentsOf(text) {
  const result = [];
  let start = 0, depth = 0, quote = "", escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if ("[{(".includes(c)) depth++;
    else if ("]})".includes(c)) depth--;
    else if (c === "," && depth === 0) {
      result.push(text.slice(start, i));
      start = i + 1;
    }
  }
  result.push(text.slice(start));
  return result.map(literal);
}
function parseVariableUpdates(text) {
  if (typeof text !== "string" || text.length > 1e6) variableError("\u66F4\u65B0\u6587\u672C\u8FC7\u957F");
  const warnings = [], operations = [];
  let body = (text.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/i)?.[1] || text).trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  if (body.startsWith("[")) {
    let rows;
    try {
      rows = JSON.parse(body);
    } catch {
      return variableError("JSON Patch \u65E0\u6CD5\u89E3\u6790");
    }
    if (!Array.isArray(rows) || rows.length > 200) variableError("\u8865\u4E01\u6700\u591A\u4E8C\u767E\u9879");
    for (const row of rows) {
      if (!row || !["add", "replace", "remove", "test", "copy", "move", "inc", "set", "delete"].includes(row.op)) variableError("\u4E0D\u652F\u6301\u7684\u8865\u4E01\u64CD\u4F5C");
      operations.push({ op: row.op, path: row.path, ...Object.hasOwn(row, "value") ? { value: row.value } : {}, ...row.from !== void 0 ? { from: row.from } : {} });
    }
  } else {
    const regex = /_\.(set|add|remove|insert)\s*\(/g;
    let match;
    while (match = regex.exec(body)) {
      let i = regex.lastIndex, start = i, depth = 1, quote = "", escaped = false;
      for (; i < body.length; i++) {
        const c = body[i];
        if (quote) {
          if (escaped) escaped = false;
          else if (c === "\\") escaped = true;
          else if (c === quote) quote = "";
        } else if (c === '"' || c === "'") quote = c;
        else if (c === "(") depth++;
        else if (c === ")" && --depth === 0) break;
      }
      if (depth !== 0) variableError("\u66F4\u65B0\u547D\u4EE4\u62EC\u53F7\u4E0D\u5B8C\u6574");
      const args = argumentsOf(body.slice(start, i)), path = typeof args[0] === "string" ? toPointer(args[0]) : variableError("\u66F4\u65B0\u8DEF\u5F84\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      if (match[1] === "set") {
        if (args.length < 2 || args.length > 3) variableError("set \u9700\u8981\u8DEF\u5F84\u548C\u503C");
        if (args.length === 3) operations.push({ op: "test", path, value: args[1] });
        operations.push({ op: "set", path, value: args.at(-1) });
      } else if (match[1] === "add") operations.push({ op: "inc", path, value: args[1] });
      else if (match[1] === "insert") operations.push({ op: "add", path: path + (args.length === 2 ? "/-" : "/" + String(args[1]).replaceAll("~", "~0").replaceAll("/", "~1")), value: args.at(-1) });
      else operations.push({ op: "remove", path: path + (args.length > 1 ? "/" + String(args[1]).replaceAll("~", "~0").replaceAll("/", "~1") : "") });
      regex.lastIndex = i + 1;
    }
    if (!operations.length) variableError("\u672A\u8BC6\u522B\u5230 JSON Patch \u6216\u5E38\u89C1 MVU \u66F4\u65B0\u547D\u4EE4");
    warnings.push("\u53EA\u89E3\u6790\u53D7\u652F\u6301\u7684\u5B57\u9762\u91CF\u547D\u4EE4\uFF1B\u4E0D\u4F1A\u6267\u884C JavaScript\u3001EJS \u6216\u4EFB\u610F\u51FD\u6570\u3002");
  }
  if (operations.length > 200) variableError("\u8865\u4E01\u6700\u591A\u4E8C\u767E\u9879");
  for (const op of operations) {
    pointer(op.path);
    if (op.from !== void 0) pointer(op.from);
    if (Object.hasOwn(op, "value")) jsonValue(op.value);
  }
  return { operations, warnings };
}
function importVariableSource(input) {
  if (!input || typeof input !== "object" || JSON.stringify(input).length > 2e6) variableError("\u53D8\u91CF\u6765\u6E90\u5FC5\u987B\u662F\u5C0F\u4E8E 2 MB \u7684 JSON");
  jsonValue(input);
  const story = {}, local = {}, warnings = /* @__PURE__ */ new Set();
  let hasGlobals = false;
  const raw = input, data = raw.data || raw, entries = data.entries || data.character_book?.entries || raw.prompts || data.prompts || [];
  const texts = [];
  for (const e of Array.isArray(entries) ? entries : Object.values(entries)) {
    if (typeof e?.content === "string") texts.push({ name: String(e.name || e.comment || ""), text: e.content });
  }
  for (const field of ["description", "scenario", "system_prompt", "content"]) if (typeof data[field] === "string") texts.push({ name: field, text: data[field] });
  if (data.stat_data && typeof data.stat_data === "object") story.stat_data = structuredClone(data.stat_data);
  for (const { name, text } of texts) {
    const init = text.match(/<initvar>\s*([\s\S]*?)\s*<\/initvar>/i)?.[1] || (/\[?initvar\]?/i.test(name) ? text : null);
    if (init) {
      let value;
      try {
        value = parseYaml(init.replace(/^```(?:ya?ml|json)?\s*|\s*```$/g, ""));
        jsonValue(value);
      } catch {
        return variableError("\u521D\u59CB\u5316\u53D8\u91CF\u65E0\u6CD5\u89E3\u6790\uFF1A" + name);
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) return variableError("\u521D\u59CB\u5316\u53D8\u91CF\u9700\u8981\u5BF9\u8C61");
      story.stat_data = structuredClone(value.stat_data || value);
    }
    for (const m of text.matchAll(/\{\{(setvar|setglobalvar)::([^{}:]+)::([^{}]*)\}\}/g)) {
      const value = (() => {
        try {
          return literal(m[3]);
        } catch {
          return m[3];
        }
      })(), path = toPointer(m[2]);
      pointer(path);
      if (path.split("/").length !== 2) {
        warnings.add("\u5D4C\u5957 setvar \u521D\u59CB\u5316\u8BF7\u5728\u53D8\u91CF\u7F16\u8F91\u5668\u6838\u5BF9\uFF1A" + m[2]);
        continue;
      }
      if (m[1] === "setglobalvar") {
        hasGlobals = true;
        story.tavernGlobal ??= {};
        story.tavernGlobal[m[2]] = value;
      } else local[m[2]] = value;
    }
    for (const warning of renderVariables(text, story, local).warnings) warnings.add(warning);
  }
  warnings.add("\u666E\u901A setvar \u521D\u503C\u6620\u5C04\u4E3A\u4F1A\u8BDD\u5C40\u90E8\u9ED8\u8BA4\u503C\uFF1BMVU InitVar/stat_data \u6620\u5C04\u4E3A\u8FD9\u672C\u4F5C\u54C1\u7684\u5267\u60C5\u72B6\u6001\u3002");
  if (hasGlobals) warnings.add("\u539F\u9152\u9986\u8DE8\u804A\u5929\u5168\u5C40\u53D8\u91CF\u5C06\u653E\u8FDB\u672C\u4F5C\u54C1 tavernGlobal\uFF1B\u4E0D\u4F1A\u4E0E\u5176\u4ED6\u4F5C\u54C1\u5171\u4EAB\uFF0C\u5BFC\u5165\u65F6\u9700\u8981\u786E\u8BA4\u3002");
  warnings.add("\u53EA\u517C\u5BB9\u5E38\u89C1\u53D6\u503C\u5B8F\u3001\u521D\u59CB\u5316\u3001JSON Patch \u548C\u5B57\u9762\u91CF\u66F4\u65B0\u547D\u4EE4\uFF1B\u539F\u59CB\u6765\u6E90\u4FDD\u7559\uFF0CEJS/\u811A\u672C/\u72B6\u6001\u680F\u6269\u5C55\u4E0D\u6267\u884C\u3002");
  return { story, local, warnings: [...warnings], hasGlobals, digest: createHash("sha256").update(JSON.stringify(input)).digest("hex"), counts: { story: Object.keys(story).length, local: Object.keys(local).length } };
}
export {
  importVariableSource,
  parseVariableUpdates,
  renderVariables
};
