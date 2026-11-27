import { relative, resolve, sep, isAbsolute } from "node:path";
function within(root, path) {
  const rel = relative(resolve(root), resolve(path));
  return !rel || rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel);
}
export {
  within
};
