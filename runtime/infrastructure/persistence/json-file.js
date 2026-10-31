function parseJsonFile(text, path) {
  const source = text.charCodeAt(0) === 65279 ? text.slice(1) : text;
  try {
    return JSON.parse(source);
  } catch (cause) {
    if (!(cause instanceof SyntaxError)) throw cause;
    const native = cause.message;
    const position = /\bat position (\d+)\b/.exec(native);
    const coordinates = /\bline (\d+) column (\d+)\b/.exec(native);
    const offset = position ? Number(position[1]) : /Unexpected end of JSON input/.test(native) ? source.length : void 0;
    const prefix = offset === void 0 ? void 0 : source.slice(0, offset);
    const line = coordinates ? Number(coordinates[1]) : prefix === void 0 ? void 0 : prefix.split("\n").length;
    const column = coordinates ? Number(coordinates[2]) : prefix === void 0 ? void 0 : prefix.length - prefix.lastIndexOf("\n");
    const location = line === void 0 ? "" : `\uFF08\u7B2C ${line} \u884C\uFF0C\u7B2C ${column} \u5217\uFF09`;
    throw Object.assign(new Error(`\u5C0F\u8BF4\u6570\u636E\u6587\u4EF6\u65E0\u6CD5\u89E3\u6790\uFF1A${path}${location}\uFF1A${native}`, { cause }), {
      code: "CORRUPT_STORE",
      details: { path, reason: native, ...line === void 0 ? {} : { line, column }, ...offset === void 0 ? {} : { offset } }
    });
  }
}
export {
  parseJsonFile
};
