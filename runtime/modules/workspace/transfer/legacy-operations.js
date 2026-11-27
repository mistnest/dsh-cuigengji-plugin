import { defineOperations, write } from "../../../platform/tools/definition.js";
const legacyOperations = defineOperations("legacy", [
  write("legacy.preview")
]);
export {
  legacyOperations
};
