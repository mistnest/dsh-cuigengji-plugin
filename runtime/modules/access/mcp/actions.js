import { MEMORY_ACTIONS } from "../catalog/actions.js";
const toolName = (action) => `memory_${action.replaceAll(".", "_")}`;
function assertMemoryAction(action) {
  if (!MEMORY_ACTIONS.includes(action)) throw new Error(`\u4E0D\u5141\u8BB8\u7684\u8BB0\u5FC6\u64CD\u4F5C\uFF1A${action}`);
}
export {
  MEMORY_ACTIONS,
  assertMemoryAction,
  toolName
};
