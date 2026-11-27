import { defineOperations, write } from "../../../platform/tools/definition.js";
const petOperations = defineOperations("pet", [
  write("pet.desktop")
]);
export {
  petOperations
};
