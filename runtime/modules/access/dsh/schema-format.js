function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function jsonSchema(value) {
  if (Array.isArray(value)) return value.map(jsonSchema);
  if (!object(value)) return value;
  if (value.type === "json") return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSchema(item)]));
}
function nativeValueSchema(value) {
  if (Array.isArray(value)) return value.map(nativeValueSchema);
  if (!object(value)) return value;
  const result = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "required" && !(typeof value.type === "string" && ["minItems", "maxItems", "minimum", "maximum"].includes(key))).map(([key, item]) => [key, nativeValueSchema(item)]));
  if (Array.isArray(value.required) && object(result.properties)) {
    for (const key of value.required) {
      const property = typeof key === "string" && result.properties[key];
      if (property && object(property)) property.required = true;
    }
  }
  return result;
}
export {
  jsonSchema,
  nativeValueSchema
};
