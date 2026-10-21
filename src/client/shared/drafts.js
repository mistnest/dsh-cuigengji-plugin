export const draftKey = (scope, entity) => `cuigengji:draft:v2:${scope}:${entity}`;
export const draftScope = (library, session) => library ? `library::${encodeURIComponent(library)}::${session}` : session;
/** Pre-library drafts belong to the first library that claims them, never to a second imported copy. */
export function claimLegacyDraft(storage, key) {
  const match = /^cuigengji:draft:v2:library::([^:]+)::([^:]+):(.+)$/.exec(key);
  if (!match) return;
  try {
    const owner = storage.getItem('cuigengji:legacy-draft-library');
    if (!owner) storage.setItem('cuigengji:legacy-draft-library', match[1]);
    if ((!owner || owner === match[1]) && storage.getItem(key) === null) {
      const previous = storage.getItem(draftKey(match[2], match[3]));
      if (previous) storage.setItem(key, previous);
    }
  } catch {}
}
export const changed = state => JSON.stringify(state.value) !== JSON.stringify(state.base);
export function restoreDraft(storage, key, initial) {
  try {
    const cached = JSON.parse(storage.getItem(key));
    if (cached && cached.base && cached.value && typeof cached.base === 'object' && typeof cached.value === 'object'
        && Number.isSafeInteger(cached.base.revision ?? 0)) return cached;
  } catch {}
  return { base: initial, value: initial };
}
export function persistDraft(storage, key, state) {
  if (changed(state)) storage.setItem(key, JSON.stringify(state));
  else storage.removeItem(key);
}
export function rebaseDraft(state, server) {
  return { base: server, value: { ...server, ...state.value, revision: server.revision, contentHash: server.contentHash } };
}
