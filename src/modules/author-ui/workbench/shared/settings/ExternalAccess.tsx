import React, { useEffect, useRef, useState } from 'react';
import { grantLevels } from '../../../../collaboration/grants/permissions.ts';
import { Modal } from '../Modal.tsx';
import { Icon } from '../icons.tsx';
import { type FeatureCall, useWorkspaceResource } from '../workspace-state.ts';
import { useSurfaceActivity } from '../surface-activity.ts';
import { SettingsAction } from './SettingsRow.tsx';
import {
  BookPicker,
  describeMcpAction,
  describeMcpError,
  PermissionRows,
  permissionSummary,
  scopeText,
  type Book,
  type Connection,
} from './connection-fields.tsx';
import { connectionStyles } from './connection-styles.ts';

interface Snapshot {
  libraryRoot: string;
  profiles: Connection[];
}
interface Log {
  time: string;
  action: string;
  ok: boolean;
  code?: string;
  novelId?: string;
}
type Editor = {
  kind: 'create' | 'edit';
  id?: string;
  base: number;
  root: string;
  name: string;
  books: string[] | null;
  permissions: Connection['permissions'];
};

export function ExternalAccessSettings({ call }: { call: FeatureCall }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsAction
        icon="link"
        title="MCP 连接管理"
        description="授权 Claude、Cursor 等外部 AI 客户端读写指定作品。"
        actionLabel="管理"
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal title="MCP 连接管理" className="mcp-manager-modal" close={() => setOpen(false)}>
          <ConnectionsManager call={call} />
        </Modal>
      )}
    </>
  );
}

export function ConnectionsManager({ call }: { call: FeatureCall }) {
  const [selected, select] = useState(''),
    [mobile, setMobile] = useState(false),
    [tick, pulse] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null),
    [deletion, setDeletion] = useState<Connection | null>(null);
  const [tab, setTab] = useState<'permissions' | 'records' | 'config'>('permissions'),
    [scopeOpen, setScopeOpen] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  const active = useSurfaceActivity(),
    saving = useRef(false);
  const createAttempt = useRef<{ signature: string; requestId: string } | null>(null);
  useEffect(() => {
    if (!active) return;
    const refresh = () => {
      if (!document.hidden) pulse((v) => v + 1);
    };
    const timer = setInterval(refresh, 2000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [active]);
  const state = useWorkspaceResource<Snapshot>(() => call('external.status'), [call, tick], [call]);
  const root = state.value?.libraryRoot ?? '';
  const catalogue = useWorkspaceResource<Book[]>(() => call('novel.list'), [call, root, tick], [call, root]);
  const books = catalogue.value ?? [],
    profiles = state.value?.profiles ?? [];
  const p = selected ? profiles.find((x) => x.id === selected) : profiles[0];
  const logs = useWorkspaceResource<Log[]>(
    async () => (tab === 'records' && p ? (await call('external.records', { id: p.id, limit: 50 })).items : []),
    [call, p?.id, tab, tick],
    [call, p?.id, tab],
  );
  const editTarget = editor?.kind === 'edit' ? profiles.find((row) => row.id === editor.id) : undefined;
  const stale =
    !!editor && (root !== editor.root || (editor.kind === 'edit' && editor.base !== editTarget?.revision));
  function pick(id: string) {
    select(id);
    setMobile(true);
    setTab('permissions');
    setScopeOpen(false);
    setError('');
    setCopied(false);
  }
  function edit(row?: Connection) {
    createAttempt.current = null;
    setError('');
    setEditor({
      kind: row ? 'edit' : 'create',
      id: row?.id,
      base: row?.revision ?? 0,
      root,
      name: row?.name ?? '',
      books: row ? row.novelIds : [],
      permissions: row?.permissions ?? grantLevels(['manuscript']),
    });
  }
  async function mutate(action: string, args: Record<string, unknown>, after?: (result: Connection) => void) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await call(action, { ...args, __libraryRoot: root });
      after?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      try {
        await state.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      saving.current = false;
      setBusy(false);
    }
  }
  function saveEditor() {
    if (!editor || stale) return;
    const data = { name: editor.name.trim(), novelIds: editor.books, permissions: editor.permissions };
    const creating = editor.kind === 'create';
    if (creating && createAttempt.current?.signature !== JSON.stringify(data))
      createAttempt.current = { signature: JSON.stringify(data), requestId: crypto.randomUUID() };
    void mutate(
      creating ? 'external.create' : 'external.update',
      creating
        ? { ...data, requestId: createAttempt.current!.requestId }
        : { ...data, id: editor.id, expectedRevision: editor.base },
      (saved) => {
        setEditor(null);
        pick(saved.id);
      },
    );
  }
  const note = error || state.error || catalogue.error;
  return (
    <section className="mcp-manager" aria-label="外部连接管理">
      <style>{connectionStyles}</style>
      <div className="mcp-toolbar">
        <strong>
          长期连接 <small>{profiles.length}</small>
        </strong>
        <button className="primary" disabled={!root || busy} onClick={() => edit()}>
          ＋ 新建连接
        </button>
      </div>
      {note && !editor && (
        <p role="alert" className="notice error">
          {note}
        </p>
      )}
      {!state.value && !state.error && <p role="status">正在读取连接…</p>}
      {state.value && (
        <div className={'mcp-layout ' + (mobile && p ? 'mcp-detail-open' : '')}>
          <nav aria-label="连接列表">
            {profiles.map((row) => (
              <button
                key={row.id}
                title={row.name}
                className={!row.enabled ? 'is-disabled' : undefined}
                aria-current={row.id === p?.id}
                onClick={() => pick(row.id)}
              >
                <Icon name="person" />
                <span>
                  <strong>{row.name}</strong>
                  <small title={row.enabled ? scopeText(row, root, books) : undefined}>
                    {row.enabled ? scopeText(row, root, books) : '已停用'}
                  </small>
                  <small className="mcp-nav-perms">{permissionSummary(row.permissions)}</small>
                </span>
              </button>
            ))}
            {!profiles.length && <p>还没有长期连接</p>}
          </nav>
          {p ? (
            <article aria-label={'外部连接 ' + p.name}>
              <button className="mcp-back" onClick={() => setMobile(false)}>
                ‹ 连接列表
              </button>
              <header>
                <div>
                  <h3>{p.name}</h3>
                  <small>
                    {p.libraryRoot === root ? '当前作品库' : '其他作品库'} · v{p.revision}
                  </small>
                </div>
                <label className="mcp-enable-switch">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={'启用连接 ' + p.name}
                    checked={p.enabled}
                    disabled={busy}
                    onChange={() =>
                      void mutate('external.update', {
                        id: p.id,
                        expectedRevision: p.revision,
                        enabled: !p.enabled,
                      })
                    }
                  />
                  <span>{p.enabled ? '已启用' : '已停用'}</span>
                </label>
              </header>
              <div className="mcp-tabs">
                {(
                  [
                    ['permissions', '权限'],
                    ['records', '调用记录'],
                    ['config', '客户端配置'],
                  ] as const
                ).map(([v, title]) => (
                  <button
                    key={v}
                    aria-pressed={tab === v}
                    onClick={() => {
                      setTab(v);
                      setCopied(false);
                    }}
                  >
                    {title}
                  </button>
                ))}
              </div>
              {tab === 'permissions' && (
                <>
                  <div className="mcp-scope-box">
                    <div className="mcp-scope">
                      <Icon name="folder" />
                      <div>
                        <small>作品范围</small>
                        <strong>{scopeText(p, root, books)}</strong>
                      </div>
                      {books.length > 0 && root === p.libraryRoot && (
                        <button
                          type="button"
                          className="quiet"
                          aria-expanded={scopeOpen}
                          disabled={busy}
                          onClick={() => setScopeOpen((v) => !v)}
                        >
                          {scopeOpen ? '收起选书' : '快速选书'}
                        </button>
                      )}
                      <button disabled={busy || root !== p.libraryRoot} onClick={() => edit(p)}>
                        编辑连接
                      </button>
                    </div>
                    {scopeOpen && root === p.libraryRoot && (
                      <div className="mcp-inline-books">
                        <label>
                          <input
                            type="checkbox"
                            checked={p.novelIds === null}
                            disabled={busy || (p.novelIds !== null && books.length === 0)}
                            onChange={() =>
                              void mutate('external.update', {
                                id: p.id,
                                expectedRevision: p.revision,
                                novelIds: p.novelIds === null ? (books[0] ? [books[0].id] : null) : null,
                              })
                            }
                          />
                          整个作品库（含后续新增作品）
                        </label>
                        {p.novelIds !== null && (
                          <div className="mcp-inline-book-grid">
                            {books.map((b) => {
                              const checked = p.novelIds!.includes(b.id);
                              const sole = checked && p.novelIds!.length <= 1;
                              return (
                                <label key={b.id} title={sole ? '至少保留一部作品' : undefined}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={busy || sole}
                                    onChange={() =>
                                      void mutate('external.update', {
                                        id: p.id,
                                        expectedRevision: p.revision,
                                        novelIds: checked
                                          ? p.novelIds!.filter((id) => id !== b.id)
                                          : [...p.novelIds!, b.id],
                                      })
                                    }
                                  />
                                  {b.title}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <PermissionRows
                    value={p.permissions}
                    disabled={busy}
                    change={(m, level) =>
                      void mutate('external.update', {
                        id: p.id,
                        expectedRevision: p.revision,
                        permissions: { [m]: level },
                      })
                    }
                  />
                  <div className="mcp-tail">
                    <button className="danger" disabled={busy} onClick={() => setDeletion(p)}>
                      删除连接
                    </button>
                  </div>
                </>
              )}
              {tab === 'config' && (
                <div className="mcp-pane">
                  <p>将这份配置加入助手的 MCP 客户端。同一连接修改授权后可继续使用。</p>
                  <textarea
                    rows={9}
                    readOnly
                    spellCheck={false}
                    aria-label={p.name + '的MCP客户端配置'}
                    value={JSON.stringify(p.clientConfig, null, 2)}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(p.clientConfig, null, 2));
                        setCopied(true);
                      } catch {
                        setError('请选中配置文本后复制。');
                      }
                    }}
                  >
                    {copied ? '已复制' : '复制配置'}
                  </button>
                </div>
              )}
              {tab === 'records' && (
                <div className="mcp-pane" aria-label={p.name + '的调用记录'}>
                  {logs.error ? (
                    <p role="alert">{logs.error}</p>
                  ) : logs.value?.length ? (
                    logs.value.map((row, i) => {
                      const bookTitle = row.novelId ? books.find((b) => b.id === row.novelId)?.title : undefined;
                      return (
                        <div className="mcp-log" key={i}>
                          <time>{new Date(row.time).toLocaleTimeString()}</time>
                          <strong>{describeMcpAction(row.action)}</strong>
                          <code>{row.action}</code>
                          {bookTitle && <small className="mcp-log-book">《{bookTitle}》</small>}
                          <span className={row.ok ? 'is-ok' : 'is-err'}>
                            {row.ok ? '成功' : describeMcpError(row.code)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p>{logs.loading ? '正在读取…' : '暂无调用记录'}</p>
                  )}
                </div>
              )}
            </article>
          ) : (
            <div className="mcp-empty">
              {profiles.length ? '请选择要管理的连接。' : '新建连接后，可以在这里为助手选择作品和权限。'}
            </div>
          )}
        </div>
      )}
      {editor && (
        <Modal
          title={editor.kind === 'create' ? '新建长期连接' : '编辑连接'}
          className="mcp-edit-modal"
          close={() => {
            if (!busy) setEditor(null);
          }}
        >
          <form
            className="mcp-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveEditor();
            }}
          >
            <div className="mcp-fields">
              <label>
                助手名称
                <input
                  value={editor.name}
                  autoFocus
                  maxLength={100}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                />
              </label>
              <BookPicker value={editor.books} books={books} change={(v) => setEditor({ ...editor, books: v })} />
              <PermissionRows
                value={editor.permissions}
                change={(m, v) => setEditor({ ...editor, permissions: { ...editor.permissions, [m]: v } })}
              />
              {note && (
                <p role="alert" className="notice error">
                  {note}
                </p>
              )}
              {stale && (
                <p role="status">
                  连接配置已变化。
                  {editTarget && root === editor.root ? (
                    <button type="button" onClick={() => edit(editTarget)}>
                      载入最新配置
                    </button>
                  ) : (
                    '请返回列表重新选择。'
                  )}
                </p>
              )}
            </div>
            <footer>
              <button type="button" disabled={busy} onClick={() => setEditor(null)}>
                取消
              </button>
              <button
                className="primary"
                disabled={stale || busy || !editor.name.trim() || editor.books?.length === 0}
              >
                {editor.kind === 'create' ? '创建连接' : '保存'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {deletion && (
        <Modal title="删除连接" className="mcp-edit-modal" close={() => setDeletion(null)}>
          <p>删除后，「{deletion.name}」的客户端配置会立即失效。</p>
          <div className="mcp-tail">
            <button onClick={() => setDeletion(null)}>取消</button>
            <button
              className="danger"
              disabled={busy}
              onClick={() => {
                setDeletion(null);
                void mutate('external.revoke', { id: deletion.id, expectedRevision: deletion.revision }, () => {
                  select('');
                  setMobile(false);
                  setTab('permissions');
                });
              }}
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
