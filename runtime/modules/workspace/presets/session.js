import { compilePreset } from "./index.js";
import { variableAction } from "../variables/index.js";
async function readSessionPreset(novel, args, actor, chapterId, { loadSnapshot, saveSnapshot }) {
  const sessionId = actor.kind === "agent" ? actor.sessionId : void 0;
  const { preset, snapshot, capturePath } = await loadSnapshot(novel.id, sessionId);
  const effective = snapshot ?? {
    enabled: Boolean(preset?.enabled),
    name: preset?.name || "",
    revision: preset?.revision || 0,
    content: compilePreset(preset)
  };
  const rendered = novel.variables?.enabled ? variableAction(novel, "variables.render", {
    text: effective.content,
    ...chapterId ? { chapterId, chapterRevision: args.chapterRevision, position: args.position || "start" } : {}
  }, actor) : null;
  if (capturePath) await saveSnapshot(capturePath, effective);
  return rendered ? {
    ...effective,
    content: rendered.content,
    variableSnapshot: { id: rendered.snapshotId, revision: rendered.revision },
    warnings: rendered.warnings
  } : effective;
}
export {
  readSessionPreset
};
