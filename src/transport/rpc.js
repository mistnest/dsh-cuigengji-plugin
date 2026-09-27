import { readFileSync } from 'node:fs';
import { HUMAN_ACTIONS } from '../core/actions.js';
import { convertLegacyExport } from '../core/import-legacy.js';

const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
export const RPC_ENDPOINT = 'cuigengji/dispatch';
const RPC_PATH = `/api/${RPC_ENDPOINT}`;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const invalid = message => Object.assign(new Error(message), { code: 'INVALID_INPUT' });

function failure(error) {
  return {
    ok: false,
    error: {
      code: error.code || 'CUIGENGJI_ERROR',
      message: error.message || String(error),
      details: {},
    },
  };
}

export function registerRpcRoute(ctx, { dispatch, contextChars, dataRoot }) {
  const dispatchRpc = async (payload, signal) => {
    try {
      signal.throwIfAborted();
      if (!record(payload) || !HUMAN_ACTIONS.includes(payload.action)) throw invalid('无效的催更姬操作');
      const { action, args = {}, sessionId } = payload;
      if (!record(args)) throw invalid('args 必须是对象');
      if (sessionId !== undefined && (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 512)) {
        throw invalid('sessionId 必须是有效的会话标识');
      }
      if (!['novel.list', 'novel.create', 'novel.import', 'legacy.preview', 'settings.get'].includes(action) && !sessionId) {
        throw Object.assign(new Error('请选择一个 DSH 会话'), { code: 'SESSION_REQUIRED' });
      }
      if (action === 'settings.get') {
        return { ok: true, value: { contextChars, dataRoot, pluginVersion: manifest.version, supportedDsh: manifest.peerDependencies['@deepseek-ai/dsh-tools'] } };
      }
      if (action === 'legacy.preview') return { ok: true, value: convertLegacyExport(args.input) };
      return { ok: true, value: await dispatch(action, args, { kind: 'human', sessionId }) };
    } catch (error) {
      return failure(error);
    }
  };

  ctx.connection.fetch.register({
    path: RPC_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async request => {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return new Response('content type must be application/json', { status: 415 });
      }
      let message;
      try {
        message = await request.json();
      } catch {
        return new Response('body is not JSON', { status: 400 });
      }
      const rpcId = typeof message?.rpcId === 'string' ? message.rpcId : 'invalid-request';
      if (!record(message) || message.type !== 'client-request' || message.method !== RPC_ENDPOINT || typeof message.rpcId !== 'string' || !message.rpcId.trim()) {
        return Response.json({
          type: 'server-response',
          rpcId,
          result: failure(invalid('无效的 RPC 请求')),
        });
      }
      return Response.json({
        type: 'server-response',
        rpcId,
        result: await dispatchRpc(message.payload, request.signal),
      });
    },
  });
}
