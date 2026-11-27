import { isMap, isSeq, parseDocument } from "yaml";
const PACKAGE_NAME = "dsh-cuigengji-plugin";
const LEGACY_PACKAGE_NAME = "dsh-cuigengji";
const PLUGIN_ENTRY_ID = "cuigengji";
function renamedBundles(bundles) {
  return [...new Set(bundles.map((name) => name === LEGACY_PACKAGE_NAME ? PACKAGE_NAME : name))];
}
function renamedPatch(text) {
  const document = parseDocument(text, {
    customTags: [{ tag: "tag:yaml.org,2002:js", resolve: (value) => value }]
  });
  if (document.errors.length) throw document.errors[0];
  if (!document.contents) return { text, changed: 0 };
  if (!isSeq(document.contents)) throw new Error("DSH patch must be a YAML sequence");
  let changed = 0;
  const visit = (sequence, inserted) => {
    if (!isSeq(sequence)) return;
    for (const item of sequence.items) {
      if (!isMap(item)) continue;
      if (item.get("id") === PLUGIN_ENTRY_ID && item.get("name") === LEGACY_PACKAGE_NAME) {
        if (inserted) item.set("name", PACKAGE_NAME);
        else item.delete("name");
        changed++;
      }
      visit(item.get("insert", true), true);
    }
  };
  visit(document.contents, false);
  return { text: changed ? String(document) : text, changed };
}
export {
  LEGACY_PACKAGE_NAME,
  PACKAGE_NAME,
  PLUGIN_ENTRY_ID,
  renamedBundles,
  renamedPatch
};
