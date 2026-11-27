type Json = undefined | null | string | number | boolean | Json[] | {[key: string]: Json};
function object(value: Json): value is {[key: string]: Json} {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** DSH uses type:json for arbitrary JSON. MCP uses an empty schema. */
export function jsonSchema(value: Json): Json {
  if (Array.isArray(value)) return value.map(jsonSchema);
  if (!object(value)) return value;
  if (value.type === 'json') return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSchema(item)]));
}

export function nativeValueSchema(value: Json): Json {
  if (Array.isArray(value)) return value.map(nativeValueSchema);
  if (!object(value)) return value;
  // The DSH tool DSL rejects JSON Schema bounds. Operation handlers still enforce them.
  const result = Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'required' && !(typeof value.type === 'string' && ['minItems','maxItems','minimum','maximum'].includes(key)))
    .map(([key, item]) => [key, nativeValueSchema(item)]));
  if (Array.isArray(value.required) && object(result.properties)) {
    for (const key of value.required) {
      const property = typeof key === 'string' && result.properties[key];
      if (property && object(property)) property.required = true;
    }
  }
  return result;
}
