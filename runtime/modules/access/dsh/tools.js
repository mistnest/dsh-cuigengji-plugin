import { randomUUID } from "node:crypto";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { TOOL_ACTIONS, isReadAction } from "../catalog/actions.js";
import { prepareImageToolResult, renderImageToolResult } from "./image-schema.js";
import { projectArgsSchema, projectToolDescription } from "./project-schema.js";
import { memoryDshArgsSchema, memoryToolDescription } from "./memory-schema.js";
import { planningArgsSchema, planningToolDescription } from "./planning-schema.js";
import { presetArgsSchema, presetToolDescription } from "./preset-schema.js";
import { variablesArgsSchema, variablesToolDescription } from "./variables-schema.js";
import { connectionsArgs, connectionsDescription } from "./connections.js";
const toolDefinitions = {
  cuigengji_connections: { description: connectionsDescription, args: connectionsArgs },
  cuigengji_project: { description: projectToolDescription, args: projectArgsSchema() },
  cuigengji_memory: { description: memoryToolDescription, args: memoryDshArgsSchema },
  cuigengji_plan: { description: planningToolDescription, args: planningArgsSchema },
  cuigengji_context: { description: presetToolDescription, args: presetArgsSchema },
  cuigengji_variables: { description: variablesToolDescription, args: variablesArgsSchema }
};
function registerTools(ctx, { libraries, dispatch, guidanceDispatch, maintenance }) {
  for (const [toolName, actions] of Object.entries(TOOL_ACTIONS)) {
    const definition = toolDefinitions[toolName];
    ctx.tools.register(defineTool({
      name: toolName,
      description: definition.description,
      parameters: { action: { type: "string", enum: [...actions], required: true }, args: definition.args },
      output: { schema: { type: "string" }, render: (_args, value) => renderImageToolResult(value) },
      execute: async ({ action, args }, exec) => libraries.use(async () => {
        if (!exec.agent?.id) throw new Error("\u5C0F\u8BF4\u5DE5\u5177\u9700\u8981 DSH \u4F1A\u8BDD");
        exec.signal?.throwIfAborted();
        const actor = { kind: "agent", sessionId: String(exec.agent.id) };
        const input = { ...args || {} };
        delete input.sessionId;
        delete input.actor;
        if (!isReadAction(action)) input.requestId ??= exec.callId == null ? randomUUID() : String(exec.callId);
        const result = await dispatch(action, input, actor);
        return JSON.stringify(await prepareImageToolResult(ctx, result));
      })
    }));
  }
  ctx.tools.register(defineTool({
    name: "cuigengji_guidance",
    description: "\u6309\u9700\u8BFB\u53D6\u50AC\u66F4\u59EC\u5199\u4F5C\u6307\u5F15\uFF0C\u4F7F\u7528 {section,args?}\uFF0C\u4E0E\u5185\u5BB9\u5DE5\u5177\u7684 {action,args} \u4E0D\u540C\u3002\u5173\u95ED\u6301\u7EED\u6307\u5F15\u540E\u4ECD\u53EF\u7528\uFF1Acore \u662F\u57FA\u7840\u89C4\u5219\uFF0Cproject/write/plan/memory/revise \u662F\u5BF9\u5E94\u89C4\u8303\uFF0Cvariables \u662F\u53EF\u9009\u5267\u60C5\u53D8\u91CF\u89C4\u8303\uFF0Cpreset \u662F\u5F53\u524D\u4F5C\u54C1\u9884\u8BBE\uFF0Call \u8FD4\u56DE\u5168\u90E8\u89C4\u5219\u4E0E\u9884\u8BBE\u3002\u672A\u9009\u4F5C\u54C1\u4ECD\u8FD4\u56DE\u57FA\u7840\u89C4\u5219\uFF0C\u5E76\u6CE8\u660E\u9884\u8BBE\u4E0D\u53EF\u7528\uFF1B\u53C2\u8003\u6587\u4EF6\u76F8\u5BF9\u8FD4\u56DE\u7684 resourceBase \u8BFB\u53D6\u3002",
    parameters: {
      section: { type: "string", enum: ["core", "project", "write", "plan", "memory", "revise", "variables", "preset", "all"], required: true },
      args: { type: "object", additionalProperties: true, description: "\u53EF\u9009 novelId\uFF1B\u4E0D\u4F20\u5219\u4F7F\u7528\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1\u3002" }
    },
    output: { schema: { type: "string" }, render: (_args, value) => [{ type: "text", text: value }] },
    execute: async ({ section, args }, exec) => libraries.use(async () => {
      exec.signal?.throwIfAborted();
      if (!exec.agent?.id) throw new Error("\u5199\u4F5C\u6307\u5F15\u9700\u8981 DSH \u4F1A\u8BDD");
      const result = await guidanceDispatch("guidance.read", { ...args || {}, section }, { kind: "agent", sessionId: String(exec.agent.id) });
      return JSON.stringify(result);
    })
  }));
  ctx.tools.register(defineTool({
    name: "cuigengji_maintenance",
    description: "\u67E5\u8BE2\u50AC\u66F4\u59EC\u63D2\u4EF6\u5347\u7EA7\u3001\u6570\u636E\u8FC1\u79FB\u548C\u5B8C\u6574\u6027\u6821\u9A8C\u7ED3\u679C\u3002\u8FD9\u4E2A\u5DE5\u5177\u4E0D\u8981\u6C42\u7ED1\u5B9A\u5C0F\u8BF4\uFF1B\u66F4\u65B0\u540E\u5148\u8C03\u7528 status\uFF0C\u518D\u7528 verify \u6838\u5BF9\u5B9E\u9645\u52A0\u8F7D\u7248\u672C\u3001\u6570\u636E\u76EE\u5F55\u548C\u8BB0\u5F55\u6570\u91CF\u3002\u8FC1\u79FB\u7531\u63D2\u4EF6\u542F\u52A8\u9636\u6BB5\u81EA\u52A8\u5B8C\u6210\uFF0CAgent \u4E0D\u5E94\u76F4\u63A5\u6539\u5C0F\u8BF4\u6587\u4EF6\u3002",
    parameters: {
      action: { type: "string", enum: ["status", "verify"], required: true },
      args: { type: "object", additionalProperties: true, description: "verify \u53EF\u9009 expectedVersion\u3001expectedDataRoot\u3001expectedNovelIds\uFF08\u539F\u4F5C\u54C1ID\u6570\u7EC4\uFF09\u3002" }
    },
    output: { schema: { type: "string" }, render: (_args, value) => [{ type: "text", text: value }] },
    execute: async ({ action, args }, exec) => libraries.use(async () => {
      exec.signal?.throwIfAborted();
      if (!["status", "verify"].includes(action)) throw new Error("\u65E0\u6548\u7684\u7EF4\u62A4\u64CD\u4F5C");
      const result = action === "status" ? await maintenance.status() : await maintenance.verify(args || {});
      return JSON.stringify(result);
    })
  }));
}
export {
  registerTools
};
