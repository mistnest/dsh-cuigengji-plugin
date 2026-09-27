export const draftKey = (scope, entity) => `cuigengji:draft:v2:${scope}:${entity}`;
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
