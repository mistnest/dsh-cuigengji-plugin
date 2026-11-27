import React from 'react';
import { accessLabels, type AccessLevel, type Permissions } from '../../../../collaboration/grants/permissions.ts';
import {
  READER_MODULES,
  readerModuleNames,
  type ReaderModule,
} from '../../../../workspace/queries/reader-modules.ts';
import { Icon, type IconName } from '../icons.tsx';

export interface Book {
  id: string;
  title: string;
}
export interface Connection {
  id: string;
  name: string;
  revision: number;
  enabled: boolean;
  libraryRoot: string;
  novelIds: string[] | null;
  permissions: Permissions;
  clientConfig: unknown;
}
const details: Record<ReaderModule, [IconName, string]> = {
  manuscript: ['book', '查目录和正文，读写可新建、修改章节'],
  settings: ['world', '查人物、世界和关系，读写可新建、修改设定卡'],
  planning: ['plan', '查画布和情节，读写可新建、修改情节卡'],
  guidance: ['edit', '查写作指引，读写可修改本书的创作记忆'],
};
export function PermissionRows({
  value,
  change,
  disabled,
}: {
  value: Permissions;
  change: (m: ReaderModule, v: AccessLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mcp-perms">
      {READER_MODULES.map((m) => (
        <div key={m} className="mcp-perm">
          <Icon name={details[m][0]} />
          <div>
            <strong>{readerModuleNames[m]}</strong>
            <small>{details[m][1]}</small>
          </div>
          <div role="group" aria-label={readerModuleNames[m]} className="mcp-level">
            {(Object.keys(accessLabels) as AccessLevel[]).map((level) => (
              <button
                type="button"
                key={level}
                aria-pressed={value[m] === level}
                disabled={disabled}
                onClick={() => change(m, level)}
              >
                {accessLabels[level]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
export function BookPicker({
  value,
  books,
  change,
}: {
  value: string[] | null;
  books: Book[];
  change: (v: string[] | null) => void;
}) {
  const ids = value ?? [];
  return (
    <fieldset className="mcp-books">
      <legend>作品范围</legend>
      <label>
        <input type="radio" name="mcp-range" checked={value !== null} onChange={() => change([])} />
        指定作品
      </label>
      <label>
        <input type="radio" name="mcp-range" checked={value === null} onChange={() => change(null)} />
        整个作品库（含以后新增的作品）
      </label>
      {value !== null && (
        <div className="mcp-picks">
          {books.map((b) => (
            <label key={b.id}>
              <input
                type="checkbox"
                checked={ids.includes(b.id)}
                onChange={() => change(ids.includes(b.id) ? ids.filter((id) => id !== b.id) : [...ids, b.id])}
              />
              {b.title}
            </label>
          ))}
          {ids
            .filter((id) => !books.some((b) => b.id === id))
            .map((id) => (
              <label key={id}>
                <input type="checkbox" checked onChange={() => change(ids.filter((x) => x !== id))} />
                已移除的作品 · {id}
              </label>
            ))}
          {!books.length && <small>当前作品库里还没有可选作品。</small>}
        </div>
      )}
    </fieldset>
  );
}
export function scopeText(p: Connection, root: string, books: Book[]) {
  if (!p.novelIds) return '整个作品库';
  if (root !== p.libraryRoot) return '原作品库中 ' + p.novelIds.length + ' 部作品';
  return p.novelIds.map((id) => books.find((b) => b.id === id)?.title ?? '已移除的作品').join('、');
}

const shortModuleNames: Record<ReaderModule, string> = {
  manuscript: '正文',
  settings: '设定',
  planning: '规划',
  guidance: '记忆',
};

export function permissionSummary(permissions: Permissions) {
  const active = READER_MODULES.filter((m) => permissions[m] && permissions[m] !== 'none').map(
    (m) => `${shortModuleNames[m]}${accessLabels[permissions[m]]}`,
  );
  return active.length ? active.join(' · ') : '暂无模块权限';
}

const actionLabels: Record<string, string> = {
  'novel.list': '查看作品列表',
  'novel.get': '读取作品概览',
  'chapter.list': '查看章节目录',
  'chapter.get': '读取章节正文',
  'chapter.read': '读取章节正文',
  'chapter.search': '搜索正文内容',
  'chapter.create': '新建章节',
  'chapter.update': '修改章节正文',
  'graph.list': '查看设定目录',
  'graph.search': '搜索人物与设定',
  'graph.get': '读取设定卡片',
  'graph.relations': '查询设定关系',
  'graph.create': '新建设定卡片',
  'graph.update': '修改设定卡片',
  'graph.batchUpdate': '批量修改设定卡',
  'planning.list': '查看规划画布',
  'planning.search': '搜索剧情规划',
  'planning.get': '读取规划节点',
  'planning.apply': '更新剧情规划',
  'creativeMemory.read': '查阅创作记忆',
  'creativeMemory.update': '更新创作记忆',
  'preset.read': '读取旧版预设',
  'guidance.read': '读取写作指引',
  'context.get': '汇总写作上下文',
  'materials.read': '批量读取资料',
  'batch.read': '批量读取资料',
  'task.submit': '提交协作稿件',
};

const errorLabels: Record<string, string> = {
  CAPABILITY_DENIED: '无此模块权限',
  UNAUTHORIZED: '连接已停用或未授权',
  FORBIDDEN: '超出作品授权范围',
  CONFLICT: '版本冲突已拦截',
  NOT_FOUND: '目标不存在',
};

export function describeMcpAction(action: string) {
  return actionLabels[action] ?? '调用工具';
}

export function describeMcpError(code?: string) {
  if (!code) return '失败';
  return errorLabels[code] ? `${errorLabels[code]} (${code})` : code;
}
