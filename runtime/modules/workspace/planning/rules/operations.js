import { PLANNING_OPERATIONS } from "../types.js";
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const supported = new Set(PLANNING_OPERATIONS);
const fail = (index, message) => {
  throw Object.assign(new Error(`operations[${index}]\uFF1A${message}`), { code: "INVALID_INPUT" });
};
function normalizePlanningOperations(input) {
  if (!Array.isArray(input) || !input.length || input.length > 200) {
    throw Object.assign(new Error("\u8BF7\u63D0\u4F9B 1\u2013200 \u4E2A\u89C4\u5212\u64CD\u4F5C\uFF1Aoperations:[{op,id,expectedRevision,value}]"), { code: "INVALID_INPUT" });
  }
  return input.map((raw, index) => {
    if (!record(raw)) return fail(index, '\u64CD\u4F5C\u5FC5\u987B\u662F\u5BF9\u8C61\uFF0C\u5982 {op:"node.update",id,expectedRevision,value}');
    if (raw.op !== void 0 && raw.action !== void 0 && raw.op !== raw.action) fail(index, "op \u4E0E action \u4E0D\u4E00\u81F4\uFF0C\u8BF7\u660E\u786E\u8981\u6267\u884C\u7684\u64CD\u4F5C");
    const name = raw.op ?? raw.action;
    if (typeof name !== "string" || !supported.has(name)) return fail(index, "\u8BF7\u7528 op \u6307\u5B9A\u64CD\u4F5C\uFF0C\u5982 node.create\u3001node.update \u6216 edge.create");
    const op = { ...raw, op: name };
    delete op.action;
    const updating = name.endsWith(".update"), deleting = name.endsWith(".delete");
    if ((updating || !deleting && name !== "node.create") && !record(raw.value)) fail(index, "value \u5FC5\u987B\u662F\u5BF9\u8C61\uFF0C\u53EA\u653E\u5F85\u4FDD\u5B58\u7684\u5B57\u6BB5");
    if (raw.value !== void 0 && !record(raw.value)) fail(index, "value \u5FC5\u987B\u662F\u5BF9\u8C61");
    if (record(raw.value)) op.value = { ...raw.value };
    if (updating || deleting) {
      const value = record(op.value) ? op.value : {};
      const select = (field, candidates) => {
        const present = candidates.filter((item) => item !== void 0);
        if (present.some((item) => item !== present[0])) fail(index, `${field} \u51FA\u73B0\u4E0D\u540C\u7684\u503C\uFF0C\u8BF7\u4FDD\u7559\u552F\u4E00\u503C\u5E76\u653E\u5728\u4E0E op \u540C\u4E00\u5C42`);
        return present[0];
      };
      op.id = select("id", [raw.id, name.startsWith("node.") ? raw.nodeId : void 0, value.id]);
      op.expectedRevision = select("expectedRevision", [raw.expectedRevision, value.expectedRevision]);
      if (typeof op.id !== "string" || !op.id.trim()) fail(index, "\u7F3A\u5C11 id\u3002apply \u64CD\u4F5C\u7528 id\uFF1Bplanning.get/continue \u624D\u7528 nodeId\u3002id \u4E0E op \u540C\u5C42");
      if (!Number.isSafeInteger(op.expectedRevision) || typeof op.expectedRevision !== "number" || op.expectedRevision < 0) fail(index, "\u7F3A\u5C11\u6709\u6548 expectedRevision\uFF0C\u8BF7\u5148\u8BFB\u53D6\u5BF9\u8C61\u7248\u672C\uFF1B\u5B83\u4E0E op \u540C\u5C42\uFF0C\u4E0D\u653E\u5728 value \u5185");
      delete op.nodeId;
      delete value.id;
      delete value.expectedRevision;
    }
    if (op.ref !== void 0 && (typeof op.ref !== "string" || !op.ref.trim())) fail(index, "ref \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\uFF0C\u540E\u7EED\u64CD\u4F5C\u76F4\u63A5\u5F15\u7528\uFF0C\u4E0D\u52A0 $");
    if (name === "edge.create") {
      const value = op.value;
      if (typeof value.from !== "string" || !value.from.trim() || typeof value.to !== "string" || !value.to.trim()) fail(index, "edge.create \u9700\u8981 value:{from,to}\uFF0C\u7AEF\u70B9\u4F7F\u7528\u771F\u5B9E ID \u6216\u672C\u6B21\u5DF2\u521B\u5EFA\u7684 ref");
    }
    return op;
  });
}
export {
  normalizePlanningOperations
};
