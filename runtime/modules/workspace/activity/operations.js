import { defineOperations, read } from "../../../platform/tools/definition.js";
const activityOperations = defineOperations("activity", [
  read("activity.today"),
  read("activity.stats")
]);
export {
  activityOperations
};
