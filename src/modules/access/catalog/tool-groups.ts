import {OPERATIONS} from './operations.ts';

// These tools have their own adapters and authorization paths.
const standalone = new Set(['cuigengji_guidance','cuigengji_maintenance']);
const combined = new Map<string, string[]>();

for (const {id, dshTool} of OPERATIONS) {
  if (!dshTool || standalone.has(dshTool)) continue;
  if (!combined.has(dshTool)) combined.set(dshTool, []);
  combined.get(dshTool)!.push(id);
}

export const TOOL_ACTIONS = Object.freeze(Object.fromEntries(
  [...combined].map(([tool, ids]) => [tool, Object.freeze(ids)]),
));
export const HUMAN_ACTIONS = Object.freeze(OPERATIONS.filter(operation => operation.panel).map(operation => operation.id));
