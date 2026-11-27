import { OPERATIONS } from "./operations.js";
const standalone = /* @__PURE__ */ new Set(["cuigengji_guidance", "cuigengji_maintenance"]);
const combined = /* @__PURE__ */ new Map();
for (const { id, dshTool } of OPERATIONS) {
  if (!dshTool || standalone.has(dshTool)) continue;
  if (!combined.has(dshTool)) combined.set(dshTool, []);
  combined.get(dshTool).push(id);
}
const TOOL_ACTIONS = Object.freeze(Object.fromEntries(
  [...combined].map(([tool, ids]) => [tool, Object.freeze(ids)])
));
const HUMAN_ACTIONS = Object.freeze(OPERATIONS.filter((operation) => operation.panel).map((operation) => operation.id));
export {
  HUMAN_ACTIONS,
  TOOL_ACTIONS
};
