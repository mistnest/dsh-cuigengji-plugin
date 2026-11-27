import { ensurePlanning, planningAction } from "./rules/index.js";
import { layoutPlanning } from "../cards/layout.js";
import { authorizeDirectoryMove, moveDirectory } from "../cards/directory-move.js";
import { clone, fail, touch } from "../operations/records.js";
function runPlanningAction(n, action, a, actor) {
  if (action === "planning.directory.move") {
    authorizeDirectoryMove(actor);
    const board = ensurePlanning(n);
    const pageId = a.pageId ?? null;
    if (pageId && (!board.pages?.[pageId] || board.pages[pageId].deleted)) {
      fail("NOT_FOUND", "\u89C4\u5212\u9875\u9762\u4E0D\u5B58\u5728");
    }
    return moveDirectory(
      n,
      "planning",
      {
        items: board.nodes,
        groups: board.groups ?? {},
        moveMember: (node, value) => planningAction(
          n,
          "planning.apply",
          {
            requestId: a.requestId,
            reason: "\u4ECE\u76EE\u5F55\u8C03\u6574\u60C5\u8282\u5F52\u5C5E",
            operations: [{ op: "node.update", id: node.id, expectedRevision: node.revision, value }]
          },
          actor
        )
      },
      a
    );
  }
  if (action === "planning.layout.get") return layoutPlanning(n, a, actor, true);
  const previous = n.planning?.sequence;
  if (action === "planning.layout") {
    return layoutPlanning(n, a, actor).then((result2) => {
      if (previous !== n.planning?.sequence) touch(n);
      return result2;
    });
  }
  const result = planningAction(n, action, a, actor);
  if (action === "planning.apply" && a.imageCopies !== void 0) {
    if (actor.kind !== "human" || !Array.isArray(a.imageCopies) || a.imageCopies.length > 200 || a.imageCopies.some(
      (item) => !item || typeof item.sourceId !== "string" || typeof item.targetRef !== "string"
    )) {
      fail("INVALID_INPUT", "\u914D\u56FE\u590D\u5236\u53C2\u6570\u65E0\u6548");
    }
    for (const { sourceId, targetRef } of a.imageCopies) {
      const targetId = result.mapping?.[targetRef];
      const gallery = n.cardImages?.["planning:" + sourceId];
      if (!targetId || !n.planning?.nodes[targetId]) fail("INVALID_INPUT", "\u914D\u56FE\u53EA\u53EF\u590D\u5236\u5230\u672C\u6B21\u65B0\u5EFA\u7684\u5361\u7247");
      if (gallery) n.cardImages["planning:" + targetId] = clone(gallery);
    }
  }
  if (previous !== n.planning?.sequence) touch(n);
  return result;
}
export {
  runPlanningAction
};
