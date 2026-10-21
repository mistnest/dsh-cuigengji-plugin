import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { MEMORY_ACTIONS, toolName } from "./actions.js";
import { memoryArgsSchema, memoryActionDescription } from "../dsh/memory-schema.js";
const endpoint = process.env.CUIGENGJI_MEMORY_ENDPOINT;
const token = process.env.CUIGENGJI_MEMORY_TOKEN;
if (!endpoint || !token) throw new Error("\u7F3A\u5C11 cuigengji \u5BBF\u4E3B\u8FDE\u63A5\u4FE1\u606F");
const address = new URL(endpoint);
if (address.protocol !== "http:" || address.hostname !== "127.0.0.1") {
  throw new Error("\u8BB0\u5FC6\u670D\u52A1\u5FC5\u987B\u4E3A\u672C\u673A loopback \u5730\u5740");
}
const server = new Server({ name: "cuigengji-memory", version: "0.1.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: MEMORY_ACTIONS.map((action) => ({
    name: toolName(action),
    description: action === "guidance.read" ? "\u6309\u9700\u8BFB\u53D6\u50AC\u66F4\u59EC\u7684\u5199\u4F5C\u6307\u5F15\u6A21\u5757\uFF0C\u586B\u5199 section\u3002\u57FA\u7840\u89C4\u5219\u4E0D\u8981\u6C42\u7ED1\u5B9A\u4F5C\u54C1\uFF1Bpreset/all \u4F1A\u9644\u5E26\u76EE\u6807\u4F5C\u54C1\u7684\u6709\u6548\u9884\u8BBE\uFF0C\u672A\u9009\u4F5C\u54C1\u65F6\u6CE8\u660E\u9884\u8BBE\u4E0D\u53EF\u7528\uFF0C\u89C4\u5219\u4ECD\u53EF\u8BFB\u53D6\u3002\u53C2\u8003\u6587\u4EF6\u76F8\u5BF9\u8FD4\u56DE\u7684 resourceBase\u3002" : memoryActionDescription(action),
    inputSchema: action.startsWith("graph.") || action.startsWith("edge.") ? memoryArgsSchema : action === "guidance.read" ? { type: "object", additionalProperties: true, properties: { section: { type: "string", enum: ["core", "project", "write", "plan", "memory", "revise", "preset", "all"] }, novelId: { type: "string" } } } : { type: "object", additionalProperties: true }
  }))
}));
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const action = MEMORY_ACTIONS.find((item) => toolName(item) === request.params.name);
  if (!action) return { isError: true, content: [{ type: "text", text: "\u672A\u77E5\u8BB0\u5FC6\u5DE5\u5177" }] };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ action, args: request.params.arguments ?? {} }),
      signal: AbortSignal.any([extra.signal, AbortSignal.timeout(3e4)])
    });
    const body = await response.json();
    if (!response.ok) return { isError: true, content: [{ type: "text", text: body.error ?? "\u8BB0\u5FC6\u64CD\u4F5C\u5931\u8D25" }] };
    return { content: [{ type: "text", text: JSON.stringify(body.result ?? null) }] };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
});
await server.connect(new StdioServerTransport());
