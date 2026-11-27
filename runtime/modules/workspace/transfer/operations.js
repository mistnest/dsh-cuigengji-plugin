import { defineOperations, write } from "../../../platform/tools/definition.js";
const transferOperations = defineOperations("transfer", [
  write("transfer.catalog"),
  write("transfer.inspect"),
  write("transfer.preview"),
  write("transfer.import"),
  write("transfer.exportPreview"),
  write("transfer.export")
]);
export {
  transferOperations
};
