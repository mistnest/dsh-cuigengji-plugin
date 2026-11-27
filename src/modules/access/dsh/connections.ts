import type { ExternalAccess } from '../../collaboration/grants/service.ts';
import { z } from 'zod';
import { READER_MODULES } from '../../workspace/queries/reader-modules.ts';
import { id, revision } from '../../../platform/tools/query-fields.ts';
import { fail } from '../../../platform/errors.ts';

const levels = z.partialRecord(z.enum(READER_MODULES), z.enum(['none', 'read', 'write']));
const books = z.array(id).nonempty().nullable();
const target = { id, expectedRevision: revision };
const commands = {
  'external.status': z.strictObject({}),
  'external.create': z.strictObject({ name: id, novelIds: books, permissions: levels }),
  'external.update': z.strictObject({
    ...target,
    name: id.optional(),
    novelIds: books.optional(),
    permissions: levels.optional(),
    enabled: z.boolean().optional(),
  }),
  'external.revoke': z.strictObject(target),
  'external.records': z.strictObject({ id, limit: z.number().int().min(1).max(200).optional() }),
};
export const connectionsDescription =
  '为作者管理外部助手的长期 MCP 连接。先 external.status 读当前配置和 revision，作品 ID 从 cuigengji_project 的 novel.list 获取。create 必须明确 novelIds（书 ID 数组，整个库才用 null）及 permissions，模块 manuscript/settings/planning/guidance 每项选 none/read/write。update 需 id、expectedRevision，只传要变的字段；权限按模块局部更新。revoke 用 id、expectedRevision 撤销；records 按 id 查调用。冲突后先重读，不能用旧配置覆盖作者修改。正式写作内容与连接管理独立。所有 action 使用 external. 前缀。';
const moduleProperties = Object.fromEntries(
  READER_MODULES.map((m) => [m, { type: 'string', enum: ['none', 'read', 'write'] }]),
);
export const connectionsArgs = {
  type: 'object',
  additionalProperties: true,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    enabled: { type: 'boolean' },
    expectedRevision: { type: 'integer' },
    novelIds: { oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
    permissions: { type: 'object', additionalProperties: false, properties: moduleProperties },
    limit: { type: 'integer' },
  },
};
type Profile = Awaited<ReturnType<ExternalAccess['create']>>;
const summary = ({ id, name, revision, enabled, permissions, novelIds, active }: Profile) => ({
  id,
  name,
  revision,
  enabled,
  permissions,
  novelIds,
  active,
});
export async function manageConnections(
  service: ExternalAccess,
  action: string,
  input: Record<string, unknown>,
  sessionId: string,
) {
  const schema = Object.hasOwn(commands, action) ? commands[action as keyof typeof commands] : undefined;
  if (!schema) return fail('INVALID_INPUT', '未知连接管理操作');
  const { requestId, ...fields } = input;
  const parsed = schema.safeParse(fields);
  if (!parsed.success)
    return fail('INVALID_INPUT', parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('；'));
  const args = parsed.data;
  switch (action) {
    case 'external.status':
      return { profiles: (await service.status()).profiles.map(summary) };
    case 'external.create':
      return summary(await service.create({ ...args, requestId }, 'agent:' + sessionId));
    case 'external.update':
      return summary(await service.update(args));
    case 'external.revoke':
      return service.revoke(args);
    case 'external.records':
      return service.records(args);
  }
}
