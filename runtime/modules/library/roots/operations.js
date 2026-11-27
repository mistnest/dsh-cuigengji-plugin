import { defineOperations, read, write } from "../../../platform/tools/definition.js";
const libraryOperations = defineOperations("library", [
  write("library.status"),
  write("library.pick"),
  write("library.inspect"),
  write("library.change"),
  write("library.restoreIndex")
]);
const workspaceDataOperations = defineOperations("workspace", [
  write("workspace.status"),
  write("workspace.export"),
  write("workspace.preview"),
  write("workspace.import")
]);
const maintenanceOperations = defineOperations("maintenance", [
  read("maintenance.status"),
  write("maintenance.verify")
], "cuigengji_maintenance");
export {
  libraryOperations,
  maintenanceOperations,
  workspaceDataOperations
};
