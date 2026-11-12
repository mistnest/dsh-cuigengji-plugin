const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const fail = (message) => {
  throw Object.assign(new Error(message), { code: "INVALID_PRESET" });
};
function presetBlockReason(block) {
  return block.marker && !block.content?.trim() ? "\u52A8\u6001\u5360\u4F4D\u6761\u76EE\u6CA1\u6709\u63D0\u793A\u8BCD\u6B63\u6587\uFF0C\u5185\u5BB9\u7531\u50AC\u66F4\u59EC\u6309\u81EA\u5DF1\u7684\u65B9\u5F0F\u8BFB\u53D6" : "";
}
function presetBlockNotice(block) {
  if (presetBlockReason(block)) return presetBlockReason(block);
  return /\{\{|\}\}/.test(block.content) ? "\u539F\u6587\u4FDD\u7559\u3002\u6B64\u4F5C\u54C1\u542F\u7528\u5267\u60C5\u53D8\u91CF\u540E\uFF0C\u53EF\u66FF\u6362\u5E38\u89C1\u53D6\u503C\u5B8F\uFF1B\u5199\u5165\u5B8F\u3001JS/EJS \u4E0E\u6269\u5C55\u811A\u672C\u4E0D\u4F1A\u5728\u8BFB\u53D6\u65F6\u6267\u884C\u3002" : "";
}
function source(input) {
  if (!object(input) || JSON.stringify(input).length > 2e6) fail("\u9884\u8BBE\u5FC5\u987B\u662F\u5C0F\u4E8E 2 MB \u7684 JSON \u5BF9\u8C61");
  if (Array.isArray(input.prompts)) return { data: input, format: "chat-completion" };
  if (object(input.data) && Array.isArray(input.data.prompts)) return { data: input.data, format: "prompt-manager" };
  if (typeof input.content === "string" || typeof input.system_prompt === "string") {
    const fields = [["content", "\u4E3B\u8981\u63D0\u793A\u8BCD"], ["system_prompt", "\u7CFB\u7EDF\u63D0\u793A\u8BCD"], ["post_history", "\u8865\u5145\u8981\u6C42"], ["post_history_instructions", "\u8865\u5145\u6307\u4EE4"]];
    for (const [key] of fields) if (input[key] !== void 0 && typeof input[key] !== "string") fail(`${key} \u5FC5\u987B\u662F\u6587\u672C`);
    const prompts = fields.filter(([key]) => typeof input[key] === "string").map(([key, name]) => ({ identifier: key, name, content: input[key], enabled: true }));
    return { data: { prompts }, format: "system-prompt" };
  }
  if ("story_string" in input || "input_sequence" in input || "output_sequence" in input) fail("\u8FD9\u662F\u4E0A\u4E0B\u6587\u88C5\u586B\u6216 Instruct \u5206\u9694\u6A21\u677F\uFF0C\u6CA1\u6709\u72EC\u7ACB\u63D0\u793A\u8BCD\u6B63\u6587\u3002\u8BF7\u9009\u62E9\u5B8C\u6574 Chat Completion \u9884\u8BBE\u3001\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u5BFC\u51FA\u6216\u7CFB\u7EDF\u63D0\u793A\u8BCD\u6587\u4EF6\u3002");
  fail("\u672A\u627E\u5230\u63D0\u793A\u8BCD\u5185\u5BB9\u3002\u652F\u6301\u542B prompts \u7684\u5B8C\u6574\u9884\u8BBE\u3001\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u5BFC\u51FA\uFF0C\u4EE5\u53CA\u542B content \u7684\u7CFB\u7EDF\u63D0\u793A\u8BCD JSON\uFF1B\u4EC5\u91C7\u6837\u53C2\u6570\u7684\u6587\u4EF6\u4E0D\u5305\u542B\u63D0\u793A\u8BCD\u3002");
}
function presetImportOrders(input) {
  const { data } = source(input), orders = data.prompt_order;
  if (orders === void 0 || orders === null) return [];
  if (!Array.isArray(orders)) fail("prompt_order \u5FC5\u987B\u662F\u6570\u7EC4");
  if (!orders.length) return [];
  if (orders.every((v) => object(v) && typeof v.identifier === "string")) return [{ character_id: "flat", order: orders }];
  if (!orders.every((v) => object(v) && v.character_id !== void 0 && Array.isArray(v.order))) fail("\u63D0\u793A\u8BCD\u6392\u5217\u7ED3\u6784\u65E0\u6548");
  if (new Set(orders.map((v) => String(v.character_id))).size !== orders.length) fail("\u63D0\u793A\u8BCD\u6392\u5217\u65B9\u6848\u6807\u8BC6\u91CD\u590D");
  return orders;
}
function importPreset(input, orderId) {
  const { data, format } = source(input);
  if (data.prompts.length > 500) fail("\u6700\u591A\u652F\u6301 500 \u4E2A\u63D0\u793A\u8BCD\u6761\u76EE");
  const orders = presetImportOrders(input);
  const order = orderId !== void 0 ? orders.find((v) => String(v.character_id) === String(orderId)) : orders.find((v) => String(v.character_id) === "100001") || (orders.length === 1 ? orders[0] : null);
  if (orders.length && !order) fail("\u5B58\u5728\u591A\u4E2A\u63D0\u793A\u8BCD\u6392\u5217\uFF0C\u8BF7\u5148\u9009\u62E9\u6392\u5217\u65B9\u6848");
  const map = /* @__PURE__ */ new Map();
  for (const p of data.prompts) {
    if (!object(p) || typeof p.identifier !== "string" || !p.identifier || map.has(p.identifier)) fail("\u6761\u76EE\u6807\u8BC6\u7F3A\u5931\u6216\u91CD\u590D");
    if (p.content !== void 0 && typeof p.content !== "string") fail("\u63D0\u793A\u8BCD content \u5FC5\u987B\u662F\u6587\u672C");
    if (p.enabled !== void 0 && typeof p.enabled !== "boolean") fail("\u63D0\u793A\u8BCD enabled \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
    map.set(p.identifier, p);
  }
  const seen = /* @__PURE__ */ new Set();
  const blocks = [], missing = [];
  function add(p, enabled) {
    if (seen.has(p.identifier)) return;
    seen.add(p.identifier);
    const block = {
      identifier: p.identifier,
      name: typeof p.name === "string" ? p.name : p.identifier,
      content: p.content || "",
      role: p.role || "system",
      marker: p.marker === true,
      injection_position: p.injection_position ?? 0,
      injection_trigger: p.injection_trigger ?? [],
      enabled: enabled === true
    };
    const reason = presetBlockReason(block);
    blocks.push({ ...block, enabled: enabled === true && !reason, importWarning: presetBlockNotice(block) });
  }
  if (order) for (const item of order.order) {
    if (!object(item) || typeof item.identifier !== "string" || item.enabled !== void 0 && typeof item.enabled !== "boolean") fail("\u63D0\u793A\u8BCD\u6392\u5217\u6761\u76EE\u65E0\u6548");
    if (!map.has(item.identifier)) {
      if (format === "prompt-manager") {
        missing.push(item.identifier);
        continue;
      }
      fail(`\u6392\u5217\u5F15\u7528\u4E86\u4E0D\u5B58\u5728\u7684\u6761\u76EE\uFF1A${item.identifier}`);
    }
    add(map.get(item.identifier), item.enabled ?? map.get(item.identifier).enabled ?? true);
  }
  for (const p of data.prompts) add(p, order ? false : p.enabled !== false);
  const warnings = ["\u5BFC\u5165\u540E\u6574\u4F53\u505C\u7528\uFF0C\u6838\u5BF9\u540E\u542F\u7528\u5E76\u4FDD\u5B58\u3002\u542F\u7528\u6761\u76EE\u7684\u6B63\u6587\u6309\u5F53\u524D\u5217\u8868\u987A\u5E8F\u52A0\u5165\u5199\u4F5C\u8981\u6C42\u3002", "\u4EC5\u4F7F\u7528\u63D0\u793A\u8BCD\u5185\u5BB9\uFF1B\u9152\u9986\u6D88\u606F\u89D2\u8272\u3001\u89E6\u53D1\u3001\u63D2\u5165\u6DF1\u5EA6\u53CA\u88C5\u586B\u89C4\u5219\u4E0D\u6267\u884C\u3002\u6A21\u578B\u548C\u91C7\u6837\u53C2\u6570\u7531 DSH \u7BA1\u7406\uFF0C\u539F\u59CB\u6587\u4EF6\u968F\u5907\u4EFD\u4FDD\u7559\u3002"];
  if (blocks.some((b) => /\{\{|\}\}/.test(b.content))) warnings.push("\u5B8F\u4E0E\u5360\u4F4D\u7B26\u6309\u539F\u6587\u4FDD\u7559\u3002\u6B64\u4F5C\u54C1\u542F\u7528\u5267\u60C5\u53D8\u91CF\u540E\u53EF\u8BFB\u53D6\u5E38\u89C1\u53D6\u503C\u5B8F\uFF1B\u672A\u542F\u7528\u65F6\u4FDD\u6301\u539F\u6587\uFF0C\u5199\u5165\u5B8F\u548C JS/EJS \u4E0D\u4F1A\u81EA\u52A8\u6267\u884C\u3002");
  if (missing.length) warnings.push(`\u6392\u5217\u4E2D\u6709 ${missing.length} \u9879\u672A\u968F\u6587\u4EF6\u5BFC\u51FA\uFF0C\u5DF2\u8DF3\u8FC7\u8FD9\u4E9B\u5F15\u7528\uFF1B\u672A\u7F16\u9020\u5176\u63D0\u793A\u8BCD\u5185\u5BB9\u3002`);
  const result = { name: typeof input.name === "string" && input.name.trim() ? input.name : typeof data.name === "string" && data.name.trim() ? data.name : "\u5BFC\u5165\u7684\u5199\u4F5C\u9884\u8BBE", enabled: false, blocks, raw: input, importFormat: format, warnings };
  validatePreset(result);
  return result;
}
function validatePreset(value) {
  if (JSON.stringify(value)?.length > 2e6) fail("\u9884\u8BBE\u603B\u5927\u5C0F\u8D85\u8FC7 2 MB");
  if (!object(value) || typeof value.name !== "string" || !value.name.trim() || typeof value.enabled !== "boolean" || !Array.isArray(value.blocks) || value.blocks.length > 500) fail("\u9884\u8BBE\u683C\u5F0F\u65E0\u6548");
  if (value.importFormat !== void 0 && !["chat-completion", "prompt-manager", "system-prompt"].includes(value.importFormat)) fail("\u9884\u8BBE\u5BFC\u5165\u683C\u5F0F\u6807\u8BC6\u65E0\u6548");
  const ids = /* @__PURE__ */ new Set();
  let length = 0;
  for (const block of value.blocks) {
    if (!object(block) || typeof block.identifier !== "string" || ids.has(block.identifier) || typeof block.content !== "string" || typeof block.name !== "string" || typeof block.enabled !== "boolean") fail("\u9884\u8BBE\u6761\u76EE\u65E0\u6548\u6216\u6807\u8BC6\u91CD\u590D");
    ids.add(block.identifier);
    length += block.content.length;
  }
  if (length > 1e5) fail("\u63D0\u793A\u8BCD\u603B\u957F\u5EA6\u4E0D\u80FD\u8D85\u8FC7 100000 \u5B57\u7B26");
  return value;
}
function compilePreset(preset) {
  if (!preset?.enabled) return "";
  validatePreset(preset);
  return preset.blocks.filter((block) => block.enabled && block.content.trim()).map((block) => block.content).join("\n\n");
}
export {
  compilePreset,
  importPreset,
  presetBlockNotice,
  presetBlockReason,
  presetImportOrders,
  validatePreset
};
