import { actionCapability } from "./capabilities.js";
import { TOOL_ACTIONS } from "./tool-groups.js";
import { TOOL_ACTIONS as TOOL_ACTIONS2, HUMAN_ACTIONS } from "./tool-groups.js";
const isReadAction = (action) => actionCapability(action)?.effect === "read";
const changesProse = (action, args) => ["chapter.restore", "chapter.delete", "chapter.replace"].includes(action) || action === "volume.delete" && args.chapterPolicy === "delete" || ["chapter.create", "chapter.update"].includes(action) && ["content", "append", "patch"].some((key) => args[key] !== void 0);
const MEMORY_ACTIONS = Object.freeze([...TOOL_ACTIONS.cuigengji_memory, ...TOOL_ACTIONS.cuigengji_variables, ...TOOL_ACTIONS.cuigengji_context.filter((action) => action.startsWith("preset.") || action.startsWith("creativeMemory.")), "context.get", "context.readMany", "guidance.read"]);
export {
  HUMAN_ACTIONS,
  MEMORY_ACTIONS,
  TOOL_ACTIONS2 as TOOL_ACTIONS,
  changesProse,
  isReadAction
};
