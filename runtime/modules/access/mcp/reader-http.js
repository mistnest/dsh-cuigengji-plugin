import http from "node:http";
import { errorInfo, fail } from "../../../platform/errors.js";
const postRoutes = { "/reader/open": "open", "/reader/status": "status", "/query": "query", "/write": "write" };
async function readBody(request, limit) {
  if (request.headers["content-type"]?.split(";")[0] !== "application/json") fail("INVALID_INPUT", "\u8BF7\u6C42\u987B\u4E3A JSON");
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) fail("INVALID_INPUT", "\u8BF7\u6C42\u5185\u5BB9\u8FC7\u5927");
    chunks.push(chunk);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("INVALID_INPUT", "\u67E5\u8BE2\u53C2\u6570\u987B\u4E3A\u5BF9\u8C61");
  return body;
}
function createReaderTransport(authorize) {
  let endpoint = "", closed = false;
  let server;
  let opening;
  async function handle(request, response) {
    const reply = (status, body) => {
      response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(body));
    };
    try {
      if (request.headers.host !== endpoint.slice("http://".length)) fail("UNAUTHORIZED", "\u5916\u90E8\u8FDE\u63A5\u5730\u5740\u65E0\u6548");
      const reader = await authorize((request.headers.authorization || "").replace(/^Bearer /, ""));
      if (request.method === "GET" && request.url === "/capabilities") {
        return reply(200, { ok: true, value: await reader.invoke("capabilities", {}) });
      }
      const path = request.url || "";
      if (request.method !== "POST" || !Object.hasOwn(postRoutes, path)) fail("READ_ONLY", "\u6B64\u8FDE\u63A5\u672A\u5F00\u653E\u8BE5\u5165\u53E3");
      const operation = postRoutes[path];
      const body = await readBody(request, operation === "write" ? 1536 * 1024 : 256 * 1024);
      reply(200, { ok: true, value: await reader.invoke(operation, body) });
    } catch (error) {
      const diagnostic = errorInfo(error);
      reply(diagnostic.code === "UNAUTHORIZED" ? 401 : 400, { ok: false, error: diagnostic });
    }
  }
  return {
    async listen() {
      if (closed) fail("EXTERNAL_CLOSED", "\u5916\u90E8\u8FDE\u63A5\u670D\u52A1\u5DF2\u5173\u95ED");
      if (endpoint) return endpoint;
      if (!opening) {
        const listener = http.createServer((req, res) => {
          void handle(req, res);
        });
        listener.requestTimeout = 3e4;
        listener.headersTimeout = 15e3;
        opening = new Promise((done, reject) => {
          listener.once("error", reject);
          listener.listen(0, "127.0.0.1", () => {
            listener.off("error", reject);
            server = listener;
            endpoint = "http://127.0.0.1:" + listener.address().port;
            done(endpoint);
          });
        }).finally(() => {
          opening = void 0;
        });
      }
      return opening;
    },
    async close() {
      closed = true;
      await opening?.catch(() => {
      });
      const listener = server;
      if (!listener) return;
      server = void 0;
      listener.closeAllConnections();
      await new Promise((done) => listener.close(() => done()));
    }
  };
}
export {
  createReaderTransport
};
