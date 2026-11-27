import type { FeatureServices } from '../../shared/workspace-state.ts';
import {
  kind,
  settingFactNames,
  settingStatusNames,
  type SettingDocument,
  type SettingEdge,
  type SettingFactType,
  type SettingIndex,
  type SettingStatus,
} from './model.ts';
import type { GroupItem } from '../../shared/groups.tsx';
import type { TransferShortcut } from '../../../../workspace/transfer/types.ts';
type EditorServices = Omit<FeatureServices, 'tick'>;
type NodeProps = EditorServices & {
  initial: SettingDocument;
  latest?: SettingIndex;
  saved: (value: SettingDocument | null) => void;
  groups: GroupItem[];
  onTransfer: (value: TransferShortcut) => void;
  children?: React.ReactNode;
  referenceName: (id: string) => string;
};
type EdgeProps = EditorServices & {
  initial: SettingEdge;
  nodes: SettingIndex[];
  saved: (value: SettingEdge | null) => void;
};
import React, { useEffect, useState } from 'react';
import { DetailActions } from '../../shared/detail-page.tsx';
import { DocumentTextarea } from '../../shared/workspace.tsx';
import { GroupSelect } from '../../shared/groups.tsx';
import { useDraft, useResource } from '../../shared/state.ts';
import { useDocumentDraft } from '../../shared/document-editor.tsx';
import { SaveBar, saveShortcut } from '../../shared/ui.tsx';
import { useDialog } from '../../dialog.tsx';
import { DocumentHeading, DocumentBody, type ArchiveChip } from '../../shared/DocumentPresentation.tsx';
import { CardComparison } from '../../shared/CardComparison.tsx';
import { CardGallery } from '../../shared/CardImages.tsx';
import { ChapterEvidence } from '../../shared/evidence.tsx';
import { Icon } from '../../shared/icons.tsx';

const nodeFields = [
  'name',
  'summary',
  'content',
  'type',
  'groupId',
  'aliases',
  'storyTime',
  'factType',
  'status',
] as const;

function settingBadges(value: SettingDocument): ArchiveChip[] {
  const list: ArchiveChip[] = [];
  if (value.status === 'stale') list.push({ label: settingStatusNames.stale, tone: 'warn', dot: true });
  else if (value.status === 'retired') list.push({ label: settingStatusNames.retired, tone: 'muted', dot: true });
  else if (value.status === 'unconfirmed' || value.factType === 'unconfirmed')
    list.push({ label: settingFactNames.unconfirmed, tone: 'warn', dot: true });
  else if (value.factType && value.factType !== 'fact')
    list.push({ label: settingFactNames[value.factType] || value.factType, tone: 'default', dot: true });
  else list.push({ label: settingFactNames.fact, tone: 'ok', dot: true });

  if (value.storyTime?.trim()) list.push({ label: value.storyTime.trim(), icon: 'clock' });
  return list;
}

export function NodeEditor({
  call,
  novelId,
  run,
  busy,
  initial,
  latest,
  saved,
  groups,
  onTransfer,
  children,
  referenceName,
}: NodeProps) {
  const fresh = useResource(
    () => (initial.id ? call('graph.get', { novelId, nodeId: initial.id }) : Promise.resolve(null)),
    [call, novelId, initial.id, latest?.revision],
  );
  const { value, base, change, accept, dirty, cacheError, save, remoteChanged, conflictDialog } =
    useDocumentDraft<SettingDocument>({
      key: `${novelId}:node:${initial.id || initial.type + ':new'}`,
      initial,
      fresh: fresh.value,
      busy,
      run,
      fields: nodeFields,
      load: () => call('graph.get', { novelId, nodeId: initial.id }),
      persist: (patch, remote) =>
        call('graph.update', { novelId, nodeId: initial.id, expectedRevision: remote.revision, ...patch }),
      saved: (n) => {
        saved(n);
        setEditing(false);
      },
    });
  const hasSources = Boolean(value.sources?.length);
  const chaptersResource = useResource<{ id: string; title: string }[]>(
    () => (hasSources ? call('chapter.list', { novelId }) : Promise.resolve([])),
    [call, novelId, hasSources],
  );
  const chapters = chaptersResource.value || [];
  const [editing, setEditing] = useState(!initial.id || dirty),
    [comparing, setComparing] = useState(false);
  const [aliasInput, setAliasInput] = useState((value.aliases || []).join('，'));
  useEffect(() => setAliasInput((value.aliases || []).join('，')), [base]);
  const { confirm, ask } = useDialog();
  const set = (key: keyof SettingDocument, v: unknown) => change((old) => ({ ...old, [key]: v }));

  const restoreVersion = async (revision: number) => {
    if (
      !(await confirm(
        `${dirty ? '先保存当前草稿，再恢复' : '恢复设定'}到 v${revision}？当前内容会保留在历史中。`,
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
      const result = await call('graph.restore', {
        novelId,
        nodeId: value.id,
        expectedRevision,
        targetRevision: revision,
        restoreScope: 'content',
        requestId: crypto.randomUUID(),
        reason: `从 v${revision} 恢复卡片内容`,
      });
      accept(result);
      saved(result);
      setEditing(false);
      setComparing(false);
    });
  };

  if (comparing)
    return (
      <div className="entry-document is-comparing">
        <CardComparison
          {...{ call, novelId, busy, dirty, referenceName }}
          kind="memory"
          draft={value}
          close={() => setComparing(false)}
          restore={restoreVersion}
        />
        {conflictDialog}
      </div>
    );

  const knownNames = (value.knownBy || []).map((id) => ({ id, name: referenceName(id) || '设定角色' }));

  return (
    <div className="entry-document" onKeyDown={(e) => saveShortcut(e, save)}>
      {!editing && (
        <DocumentHeading
          title={value.name}
          kind={kind(value)}
          kindIcon={value.type === 'character_card' ? 'person' : 'world'}
          group={groups.find((g) => g.id === value.groupId)?.name || '全书设定'}
          chips={settingBadges(value)}
          aliases={value.aliases?.filter(Boolean)}
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
              disabled={busy || !dirty || !value.name.trim() || value.deleted}
              onClick={save}
            >
              保存设定
            </button>
          </>
        )}
        {value.id && (
          <button disabled={busy} onClick={() => setComparing(true)}>
            改动对比
          </button>
        )}
        <button disabled={busy} onClick={() => setEditing(!editing)}>
          {editing ? '阅读' : '编辑'}
        </button>
        {value.id && (
          <details className="menu detail-more-menu">
            <summary aria-label="设定条目更多操作" title="更多操作">
              ···
            </summary>
            <div className="menu-panel">
              <button
                type="button"
                disabled={busy || dirty}
                title={dirty ? '先保存设定后导出' : undefined}
                onClick={() =>
                  onTransfer({ mode: 'export', selection: { kind: 'memory', novelId, nodeIds: [value.id] } })
                }
              >
                导出这条设定
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!dirty || (await confirm('放弃本地草稿并读取最新设定？')))
                    run(async () => {
                      const n = await call('graph.get', { novelId, nodeId: value.id });
                      accept(n);
                      saved(n);
                    });
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
                  if (await confirm(`删除“${value.name}”及其关系？`))
                    run(async () => {
                      await call('graph.delete', {
                        novelId,
                        nodeId: value.id,
                        expectedRevision: base.revision,
                        confirm: true,
                      });
                      accept(initial);
                      saved(null);
                    });
                }}
              >
                删除设定
              </button>
            </div>
          </details>
        )}
      </DetailActions>
      {fresh.error && (
        <p className="notice error" role="alert">
          {fresh.error}
        </p>
      )}
      {remoteChanged && <p className="notice">作品有新修改，输入已保留。保存时会合并互不影响的内容。</p>}
      {cacheError && (
        <p className="notice error" role="alert">
          {cacheError}
        </p>
      )}
      {value.id && <CardGallery kind="memory" nodeId={value.id} disabled={busy || value.deleted} />}
      {editing ? (
        <fieldset disabled={busy} className="editor-fields document-fields detail-edit-card">
          <label>
            名称
            <input value={value.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label>
            摘要
            <DocumentTextarea
              aria-label="摘要"
              value={value.summary || ''}
              onChange={(e) => set('summary', e.target.value)}
            />
          </label>
          <label>
            全文
            <DocumentTextarea
              aria-label="全文"
              className="prose"
              value={value.content || ''}
              onChange={(e) => set('content', e.target.value)}
            />
          </label>
          <details className="section-fold">
            <summary>属性与分组</summary>
            <div className="detail-edit-grid">
              <label>
                类型
                <select
                  value={value.type === 'character_card' ? 'character_card' : 'world_entry'}
                  onChange={(e) => set('type', e.target.value)}
                >
                  <option value="character_card">角色卡</option>
                  <option value="world_entry">世界书</option>
                </select>
              </label>
              <label>
                设定性质
                <select
                  value={value.factType || 'fact'}
                  onChange={(e) => {
                    const next = e.target.value as SettingFactType;
                    change((old) => ({
                      ...old,
                      factType: next,
                      status: next === 'unconfirmed' ? 'unconfirmed' : ('active' as SettingStatus),
                    }));
                  }}
                >
                  {Object.entries(settingFactNames).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                适用时期
                <input
                  placeholder="如：第一卷、雨夜来信后"
                  value={value.storyTime || ''}
                  onChange={(e) => set('storyTime', e.target.value)}
                />
              </label>
              <label>
                别名（逗号分隔）
                <input
                  placeholder="如：夜间店主，守灯人女儿"
                  value={aliasInput}
                  onChange={(e) => {
                    setAliasInput(e.target.value);
                    set(
                      'aliases',
                      [
                        ...new Set(
                          e.target.value
                            .split(/[,，]/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                        ),
                      ],
                    );
                  }}
                />
              </label>
            </div>
            <div className="creation-settings">
              <GroupSelect groups={groups} value={value.groupId} onChange={(id) => set('groupId', id)} />
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const name = await ask('新建分组名称');
                  if (name?.trim())
                    run(async () => {
                      const g = await call('graph.group.create', {
                        novelId,
                        name,
                        pageId: value.pageId ?? null,
                      });
                      set('groupId', g.id);
                    });
                }}
              >
                ＋ 新建分组
              </button>
            </div>
          </details>
        </fieldset>
      ) : (
        <DocumentBody
          text={value.content}
          empty="尚未填写详细设定"
          onQuickEdit={!busy && !value.deleted ? () => setEditing(true) : undefined}
        />
      )}
      {children}
      {(knownNames.length > 0 || (value.sources && value.sources.length > 0)) && (
        <section className="detail-meta-section" aria-label="知情范围与正文依据">
          {knownNames.length > 0 && (
            <div className="detail-pill-group">
              <span>知情角色</span>
              {knownNames.map((item) => (
                <span key={item.id} className="detail-chip">
                  <Icon name="person" />
                  <span>{item.name}</span>
                </span>
              ))}
            </div>
          )}
          {value.sources?.map((src, idx) => (
            <ChapterEvidence
              key={`${src.chapterId}:${src.revision}:${idx}`}
              call={call}
              novelId={novelId}
              source={src}
              title={chapters.find((c) => c.id === src.chapterId)?.title}
            />
          ))}
        </section>
      )}
      {conflictDialog}
    </div>
  );
}

export function EdgeEditor({ call, novelId, nodes, run, busy, initial, saved }: EdgeProps) {
  const {
    value: draft,
    base,
    change,
    accept,
    dirty,
    cacheError,
  } = useDraft(`${novelId}:edge:${initial.id || `new:${initial.from}:${initial.to}`}`, initial);
  const { confirm } = useDialog();
  const save = () => {
    if (draft.from && draft.to && !busy)
      run(async () => {
        const e = await call(draft.id ? 'edge.update' : 'edge.create', {
          from: draft.from,
          to: draft.to,
          name: draft.name,
          content: draft.content,
          novelId,
          edgeId: draft.id,
          expectedRevision: base.revision,
        });
        accept(e);
        saved(e);
      });
  };
  return (
    <div onKeyDown={(e) => saveShortcut(e, save)}>
      <fieldset disabled={busy} className="editor-fields">
        {(
          [
            ['from', '从'],
            ['to', '到'],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <select value={draft[key]} onChange={(e) => change((d) => ({ ...d, [key]: e.target.value }))}>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          关系名称（可选）
          <input
            placeholder="例如：居住于、朋友、敌对"
            value={draft.name || ''}
            onChange={(e) => change((d) => ({ ...d, name: e.target.value }))}
          />
        </label>
        <label>
          说明
          <DocumentTextarea
            value={draft.content || ''}
            onChange={(e) => change((d) => ({ ...d, content: e.target.value }))}
          />
        </label>
      </fieldset>
      <SaveBar
        dirty={dirty || !draft.id}
        {...{ busy }}
        error={cacheError}
        invalid={!draft.from || !draft.to ? '请选择关系端点' : undefined}
        onSave={save}
        label="保存关系"
      />
      {draft.id && (
        <details className="section-fold">
          <summary>更多操作</summary>
          <div className="row">
            <button
              disabled={busy}
              onClick={async () => {
                if (!dirty || (await confirm('丢弃关系草稿并读取最新版本？')))
                  run(async () => {
                    const latest = await call('edge.get', { novelId, edgeId: draft.id });
                    accept(latest);
                    saved(latest);
                  });
              }}
            >
              读取最新关系
            </button>
            <button
              disabled={busy}
              className="danger"
              onClick={async () => {
                if (await confirm('删除这条关系？'))
                  run(async () => {
                    await call('edge.delete', {
                      novelId,
                      edgeId: draft.id,
                      expectedRevision: base.revision,
                      confirm: true,
                    });
                    accept(initial);
                    saved(null);
                  });
              }}
            >
              删除关系
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
