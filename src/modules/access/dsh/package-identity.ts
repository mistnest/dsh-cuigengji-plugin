import {isMap, isSeq, parseDocument} from 'yaml';

export const PACKAGE_NAME = 'dsh-cuigengji-plugin';
export const LEGACY_PACKAGE_NAME = 'dsh-cuigengji';
export const PLUGIN_ENTRY_ID = 'cuigengji';

/** Only installation identities change; the stable entry id owns user config. */
export function renamedBundles(bundles: string[]): string[] {
  return [...new Set(bundles.map(name => name === LEGACY_PACKAGE_NAME ? PACKAGE_NAME : name))];
}

/** Unqualify overrides so the same config also works if code is rolled back. */
export function renamedPatch(text: string): {text: string; changed: number} {
  const document = parseDocument(text, {
    customTags: [{tag: 'tag:yaml.org,2002:js', resolve: (value: string) => value}],
  });
  if (document.errors.length) throw document.errors[0];
  if (!document.contents) return {text, changed: 0};
  if (!isSeq(document.contents)) throw new Error('DSH patch must be a YAML sequence');
  let changed = 0;
  const visit = (sequence: unknown, inserted: boolean) => {
    if (!isSeq(sequence)) return;
    for (const item of sequence.items) {
      if (!isMap(item)) continue;
      if (item.get('id') === PLUGIN_ENTRY_ID && item.get('name') === LEGACY_PACKAGE_NAME) {
        // An inserted row needs a module name; an override only needs its id.
        if (inserted) item.set('name', PACKAGE_NAME);
        else item.delete('name');
        changed++;
      }
      visit(item.get('insert', true), true);
    }
  };
  visit(document.contents, false);
  return {text: changed ? String(document) : text, changed};
}
