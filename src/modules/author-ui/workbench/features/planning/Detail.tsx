import type { FeatureServices } from '../../shared/workspace-state.ts';
import type { usePlanningWorkspace } from './usePlanningWorkspace.ts';
import type { PlanningNode } from '../../../../workspace/planning/types.ts';
type DetailProps = Omit<FeatureServices, 'tick'> &
  Pick<
    ReturnType<typeof usePlanningWorkspace>,
    'nodes' | 'edges' | 'groups' | 'transact' | 'refreshWritten' | 'continueFrom' | 'close'
  > & {
    id: string;
    latest?: ReturnType<typeof usePlanningWorkspace>['nodes'][number];
    onChapter: (id: string) => void;
    onMemory: (id: string) => void;
    onEnter: () => void;
    onSelect: (id: string) => void;
  };
import React, { useEffect, useState } from 'react';
import { DetailActions } from '../../shared/detail-page.tsx';
import { DocumentTextarea } from '../../shared/workspace.tsx';
import { GroupSelect } from '../../shared/groups.tsx';
import { useResource } from '../../shared/state.ts';
import { useDocumentDraft } from '../../shared/document-editor.tsx';
import { ResourceState, saveShortcut } from '../../shared/ui.tsx';
import { useDialog } from '../../dialog.tsx';
import { ChapterEvidence } from '../../shared/evidence.tsx';
import { statusNames, scopeNames } from './model.ts';
import { DocumentHeading, DocumentBody, type ArchiveChip } from '../../shared/DocumentPresentation.tsx';
import { CardComparison } from '../../shared/CardComparison.tsx';
import { CardGallery } from '../../shared/CardImages.tsx';
import { Icon } from '../../shared/icons.tsx';

const editorFields = [
  'title',
  'summary',
  'content',
  'groupId',
  'scope',
  'status',
  'parentId',
  'threads',
  'chapterRefs',
  'memoryRefs',
];

export function PlanningDetail(props: DetailProps) {
  const resource = useResource(
    () => props.call('planning.get', { novelId: props.novelId, nodeId: props.id }),
    [props.call, props.novelId, props.id, props.latest?.revision],
  );
  return (
    <ResourceState resource={resource}>
      {resource.value && <PlanningEditor {...props} initial={resource.value.node} />}
    </ResourceState>
  );
}

function PlanningEditor({
  call,
  novelId,
  run,
  busy,
  id,
  initial,
  latest,
  nodes,
  edges,
  groups,
  transact,
  refreshWritten,
  close,
  onChapter,
  onMemory,
  onEnter,
  continueFrom,
  onSelect,
}: DetailProps & { initial: PlanningNode }) {
  const { value, base, change, accept, dirty, cacheError, save, remoteChanged, conflictDialog } =
    useDocumentDraft<PlanningNode>({
      key: `${novelId}:planning:${id}`,
      initial,
      busy,
      run,
      fields: editorFields,
      load: async () => (await call('planning.get', { novelId, nodeId: id })).node,
      persist: async (patch, remote) => {
        await call('planning.apply', {
          novelId,
          requestId: crypto.randomUUID(),
          reason: `修改 ${patch.title || value.title}`,
          operations: [{ op: 'node.update', id, expectedRevision: remote.revision, value: patch }],
        });
        const result = (await call('planning.get', { novelId, nodeId: id })).node;
        await refreshWritten();
        return result;
      },
      saved: () => setEditing(false),
    });
  const { confirm, ask } = useDialog();
  const refs = useResource<
    [{ id: string; title: string; revision: number }[], { id: string; name: string; type?: string }[]]
  >(() => Promise.all([call('chapter.list', { novelId }), call('graph.list', { novelId })]), [call, novelId]);
  const [chapters = [], memory = []] = refs.value || [];
  const [target, setTarget] = useState(''),
    [referenceQuery, setReferenceQuery] = useState(''),
    [editing, setEditing] = useState(dirty),
    [comparing, setComparing] = useState(false),
    [edgeManagerOpen, setEdgeManagerOpen] = useState(false);
  const [threadText, setThreadText] = useState(value.threads.join(', '));
  useEffect(() => setThreadText(value.threads.join(', ')), [base]);
  const set = (key: keyof PlanningNode, v: unknown) => change((old) => ({ ...old, [key]: v }));
  const reload = () => run(async () => accept((await call('planning.get', { novelId, nodeId: id })).node));
  const adjacent = (direction: 'before' | 'after') =>
    edges
      .filter((e) => (direction === 'before' ? e.to === id : e.from === id))
      .map((e) => nodes.find((n) => n.id === (direction === 'before' ? e.from : e.to)))
      .filter((n) => n !== undefined);

  const quickChangeStatus = (next: PlanningNode['status']) => {
    if (next === value.status) return;
    if (dirty) {
      set('status', next);
      return;
    }
    void run(async () => {
      await call('planning.apply', {
        novelId,
        requestId: crypto.randomUUID(),
        reason: `更新进展为 ${statusNames[next]}`,
        operations: [{ op: 'node.update', id, expectedRevision: base.revision, value: { status: next } }],
      });
      const updated = (await call('planning.get', { novelId, nodeId: id })).node;
      accept(updated);
      await refreshWritten();
    });
  };

  const restoreVersion = async (revision: number) => {
    if (
      !(await confirm(
        `${dirty ? '先保存当前草稿，再恢复' : '恢复规划'}到 v${revision}？当前内容会保留在历史中。`,
      ))
    )
      return;
    let expectedRevision = base.revision;
    if (dirty) {
      const result = await save();
      if (!result) return;
      expectedRevision = result.revision;
    }
    await run(async () => {
      const result = await call('planning.node.restore', {
        novelId,
        nodeId: id,
        expectedRevision,
        targetRevision: revision,
        requestId: crypto.randomUUID(),
        reason: `从 v${revision} 恢复卡片内容`,
      });
      accept(result.node);
      await refreshWritten();
      setEditing(false);
      setComparing(false);
    });
  };

  if (comparing)
    return (
      <div className="entry-document is-comparing">
        <CardComparison
          {...{ call, novelId, busy, dirty }}
          kind="planning"
          draft={value}
          referenceName={(ref) =>
            chapters.find((c) => c.id === ref)?.title ||
            memory.find((n) => n.id === ref)?.name ||
            '已移除的引用'
          }
          close={() => setComparing(false)}
          restore={restoreVersion}
        />
        {conflictDialog}
      </div>
    );

  const parentNode = value.parentId ? nodes.find((n) => n.id === value.parentId) : undefined;
  const headerChips: ArchiveChip[] = [
    ...(parentNode ? [{ label: `所属：${parentNode.title}` }] : []),
    ...(value.scope && value.scope !== 'unspecified' ? [{ label: `${scopeNames[value.scope]}范围` }] : []),
    ...value.threads.map((t) => ({ label: `# ${t}` })),
  ];
  const beforeNodes = adjacent('before');
  const afterNodes = adjacent('after');
  const connectedEdges = edges.filter((e) => e.from === id || e.to === id);

  return (
    <div
      className="entry-document"
      onKeyDown={(e) =>
        saveShortcut(e, () => {
          if (dirty && !busy) save();
        })
      }
    >
      {!editing && (
        <DocumentHeading
          title={value.title}
          kind="情节规划"
          kindIcon="plan"
          group={groups.find((g) => g.id === value.groupId)?.name || '当前画布'}
          statusSlot={
            <label className={`detail-status-pill status-${value.status}`} title="点击切换讨论进展">
              <i className="detail-chip-dot" aria-hidden="true" />
              <select
                aria-label="快捷切换进展"
                disabled={busy || value.deleted}
                value={value.status}
                onChange={(e) => quickChangeStatus(e.target.value as PlanningNode['status'])}
              >
                {Object.entries(statusNames).map(([v, l]) => {
                  const needChapter = v === 'written' && value.chapterRefs.length === 0 && value.status !== 'written';
                  return (
                    <option key={v} value={v} disabled={needChapter}>
                      {needChapter ? `${l}（需关联章节）` : l}
                    </option>
                  );
                })}
              </select>
              <span className="detail-status-caret" aria-hidden="true">
                ▾
              </span>
            </label>
          }
          chips={headerChips}
          summary={value.summary}
          updatedAt={value.updatedAt}
          revision={value.revision}
        />
      )}
      <DetailActions>
        {(editing || dirty) && (
          <>
            <small className="document-save-state" role="status">
              {dirty ? '草稿待保存' : '已保存'}
            </small>
            <button
              className="primary"
              disabled={busy || !dirty || !value.title.trim() || value.deleted}
              onClick={save}
            >
              保存规划
            </button>
          </>
        )}
        <button disabled={busy} onClick={() => setComparing(true)}>
          改动对比
        </button>
        <button disabled={busy} onClick={() => setEditing(!editing)}>
          {editing ? '阅读预览' : '编辑规划'}
        </button>
        <details className="menu detail-more-menu">
          <summary aria-label="规划条目更多操作" title="更多操作">
            ···
          </summary>
          <div className="menu-panel">
            <button type="button" disabled={busy || dirty || value.deleted} onClick={onEnter}>
              新建子情节
            </button>
            <button type="button" onClick={() => setEdgeManagerOpen((v) => !v)}>
              {edgeManagerOpen ? '收起连线管理' : '调整连线…'}
            </button>
            <button
              type="button"
              onClick={() => run(() => navigator.clipboard.writeText(`规划：${value.title} [规划节点: ${id}]`))}
            >
              复制节点引用
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!dirty || (await confirm('丢弃本地草稿并读取最新规划？'))) reload();
              }}
            >
              读取最新
            </button>
            <div className="detail-more-divider" />
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={async () => {
                let childPolicy: 'detach' | 'subtree' = 'detach';
                if (nodes.some((n) => n.parentId === id)) {
                  const choice = await ask('输入“移出”保留子节点，或“子树”删除全部下级', '移出');
                  if (!choice || !['移出', '子树'].includes(choice)) return;
                  childPolicy = choice === '子树' ? 'subtree' : 'detach';
                }
                if (await confirm('删除此规划及相关连线？可在修改记录中撤销。')) {
                  const ok = await transact(
                    [{ op: 'node.delete', id, expectedRevision: base.revision, confirm: true, childPolicy }],
                    '删除规划',
                  );
                  if (ok) {
                    accept(initial);
                    close();
                  }
                }
              }}
            >
              删除此条规划
            </button>
          </div>
        </details>
      </DetailActions>
      {remoteChanged && <p className="notice">作品有新修改，输入已保留。保存时会合并互不影响的内容。</p>}
      {cacheError && (
        <p className="notice error" role="alert">
          {cacheError}
        </p>
      )}
      {value.deleted && <p className="notice">此规划已删除，可在历史中撤销删除。</p>}
      <CardGallery kind="planning" nodeId={id} disabled={busy || value.deleted} />
      {editing ? (
        <fieldset className="editor-fields document-fields detail-edit-card" disabled={busy || value.deleted}>
          <label>
            标题
            <input value={value.title} onChange={(e) => set('title', e.target.value)} />
          </label>
          <label>
            摘要
            <DocumentTextarea
              aria-label="摘要"
              value={value.summary}
              onChange={(e) => set('summary', e.target.value)}
            />
          </label>
          <label>
            正文
            <DocumentTextarea
              aria-label="正文"
              className="prose"
              value={value.content}
              onChange={(e) => set('content', e.target.value)}
            />
          </label>
          <details className="section-fold">
            <summary>属性与分组</summary>
            <div className="detail-edit-grid">
              <label>
                讨论进展
                <select value={value.status} onChange={(e) => set('status', e.target.value)}>
                  {Object.entries(statusNames).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                范围
                <select value={value.scope} onChange={(e) => set('scope', e.target.value)}>
                  {Object.entries(scopeNames).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                所属阶段
                <select value={value.parentId || ''} onChange={(e) => set('parentId', e.target.value || null)}>
                  <option value="">当前画布根目录</option>
                  {nodes
                    .filter((n) => n.id !== id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                故事线（逗号分隔）
                <input
                  value={threadText}
                  onChange={(e) => {
                    setThreadText(e.target.value);
                    set('threads', [
                      ...new Set(
                        e.target.value
                          .split(/[,，]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      ),
                    ]);
                  }}
                />
              </label>
            </div>
            <GroupSelect groups={groups} value={value.groupId} onChange={(id) => set('groupId', id)} />
          </details>
          <details className="section-fold">
            <summary>关联正文与人物设定</summary>
            {value.chapterRefs.map((r) => (
              <p key={r.chapterId}>
                {chapters.find((c) => c.id === r.chapterId)?.title || '已删除或缺失章节'} · 版本{r.revision}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      'chapterRefs',
                      value.chapterRefs.filter((x) => x.chapterId !== r.chapterId),
                    )
                  }
                >
                  移除
                </button>
              </p>
            ))}
            {value.memoryRefs.map((refId) => (
              <p key={refId}>
                {memory.find((n) => n.id === refId)?.name || '已删除或缺失设定'}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      'memoryRefs',
                      value.memoryRefs.filter((x) => x !== refId),
                    )
                  }
                >
                  移除
                </button>
              </p>
            ))}
            <input
              aria-label="筛选关联资料"
              placeholder="搜索章节或设定"
              value={referenceQuery}
              onChange={(e) => setReferenceQuery(e.target.value)}
            />
            {chapters
              .filter((c) => c.title.includes(referenceQuery))
              .map((c) => (
                <label className="row" key={c.id}>
                  <input
                    type="checkbox"
                    checked={value.chapterRefs.some((r) => r.chapterId === c.id)}
                    onChange={(e) =>
                      set(
                        'chapterRefs',
                        e.target.checked
                          ? [...value.chapterRefs, { chapterId: c.id, revision: c.revision }]
                          : value.chapterRefs.filter((r) => r.chapterId !== c.id),
                      )
                    }
                  />
                  {c.title}
                  <button type="button" onClick={() => onChapter(c.id)}>
                    打开
                  </button>
                  {value.chapterRefs.some((r) => r.chapterId === c.id && r.revision !== c.revision) && (
                    <span>正文版本已变化</span>
                  )}
                </label>
              ))}
            {memory
              .filter((n) => n.name.includes(referenceQuery))
              .map((n) => (
                <label className="row" key={n.id}>
                  <input
                    type="checkbox"
                    checked={value.memoryRefs.includes(n.id)}
                    onChange={(e) =>
                      set(
                        'memoryRefs',
                        e.target.checked
                          ? [...value.memoryRefs, n.id]
                          : value.memoryRefs.filter((v) => v !== n.id),
                      )
                    }
                  />
                  {n.name}
                </label>
              ))}
          </details>
        </fieldset>
      ) : (
        <section className="planning-reading">
          <DocumentBody
            text={value.content}
            empty="尚未填写详细规划"
            onQuickEdit={!busy && !value.deleted ? () => setEditing(true) : undefined}
          />
        </section>
      )}

      <section className="detail-rel-section" aria-label="情节前后关系">
        <header className="detail-rel-head">
          <h3>
            上下游剧情推进 <small>{beforeNodes.length + afterNodes.length}</small>
          </h3>
          <div className="detail-rel-head-actions">
            <button type="button" disabled={busy || dirty || value.deleted} onClick={onEnter}>
              ＋ 子情节
            </button>
            <button
              type="button"
              disabled={busy || dirty || value.deleted}
              title={dirty ? '先保存当前节点，再继续推进' : undefined}
              onClick={() => continueFrom(latest || base)}
            >
              ＋ 接着推进
            </button>
          </div>
        </header>
        <div className="detail-flow-grid flow-context">
          <div className="detail-flow-box">
            <span className="detail-flow-label">← 从哪里来（前置事件）</span>
            {beforeNodes.length ? (
              <div className="detail-flow-items">
                {beforeNodes.map((n) => (
                  <button key={n.id} type="button" className="detail-flow-item" onClick={() => onSelect(n.id)}>
                    <span>{n.title}</span>
                    <small aria-hidden="true">{statusNames[n.status]} ›</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="detail-flow-none">这条路线的起点</p>
            )}
          </div>
          <div className="detail-flow-box">
            <span className="detail-flow-label">接下来去哪（后续推进） →</span>
            {afterNodes.length ? (
              <div className="detail-flow-items">
                {afterNodes.map((n) => (
                  <button key={n.id} type="button" className="detail-flow-item" onClick={() => onSelect(n.id)}>
                    <span>{n.title}</span>
                    <small aria-hidden="true">{statusNames[n.status]} ›</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="detail-flow-none">等待讨论下一步</p>
            )}
          </div>
        </div>
        {edgeManagerOpen && (
          <div className="detail-quick-connect">
            {connectedEdges.map((e) => (
              <div key={e.id} className="source-row" style={{ width: '100%' }}>
                <span>
                  {nodes.find((n) => n.id === e.from)?.title} → {nodes.find((n) => n.id === e.to)?.title}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (await confirm('删除这条规划关系？'))
                      transact(
                        [{ op: 'edge.delete', id: e.id, expectedRevision: e.revision, confirm: true }],
                        '删除规划关系',
                      );
                  }}
                >
                  移除
                </button>
              </div>
            ))}
            <select aria-label="目标规划" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">选择后续目标节点…</option>
              {nodes
                .filter((n) => n.id !== id)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={busy || !target}
              onClick={() =>
                transact([{ op: 'edge.create', value: { from: id, to: target, type: 'next' } }], '建立剧情关系')
              }
            >
              连接
            </button>
          </div>
        )}
      </section>

      {!editing && (value.memoryRefs.length > 0 || value.chapterRefs.length > 0) && (
        <section className="detail-meta-section" aria-label="关联设定与正文">
          {value.memoryRefs.length > 0 && (
            <div className="detail-pill-group">
              <span>涉及设定</span>
              {value.memoryRefs.map((ref) => {
                const targetNode = memory.find((n) => n.id === ref);
                return (
                  <button key={ref} type="button" className="detail-ref-pill" onClick={() => onMemory(ref)}>
                    <Icon name={targetNode?.type === 'character_card' ? 'person' : 'world'} />
                    <span>{targetNode?.name || '已删除设定'}</span>
                  </button>
                );
              })}
            </div>
          )}
          {value.chapterRefs.map((r) => (
            <ChapterEvidence
              key={r.chapterId}
              {...{ call, novelId, onChapter }}
              source={r}
              title={chapters.find((c) => c.id === r.chapterId)?.title}
            />
          ))}
        </section>
      )}
      {conflictDialog}
    </div>
  );
}
