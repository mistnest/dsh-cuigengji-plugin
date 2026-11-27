import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {type BackProps} from '../../shared/management-page.tsx';
import {ResourceState, saveShortcut} from '../../shared/ui.tsx';
import {extractMarkdownHeadings, MarkdownReading} from '../../shared/MarkdownReading.tsx';
import {useResource} from '../../shared/useResource.ts';
import type {FeatureServices} from '../../shared/workspace-state.ts';
import {presetMarkdown} from '../../../../workspace/presets/markdown.ts';
import {downloadFile, readTransferFile} from '../transfer/file.ts';
import {joinParts, relocateBlockSession, splitMemoryBlocks, type InlineEditSession} from './blocks.ts';
import {type MemoryDocument} from './sync.ts';
import {useCreativeMemorySync} from './useCreativeMemorySync.ts';

type Props = FeatureServices & BackProps & {onLegacy():void};

function AutosizeBlockEditor({
  value, placeholder, disabled, autoSelectHeading, onChange, onCommit, onSaveShortcut, onComposition, onAbortComposition,
}: {
  value: string; placeholder?: string; disabled?: boolean; autoSelectHeading?: boolean;
  onChange: (next: string) => void; onCommit: () => void; onSaveShortcut: () => void;
  onComposition: (active: boolean) => void; onAbortComposition: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(96, el.scrollHeight + 4)}px`;
  }, [value]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({preventScroll: true});
    if (autoSelectHeading) {
      const m = /^#{1,3}\s+([^\n]+)/.exec(el.value);
      if (m) {
        const idx = el.value.indexOf(m[1]);
        el.setSelectionRange(idx, idx + m[1].length);
        return;
      }
    }
    el.setSelectionRange(el.value.length, el.value.length);
  }, [autoSelectHeading]);
  useEffect(() => () => {
    if (composingRef.current) {
      composingRef.current = false;
      onAbortComposition();
    }
  }, [onAbortComposition]);
  return <textarea
    ref={ref}
    className="cm-inline-textarea"
    aria-label="创作记忆正文"
    disabled={disabled}
    value={value}
    placeholder={placeholder}
    onCompositionStart={() => { composingRef.current = true; onComposition(true); }}
    onCompositionEnd={() => { composingRef.current = false; onComposition(false); }}
    onChange={e => onChange(e.target.value)}
    onBlur={e => {
      if (e.relatedTarget instanceof Element) {
        if (e.currentTarget.closest('.cm-block-editing,.cm-full-editor')?.contains(e.relatedTarget)) return;
        if (e.relatedTarget.closest('.cm-save-btn')) return;
      }
      onCommit();
    }}
    onKeyDown={e => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCommit(); return; }
      saveShortcut(e.nativeEvent, onSaveShortcut);
    }}
  />;
}

export function CreativeMemory(props: Props) {
  const {call, novelId, tick} = props;
  const load = (): Promise<MemoryDocument> => call('creativeMemory.read', {novelId, full:true});
  const resource = useResource(load, [call, novelId, tick]);
  return <ResourceState resource={resource}>{resource.value &&
    <Editor key={novelId} {...props} initial={resource.value} load={load}/>}</ResourceState>;
}

function Editor({call, novelId, run, busy, initial, load, onBack, backLabel = '返回设置', onLegacy}: Props & {initial:MemoryDocument;load:()=>Promise<MemoryDocument>}) {
  const [session, setSession] = useState<InlineEditSession | null>(null);
  const lastComposedRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDetailsElement>(null);

  const draft = useCreativeMemorySync({
    novelId,
    initial,
    read: load,
    write: (content, remote, requestId) => call('creativeMemory.update', {
      novelId,
      expectedRevision: remote.revision,
      expectedHash: remote.contentHash,
      requestId,
      content,
    }),
  });

  const headings = useMemo(() => extractMarkdownHeadings(draft.value.content), [draft.value.content]);
  const blocks = useMemo(() => splitMemoryBlocks(draft.value.content), [draft.value.content]);
  const saving = draft.phase === 'saving';
  const needsSave = draft.dirty || draft.base.legacy;

  // Keep active editor synchronized if a background merge updates draft.value.content externally.
  useEffect(() => {
    if (!session) { lastComposedRef.current = null; return; }
    if (lastComposedRef.current === draft.value.content) return;
    lastComposedRef.current = draft.value.content;
    setSession(cur => cur ? relocateBlockSession(cur, draft.value.content, {dirty: draft.dirty}) : null);
  }, [draft.value.content, draft.dirty, session]);

  const save = () => draft.save();
  const commitSession = () => {
    draft.abortComposition();
    setSession(null);
  };

  const openBlock = (index: number, event?: React.MouseEvent, selectHeading = false) => {
    if (busy) return;
    if (event) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a,button,summary,input,textarea')) return;
      if ((window.getSelection()?.toString().length || 0) > 0) return;
    }
    draft.abortComposition();
    const currentBlocks = splitMemoryBlocks(draft.value.content);
    const block = currentBlocks[index];
    if (!block) return;
    lastComposedRef.current = draft.value.content;
    setSession({
      mode: 'block',
      index,
      headingId: block.headingId,
      before: currentBlocks.slice(0, index).map(b => b.raw).join('\n\n'),
      raw: block.raw,
      originalRaw: block.raw,
      after: currentBlocks.slice(index + 1).map(b => b.raw).join('\n\n'),
      selectHeading,
    });
  };

  const openFullEditor = () => {
    if (busy) return;
    draft.abortComposition();
    if (session?.mode === 'full') { setSession(null); return; }
    lastComposedRef.current = draft.value.content;
    setSession({mode: 'full', index: 0, headingId: null, before: '', raw: draft.value.content, originalRaw: draft.value.content, after: '', selectHeading: false});
  };

  const updateSessionRaw = (nextRaw: string) => {
    setSession(cur => {
      if (!cur) return null;
      const composed = cur.mode === 'full' ? nextRaw : joinParts(cur.before, nextRaw, cur.after);
      lastComposedRef.current = composed;
      draft.change(composed);
      return {...cur, raw: nextRaw, selectHeading: false};
    });
  };

  const appendSection = () => {
    draft.abortComposition();
    const current = draft.value.content.replace(/\s+$/, '');
    const stub = current ? '## 新条目\n\n' : '## 叙事与文风\n\n';
    const composed = joinParts(current, stub, '');
    const nextBlocks = splitMemoryBlocks(composed);
    const idx = Math.max(0, nextBlocks.length - 1);
    lastComposedRef.current = composed;
    draft.change(composed);
    setSession({
      mode: 'block',
      index: idx,
      headingId: nextBlocks[idx]?.headingId ?? null,
      before: current,
      raw: stub,
      originalRaw: stub,
      after: '',
      selectHeading: true,
    });
  };

  const jumpToHeading = (id: string, closePopover?: HTMLElement | null) => {
    closePopover?.closest('details')?.removeAttribute('open');
    if (session?.mode === 'full') setSession(null);
    requestAnimationFrame(() => {
      const escaped = CSS.escape(id);
      const target = scrollRef.current?.querySelector(`[data-heading-id="${escaped}"], #${escaped}`);
      target?.scrollIntoView({block: 'start', behavior: 'smooth'});
    });
  };

  const handleImport: React.ChangeEventHandler<HTMLInputElement> = e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    moreMenuRef.current?.removeAttribute('open');
    if (!file) return;
    void run(async () => {
      const input = await readTransferFile(file);
      const text = /\.json$/i.test(file.name)
        ? presetMarkdown((await call('preset.preview', {novelId, input:input.text, fileName:file.name})).blocks)
        : input.text;
      if (!text?.trim()) throw new Error('文件中没有可导入的文字或启用的条目');
      setSession(null);
      const baseText = draft.value.content.replace(/\s+$/, '');
      draft.importDraft(baseText ? `${baseText}\n\n${text.trim()}` : text.trim());
    });
  };

  const hasError = Boolean(draft.cacheError || draft.error || draft.phase === 'conflict');
  const statusText = draft.cacheError
    || draft.error
    || (draft.phase === 'conflict'
      ? '存在同处修改待确认'
      : saving
      ? '正在保存…'
      : draft.base.legacy
      ? '旧预设待确认保存'
      : draft.dirty
      ? (draft.manualConfirm ? '已导入草稿，确认后保存' : '等待自动保存…')
      : (draft.notice || '点击任意段落可直接修改'));

  const beforeBlocks = useMemo(() => session?.mode === 'block' && session.before ? splitMemoryBlocks(session.before) : [], [session?.mode, session?.before]);
  const afterBlocks = useMemo(() => session?.mode === 'block' && session.after ? splitMemoryBlocks(session.after) : [], [session?.mode, session?.after]);

  return <section
    className="management-page creative-memory-page"
    aria-label="创作记忆"
    onCompositionStart={e => { if (e.target instanceof HTMLTextAreaElement) draft.composition(true); }}
    onCompositionEnd={e => { if (e.target instanceof HTMLTextAreaElement) draft.composition(false); }}
    onKeyDown={e => { if (!e.nativeEvent.isComposing) saveShortcut(e.nativeEvent, () => { void save(); }); }}
  >
    <header className="creative-memory-bar">
      <div className="cm-bar-leading">
        {onBack && <button type="button" className="cm-back" onClick={onBack}>‹ {backLabel}</button>}
        <h2>创作记忆</h2>
        {headings.length > 0 && session?.mode !== 'full' && <details className="menu cm-toc-popover">
          <summary aria-label="展开条目目录">目录 <span>{headings.length}</span></summary>
          <div className="menu-panel cm-toc-panel">
            {headings.map(item => <button type="button" key={item.id} className={`outline-level-${item.level}`} title={item.title} onClick={e => jumpToHeading(item.id, e.currentTarget)}>{item.title}</button>)}
          </div>
        </details>}
        <span role="status" className={`cm-status ${hasError ? 'error-text' : ''}`}>{statusText}</span>
      </div>
      <div className="cm-bar-actions">
        <button type="button" className="cm-add-btn" disabled={busy} onClick={appendSection}>＋ 新增条目</button>
        <button type="button" className="cm-raw-btn" aria-pressed={session?.mode === 'full'} disabled={busy} onClick={openFullEditor}>
          {session?.mode === 'full' ? '完成编辑' : '全文编辑'}
        </button>
        <button type="button" className={needsSave ? 'primary cm-save-btn' : 'cm-save-btn is-saved'} disabled={busy || saving || !needsSave} onClick={() => void save()}>
          {draft.base.legacy ? '保存为创作记忆' : '保存记忆'}
        </button>
        <input ref={fileInputRef} type="file" className="cm-hidden-file" aria-label="导入创作记忆" accept=".md,.txt,.json,text/plain,text/markdown,application/json" disabled={busy} onChange={handleImport}/>
        <details ref={moreMenuRef} className="menu cm-more-menu">
          <summary aria-label="创作记忆更多操作" title="导入、导出与旧版预设">···</summary>
          <div className="menu-panel">
            <button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>导入文件（.md / .txt / 预设）</button>
            <button type="button" disabled={!draft.base.content || busy || saving || draft.dirty} onClick={() => { moreMenuRef.current?.removeAttribute('open'); downloadFile({filename:'memory.md', mime:'text/markdown;charset=utf-8', content:draft.base.content}); }}>导出 Markdown</button>
            <button type="button" disabled={busy} onClick={() => { moreMenuRef.current?.removeAttribute('open'); onLegacy(); }}>旧版预设</button>
          </div>
        </details>
      </div>
    </header>

    <div className="management-scroll cm-scroll" ref={scrollRef}>
      <div className="management-document creative-memory-document">
        {draft.base.legacy && <div className="cm-legacy-banner" role="note">已带入旧版预设中启用的条目；点击段落可直接修改，确认后点右上角「保存为创作记忆」即可转为本书记忆。</div>}
        {draft.phase === 'conflict' && draft.remote && <div className="cm-legacy-banner" role="alert">
          <span>你与 AI 或其他窗口同时修改了同一处记忆，本地草稿已保留。</span>
          <div className="row compact">
            <button type="button" className="primary" disabled={saving} onClick={draft.overwriteWithLocal}>保留当前草稿并保存</button>
            <button type="button" disabled={saving} onClick={() => { if (draft.remote) { lastComposedRef.current = null; draft.accept(draft.remote); setSession(null); } }}>采用最新已保存版本</button>
          </div>
        </div>}
        <div className={`creative-memory-layout ${headings.length > 0 && session?.mode !== 'full' ? 'has-outline' : ''}`}>
          {headings.length > 0 && session?.mode !== 'full' && <aside className="creative-memory-outline" aria-label="创作记忆目录">
            <div className="creative-memory-outline-title"><span>目录</span><small>{headings.length}</small></div>
            <nav className="cm-outline-nav">
              {headings.map(item => <button type="button" key={item.id} className={`outline-level-${item.level}`} title={item.title} onClick={() => jumpToHeading(item.id)}>{item.title}</button>)}
            </nav>
          </aside>}

          <div className="creative-memory-main">
            {session?.mode === 'full' ? (
              <div className="cm-full-editor">
                <AutosizeBlockEditor
                  value={session.raw}
                  disabled={busy}
                  placeholder={'## 叙事与文风\n\n写下这本书已经定下、后续章节还要遵守的视角、语气或伏笔约定…'}
                  onChange={updateSessionRaw}
                  onCommit={commitSession}
                  onSaveShortcut={() => { void save(); }}
                  onComposition={draft.composition}
                  onAbortComposition={draft.abortComposition}
                />
                <div className="cm-editor-foot"><span>支持 Markdown 二三级标题（##）自动生成目录 · 按 Esc 完成</span><button type="button" onClick={commitSession}>完成</button></div>
              </div>
            ) : session?.mode === 'block' ? (
              <article className="cm-surface" aria-label="创作记忆预览">
                {beforeBlocks.map((block, idx) => (
                  <div key={`b-${idx}`} id={block.headingId || undefined} data-heading-id={block.headingId || undefined} className="cm-block cm-block-reading" onClick={e => openBlock(idx, e)} title="点击直接修改这一节">
                    <button type="button" className="cm-block-edit-pill" aria-label={`编辑 ${block.title}`} onClick={e => { e.stopPropagation(); openBlock(idx); }}>编辑</button>
                    <MarkdownReading className="cm-block-markdown" text={block.raw}/>
                  </div>
                ))}
                <div className="cm-block cm-block-editing" id={session.headingId || undefined} data-heading-id={session.headingId || undefined}>
                  <AutosizeBlockEditor
                    value={session.raw}
                    disabled={busy}
                    autoSelectHeading={session.selectHeading}
                    placeholder={'## 条目标题\n\n写下约定内容…'}
                    onChange={updateSessionRaw}
                    onCommit={commitSession}
                    onSaveShortcut={() => { void save(); }}
                    onComposition={draft.composition}
                    onAbortComposition={draft.abortComposition}
                  />
                  <div className="cm-editor-foot">
                    <span>点击外部或按 Esc 完成修改</span>
                    <div>
                      <button type="button" className="danger" onClick={() => {
                        draft.abortComposition();
                        const next = joinParts(session.before, '', session.after);
                        lastComposedRef.current = next;
                        draft.change(next);
                        setSession(null);
                      }}>删除此节</button>
                      <button type="button" onClick={commitSession}>完成</button>
                    </div>
                  </div>
                </div>
                {afterBlocks.map((block, idx) => {
                  const realIndex = beforeBlocks.length + 1 + idx;
                  return (
                    <div key={`a-${idx}`} id={block.headingId || undefined} data-heading-id={block.headingId || undefined} className="cm-block cm-block-reading" onClick={e => openBlock(realIndex, e)} title="点击直接修改这一节">
                      <button type="button" className="cm-block-edit-pill" aria-label={`编辑 ${block.title}`} onClick={e => { e.stopPropagation(); openBlock(realIndex); }}>编辑</button>
                      <MarkdownReading className="cm-block-markdown" text={block.raw}/>
                    </div>
                  );
                })}
                <button type="button" className="cm-append-card" disabled={busy} onClick={appendSection}>＋ 新增一条记忆约定</button>
              </article>
            ) : blocks.length > 0 ? (
              <article className="cm-surface" aria-label="创作记忆预览">
                {blocks.map(block => (
                  <div
                    key={block.index}
                    id={block.headingId || undefined}
                    data-heading-id={block.headingId || undefined}
                    className="cm-block cm-block-reading"
                    onClick={e => openBlock(block.index, e)}
                    title="点击直接修改这一节"
                  >
                    <button type="button" className="cm-block-edit-pill" aria-label={`编辑 ${block.title}`} onClick={e => { e.stopPropagation(); openBlock(block.index); }}>编辑</button>
                    <MarkdownReading className="cm-block-markdown" text={block.raw}/>
                  </div>
                ))}
                <button type="button" className="cm-append-card" disabled={busy} onClick={appendSection}>＋ 新增一条记忆约定</button>
              </article>
            ) : (
              <div className="cm-empty-surface" role="button" tabIndex={0} onClick={openFullEditor} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFullEditor(); } }}>
                <strong>还没有创作记忆</strong>
                <p>和 AI 聊定的文风、叙述视角与跨章伏笔会自动记在这里；也可以直接点击此处开始书写。</p>
                <div className="cm-empty-actions" onClick={e => e.stopPropagation()}>
                  <button type="button" className="primary" onClick={appendSection}>＋ 写下第一条记忆</button>
                  <button type="button" onClick={() => fileInputRef.current?.click()}>导入 Markdown / 预设</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </section>;
}
