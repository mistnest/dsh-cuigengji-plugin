import { createHash, randomUUID } from "node:crypto";
import { fail } from "../../../platform/errors.js";
import { StoreError, fail as fail2 } from "../../../platform/errors.js";
const clone = (value) => structuredClone(value);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const now = () => (/* @__PURE__ */ new Date()).toISOString();
const source = (actor) => ({ kind: actor.kind === "human" ? "human" : "agent", sessionId: actor.sessionId || null });
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const get = (object, key, label) => own(object, key) ? object[key] : fail("NOT_FOUND", `${label}\u4E0D\u5B58\u5728\uFF1A${key}`);
function text(value, name, allowEmpty = false) {
  if (typeof value !== "string" || !allowEmpty && !value.trim()) fail("INVALID_INPUT", `${name}\u5FC5\u987B\u662F${allowEmpty ? "" : "\u975E\u7A7A"}\u6587\u672C`);
  return value;
}
function cas(entity, args) {
  if (!Number.isSafeInteger(args.expectedRevision)) fail("REVISION_REQUIRED", "\u4FEE\u6539\u524D\u8BF7\u8BFB\u53D6\u5BF9\u8C61\u5E76\u63D0\u4F9B expectedRevision");
  if (entity.revision !== args.expectedRevision) fail("CONFLICT", `\u7248\u672C\u5DF2\u53D8\u5316\uFF0C\u5F53\u524D\u7248\u672C ${entity.revision}`);
  if (args.expectedHash !== void 0 && args.expectedHash !== entity.contentHash) fail("CONFLICT", "\u6B63\u6587\u5185\u5BB9\u54C8\u5E0C\u5DF2\u53D8\u5316");
}
function touch(entity) {
  entity.revision++;
  entity.updatedAt = now();
}
function record(fields) {
  return { id: randomUUID(), revision: 1, createdAt: now(), updatedAt: now(), ...fields };
}
export {
  StoreError,
  cas,
  clone,
  fail2 as fail,
  get,
  hash,
  now,
  own,
  record,
  source,
  text,
  touch
};
