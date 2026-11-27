import {relative, resolve, sep, isAbsolute} from 'node:path';

export function within(root: string, path: string) {
  const rel = relative(resolve(root), resolve(path));
  return !rel || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
}
