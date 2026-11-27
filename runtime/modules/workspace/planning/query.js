import { planningAction } from "./rules/index.js";
import { checkReadRevision, current } from "../queries/common.js";
function planningQuery(novel, action, args) {
  const projection = structuredClone(novel);
  const result = planningAction(projection, action, args, { kind: "external-agent" });
  if (action === "planning.get") {
    current(projection.planning.nodes, args.nodeId, "\u89C4\u5212");
    checkReadRevision(result.node, args);
    const parent = result.node.parentId ? projection.planning.nodes[result.node.parentId] : null;
    return { ...result, parent: parent ? Object.fromEntries(["id", "title", "summary", "revision", "status"].map((key) => [key, parent[key]])) : null };
  }
  if (action === "planning.pages" && args.query) return result.filter((page) => `${page.name}
${page.summary}`.toLowerCase().includes(args.query.toLowerCase()));
  return result;
}
export {
  planningQuery
};
