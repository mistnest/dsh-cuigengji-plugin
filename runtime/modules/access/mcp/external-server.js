#!/usr/bin/env node
import { openReaderConnection } from "./reader-connection.js";
import { basename, dirname, resolve } from "node:path";
import { watch } from "node:fs";
import { z } from "zod";
import { grantWrites } from "../../collaboration/grants/writes.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { QUERY_CAPABILITIES, queryAllowed, queryInputSchema } from "../../workspace/queries/catalog.js";
import { errorInfo, fail } from "../../../platform/errors.js";
const option = process.argv.indexOf("--connection");
const connection = option >= 0 ? process.argv[option + 1] : process.env.CUIGENGJI_MCP_CONNECTION;
if (process.argv.includes("--help")) {
  process.stderr.write("\u50AC\u66F4\u59EC\u5916\u90E8 MCP\n\u7528\u6CD5\uFF1Acuigengji-mcp --connection <\u8FDE\u63A5\u914D\u7F6E\u6587\u4EF6>\n\u4E5F\u53EF\u8BBE\u7F6E CUIGENGJI_MCP_CONNECTION\u3002\u4F7F\u7528 MCP \u8FDE\u63A5\u7BA1\u7406\u63D0\u4F9B\u7684\u8FDE\u63A5\u6587\u4EF6\u3002\n");
  process.exit(0);
}
if (!connection) throw new Error("\u8BF7\u63D0\u4F9B --connection <\u6587\u4EF6> \u6216 CUIGENGJI_MCP_CONNECTION");
const { request } = openReaderConnection(resolve(connection));
const nameFor = (action) => "cuigengji_" + action.replaceAll(".", "_");
const server = new Server({ name: "cuigengji-reader", version: "1.0.0" }, { capabilities: { tools: { listChanged: true } } });
let defaultReader;
const clientName = () => {
  const value = server.getClientVersion();
  return [value?.name, value?.version].filter(Boolean).join(" ") || "MCP client";
};
async function readerId(signal) {
  if (!defaultReader) defaultReader = request("/reader/open", { client: clientName(), label: "\u9ED8\u8BA4\u9605\u8BFB\u4F1A\u8BDD" }, signal).then((value) => value.readerSessionId).catch((error) => {
    defaultReader = void 0;
    throw error;
  });
  return defaultReader;
}
function queryTool(capability, modules, extra) {
  const input = queryInputSchema(capability, modules);
  return { name: nameFor(capability.id), description: capability.description, inputSchema: {
    ...input,
    properties: { ...input.properties, ...extra }
  }, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } };
}
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const profile = await request("/capabilities");
  const sessionProperty = { type: "string", description: "\u53EF\u9009\uFF1Areader.open \u8FD4\u56DE\u7684\u9605\u8BFB\u4F1A\u8BDD ID\uFF1B\u5BA2\u6237\u7AEF\u5171\u4EAB MCP \u8FDB\u7A0B\u65F6\uFF0C\u4E0D\u540C\u5199\u4F5C\u4EFB\u52A1\u5404\u81EA\u4F7F\u7528\u72EC\u7ACB\u4F1A\u8BDD\u3002\u7701\u7565\u6CBF\u7528\u672C\u8FDE\u63A5\u7684\u9ED8\u8BA4\u9605\u8BFB\u4F1A\u8BDD\u3002" };
  return { tools: [
    { name: "cuigengji_reader_open", description: "\u521B\u5EFA\u72EC\u7ACB\u7684\u5916\u90E8\u4F1A\u8BDD\uFF0C\u8FD4\u56DE readerSessionId\uFF1B\u4E0D\u4F1A\u7ED1\u5B9A\u6216\u6539\u52A8 DSH \u4F1A\u8BDD\u3002\u65B0\u4EFB\u52A1\u7528\u5B83\u53D6\u5F97\u65B0\u7684\u9884\u8BBE\u5FEB\u7167\u3002", inputSchema: { type: "object", additionalProperties: false, properties: { label: { type: "string", maxLength: 100 } } }, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false } },
    { name: "cuigengji_reader_status", description: "\u67E5\u770B\u672C\u9605\u8BFB\u4F1A\u8BDD\u548C\u5DF2\u91C7\u7528\u7684\u9884\u8BBE\u7248\u672C\uFF0C\u4E0D\u8FD4\u56DE\u51ED\u636E\u3002", inputSchema: { type: "object", additionalProperties: false, properties: { readerSessionId: sessionProperty } }, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true } },
    ...QUERY_CAPABILITIES.filter((capability) => profile.modules.length && queryAllowed(capability, profile.modules)).map((capability) => queryTool(capability, profile.modules, { readerSessionId: sessionProperty })),
    ...grantWrites.filter((command) => profile.writableModules?.includes(command.module)).map((command) => {
      const { $schema, ...inputSchema } = z.toJSONSchema(command.input.extend({ readerSessionId: z.string().optional() }));
      return { name: nameFor(command.action), description: command.description, inputSchema, annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false } };
    })
  ] };
});
server.setRequestHandler(CallToolRequestSchema, async (requestMessage, extra) => {
  try {
    const input = requestMessage.params.arguments ?? {};
    if (!input || typeof input !== "object" || Array.isArray(input)) fail("INVALID_INPUT", "\u5DE5\u5177\u53C2\u6570\u987B\u4E3A\u5BF9\u8C61");
    const tool = requestMessage.params.name;
    const { readerSessionId, ...args } = input;
    let value;
    if (requestMessage.params.name === "cuigengji_reader_open") {
      if (Object.keys(args).some((key) => key !== "label") || args.label !== void 0 && (typeof args.label !== "string" || args.label.length > 100)) fail("INVALID_INPUT", "\u8BF7\u53EA\u63D0\u4F9B\u53EF\u9009\u7684\u4EFB\u52A1 label");
      value = await request("/reader/open", { client: clientName(), label: args.label }, extra.signal);
    } else {
      const id = readerSessionId || await readerId(extra.signal);
      if (requestMessage.params.name === "cuigengji_reader_status") {
        if (Object.keys(args).length) fail("INVALID_INPUT", "\u72B6\u6001\u67E5\u8BE2\u53EA\u63A5\u53D7 readerSessionId");
        value = await request("/reader/status", { readerSessionId: id }, extra.signal);
      } else {
        const capability = QUERY_CAPABILITIES.find((capability2) => nameFor(capability2.id) === requestMessage.params.name);
        const command = grantWrites.find((c) => nameFor(c.action) === tool);
        if (!capability && !command) fail("READ_ONLY", "\u8FD9\u4E2A\u8FDE\u63A5\u672A\u5F00\u653E\u8BE5\u5DE5\u5177");
        value = await request(command ? "/write" : "/query", { readerSessionId: id, action: command?.action ?? capability?.id, args }, extra.signal);
      }
    }
    return { content: [{ type: "text", text: JSON.stringify(value) }] };
  } catch (error) {
    const diagnostic = errorInfo(error);
    return { isError: true, content: [{ type: "text", text: diagnostic.message }], structuredContent: { error: diagnostic } };
  }
});
await server.connect(new StdioServerTransport());
try {
  const file = resolve(connection);
  let timer;
  const watcher = watch(dirname(file), { persistent: false }, (_, name) => {
    if (name && String(name) !== basename(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => void server.sendToolListChanged().catch(() => {
    }), 80);
  });
  watcher.on("error", () => watcher.close());
  server.onclose = () => {
    clearTimeout(timer);
    watcher.close();
  };
} catch {
}
