import type { FeatureServices } from '../../shared/workspace-state.ts';
import type { usePlanningWorkspace } from './usePlanningWorkspace.ts';
type HistoryProps = Pick<
  ReturnType<typeof usePlanningWorkspace>,
  'changes' | 'sequence' | 'setSeen' | 'setHistoryOpen' | 'nodes' | 'open' | 'confirm' | 'setChanges'
> &
  Omit<FeatureServices, 'tick'> & { setPageId: (id: string) => void };
import React from 'react';
import { changeSummary, describe } from './history-model.ts';
import { edgeNames } from './model.ts';
export function PlanningHistory({
  changes,
  sequence,
  setSeen,
  setHistoryOpen,
  nodes,
  setPageId,
  open,
  busy,
  confirm,
  run,
  call,
  novelId,
  setChanges,
}: HistoryProps) {
  return (
    <div className="planning-history page">
      <div className="row">
        <h2 className="grow">规划修改记录</h2>
        <button onClick={() => setSeen(changes?.sequence || sequence)}>标为已读</button>
        <button onClick={() => setHistoryOpen(false)}>关闭记录</button>
      </div>
      {changes?.items.map((t) => {
        const cleaned = t.changes.some((c) => (c.before && 'pruned' in c.before) || 'pruned' in c.after);
        return (
          <details className="card" key={t.id}>
            <summary>
              {t.actor.kind === 'agent' ? 'AI' : '作者'} · {t.reason} ·{' '}
              {new Date(t.updatedAt).toLocaleString()} · {t.changes.length} 项
            </summary>
            {t.changes.map((c) => {
              const current = c.collection === 'nodes' ? nodes.find((n) => n.id === c.id) : null;
              const target = current || (c.collection === 'nodes' && 'threads' in c.after ? c.after : null);
              return (
                <div key={`${c.collection}:${c.id}`}>
                  <h3>
                    {('title' in c.after && c.after.title) ||
                      ('name' in c.after && c.after.name) ||
                      current?.title ||
                      ('from' in c.after && edgeNames[c.after.type]) ||
                      (c.collection === 'decorations'
                        ? '画布批注'
                        : c.collection === 'nodes'
                          ? '规划卡片'
                          : '关系')}
                  </h3>
                  <p className="muted">{changeSummary(c)}</p>
                  <details>
                    <summary>比较前后版本</summary>
                    <div className="split">
                      <div>
                        <h4>修改前</h4>
                        <pre>{describe(c.before, nodes)}</pre>
                      </div>
                      <div>
                        <h4>修改后</h4>
                        <pre>{describe(c.after, nodes)}</pre>
                      </div>
                    </div>
                  </details>
                  {target && !target.deleted && (
                    <button
                      onClick={() => {
                        setPageId(target.pageId || '');
                        open(c.id);
                        setHistoryOpen(false);
                      }}
                    >
                      定位节点
                    </button>
                  )}
                </div>
              );
            })}
            <button
              disabled={busy || cleaned}
              title={cleaned ? '部分历史版本已清理，无法整批撤销' : undefined}
              onClick={async () => {
                if (await confirm('撤销这次变更？若相关对象已有后续修改，将拒绝覆盖。'))
                  run(async () => {
                    await call('planning.revert', {
                      novelId,
                      transactionId: t.id,
                      requestId: crypto.randomUUID(),
                    });
                    setHistoryOpen(false);
                  });
              }}
            >
              撤销这次变更
            </button>
          </details>
        );
      })}
      {changes?.nextOffset != null && (
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const next = await call('planning.history', {
                novelId,
                offset: changes.nextOffset,
                limit: 200,
              });
              setChanges({ ...next, items: [...changes.items, ...next.items] });
            })
          }
        >
          加载更多记录
        </button>
      )}
    </div>
  );
}
