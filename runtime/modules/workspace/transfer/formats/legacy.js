import { createHash } from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const list = (value) => Array.isArray(value) ? value : value && typeof value === "object" ? Object.entries(value).map(
  ([key, item]) => typeof item === "object" && item !== null ? { name: key, ...item } : { name: key, content: String(item ?? "") }
) : [];
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function invalid(message) {
  throw Object.assign(new Error(message), { code: "INVALID_LEGACY_EXPORT" });
}
function stableId(type, id, value) {
  return `legacy-${type}-${hash(String(id || JSON.stringify(value))).slice(0, 24)}`;
}
function prose(value) {
  if (typeof value === "string") return value;
  if (value === void 0 || value === null) return "";
  return JSON.stringify(value, null, 2);
}
function convertLegacyExport(input) {
  if (!object(input)) invalid("\u65E7\u9879\u76EE\u5BFC\u51FA\u5FC5\u987B\u662F JSON \u5BF9\u8C61");
  const project = object(input.project) ? input.project : input;
  const workspace = object(input.workspace) ? input.workspace : input;
  const chapters = list(input.chapters ?? workspace.chapters);
  const title = project.title || project.name || workspace.title;
  if (typeof title !== "string" || !title.trim()) invalid("\u65E7\u9879\u76EE\u7F3A\u5C11 title \u6216 name");
  if (chapters.some((c) => c.type !== "volume" && typeof c.content !== "string"))
    invalid("\u7AE0\u8282\u7F3A\u5C11\u6B63\u6587\uFF1B\u8BF7\u5BFC\u51FA\u5305\u542B\u6B63\u6587\u7684\u6570\u636E\uFF0C\u4E0D\u80FD\u4EC5\u5BFC\u5165\u6587\u4EF6\u8DEF\u5F84\u6216\u76EE\u5F55");
  const warnings = [];
  warnings.push("\u6A21\u578B\u914D\u7F6E\u3001API \u5BC6\u94A5\u548C\u8FD0\u884C\u65F6\u8BBE\u7F6E\u4E0D\u8FC1\u79FB\uFF1B\u65E7 preset \u8BF7\u4ECE\u201C\u5199\u4F5C\u9884\u8BBE\u201D\u5165\u53E3\u5355\u72EC\u5BFC\u5165\u5E76\u68C0\u67E5\u517C\u5BB9\u62A5\u544A\u3002");
  const timestamp = "1970-01-01T00:00:00.000Z";
  const entity = (id, fields) => ({
    id,
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    deleted: false,
    ...fields
  });
  const n = entity(stableId("novel", project.id || project.novelId || workspace.novelId, title), {
    title,
    description: prose(project.description || ""),
    archived: false,
    volumes: {},
    chapters: {},
    nodes: {},
    edges: {},
    plan: null
  });
  const volumeMap = /* @__PURE__ */ new Map();
  const chapterMap = /* @__PURE__ */ new Map();
  const nodeMap = /* @__PURE__ */ new Map();
  const volumes = [
    ...list(input.volumes ?? workspace.volumes),
    ...chapters.filter((c) => c.type === "volume")
  ];
  for (const [index, v] of volumes.entries()) {
    const id = stableId("volume", v.id, v.title || v.name || index);
    volumeMap.set(v.id || v.name || v.title, id);
    n.volumes[id] = entity(id, {
      title: v.title || v.name || `\u7B2C${index + 1}\u5377`,
      order: Number.isFinite(v.order) ? v.order : index
    });
  }
  for (const [index, c] of chapters.filter((c2) => c2.type !== "volume").entries()) {
    const id = stableId("chapter", c.id, { index, title: c.title, content: c.content });
    if (n.chapters[id]) invalid(`\u91CD\u590D\u7AE0\u8282 ID\uFF1A${c.id}`);
    chapterMap.set(c.id || id, id);
    const volumeId = volumeMap.get(c.volumeId) || null;
    if (c.volumeId && !volumeId)
      warnings.push(`\u7AE0\u8282\u201C${c.title || index + 1}\u201D\u5F15\u7528\u7684\u5377\u4E0D\u5B58\u5728\uFF0C\u5DF2\u653E\u5165\u672A\u5206\u5377\u7AE0\u8282\u3002`);
    const ch = entity(id, {
      title: c.title || c.name || `\u7B2C${index + 1}\u7AE0`,
      volumeId,
      order: Number.isFinite(c.order) ? c.order : index,
      content: c.content,
      contentHash: hash(c.content),
      versions: []
    });
    ch.versions.push({
      revision: 1,
      content: ch.content,
      contentHash: ch.contentHash,
      title: ch.title,
      volumeId,
      order: ch.order,
      deleted: false,
      timestamp,
      actor: { kind: "human", sessionId: null },
      reason: "\u65E7\u9879\u76EE\u5BFC\u5165"
    });
    n.chapters[id] = ch;
  }
  function addNode(raw, type, index) {
    const data = object(raw.data) ? raw.data : raw;
    const name = raw.name || raw.title || data.name || `\u5BFC\u5165\u8BBE\u5B9A${index + 1}`;
    const id = stableId("node", raw.id, `${type}:${name}`);
    nodeMap.set(raw.id || name, id);
    if (n.nodes[id]) return id;
    const body = raw.body ?? data.content ?? data.description ?? data;
    n.nodes[id] = entity(id, {
      type,
      name,
      summary: prose(raw.summary ?? data.summary ?? ""),
      content: prose(body),
      status: "unconfirmed",
      factType: "unconfirmed",
      aliases: Array.isArray(raw.aliases) ? raw.aliases.filter((v) => typeof v === "string") : [],
      sources: [],
      knownBy: [],
      dependsOn: [],
      storyTime: ""
    });
    return id;
  }
  let nodeIndex = 0;
  for (const book of list(input.worldBooks ?? input.worldbooks ?? workspace.worldBooks))
    addNode(book, "world_book", nodeIndex++);
  if (object(workspace.worldBook)) {
    const entries = list(workspace.worldBook.entries);
    if (entries.length) for (const entry of entries) addNode(entry, "world_entry", nodeIndex++);
    else addNode({ name: "\u4E16\u754C\u4E66", ...workspace.worldBook }, "world_book", nodeIndex++);
  }
  for (const card of list(input.characters ?? workspace.characters ?? input.characterCards))
    addNode(card, "character_card", nodeIndex++);
  const graph = object(input.graph) ? input.graph : {};
  for (const raw of list(graph.nodes)) {
    const type = raw.type || raw.kind;
    if (!["world_book", "world_entry", "character_card"].includes(type)) {
      warnings.push(`\u672A\u5BFC\u5165\u4E0D\u652F\u6301\u7684\u8282\u70B9\u7C7B\u578B\uFF1A${type}`);
      continue;
    }
    addNode(raw, type, nodeIndex++);
  }
  for (const [index, raw] of list(graph.edges).entries()) {
    const from = nodeMap.get(raw.from || raw.source), to = nodeMap.get(raw.to || raw.target);
    if (!from || !to) {
      warnings.push(`\u5173\u7CFB ${raw.id || index + 1} \u7F3A\u5C11\u7AEF\u70B9\uFF0C\u672A\u5BFC\u5165\u3002`);
      continue;
    }
    const id = stableId("edge", raw.id, { from, to, index });
    n.edges[id] = entity(id, {
      from,
      to,
      name: raw.name || raw.relation || raw.type || "\u76F8\u5173",
      summary: prose(raw.summary || ""),
      content: prose(raw.content ?? raw.body ?? ""),
      status: "unconfirmed",
      factType: "unconfirmed",
      sources: [],
      aliases: [],
      knownBy: [],
      dependsOn: [],
      storyTime: ""
    });
  }
  const outline = workspace.outline ?? input.outline;
  if (outline)
    n.plan = entity(stableId("plan", n.id, ""), {
      content: prose(outline),
      approved: false,
      approvedAt: null
    });
  warnings.push("\u65E7\u8BBE\u5B9A\u5DF2\u6807\u8BB0\u4E3A\u672A\u786E\u8BA4\uFF1B\u5386\u53F2\u4FEE\u8BA2\u4E0E\u6765\u6E90\u7248\u672C\u4E0D\u80FD\u4ECE\u666E\u901A\u5BFC\u51FA\u4E2D\u6062\u590D\uFF0C\u9700\u4F5C\u8005\u6838\u5BF9\u3002");
  return {
    backup: { format: "cuigengji", schemaVersion: 1, exportedAt: timestamp, novel: n },
    report: {
      novelId: n.id,
      title,
      volumes: Object.keys(n.volumes).length,
      chapters: Object.keys(n.chapters).length,
      nodes: Object.keys(n.nodes).length,
      edges: Object.keys(n.edges).length,
      warnings
    }
  };
}
var legacy_default = convertLegacyExport;
export {
  convertLegacyExport,
  legacy_default as default
};
