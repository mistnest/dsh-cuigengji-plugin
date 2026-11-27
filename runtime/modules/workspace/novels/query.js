import { createHandoff } from "../queries/handoff.js";
import { pagination } from "../queries/common.js";
function workspaceQuery(state, novel, action, args, novelIds) {
  if (action === "novel.list") {
    const visible = novelIds ? new Set(novelIds) : null;
    const matches = Object.values(state.novels).filter((book2) => !book2.archived && (!visible || visible.has(book2.id)) && (!args.query || `${book2.title}
${book2.description || ""}`.toLowerCase().includes(args.query.toLowerCase())));
    return pagination(matches.map((book2) => Object.fromEntries(["id", "title", "description", "revision", "updatedAt"].filter((key) => book2[key] !== void 0).map((key) => [key, book2[key]]))), args);
  }
  if (action === "novel.handoff") return createHandoff(novel, null, args);
  const book = novel;
  return { ...Object.fromEntries(["id", "title", "description", "revision", "createdAt", "updatedAt"].filter((key) => book[key] !== void 0).map((key) => [key, book[key]])), counts: { chapters: Object.values(book.chapters).filter((value) => !value.deleted).length, settings: Object.values(book.nodes).filter((value) => !value.deleted).length, planning: Object.values(book.planning?.nodes || {}).filter((value) => !value.deleted).length } };
}
export {
  workspaceQuery
};
