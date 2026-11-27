import type { Novel, MemoryNode } from '../novels/records.ts';
import type { Row } from '../operations/record-reader.ts';
import { memoryGroupAction, groupId } from './rules/groups.ts';
import { memoryPageAction, memoryPageId } from './rules/pages.ts';
import { organizeMemoryWorkspace } from './rules/workspace.ts';
import { memoryHistory, memoryVersionFields } from './rules/history.ts';
import { memoryChangedFields, patchMemoryContent, validateMemoryMutation } from './rules/edit.ts';
import { variableAction } from '../variables/index.ts';

import { authorizeDirectoryMove, moveDirectory } from '../cards/directory-move.ts';
import { settingRows } from './query.ts';
import { settingLayout } from './layout.ts';
import { relationAction } from './relations.ts';
import { cas, clone, fail, get, own, record, text, touch } from '../operations/records.ts';
import {
  appendMemoryVersion,
  checkMemorySources,
  ensureMemoryVersions,
  memoryFields,
  memoryResult,
  memorySourcesStale,
  memoryVersion,
  nodePosition,
  settingKinds,
} from './records.ts';

import {updateCards, type CardEditResult} from './batch.ts';

export function settingsAction(n: Novel, action: 'graph.update', a: Row, actor: Row): CardEditResult;
export function settingsAction(n: Novel, action: string, a: Row, actor: Row): unknown;
export function settingsAction(n: Novel, action: string, a: Row, actor: Row): unknown {
  if (action === 'graph.updateMany') return updateCards(n,a,(draft,edit)=>settingsAction(draft,'graph.update',edit,actor));
  if (action === 'graph.directory.move') {
    authorizeDirectoryMove(actor);
    memoryPageId(n, a.pageId ?? null);
    return moveDirectory(
      n,
      'graph',
      {
        items: n.nodes,
        groups: n.memoryGroups || {},
        moveMember: (node, { groupId }) =>
          settingsAction(
            n,
            'graph.move',
            {
              groupId,
              members: [{ id: node.id, expectedRevision: node.revision }],
            },
            actor,
          ),
      },
      a,
    );
  }
  if (action === 'graph.workspace.ensure') {
    const revisions = new Map(Object.values(n.nodes).map((node) => [node.id, node.revision]));
    const result = organizeMemoryWorkspace(n);
    for (const node of Object.values(n.nodes))
      if (node.revision !== revisions.get(node.id))
        appendMemoryVersion(node, actor, '将旧设定画布收进文件夹，正文与关系保持不变');
    return result;
  }
  if (action === 'graph.pages' || action.startsWith('graph.page.')) return memoryPageAction(n, action, a);
  if (action === 'graph.list') return settingRows(n, a);
  if (action === 'graph.groups' || action.startsWith('graph.group.') || action === 'graph.move') {
    const before = new Map(Object.values(n.nodes).map((node) => [node.id, node.revision]));
    const result = memoryGroupAction(n, action, a);
    if (['graph.move', 'graph.group.create', 'graph.group.delete'].includes(action))
      for (const node of Object.values(n.nodes))
        if (node.revision !== before.get(node.id))
          appendMemoryVersion(
            node,
            actor,
            action === 'graph.move'
              ? '调整设定归属'
              : action === 'graph.group.create'
                ? '收纳到文件夹'
                : '删除设定分组',
          );
    return result;
  }
  if (action === 'graph.get') {
    const result = memoryResult(get(n.nodes, a.nodeId, '节点'));
    if (n.variables?.enabled && (actor.kind === 'agent' || a.resolveVariables === true)) {
      const rendered = variableAction(
        n,
        'variables.render',
        {
          text: result.content,
          ...(a.chapterId
            ? { chapterId: a.chapterId, chapterRevision: a.chapterRevision, position: a.position || 'start' }
            : {}),
          characterName: result.type === 'character_card' ? result.name : a.characterName,
        },
        actor,
      ) as Row;
      return {
        ...result,
        renderedContent: rendered.content,
        variableSnapshot: { id: rendered.snapshotId, revision: rendered.revision },
        variableWarnings: rendered.warnings,
      };
    }
    return result;
  }
  if (action === 'graph.history') {
    if (a.revision !== undefined && (!Number.isSafeInteger(a.revision) || a.revision < 1))
      fail('INVALID_INPUT', 'revision 必须是有效的历史版本号');
    if (a.includeContent === true && a.revision === undefined)
      fail('INVALID_INPUT', '读取历史正文需指定 revision；先用 graph.history 查看版本摘要');
    const node = get(n.nodes, a.nodeId, '节点');
    ensureMemoryVersions(node, actor);
    if (a.revision !== undefined && !node.versions.some((v) => v.revision === a.revision))
      fail('NOT_FOUND', '历史设定版本不存在');
    return memoryHistory(node.versions, a);
  }
  if (['graph.layout.get', 'graph.layout', 'graph.arrange'].includes(action)) {
    return settingLayout(n, action, a, actor);
  }
  if (action === 'graph.continue') {
    const source = get(n.nodes, a.nodeId, '节点');
    cas(source, a);
    if (source.deleted) fail('DELETED', '起点已删除');
    if (!['in', 'out'].includes(a.side ?? 'out')) fail('INVALID_INPUT', '连接方向无效');
    const node = settingsAction(
      n,
      'graph.create',
      {
        ...a.value,
        novelId: n.id,
        pageId: source.pageId ?? null,
        groupId: a.value?.groupId === undefined ? (source.groupId ?? null) : a.value.groupId,
      },
      actor,
    ) as MemoryNode;
    const edge = relationAction(n, 'edge.create', {
      from: a.side === 'in' ? node.id : source.id,
      to: a.side === 'in' ? source.id : node.id,
      name: '',
      content: '',
    });
    return { node, edge };
  }
  if (action === 'graph.create') {
    if (!settingKinds.has(a.type)) fail('INVALID_INPUT', '节点类型无效');
    const folder = groupId(n, a.groupId),
      pageId =
        a.pageId === undefined
          ? folder
            ? (n.memoryGroups![folder].pageId ?? null)
            : null
          : memoryPageId(n, a.pageId);
    if (folder && (n.memoryGroups![folder].pageId ?? null) !== pageId)
      fail('INVALID_INPUT', '设定与文件夹须在同一画布');
    const v = record({
      type: a.type,
      pageId,
      groupId: folder,
      ...memoryFields(a, n, true),
      ...nodePosition(a),
      deleted: false,
    });
    checkMemorySources(n, v);
    Object.assign(v, { versions: [memoryVersion(v, actor, a.reason || '创建设定')] });
    n.nodes[v.id] = v;
    touch(n);
    return memoryResult(v);
  }
  if (action === 'graph.update' || action === 'graph.delete' || action === 'graph.restore') {
    const v = get(n.nodes, a.nodeId, '节点');
    cas(v, a);
    if (action !== 'graph.restore') validateMemoryMutation(action, a);
    const previous = clone(v),
      previousRevision = v.revision,
      deletedEdgeIds = [];
    if (action === 'graph.delete') {
      if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true');
      v.deleted = true;
      for (const e of Object.values(n.edges))
        if (!e.deleted && (e.from === v.id || e.to === v.id)) {
          e.deleted = true;
          touch(e);
          deletedEdgeIds.push(e.id);
        }
    } else if (action === 'graph.restore') {
      if (a.restoreScope !== undefined && !['all', 'content'].includes(a.restoreScope))
        fail('INVALID_INPUT', 'restoreScope 必须是 all 或 content');
      if (a.restoreScope === 'content' && v.deleted) fail('DELETED', '设定已删除，请先恢复此设定');
      const target = v.versions?.find((item) => item.revision === a.targetRevision);
      if (!target) fail('NOT_FOUND', '历史设定版本不存在');
      for (const field of memoryVersionFields)
        if (
          !(a.restoreScope === 'content' && ['groupId', 'pageId', 'deleted'].includes(field)) &&
          target[field] !== undefined
        )
          v[field] = clone(target[field]);
      v.deleted = false;
      // Group removal is permanent; restoring a snapshot must not resurrect
      // a dangling group ID. Old evidence stays old and requires review.
      if (v.groupId && !own(n.memoryGroups || {}, v.groupId)) v.groupId = null;
      if (v.pageId && n.memoryPageFolders?.[v.pageId]) {
        v.groupId =
          v.groupId && own(n.memoryGroups || {}, v.groupId)
            ? v.groupId
            : own(n.memoryGroups || {}, n.memoryPageFolders[v.pageId])
              ? n.memoryPageFolders[v.pageId]
              : null;
        v.pageId = null;
      }
      if (v.pageId && !own(n.memoryPages || {}, v.pageId)) {
        v.pageId = null;
        v.groupId = null;
      }
      if (v.groupId && (n.memoryGroups![v.groupId].pageId ?? null) !== (v.pageId ?? null)) v.groupId = null;
      if (v.status === 'active' && memorySourcesStale(n, v)) v.status = 'stale';
      checkMemorySources(n, v);
    } else {
      if (v.deleted) fail('DELETED', '节点已删除');
      if (a.type !== undefined) {
        if (!settingKinds.has(a.type)) fail('INVALID_INPUT', '节点类型无效');
        v.type = a.type;
      }
      const targetGroup = a.groupId === undefined ? (v.groupId ?? null) : groupId(n, a.groupId);
      const pageId =
        a.pageId === undefined
          ? a.groupId !== undefined && targetGroup
            ? (n.memoryGroups![targetGroup].pageId ?? null)
            : (v.pageId ?? null)
          : memoryPageId(n, a.pageId);
      if (targetGroup && (n.memoryGroups![targetGroup].pageId ?? null) !== pageId) {
        if (a.groupId !== undefined) fail('INVALID_INPUT', '设定与文件夹须在同一画布');
        v.groupId = null;
      } else v.groupId = targetGroup;
      if (a.pageId !== undefined || a.groupId !== undefined) v.pageId = pageId;
      const fields = memoryFields(a, n);
      if (a.type !== undefined) {
        if (!settingKinds.has(a.type))
          fail('INVALID_INPUT', 'type 必须是 character_card、world_entry 或 world_book');
        fields.type = a.type;
      }
      if (a.patch !== undefined) fields.content = patchMemoryContent(v.content, a.patch);
      Object.assign(v, fields, nodePosition(a));
      checkMemorySources(n, v);
    }
    const changedFields = memoryChangedFields(previous, v);
    const changed = action === 'graph.restore' || changedFields.length > 0 || deletedEdgeIds.length > 0;
    if (changed) {
      // A legacy entry's first edit must retain its pre-edit baseline, never
      // fabricate that baseline from the already patched body.
      ensureMemoryVersions(previous, actor);
      v.versions = previous.versions;
      touch(v);
      v.versions!.push(
        memoryVersion(
          v,
          actor,
          a.reason ||
            (action === 'graph.restore'
              ? `恢复设定 v${a.targetRevision}`
              : action === 'graph.delete'
                ? '删除设定'
                : '更新设定'),
        ),
      );
      touch(n);
    }
    return {
      ...memoryResult(v),
      changed,
      changedFields,
      previousRevision,
      ...(action === 'graph.delete' ? { deletedEdgeIds } : {}),
    };
  }
  if (action === 'graph.duplicate') {
    if (
      !Array.isArray(a.members) ||
      !a.members.length ||
      a.members.length > 200 ||
      new Set(a.members.map((v) => v.id)).size !== a.members.length
    )
      fail('INVALID_INPUT', '请选择 1–200 个不同的节点');
    const sources = a.members.map((item) => {
      const node = get(n.nodes, item.id, '节点');
      cas(node, item);
      if (node.deleted) fail('DELETED', '节点已删除');
      return { node, position: item.position === undefined ? node.position : nodePosition(item).position };
    });
    const mapping: Record<string, string> = {},
      nodes = sources.map(({ node, position }, i) => {
        const copy = settingsAction(
          n,
          'graph.create',
          {
            ...clone(node),
            novelId: n.id,
            name: node.name + ' · 副本',
            position: { x: (position?.x ?? 40 + i * 332) + 28, y: (position?.y ?? 60) + 28 },
          },
          actor,
        ) as MemoryNode;
        mapping[node.id] = copy.id;
        return copy;
      });
    for (const [id, target] of Object.entries(mapping)) {
      const gallery = n.cardImages?.['memory:' + id];
      if (gallery) n.cardImages!['memory:' + target] = clone(gallery);
    }
    const edges = Object.values(n.edges)
      .filter((e) => !e.deleted && mapping[e.from] && mapping[e.to])
      .map((e) =>
        relationAction(n, 'edge.create', { ...clone(e), from: mapping[e.from], to: mapping[e.to] }),
      );
    return { nodes, edges };
  }
  if (action === 'graph.remove') {
    if (a.confirm !== true) fail('CONFIRM_REQUIRED', '删除需要 confirm:true');
    if (
      !Array.isArray(a.members) ||
      !a.members.length ||
      a.members.length > 200 ||
      new Set(a.members.map((v) => v.id)).size !== a.members.length
    )
      fail('INVALID_INPUT', '请选择 1–200 个不同的节点');
    for (const item of a.members) {
      const node = get(n.nodes, item.id, '节点');
      cas(node, item);
      if (node.deleted) fail('DELETED', '节点已删除');
    }
    return a.members.map((item) =>
      settingsAction(
        n,
        'graph.delete',
        {
          novelId: n.id,
          nodeId: item.id,
          expectedRevision: item.expectedRevision,
          confirm: true,
          reason: a.reason,
        },
        actor,
      ),
    );
  }
  fail('UNKNOWN_ACTION', `未知操作：${action}`);
}
