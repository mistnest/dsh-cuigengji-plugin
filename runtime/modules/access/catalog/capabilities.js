import { OPERATIONS } from "./operations.js";
import { grantWrites } from "../../collaboration/grants/writes.js";
const ACTION_CAPABILITIES = Object.freeze(
  OPERATIONS.map(({ query, ...operation }) => ({ ...operation, external: operation.effect === "read" ? Boolean(query) : grantWrites.some((command) => command.action === operation.id) }))
);
const byId = new Map(ACTION_CAPABILITIES.map((operation) => [operation.id, operation]));
const actionCapability = (id) => byId.get(id);
export {
  ACTION_CAPABILITIES,
  actionCapability
};
