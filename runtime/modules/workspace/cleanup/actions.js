import { validateSharedPlans } from "../novels/legacy/legacy.js";
import { prepareCleanup, previewCleanup } from "./history.js";
function cleanupAction(state, action, args, validateProject) {
  if (action === "cleanup.preview") return previewCleanup(state, args);
  const { affected, result } = prepareCleanup(state, args);
  for (const id of affected) {
    const novel = state.novels[id];
    if (!novel) continue;
    for (const key of Object.keys(novel.cardImages || {})) {
      const [kind, ...parts] = key.split(":");
      const cards = kind === "memory" ? novel.nodes : novel.planning?.nodes;
      if (!cards?.[parts.join(":")]) delete novel.cardImages[key];
    }
    validateProject(novel);
  }
  if (args.scope === "novel-trash") validateSharedPlans(state);
  return result;
}
export {
  cleanupAction
};
