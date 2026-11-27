import { defineOperations, read, write } from "../../../platform/tools/definition.js";
const cleanupOperations = defineOperations("cleanup", [
  read("cleanup.preview"),
  write("cleanup.apply")
]);
export {
  cleanupOperations
};
