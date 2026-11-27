import { z } from "zod";
function read(id, options = {}) {
  return { id, effect: "read", ...options };
}
function write(id, options = {}) {
  return { id, effect: "write", ...options };
}
function readerQuery(id, module, description, shape, { tool, loadAction = id, ...visibility } = {}) {
  return {
    ...read(id, visibility),
    query: { module, tool, description, input: z.object(shape).strict(), loadAction }
  };
}
function defineOperations(module, entries, dshTool) {
  return entries.map(({ tier = "common", panel = true, ...entry }) => ({ ...entry, module, dshTool, tier, panel }));
}
export {
  defineOperations,
  read,
  readerQuery,
  write
};
