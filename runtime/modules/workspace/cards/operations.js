import { defineOperations, read, write } from "../../../platform/tools/definition.js";
const imageOperations = defineOperations("assets", [
  read("image.list"),
  read("image.read"),
  write("image.import"),
  write("image.update"),
  write("image.delete")
], "cuigengji_memory");
export {
  imageOperations
};
