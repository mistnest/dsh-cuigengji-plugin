import {claimLegacyDraft, persistDraft, restoreDraft} from '../../shared/drafts.ts';
import {mergeText} from '../../shared/document-merge.ts';

export interface MemoryDocument {
  content: string;
  revision: number;
  contentHash: string;
  legacy: boolean;
}

type Phase = 'saved' | 'waiting' | 'saving' | 'error' | 'conflict';
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface State {
  base: MemoryDocument;
  value: MemoryDocument;
  phase: Phase;
  error: string;
  cacheError: string;
  notice: string;
  remote: MemoryDocument | null;
  manualConfirm: boolean;
}

export interface CreativeMemorySyncOptions {
  key: string;
  initial: MemoryDocument;
  storage?: DraftStorage;
  read: () => Promise<MemoryDocument>;
  write: (content: string, base: MemoryDocument, requestId: string) => Promise<{revision: number; contentHash: string}>;
  delay?: number;
}

interface PendingWrite {
  content: string;
  base: MemoryDocument;
  requestId: string;
  confirmEpoch: number;
}

const manualFlagKey = (key: string) => `cuigengji:draft-meta:manual:${key}`;
const deprecatedManualFlagKey = (key: string) => `${key}:manual`;

const isConflictError = (error: any) =>
  error?.code === 'CONFLICT' || /(CONFLICT|创作记忆已更新|版本.*变|已.*新版本)/.test(error?.message || String(error));

export class CreativeMemorySync {
  state: State;
  options: CreativeMemorySyncOptions;
  private storage: DraftStorage | undefined;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private saving = false;
  private reading = false;
  private composing = false;
  private committedContent: string;
  private touched = 0;
  private pendingRemote: MemoryDocument | null = null;
  private pending: PendingWrite | null = null;
  private confirmEpoch = 0;
  private pendingForceEpoch: number | null = null;
  private retries = 0;
  private flight: Promise<void> | null = null;

  constructor(options: CreativeMemorySyncOptions) {
    this.options = options;
    this.storage = options.storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (this.storage) claimLegacyDraft(this.storage, options.key);
    const restored = this.storage
      ? restoreDraft(this.storage, options.key, options.initial)
      : {base: options.initial, value: options.initial};
    const dirty = restored.value.content !== restored.base.content;
    let deprecatedManual: string | null = null;
    let currentManual: string | null = null;
    if (this.storage) {
      try { deprecatedManual = this.storage.getItem(deprecatedManualFlagKey(options.key)); } catch {}
      try { currentManual = this.storage.getItem(manualFlagKey(options.key)); } catch {}
    }
    const restoredManual = dirty && (Boolean(restored.manualConfirm) || currentManual === '1' || deprecatedManual === '1');
    if (this.storage && deprecatedManual === '1') {
      try {
        if (dirty) this.storage.setItem(manualFlagKey(options.key), '1');
        this.storage.removeItem(deprecatedManualFlagKey(options.key));
      } catch {
        // Keep deprecatedManual in storage if quota is full; restoredManual is already true in memory.
      }
    }
    this.committedContent = restored.value.content;
    this.state = {
      base: restored.base,
      value: restored.value,
      phase: dirty ? 'waiting' : 'saved',
      error: '',
      cacheError: '',
      notice: '',
      remote: null,
      manualConfirm: restoredManual,
    };
  }

  get dirty() {
    return this.state.value.content !== this.state.base.content;
  }

  get canAutoSave() {
    return (this.dirty || Boolean(this.pending))
      && !this.state.base.legacy
      && !this.state.manualConfirm
      && !this.composing
      && this.state.phase !== 'conflict';
  }

  snapshot = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(patch: Partial<State>) {
    this.state = {...this.state, ...patch};
    if (!this.composing) {
      this.committedContent = this.state.value.content;
    }
    // Never write uncommitted half-composed IME text to durable storage; persist once composition ends.
    if (this.storage && !this.composing) {
      try {
        persistDraft(this.storage, this.options.key, {
          base: this.state.base,
          value: this.state.value,
          ...(this.dirty && this.state.manualConfirm ? {manualConfirm: true} : {}),
        });
        if (this.dirty && this.state.manualConfirm) {
          try { this.storage.setItem(manualFlagKey(this.options.key), '1'); } catch {}
        } else {
          this.storage.removeItem(manualFlagKey(this.options.key));
          if (this.storage.getItem(deprecatedManualFlagKey(this.options.key)) === '1') {
            this.storage.removeItem(deprecatedManualFlagKey(this.options.key));
          }
        }
        this.state.cacheError = '';
      } catch {
        this.state.cacheError = '本地草稿缓存失败，请点击右上角保存。';
      }
    }
    this.listeners.forEach(fn => fn());
  }

  private schedule(delay = this.options.delay ?? 800) {
    clearTimeout(this.timer);
    if (this.canAutoSave) {
      this.timer = setTimeout(() => { void this.flush(); }, delay);
    }
  }

  change = (content: string) => {
    this.touched = Date.now();
    this.retries = 0;
    const nextValue = {...this.state.value, content};
    const dirty = content !== this.state.base.content;
    this.publish({
      value: nextValue,
      notice: '',
      error: '',
      phase: this.state.remote ? 'conflict' : this.saving ? 'saving' : dirty ? 'waiting' : 'saved',
    });
    this.schedule();
  };

  importDraft = (content: string) => {
    clearTimeout(this.timer);
    this.composing = false;
    this.touched = Date.now();
    this.retries = 0;
    this.confirmEpoch++;
    this.pendingForceEpoch = null;
    this.publish({
      value: {...this.state.value, content},
      manualConfirm: true,
      notice: '',
      error: '',
      phase: this.state.remote ? 'conflict' : 'waiting',
    });
  };

  composition = (active: boolean) => {
    if (this.composing === active) return;
    if (active) {
      this.committedContent = this.state.value.content;
      this.composing = true;
      clearTimeout(this.timer);
      return;
    }
    this.composing = false;
    // Persist the committed post-IME state immediately.
    this.publish({});
    if (this.pendingRemote && !this.saving) {
      const remote = this.pendingRemote;
      this.pendingRemote = null;
      this.applyRemote(remote);
    }
    if (this.pendingForceEpoch !== null && this.pendingForceEpoch === this.confirmEpoch) {
      this.pendingForceEpoch = null;
      void this.flush({force: true});
    } else {
      this.pendingForceEpoch = null;
      this.schedule();
    }
  };

  abortComposition = () => {
    if (!this.composing) return;
    this.composing = false;
    const revertedValue = {...this.state.value, content: this.committedContent};
    const dirty = this.committedContent !== this.state.base.content;
    this.publish({
      value: revertedValue,
      phase: this.state.remote ? 'conflict' : this.saving ? 'saving' : dirty ? 'waiting' : 'saved',
    });
    if (this.pendingRemote && !this.saving) {
      const remote = this.pendingRemote;
      this.pendingRemote = null;
      this.applyRemote(remote);
    }
    if (this.pendingForceEpoch !== null && this.pendingForceEpoch === this.confirmEpoch) {
      this.pendingForceEpoch = null;
      void this.flush({force: true});
    } else {
      this.pendingForceEpoch = null;
      this.schedule();
    }
  };

  accept = (doc: MemoryDocument) => {
    if (this.saving) return;
    clearTimeout(this.timer);
    this.pending = null;
    this.pendingRemote = null;
    this.pendingForceEpoch = null;
    this.confirmEpoch++;
    this.retries = 0;
    this.publish({base: doc, value: doc, remote: null, manualConfirm: false, phase: 'saved', error: '', notice: ''});
  };

  overwriteWithLocal = () => {
    const remote = this.state.remote;
    if (!remote || this.saving) return;
    this.pending = null;
    const localContent = this.state.value.content;
    this.publish({
      base: remote,
      value: {...remote, content: localContent},
      remote: null,
      phase: 'waiting',
      error: '',
      notice: '',
    });
    void this.flush({force: true});
  };

  private applyRemote(remote: MemoryDocument) {
    if (remote.revision < this.state.base.revision) return;
    const changed = remote.revision > this.state.base.revision
      || remote.contentHash !== this.state.base.contentHash
      || remote.legacy !== this.state.base.legacy;
    if (!changed) return;
    if (!this.dirty && !this.pending) {
      this.accept(remote);
      return;
    }
    this.reconcile(remote);
  }

  syncInitial(fresh: MemoryDocument) {
    if (this.saving || this.pending) return;
    if (fresh.revision < this.state.base.revision) return;
    const changed = fresh.revision > this.state.base.revision
      || fresh.contentHash !== this.state.base.contentHash
      || fresh.legacy !== this.state.base.legacy;
    if (!changed) return;
    if (this.composing) {
      if (!this.pendingRemote || fresh.revision >= this.pendingRemote.revision) {
        this.pendingRemote = fresh;
      }
      return;
    }
    this.applyRemote(fresh);
  }

  private reconcile(remote: MemoryDocument) {
    if (remote.revision < this.state.base.revision) return;
    if (remote.revision === this.state.base.revision && remote.contentHash === this.state.base.contentHash && remote.legacy === this.state.base.legacy) return;
    if (this.composing) {
      if (!this.pendingRemote || remote.revision >= this.pendingRemote.revision) {
        this.pendingRemote = remote;
      }
      return;
    }
    const merged = mergeText(this.state.base.content, this.state.value.content, remote.content);
    if (merged === null) {
      this.publish({remote, phase: 'conflict', error: '', notice: ''});
      return;
    }
    const dirty = merged !== remote.content;
    this.publish({
      base: remote,
      value: {...remote, content: merged},
      remote: null,
      manualConfirm: dirty ? this.state.manualConfirm : false,
      phase: dirty ? 'waiting' : 'saved',
      error: '',
      notice: dirty ? '已合并外部不同位置的修改' : '已同步最新创作记忆',
    });
    if (dirty) this.schedule();
  }

  refresh = async () => {
    if (this.reading || this.saving || this.pending) return;
    this.reading = true;
    try {
      const remote = await this.options.read();
      if (this.saving || this.pending) return;
      if (remote.revision < this.state.base.revision) return;
      if (this.composing) {
        if (!this.pendingRemote || remote.revision >= this.pendingRemote.revision) {
          this.pendingRemote = remote;
        }
        return;
      }
      if (!this.dirty) {
        this.applyRemote(remote);
        return;
      }
      if (Date.now() - this.touched < (this.options.delay ?? 800)) {
        if (!this.pendingRemote || remote.revision >= this.pendingRemote.revision) {
          this.pendingRemote = remote;
        }
        this.schedule();
      } else {
        this.reconcile(remote);
      }
    } catch {
      // Keep local draft intact on transient background read errors.
    } finally {
      this.reading = false;
    }
  };

  flush = async ({force = false}: {force?: boolean} = {}): Promise<void> => {
    const callerEpoch = this.confirmEpoch;
    if (force && this.state.manualConfirm) {
      // Explicit save confirms the current import generation immediately.
      this.publish({manualConfirm: false});
    }
    if (this.composing) {
      if (force) this.pendingForceEpoch = callerEpoch;
      return;
    }
    if (this.flight) {
      if (force) this.pendingForceEpoch = callerEpoch;
      await this.flight;
      if (this.composing) return;
      const validForce = force && this.confirmEpoch === callerEpoch;
      if (!validForce && !this.canAutoSave) return;
      if (validForce) {
        this.pendingForceEpoch = null;
        if (!this.dirty && !this.state.base.legacy && !this.pending) return;
      }
    }
    const validForce = force && this.confirmEpoch === callerEpoch;
    this.flight = this.performFlush(validForce, callerEpoch).finally(() => { this.flight = null; });
    return this.flight;
  };

  private performFlush = async (force: boolean, callerEpoch: number) => {
    clearTimeout(this.timer);
    if (this.saving) return;
    if (this.composing) {
      if (force && this.confirmEpoch === callerEpoch) this.pendingForceEpoch = callerEpoch;
      return;
    }
    const initialForce = force && this.confirmEpoch === callerEpoch;
    if (!initialForce && !this.pending && (this.state.manualConfirm || this.state.base.legacy || this.state.phase === 'conflict')) return;
    if (this.pendingRemote && !this.pending) {
      const remote = this.pendingRemote;
      this.pendingRemote = null;
      this.reconcile(remote);
      if (this.state.phase === 'conflict' || this.composing) return;
      if (!(force && this.confirmEpoch === callerEpoch) && this.state.manualConfirm) return;
    }
    if (!this.dirty && !this.pending && !(initialForce && this.state.base.legacy)) {
      if (this.state.manualConfirm && initialForce) this.publish({manualConfirm: false, phase: 'saved'});
      return;
    }

    this.saving = true;
    this.publish({phase: 'saving', error: ''});
    try {
      for (let attempt = 0; attempt < 6; attempt++) {
        const effectiveForce = force && this.confirmEpoch === callerEpoch;
        if (this.composing) {
          if (effectiveForce) this.pendingForceEpoch = callerEpoch;
          this.publish({phase: this.dirty ? 'waiting' : 'saved'});
          return;
        }
        // Never initiate a fresh write if a new unconfirmed import arrived after this flush started.
        if (!this.pending && !effectiveForce && (this.state.manualConfirm || this.state.base.legacy || this.state.phase === 'conflict')) {
          this.publish({phase: this.state.phase === 'conflict' ? 'conflict' : this.dirty ? 'waiting' : 'saved'});
          return;
        }
        const request: PendingWrite = this.pending ?? {
          content: this.state.value.content,
          base: this.state.base,
          requestId: crypto.randomUUID(),
          confirmEpoch: this.confirmEpoch,
        };
        this.pending = request;
        try {
          const saved = await this.options.write(request.content, request.base, request.requestId);
          const nextBase: MemoryDocument = {
            content: request.content,
            revision: saved.revision,
            contentHash: saved.contentHash,
            legacy: false,
          };
          const latestLocal = this.state.value.content;
          const preserved = latestLocal === request.content ? request.content : latestLocal;
          const stillDirty = preserved !== nextBase.content;
          const sameEpoch = this.confirmEpoch === request.confirmEpoch;
          const nextManualConfirm = sameEpoch ? (stillDirty && this.state.manualConfirm) : this.state.manualConfirm;
          this.pending = null;
          this.retries = 0;
          this.publish({
            base: nextBase,
            value: {...nextBase, content: preserved},
            remote: null,
            manualConfirm: nextManualConfirm,
            phase: this.state.remote ? 'conflict' : stillDirty ? 'waiting' : 'saved',
            error: '',
            notice: '',
          });
          if (force && this.confirmEpoch === callerEpoch && stillDirty && !this.composing && !this.state.remote && !nextManualConfirm) {
            continue;
          }
          return;
        } catch (error: any) {
          if (isConflictError(error)) {
            this.pending = null;
            let remote: MemoryDocument;
            try {
              remote = await this.options.read();
            } catch {
              this.retries++;
              this.publish({phase: 'error', error: '无法读取最新创作记忆，草稿已保留，请重试。'});
              return;
            }
            if (this.composing) {
              if (!this.pendingRemote || remote.revision >= this.pendingRemote.revision) {
                this.pendingRemote = remote;
              }
              if (force && this.confirmEpoch === callerEpoch) this.pendingForceEpoch = callerEpoch;
              this.publish({phase: 'waiting', error: ''});
              return;
            }
            const merged = mergeText(request.base.content, this.state.value.content, remote.content);
            if (merged === null) {
              this.publish({remote, phase: 'conflict', error: '', notice: ''});
              return;
            }
            if (merged === remote.content && !remote.legacy) {
              const sameEpoch = this.confirmEpoch === request.confirmEpoch;
              this.publish({
                base: remote,
                value: remote,
                remote: null,
                manualConfirm: sameEpoch ? false : this.state.manualConfirm,
                phase: 'saved',
                error: '',
                notice: '已同步最新创作记忆',
              });
              return;
            }
            this.publish({
              base: remote,
              value: {...remote, content: merged},
              remote: null,
              phase: 'waiting',
              error: '',
              notice: '已合并外部不同位置的修改',
            });
            // If a new unconfirmed import arrived while the old request was in flight, stop after merging remote!
            if (this.state.manualConfirm && !(force && this.confirmEpoch === callerEpoch)) {
              return;
            }
            continue;
          }
          throw error;
        }
      }
    } catch (error: any) {
      this.retries++;
      this.publish({
        phase: 'error',
        error: error?.message || '自动保存失败，草稿已保留，可点右上角重试。',
      });
    } finally {
      this.saving = false;
      if (this.pendingForceEpoch !== null && this.pendingForceEpoch === this.confirmEpoch && !this.composing && this.state.phase !== 'conflict' && this.state.phase !== 'error') {
        this.pendingForceEpoch = null;
        void this.flush({force: true});
      } else if (this.state.phase === 'waiting') {
        this.schedule();
      } else if (this.state.phase === 'error' && this.retries > 0 && this.retries <= 2) {
        this.schedule(2000 * this.retries);
      }
    }
  };

  dispose() {
    clearTimeout(this.timer);
    this.listeners.clear();
  }
}
