import { isDeepStrictEqual } from "node:util";
const variableError = (message, code = "INVALID_VARIABLE") => {
  throw Object.assign(new Error(message), { code });
};
const forbidden = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
function jsonValue(value, depth = 0) {
  if (depth > 24) variableError("\u53D8\u91CF\u5D4C\u5957\u8D85\u8FC7 24 \u5C42");
  if (value === null || ["string", "boolean"].includes(typeof value)) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) variableError("\u53D8\u91CF\u6570\u5B57\u5FC5\u987B\u6709\u9650");
    return;
  }
  if (!value || typeof value !== "object" || ![Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(value))) variableError("\u53D8\u91CF\u503C\u5FC5\u987B\u662F JSON \u6570\u636E");
  if (Array.isArray(value) && Object.keys(value).length !== value.length) variableError("\u53D8\u91CF\u6570\u7EC4\u4E0D\u80FD\u5305\u542B\u7A7A\u4F4D\u6216\u989D\u5916\u5C5E\u6027");
  for (const [key, item] of Object.entries(value)) {
    if (forbidden.has(key)) variableError("\u53D8\u91CF\u8DEF\u5F84\u5305\u542B\u4FDD\u7559\u540D\u79F0");
    jsonValue(item, depth + 1);
  }
}
function pointer(path) {
  if (typeof path !== "string" || path.length > 500 || path && !path.startsWith("/")) variableError("\u53D8\u91CF\u8DEF\u5F84\u4F7F\u7528 JSON Pointer\uFF0C\u4F8B\u5982 /\u4EBA\u7269/\u8427\u708E/\u7B49\u7EA7");
  return path ? path.slice(1).split("/").map((p) => {
    if (/~(?![01])/g.test(p)) variableError("\u53D8\u91CF\u8DEF\u5F84\u8F6C\u4E49\u65E0\u6548");
    const key = p.replaceAll("~1", "/").replaceAll("~0", "~");
    if (forbidden.has(key)) variableError("\u53D8\u91CF\u8DEF\u5F84\u5305\u542B\u4FDD\u7559\u540D\u79F0");
    return key;
  }) : [];
}
const toPointer = (value) => value.startsWith("/") || value === "" ? value : "/" + value.split(".").map((v) => v.replaceAll("~", "~0").replaceAll("/", "~1")).join("/");
function valueAt(data, path) {
  let current = data;
  for (const key of pointer(path)) {
    if (!current || typeof current !== "object" || !Object.hasOwn(current, key)) return void 0;
    current = current[key];
  }
  return structuredClone(current);
}
const pathsOverlap = (a, b) => a === b || a === "" || b === "" || a.startsWith(b + "/") || b.startsWith(a + "/");
function applyVariablePatch(initial, operations, definitions = []) {
  if (!Array.isArray(operations) || !operations.length || operations.length > 200) variableError("\u6BCF\u6B21\u63D0\u4EA4 1\u2014200 \u9879\u53D8\u91CF\u53D8\u66F4");
  let data = structuredClone(initial);
  for (const patch of operations) {
    if (!patch || !["set", "inc", "delete", "test", "add", "replace", "remove", "copy", "move"].includes(patch.op)) variableError("\u4E0D\u652F\u6301\u7684\u53D8\u91CF\u64CD\u4F5C");
    const keys = pointer(patch.path), old = valueAt(data, patch.path);
    let value = patch.value;
    if (patch.op === "test") {
      if (!isDeepStrictEqual(old, value)) variableError("\u53D8\u91CF\u6821\u9A8C\u6761\u4EF6\u5DF2\u53D8\u5316\uFF1A" + patch.path, "CONFLICT");
      continue;
    }
    if (patch.op === "copy" || patch.op === "move") {
      if (typeof patch.from !== "string") variableError("\u590D\u5236 / \u79FB\u52A8\u9700\u8981 from \u8DEF\u5F84");
      value = valueAt(data, patch.from);
      if (value === void 0) variableError("\u6765\u6E90\u53D8\u91CF\u4E0D\u5B58\u5728");
      if (patch.op === "move") {
        if (patch.from === patch.path) continue;
        if (patch.path.startsWith(patch.from + "/")) variableError("\u4E0D\u80FD\u628A\u53D8\u91CF\u79FB\u5230\u81EA\u5DF1\u7684\u5B50\u8DEF\u5F84");
        data = applyVariablePatch(data, [{ op: "remove", path: patch.from }]);
      }
    }
    if (patch.op === "inc") {
      if (typeof old !== "number" || typeof value !== "number" || !Number.isFinite(old + value)) return variableError("\u9012\u589E\u8981\u6C42\u539F\u503C\u548C\u589E\u91CF\u90FD\u662F\u6709\u9650\u6570\u5B57");
      value = old + value;
    }
    if (patch.op === "replace" && old === void 0) variableError("\u66FF\u6362\u7684\u53D8\u91CF\u4E0D\u5B58\u5728\uFF1A" + patch.path);
    if (!keys.length) {
      if (["delete", "remove"].includes(patch.op)) variableError("\u4E0D\u80FD\u5220\u9664\u6574\u4E2A\u53D8\u91CF\u6839");
      jsonValue(value);
      if (!value || Array.isArray(value) || typeof value !== "object") variableError("\u53D8\u91CF\u6839\u5FC5\u987B\u662F\u5BF9\u8C61");
      data = structuredClone(value);
      continue;
    }
    let parent = data;
    for (const key2 of keys.slice(0, -1)) {
      if (!parent || typeof parent !== "object") variableError("\u53D8\u91CF\u7236\u8DEF\u5F84\u4E0D\u662F\u5BF9\u8C61");
      if (!Object.hasOwn(parent, key2)) {
        if (patch.op !== "set") variableError("\u53D8\u91CF\u7236\u8DEF\u5F84\u4E0D\u5B58\u5728");
        parent[key2] = {};
      }
      parent = parent[key2];
    }
    if (!parent || typeof parent !== "object") variableError("\u53D8\u91CF\u7236\u8DEF\u5F84\u4E0D\u662F\u5BF9\u8C61");
    let key = keys.at(-1);
    const insert = ["add", "copy", "move"].includes(patch.op);
    if (Array.isArray(parent)) {
      if (key === "-" && insert) key = String(parent.length);
      if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) > parent.length || Number(key) === parent.length && !insert && patch.op !== "set") variableError("\u6570\u7EC4\u4E0B\u6807\u65E0\u6548");
    }
    if (["delete", "remove"].includes(patch.op)) {
      if (!Object.hasOwn(parent, key)) variableError("\u5220\u9664\u7684\u53D8\u91CF\u4E0D\u5B58\u5728\uFF1A" + patch.path);
      if (Array.isArray(parent)) parent.splice(Number(key), 1);
      else delete parent[key];
    } else {
      jsonValue(value);
      if (Array.isArray(parent) && insert) parent.splice(Number(key), 0, structuredClone(value));
      else parent[key] = structuredClone(value);
    }
  }
  jsonValue(data);
  if (Buffer.byteLength(JSON.stringify(data), "utf8") > 1e6) variableError("\u5355\u4EFD\u53D8\u91CF\u5FEB\u7167\u4E0D\u80FD\u8D85\u8FC7 1 MB");
  for (const d of definitions) {
    const value = valueAt(data, d.path);
    if (value === void 0) continue;
    const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    if (d.type && type !== d.type) variableError(`${d.name} \u9700\u8981 ${d.type} \u7C7B\u578B`);
    if (d.schema) checkSchema(value, d.schema, d.name);
  }
  return data;
}
function checkSchema(value, schema, label, depth = 0) {
  if (depth > 24) variableError("schema \u5D4C\u5957\u8FC7\u6DF1");
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  if (schema.type && !(Array.isArray(schema.type) ? schema.type : [schema.type]).includes(type)) variableError(label + " \u7C7B\u578B\u4E0D\u7B26\u5408\u7EA6\u675F");
  if (schema.enum && !schema.enum.some((v) => isDeepStrictEqual(v, value))) variableError(label + " \u4E0D\u5728\u53EF\u9009\u503C\u4E2D");
  if (typeof value === "number" && (schema.minimum !== void 0 && value < schema.minimum || schema.maximum !== void 0 && value > schema.maximum)) variableError(label + " \u8D85\u51FA\u6570\u503C\u8303\u56F4");
  if (typeof value === "string" && schema.maxLength !== void 0 && value.length > schema.maxLength) variableError(label + " \u6587\u5B57\u8FC7\u957F");
  if (Array.isArray(value) && schema.items) for (const item of value) checkSchema(item, schema.items, label, depth + 1);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) variableError(label + " \u7F3A\u5C11 " + key);
    for (const [key, item] of Object.entries(value)) if (schema.properties?.[key]) checkSchema(item, schema.properties[key], label + "." + key, depth + 1);
  }
}
export {
  applyVariablePatch,
  jsonValue,
  pathsOverlap,
  pointer,
  toPointer,
  valueAt,
  variableError
};
