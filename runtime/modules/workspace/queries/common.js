import { chapterCounts } from "../chapters/metadata.js";
const queryFail = (code, message, details = {}) => {
  throw Object.assign(new Error(message), { code, details });
};
function current(map, id, label) {
  const value = Object.hasOwn(map, id) ? map[id] : null;
  if (!value || value.deleted) return queryFail("NOT_FOUND", `${label}\u4E0D\u5B58\u5728\u6216\u5DF2\u5220\u9664`);
  return value;
}
const chapterMetadata = (chapter) => {
  const { content, versions, ...metadata } = chapter;
  return { ...metadata, ...chapterCounts(chapter) };
};
const pagination = (rows, args) => {
  const offset = args.offset ?? 0, limit = args.limit ?? 50;
  return { items: rows.slice(offset, offset + limit), total: rows.length, nextOffset: offset + limit < rows.length ? offset + limit : null };
};
function checkReadRevision(value, args) {
  if (args.expectedRevision !== void 0 && args.expectedRevision !== value.revision) queryFail("CONFLICT", "\u5185\u5BB9\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\uFF1B\u4E0D\u80FD\u628A\u4E0D\u540C\u7248\u672C\u7684\u7247\u6BB5\u62FC\u63A5\u8D77\u6765", { expectedRevision: args.expectedRevision, currentRevision: value.revision, id: value.id });
}
export {
  chapterMetadata,
  checkReadRevision,
  current,
  pagination,
  queryFail
};
