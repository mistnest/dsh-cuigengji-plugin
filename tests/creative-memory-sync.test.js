import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CreativeMemorySync} from '../src/modules/author-ui/workbench/features/creative-memory/sync.ts';
import {relocateBlockSession} from '../src/modules/author-ui/workbench/features/creative-memory/blocks.ts';
import {claimLegacyDraft, draftKey, draftScope, restoreDraft} from '../src/modules/author-ui/workbench/shared/drafts.ts';

function memoryStorage({quotaExceeded = false} = {}) {
  const map = new Map();
  let enforceQuota = false;
  return {
    get length() { return map.size; },
    key: index => Array.from(map.keys())[index] ?? null,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      if (enforceQuota) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      map.set(key, String(value));
    },
    removeItem: key => { map.delete(key); },
    freezeQuota: (frozen = quotaExceeded) => { enforceQuota = frozen; },
    dump: () => Object.fromEntries(map),
  };
}

const doc = (content, revision = 1, legacy = false) => ({
  content,
  revision,
  contentHash: `h:${revision}:${content}`,
  legacy,
});

test('relocateBlockSession keeps focus on the edited section when remote inserts earlier sections', () => {
  const session = {
    mode: 'block',
    index: 1,
    headingId: 'b-2',
    before: '## A\n\n原文甲',
    raw: '## B\n\n作者正在编辑乙 ',
    after: '## C\n\n原文丙',
    selectHeading: false,
  };
  const merged = '## 序章\n\n远端新增\n\n## A\n\n原文甲\n\n## B\n\n作者正在编辑乙\n\n## C\n\n原文丙';
  const next = relocateBlockSession(session, merged);
  assert.equal(next.index, 2);
  assert.equal(next.raw, '## B\n\n作者正在编辑乙 ');
  assert.equal(next.before, '## 序章\n\n远端新增\n\n## A\n\n原文甲');
  assert.equal(next.after, '## C\n\n原文丙');

  // Single-section document where remote prepends a section before it.
  const single = {
    mode: 'block',
    index: 0,
    headingId: 'b-1',
    before: '',
    raw: '## 唯一节\n\n作者修改中',
    after: '',
    selectHeading: false,
  };
  const nextSingle = relocateBlockSession(single, '## 远端前置\n\n内容\n\n## 唯一节\n\n作者修改中');
  assert.equal(nextSingle.index, 1);
  assert.equal(nextSingle.before, '## 远端前置\n\n内容');
  assert.equal(nextSingle.raw, '## 唯一节\n\n作者修改中');

  // When remote deletes the currently opened section, relocateBlockSession exits block editing (returns null) instead of hijacking a neighbor.
  const deletedTarget = relocateBlockSession(session, '## A\n\n原文甲\n\n## C\n\n原文丙');
  assert.equal(deletedTarget, null);

  // Duplicate same-title sections: deleting the opened one must NEVER switch focus onto the surviving same-title sibling.
  const dupTitleSession = {
    mode: 'block',
    index: 0,
    headingId: '备注-1',
    before: '',
    raw: '## 备注\n\n甲',
    originalRaw: '## 备注\n\n甲',
    after: '## 备注\n\n乙',
    selectHeading: false,
  };
  assert.equal(relocateBlockSession(dupTitleSession, '## 备注\n\n乙'), null);
  assert.equal(relocateBlockSession(dupTitleSession, '## 备注\n\n乙\n\n## 备注\n\n丙'), null);
  // Deleting the OTHER same-title sibling keeps the opened section focused.
  const keptDup = relocateBlockSession(dupTitleSession, '## 备注\n\n甲');
  assert.equal(keptDup?.index, 0);
  assert.equal(keptDup?.raw, '## 备注\n\n甲');
  // Identical twin sections: deleting one exits inline editing rather than guessing which twin survived.
  const twinSession = {
    mode: 'block',
    index: 0,
    headingId: '备注-1',
    before: '',
    raw: '## 备注\n\n同文',
    originalRaw: '## 备注\n\n同文',
    after: '## 备注\n\n同文',
    selectHeading: false,
  };
  assert.equal(relocateBlockSession(twinSession, '## 备注\n\n同文'), null);

  // Deleting the second duplicate ## 备注, modifying trailing anchor ## 尾声, and appending a new ## 备注 at the end must exit (return null).
  const secondDupWithModifiedAnchor = {
    mode: 'block',
    index: 1,
    headingId: '备注-2',
    before: '## 备注\n\n甲',
    raw: '## 备注\n\n乙',
    originalRaw: '## 备注\n\n乙',
    after: '## 尾声\n\n旧尾声',
    selectHeading: false,
  };
  assert.equal(
    relocateBlockSession(secondDupWithModifiedAnchor, '## 备注\n\n甲\n\n## 尾声\n\n新尾声\n\n## 备注\n\n丙', {dirty: false}),
    null,
  );
  // Even if the newly appended ## 备注 after modified ## 尾声 has identical text, anchor title order rejects jumping across ## 尾声.
  assert.equal(
    relocateBlockSession(secondDupWithModifiedAnchor, '## 备注\n\n甲\n\n## 尾声\n\n新尾声\n\n## 备注\n\n乙', {dirty: false}),
    null,
  );
});

test('imported drafts never bypass manual confirmation via edits, in-flight receipts, or reload', async () => {
  const storage = memoryStorage();
  const key = draftKey(draftScope('D:/lib', 's1'), 'novel-1:creative-memory');
  let server = doc('## 初始\n\n原内容', 1);
  let releaseWrite;
  const writes = [];

  const sync = new CreativeMemorySync({
    key,
    initial: server,
    storage,
    delay: 25,
    read: async () => server,
    write: async (content, base, requestId) => {
      writes.push({content, base, requestId});
      if (releaseWrite) await new Promise(r => { releaseWrite = r; });
      server = doc(content, base.revision + 1);
      return {revision: server.revision, contentHash: server.contentHash};
    },
  });

  // Start an in-flight write, then import a draft before the receipt returns.
  releaseWrite = true;
  sync.change('## 初始\n\n原内容改');
  const firstFlush = sync.flush();
  await new Promise(r => setTimeout(r, 5));
  sync.importDraft('## 初始\n\n原内容改\n\n## 导入节\n\n待确认内容');
  assert.equal(sync.state.manualConfirm, true);

  const finish = releaseWrite;
  releaseWrite = null;
  finish();
  await firstFlush;

  assert.equal(sync.state.manualConfirm, true, 'earlier write receipt must not clear manualConfirm');
  await new Promise(r => setTimeout(r, 60));
  assert.equal(writes.length, 1, 'unconfirmed import must not auto-save');

  // Editing/appending while manualConfirm is active still requires explicit confirmation.
  sync.change('## 初始\n\n原内容改\n\n## 导入节\n\n待确认内容\n\n## 新条目');
  await new Promise(r => setTimeout(r, 60));
  assert.equal(writes.length, 1);

  // Reloading from storage preserves manualConfirm.
  sync.dispose();
  const reloaded = new CreativeMemorySync({
    key,
    initial: server,
    storage,
    delay: 25,
    read: async () => server,
    write: async (content, base, requestId) => {
      writes.push({content, base, requestId});
      server = doc(content, base.revision + 1);
      return {revision: server.revision, contentHash: server.contentHash};
    },
  });
  assert.equal(reloaded.state.manualConfirm, true);
  await new Promise(r => setTimeout(r, 60));
  assert.equal(writes.length, 1, 'reloaded unconfirmed import must not auto-save');

  await reloaded.flush({force: true});
  assert.equal(writes.length, 2);
  assert.equal(reloaded.state.manualConfirm, false);
  assert.match(server.content, /导入节/);
  reloaded.dispose();
});

test('legacy unscoped draft is claimed at most once and never resurrects after server revert', async () => {
  const storage = memoryStorage();
  const legacyKey = draftKey('s1', 'novel-1:creative-memory');
  const scopedKey = draftKey(draftScope('D:/lib-a', 's1'), 'novel-1:creative-memory');
  storage.setItem(legacyKey, JSON.stringify({
    base: doc('原文', 1),
    value: doc('旧草稿修改', 1),
  }));

  claimLegacyDraft(storage, scopedKey);
  assert.equal(storage.getItem(`cuigengji:draft-meta:legacy-claimed:${scopedKey}`), 'true', 'legacy claim must record one-time marker outside cuigengji:draft:v2: namespace');
  for (const k of Object.keys(storage.dump())) {
    if (k.startsWith('cuigengji:draft:v2:library::')) {
      const parsed = JSON.parse(storage.getItem(k));
      assert.equal(typeof parsed?.value?.content, 'string');
    }
  }

  let server = doc('原文', 1);
  const first = new CreativeMemorySync({
    key: scopedKey,
    initial: server,
    storage,
    read: async () => server,
    write: async (content, base) => {
      server = doc(content, base.revision + 1);
      return {revision: server.revision, contentHash: server.contentHash};
    },
  });
  assert.equal(first.state.value.content, '旧草稿修改');
  await first.flush({force: true});
  assert.equal(server.content, '旧草稿修改');
  first.dispose();

  // Server reverts back to '原文' at higher revision; reopening must NOT re-apply '旧草稿修改'.
  server = doc('原文', 5);
  const reopened = new CreativeMemorySync({
    key: scopedKey,
    initial: server,
    storage,
    delay: 20,
    read: async () => server,
    write: async () => { throw new Error('must not write resurrected draft'); },
  });
  assert.equal(reopened.state.value.content, '原文');
  assert.equal(reopened.dirty, false);
  await new Promise(r => setTimeout(r, 50));
  reopened.dispose();
});

test('IME composition blocks in-flight conflict retry, explicit save, and clean-editor remote overwrite until composition ends', async () => {
  const storage = memoryStorage();
  const key = draftKey(draftScope('D:/lib', 's1'), 'novel-ime:creative-memory');
  let server = doc('## 第一节\n\n甲\n\n## 第二节\n\n乙', 1);
  const writtenContents = [];
  let onFirstWriteStarted;

  const sync = new CreativeMemorySync({
    key,
    initial: server,
    storage,
    delay: 20,
    read: async () => server,
    write: async (content, base) => {
      writtenContents.push(content);
      if (onFirstWriteStarted) {
        const cb = onFirstWriteStarted;
        onFirstWriteStarted = null;
        await cb();
      }
      if (base.revision !== server.revision) {
        const err = new Error('创作记忆已更新，请重新查看目录');
        err.code = 'CONFLICT';
        throw err;
      }
      server = doc(content, base.revision + 1);
      return {revision: server.revision, contentHash: server.contentHash};
    },
  });

  // 1) Clean editor during IME composition must defer remote sync until composition ends.
  sync.composition(true);
  sync.syncInitial(doc('## 第一节\n\n远端甲\n\n## 第二节\n\n乙', 2));
  assert.equal(sync.state.value.content, '## 第一节\n\n甲\n\n## 第二节\n\n乙');
  sync.composition(false);
  server = doc('## 第一节\n\n远端甲\n\n## 第二节\n\n乙', 2);
  assert.equal(sync.state.value.content, server.content);

  // 2) First write starts -> user begins IME composition ("pinyin") AND server advances -> conflict retry must NOT save "pinyin".
  sync.change('## 第一节\n\n作者定稿甲\n\n## 第二节\n\n乙');
  onFirstWriteStarted = async () => {
    server = doc('## 第一节\n\n远端甲\n\n## 第二节\n\n远端乙', 3);
    sync.composition(true);
    sync.change('## 第一节\n\n作者定稿甲 pinyin\n\n## 第二节\n\n乙');
  };
  await sync.flush();
  assert.ok(!writtenContents.some(c => c.includes('pinyin')), 'must never persist raw IME composition text');

  // Explicit save during composition also waits until composition ends.
  await sync.flush({force: true});
  assert.ok(!writtenContents.some(c => c.includes('pinyin')));

  // User finishes IME composition with final Chinese characters.
  sync.change('## 第一节\n\n作者定稿甲 最终汉字\n\n## 第二节\n\n乙');
  sync.composition(false);
  await new Promise(r => setTimeout(r, 50));
  assert.equal(server.content, '## 第一节\n\n作者定稿甲 最终汉字\n\n## 第二节\n\n远端乙');
  assert.ok(!writtenContents.some(c => c.includes('pinyin')));
  sync.dispose();
});

test('lost response replays identical requestId and repeated CAS conflicts surface conflict state cleanly', async () => {
  const storage = memoryStorage();
  const key = draftKey(draftScope('D:/lib', 's1'), 'novel-retry:creative-memory');
  let server = doc('旧内容', 1);
  const requestIds = [];
  let failOnce = true;

  const sync = new CreativeMemorySync({
    key,
    initial: server,
    storage,
    delay: 5000,
    read: async () => server,
    write: async (content, base, requestId) => {
      requestIds.push(requestId);
      if (failOnce) {
        failOnce = false;
        throw new Error('网络中断，回执丢失');
      }
      if (base.revision !== server.revision) {
        const err = new Error('创作记忆已更新，请重新查看目录');
        err.code = 'CONFLICT';
        throw err;
      }
      server = doc(content, base.revision + 1);
      return {revision: server.revision, contentHash: server.contentHash};
    },
  });

  sync.change('新内容第一次提交');
  await sync.flush({force: true});
  assert.equal(sync.state.phase, 'error');
  assert.equal(requestIds.length, 1);

  await sync.flush({force: true});
  assert.equal(requestIds.length, 2);
  assert.equal(requestIds[0], requestIds[1], 'retry after transport failure must reuse exact requestId');
  assert.equal(server.content, '新内容第一次提交');

  // Overlapping concurrent edit surfaces phase === 'conflict' with remote snapshot.
  sync.change('作者同处修改');
  server = doc('AI 同处修改', 5);
  await sync.flush({force: true});
  assert.equal(sync.state.phase, 'conflict');
  assert.equal(sync.state.remote?.content, 'AI 同处修改');
  sync.dispose();
});

test('in-flight CAS conflict + queued force save before import never auto-saves a newer unconfirmed import; uncommitted IME never enters storage; stale read never regresses; preexisting scoped+legacy drafts never resurrect', async () => {
  // 1) In-flight write + queued force save + CAS conflict before importDraft must NOT persist the new import.
  const storage = memoryStorage();
  const key = draftKey(draftScope('D:/lib', 's1'), 'novel-import-race:creative-memory');
  let server = doc('## 第一节\n\n甲\n\n## 第二节\n\n乙', 1);
  const savedBodies = [];
  let releaseFirst;

  const sync = new CreativeMemorySync({
    key,
    initial: server,
    storage,
    delay: 25,
    read: async () => server,
    write: async (content, base) => {
      if (releaseFirst) {
        await new Promise(r => { releaseFirst = r; });
      }
      if (base.revision !== server.revision) {
        const err = new Error('创作记忆已更新');
        err.code = 'CONFLICT';
        throw err;
      }
      savedBodies.push(content);
      server = doc(content, base.revision + 1);
      return {revision: server.revision, contentHash: server.contentHash};
    },
  });

  releaseFirst = true;
  sync.change('## 第一节\n\n作者甲\n\n## 第二节\n\n乙');
  const firstAuto = sync.flush();
  await new Promise(r => setTimeout(r, 5));
  // Queue a force save BEFORE importDraft, then remote advances AND user imports unconfirmed file!
  const earlierForce = sync.flush({force: true});
  server = doc('## 第一节\n\n甲\n\n## 第二节\n\n远端乙', 2);
  sync.importDraft('## 第一节\n\n作者甲\n\n## 第二节\n\n乙\n\n## 新导入\n\n未确认导入正文');

  const done = releaseFirst;
  releaseFirst = null;
  done();
  await firstAuto;
  await earlierForce;
  await new Promise(r => setTimeout(r, 70));

  assert.equal(sync.state.manualConfirm, true, 'newer import must remain unconfirmed');
  assert.ok(!savedBodies.some(b => b.includes('未确认导入正文')), 'unconfirmed import must never be written by earlier save');

  // 2) Uncommitted IME text never enters durable storage if process crashes mid-composition.
  sync.accept(server);
  sync.composition(true);
  sync.change(server.content + '\n\nbeijing');
  assert.equal(storage.getItem(key), null, 'uncommitted IME text must not be written to storage');

  // 3) Stale out-of-order read with lower revision never regresses a clean editor.
  sync.composition(false);
  sync.accept(doc('版本三最新内容', 3));
  sync.syncInitial(doc('迟到的版本二旧内容', 2));
  assert.equal(sync.state.base.revision, 3);
  assert.equal(sync.state.value.content, '版本三最新内容');
  sync.dispose();

  // 4) Preexisting coexisting legacy + scoped draft sets claimed marker on first open so legacy never resurrects.
  const upgStorage = memoryStorage();
  const legacyKey = draftKey('s2', 'novel-upg:creative-memory');
  const scopedKey = draftKey(draftScope('D:/lib-upg', 's2'), 'novel-upg:creative-memory');
  const staleDraft = JSON.stringify({base: doc('旧原文', 1), value: doc('升级前已迁入的草稿', 1)});
  upgStorage.setItem(legacyKey, staleDraft);
  upgStorage.setItem(scopedKey, staleDraft);

  let upgServer = doc('旧原文', 1);
  const upg = new CreativeMemorySync({
    key: scopedKey,
    initial: upgServer,
    storage: upgStorage,
    read: async () => upgServer,
    write: async (content, base) => {
      upgServer = doc(content, base.revision + 1);
      return {revision: upgServer.revision, contentHash: upgServer.contentHash};
    },
  });
  await upg.flush({force: true});
  upg.dispose();

  upgServer = doc('服务端撤回后的原文', 4);
  const upgReopened = new CreativeMemorySync({
    key: scopedKey,
    initial: upgServer,
    storage: upgStorage,
    read: async () => upgServer,
    write: async () => { throw new Error('must not resurrect legacy draft'); },
  });
  assert.equal(upgReopened.state.value.content, '服务端撤回后的原文');
  assert.equal(upgReopened.dirty, false);
  upgReopened.dispose();
});

test('abortComposition recovers cleanly when unmounted mid-IME without compositionend', async () => {
  const storage = memoryStorage();
  const key = draftKey(draftScope('D:/lib-ime-unmount', 's1'), 'novel-ime:creative-memory');
  let server = doc('## 第一节\n\n原内容', 1);
  const writes = [];

  const sync = new CreativeMemorySync({
    key,
    initial: server,
    storage,
    delay: 20,
    read: async () => server,
    write: async (content, base) => {
      writes.push(content);
      server = doc(content, base.revision + 1);
      return {revision: server.revision, contentHash: server.contentHash};
    },
  });

  // Author commits an edit, then starts IME composition ("beijing") and unmounts before compositionend fires.
  sync.change('## 第一节\n\n已提交句子');
  sync.composition(true);
  sync.change('## 第一节\n\n已提交句子 beijing');
  assert.equal(sync.canAutoSave, false);

  // Unmount cleanup calls abortComposition(), rolling back uncommitted IME text and unlocking sync.
  sync.abortComposition();
  assert.equal(sync.state.value.content, '## 第一节\n\n已提交句子');
  assert.equal(sync.canAutoSave, true);
  await sync.flush();
  assert.equal(server.content, '## 第一节\n\n已提交句子');
  assert.ok(!writes.some(w => w.includes('beijing')));

  // Switching back to the same session and editing again persists to localStorage and auto-saves normally.
  sync.change('## 第一节\n\n切回书库后继续编辑');
  assert.ok(storage.getItem(key), 'subsequent edits after IME abort must persist to storage');
  await new Promise(r => setTimeout(r, 50));
  assert.equal(server.content, '## 第一节\n\n切回书库后继续编辑');
  sync.dispose();
});

test('deprecated :manual and :legacy-claimed flags migrate cleanly without auto-saving imports or resurrecting legacy drafts', async () => {
  // 1) Deprecated ${key}:manual flag preserves manualConfirm and cleans up old key.
  const storage = memoryStorage();
  const key = draftKey(draftScope('D:/lib-mig', 's1'), 'novel-mig:creative-memory');
  const server = doc('## 初始\n\n原内容', 1);
  storage.setItem(key, JSON.stringify({base: server, value: doc('## 导入\n\n待确认内容', 1)}));
  storage.setItem(`${key}:manual`, '1');

  const sync = new CreativeMemorySync({
    key,
    initial: server,
    storage,
    delay: 20,
    read: async () => server,
    write: async () => { throw new Error('must not auto-save migrated manual import'); },
  });
  assert.equal(sync.state.manualConfirm, true);
  assert.equal(storage.getItem(`${key}:manual`), null);
  assert.equal(storage.getItem(`cuigengji:draft-meta:manual:${key}`), '1');
  await new Promise(r => setTimeout(r, 50));
  sync.dispose();

  // 2) Deprecated ${scopedKey}:legacy-claimed flag prevents re-claiming legacy unscoped draft.
  const storage2 = memoryStorage();
  const legacyKey = draftKey('s1', 'novel-claimed:creative-memory');
  const scopedKey = draftKey(draftScope('D:/lib-mig', 's1'), 'novel-claimed:creative-memory');
  storage2.setItem('cuigengji:legacy-draft-library', encodeURIComponent('D:/lib-mig'));
  storage2.setItem(legacyKey, JSON.stringify({base: doc('旧原文', 1), value: doc('已撤回旧草稿', 1)}));
  storage2.setItem(`${scopedKey}:legacy-claimed`, 'true');

  const revertedServer = doc('新服务端内容', 5);
  const sync2 = new CreativeMemorySync({
    key: scopedKey,
    initial: revertedServer,
    storage: storage2,
    delay: 20,
    read: async () => revertedServer,
    write: async () => { throw new Error('must not resurrect already-claimed legacy draft'); },
  });
  assert.equal(sync2.state.value.content, '新服务端内容');
  assert.equal(sync2.dirty, false);
  assert.equal(storage2.getItem(`${scopedKey}:legacy-claimed`), null);
  assert.equal(storage2.getItem(`cuigengji:draft-meta:legacy-claimed:${scopedKey}`), 'true');
  await new Promise(r => setTimeout(r, 50));
  sync2.dispose();

  // 3) Full localStorage (QuotaExceededError) must keep manualConfirm === true and never auto-save on open or reload.
  const quotaStorage = memoryStorage();
  const quotaKey = draftKey(draftScope('D:/lib-quota', 's1'), 'novel-quota:creative-memory');
  quotaStorage.setItem(quotaKey, JSON.stringify({base: server, value: doc('## 导入\n\n配额满时待确认内容', 1)}));
  quotaStorage.setItem(`${quotaKey}:manual`, '1');
  quotaStorage.freezeQuota(true);

  for (let openCount = 0; openCount < 2; openCount++) {
    const quotaSync = new CreativeMemorySync({
      key: quotaKey,
      initial: server,
      storage: quotaStorage,
      delay: 20,
      read: async () => server,
      write: async () => { throw new Error('must never auto-save unconfirmed import when storage quota is exhausted'); },
    });
    assert.equal(quotaSync.state.manualConfirm, true);
    assert.equal(quotaSync.canAutoSave, false);
    await new Promise(r => setTimeout(r, 50));
    quotaSync.dispose();
  }
  assert.equal(quotaStorage.getItem(`${quotaKey}:manual`), '1', 'deprecated marker stays intact until new marker can be persisted');

  // 4) Legitimate chapter drafts with chapter ID "manual" or "legacy-claimed" must NEVER be deleted by flag migration.
  const chapStorage = memoryStorage();
  const chapScope = draftScope('D:/lib-chap', 's1');
  const manualChapKey = draftKey(chapScope, 'chapter:manual');
  const claimedChapKey = draftKey(chapScope, 'chapter:legacy-claimed');
  const manualChapDraft = {base: {revision: 1, title: '手记', content: '旧正文'}, value: {revision: 1, title: '手记', content: '未同步的新正文'}};
  const claimedChapDraft = {base: {revision: 1, title: '认领', content: '旧正文'}, value: {revision: 1, title: '认领', content: '未同步的认领章节正文'}};
  chapStorage.setItem(manualChapKey, JSON.stringify(manualChapDraft));
  chapStorage.setItem(claimedChapKey, JSON.stringify(claimedChapDraft));

  claimLegacyDraft(chapStorage, manualChapKey);
  claimLegacyDraft(chapStorage, claimedChapKey);
  assert.equal(restoreDraft(chapStorage, manualChapKey, manualChapDraft.base).value.content, '未同步的新正文');
  assert.equal(restoreDraft(chapStorage, claimedChapKey, claimedChapDraft.base).value.content, '未同步的认领章节正文');

  // 5) Partial quota (enough for claimedFlag, NOT enough to copy legacy draft) must NOT mark claimedFlag; freeing space recovers the legacy draft.
  const sizedMap = new Map();
  let maxChars = Infinity;
  const usedChars = () => Array.from(sizedMap.entries()).reduce((sum, [k, v]) => sum + k.length + v.length, 0);
  const sizedStorage = {
    get length() { return sizedMap.size; },
    key: i => Array.from(sizedMap.keys())[i] ?? null,
    getItem: k => (sizedMap.has(k) ? sizedMap.get(k) : null),
    setItem: (k, v) => {
      const str = String(v);
      const delta = (k.length + str.length) - (sizedMap.has(k) ? k.length + sizedMap.get(k).length : 0);
      if (usedChars() + delta > maxChars) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      sizedMap.set(k, str);
    },
    removeItem: k => { sizedMap.delete(k); },
  };
  const partialLegacyKey = draftKey('s1', 'novel-partial:creative-memory');
  const partialScopedKey = draftKey(draftScope('D:/lib-partial', 's1'), 'novel-partial:creative-memory');
  const bigLegacyDraft = JSON.stringify({base: doc('原文', 1), value: doc('未迁移的长篇旧草稿'.repeat(30), 1)});
  sizedStorage.setItem(partialLegacyKey, bigLegacyDraft);
  // Allow enough space for owner + claimedFlag (~200 chars), but NOT enough for bigLegacyDraft (>500 chars).
  maxChars = usedChars() + 220;

  let partialServer = doc('原文', 1);
  const failedOpen = new CreativeMemorySync({
    key: partialScopedKey,
    initial: partialServer,
    storage: sizedStorage,
    read: async () => partialServer,
    write: async () => ({revision: 2, contentHash: 'h2'}),
  });
  assert.equal(sizedStorage.getItem(`cuigengji:draft-meta:legacy-claimed:${partialScopedKey}`), null, 'must not mark claimed when draft copy failed');
  failedOpen.dispose();

  // Free space (exactly enough for bigLegacyDraft, even if tight for claimedFlag alongside it) and reopen: draft recovers, saves, and marks claimed!
  maxChars = usedChars() + partialScopedKey.length + bigLegacyDraft.length;
  const recoveredOpen = new CreativeMemorySync({
    key: partialScopedKey,
    initial: partialServer,
    storage: sizedStorage,
    read: async () => partialServer,
    write: async (content, base) => {
      partialServer = doc(content, base.revision + 1);
      return {revision: partialServer.revision, contentHash: partialServer.contentHash};
    },
  });
  assert.equal(recoveredOpen.state.value.content, '未迁移的长篇旧草稿'.repeat(30));
  await recoveredOpen.flush({force: true});
  assert.equal(sizedStorage.getItem(`cuigengji:draft-meta:legacy-claimed:${partialScopedKey}`), 'true');
  recoveredOpen.dispose();
});
