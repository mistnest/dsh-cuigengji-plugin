type DraftStorage = Pick<Storage,'getItem' | 'setItem' | 'removeItem'>;
export interface Draft<T> {base: T; value: T; manualConfirm?: boolean}
export const draftKey = (scope: string, entity: string) => `cuigengji:draft:v2:${scope}:${entity}`;
export const draftScope = (library: string, session: string) => library ? `library::${encodeURIComponent(library)}::${session}` : session;
export function migrateDeprecatedDraftMeta(storage: DraftStorage & Partial<Pick<Storage, 'length' | 'key'>>) {
  try {
    if (typeof storage.length !== 'number' || typeof storage.key !== 'function') return;
    const deprecated: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k || !k.startsWith('cuigengji:draft:v2:')) continue;
      // Match only exact scalar marker values ('true' / '1'), never JSON entity drafts like chapter ID "manual" or "legacy-claimed".
      if (k.endsWith(':legacy-claimed') && storage.getItem(k) === 'true') {
        deprecated.push(k);
      } else if (k.endsWith(':creative-memory:manual') && storage.getItem(k) === '1') {
        deprecated.push(k);
      }
    }
    for (const k of deprecated) {
      try {
        if (k.endsWith(':legacy-claimed')) {
          const baseKey = k.slice(0, -':legacy-claimed'.length);
          storage.setItem(`cuigengji:draft-meta:legacy-claimed:${baseKey}`, 'true');
          storage.removeItem(k);
        } else if (k.endsWith(':creative-memory:manual')) {
          const baseKey = k.slice(0, -':manual'.length);
          if (storage.getItem(baseKey) !== null) {
            storage.setItem(`cuigengji:draft-meta:manual:${baseKey}`, '1');
          }
          storage.removeItem(k);
        }
      } catch {
        // Keep the deprecated marker in place when storage quota is exhausted so read-side checks still honor it.
      }
    }
  } catch {}
}
const legacyClaimedFlagKey = (key: string) => `cuigengji:draft-meta:legacy-claimed:${key}`;

/** Pre-library drafts belong to the first library that claims them, never to a second imported copy. */
export function claimLegacyDraft(storage: DraftStorage, key: string) {
  migrateDeprecatedDraftMeta(storage);
  const match = /^cuigengji:draft:v2:library::([^:]+)::([^:]+):(.+)$/.exec(key);
  if (!match) return;
  try {
    const owner = storage.getItem('cuigengji:legacy-draft-library');
    if (!owner) {
      try { storage.setItem('cuigengji:legacy-draft-library', match[1]); } catch {}
    }
    const claimedFlag = legacyClaimedFlagKey(key);
    const deprecatedFlag = `${key}:legacy-claimed`;
    const deprecatedClaimed = storage.getItem(deprecatedFlag) === 'true';
    const alreadyClaimed = storage.getItem(claimedFlag) === 'true' || deprecatedClaimed;
    if (deprecatedClaimed) {
      try {
        storage.setItem(claimedFlag, 'true');
        storage.removeItem(deprecatedFlag);
      } catch {}
    }
    if ((!owner || owner === match[1]) && !alreadyClaimed) {
      if (storage.getItem(key) === null) {
        const previous = storage.getItem(draftKey(match[2], match[3]));
        if (previous) {
          // Copy the draft before recording `claimedFlag` so a quota failure never marks an uncopied legacy draft as claimed.
          storage.setItem(key, previous);
        }
      }
      try { storage.setItem(claimedFlag, 'true'); } catch {}
    }
  } catch {}
}
export const changed = <T>(state: Draft<T>) => JSON.stringify(state.value) !== JSON.stringify(state.base);
export function restoreDraft<T>(storage: DraftStorage, key: string, initial: T): Draft<T> {
  try {
    const cached = JSON.parse(storage.getItem(key) ?? 'null');
    if (cached && cached.base && cached.value && typeof cached.base === 'object' && typeof cached.value === 'object'
        && Number.isSafeInteger(cached.base.revision ?? 0)) return cached;
  } catch {}
  return { base: initial, value: initial };
}
export function persistDraft<T>(storage: DraftStorage, key: string, state: Draft<T>) {
  if (changed(state)) {
    storage.setItem(key, JSON.stringify(state));
  } else {
    const hadScopedDraft = storage.getItem(key) !== null;
    storage.removeItem(key);
    if (hadScopedDraft) {
      const match = /^cuigengji:draft:v2:library::([^:]+)::([^:]+):(.+)$/.exec(key);
      if (match) {
        const owner = storage.getItem('cuigengji:legacy-draft-library');
        if ((!owner || owner === match[1]) && storage.getItem(draftKey(match[2], match[3])) !== null) {
          try { storage.setItem(legacyClaimedFlagKey(key), 'true'); } catch {}
        }
      }
    }
  }
}
export function rebaseDraft<T extends object>(state: Draft<T>, server: T): Draft<T> {
  return { base: server, value: { ...server, ...state.value, revision: 'revision' in server ? server.revision : undefined, contentHash: 'contentHash' in server ? server.contentHash : undefined } };
}
