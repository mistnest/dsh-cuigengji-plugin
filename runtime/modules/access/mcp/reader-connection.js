import { readFile } from "node:fs/promises";
import { fail } from "../../../platform/errors.js";
function openReaderConnection(file) {
  async function descriptor() {
    let value;
    try {
      value = JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, ""));
    } catch {
      fail("CONNECTION_UNAVAILABLE", "\u65E0\u6CD5\u8BFB\u53D6\u50AC\u66F4\u59EC\u8FDE\u63A5\u914D\u7F6E\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u662F\u5426\u5DF2\u521B\u5EFA\u6216\u64A4\u9500");
    }
    let address;
    try {
      address = new URL(value.endpoint);
    } catch {
      fail("INVALID_CONNECTION", "\u5916\u90E8 MCP \u8FDE\u63A5\u5730\u5740\u65E0\u6548");
    }
    if (value.format !== "cuigengji-mcp-connection" || value.version !== 1 || address.protocol !== "http:" || address.hostname !== "127.0.0.1" || !address.port || address.username || address.password || address.search || address.hash || address.pathname !== "/" || typeof value.token !== "string" || !/^[a-f0-9]{64}$/.test(value.token)) {
      fail("INVALID_CONNECTION", "\u9700\u8981\u6709\u6548\u7684\u672C\u673A MCP \u8FDE\u63A5\u914D\u7F6E");
    }
    return { endpoint: address.origin, token: value.token };
  }
  async function request(path, body, signal) {
    const { endpoint, token } = await descriptor();
    const headers = { authorization: `Bearer ${token}` };
    if (body !== void 0) headers["content-type"] = "application/json";
    const timeout = AbortSignal.timeout(3e4);
    let response;
    try {
      response = await fetch(endpoint + path, {
        method: body === void 0 ? "GET" : "POST",
        headers,
        body: JSON.stringify(body),
        redirect: "error",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout
      });
    } catch {
      signal?.throwIfAborted();
      fail("HOST_UNAVAILABLE", "\u65E0\u6CD5\u8FDE\u63A5\u50AC\u66F4\u59EC\u3002\u8BF7\u542F\u52A8\u914D\u7F6E\u6B64\u8FDE\u63A5\u7684 DSH\uFF0C\u5E76\u786E\u8BA4\u63D2\u4EF6\u5DF2\u542F\u7528");
    }
    let result;
    try {
      result = await response.json();
    } catch {
      fail("HOST_PROTOCOL_ERROR", "\u50AC\u66F4\u59EC\u8FDE\u63A5\u8FD4\u56DE\u4E86\u65E0\u6548\u54CD\u5E94");
    }
    if (!response.ok || !result.ok) {
      throw Object.assign(new Error(result.error?.message || "\u50AC\u66F4\u59EC\u67E5\u8BE2\u5931\u8D25"), result.error || { code: "QUERY_FAILED" });
    }
    return result.value;
  }
  return { request };
}
export {
  openReaderConnection
};
