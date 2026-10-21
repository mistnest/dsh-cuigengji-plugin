import { readFileSync } from 'node:fs';
import { HUMAN_ACTIONS } from '../../contracts/actions.js';
import { convertLegacyExport } from '../../infrastructure/migrations/legacy.js';

const manifest = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
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

export function registerRpcRoute(ctx, services) {
  const {dispatch,workData,transfer,maintenance,desktopPet,libraries}=services;
  const ensureReady = () => maintenance?.ensureReady();
  const dispatchRpc = async (payload, signal, admitted=false) => {
    if(libraries&&!admitted&&!String(payload?.action).startsWith('library.'))return libraries.use(()=>dispatchRpc(payload,signal,true)).catch(failure);
    try {
      signal.throwIfAborted();
      if (!record(payload) || !HUMAN_ACTIONS.includes(payload.action)) throw invalid('无效的催更姬操作');
      const { action, args:input = {}, sessionId } = payload;
      const args=record(input)?{...input}:input;
      if (!record(args)) throw invalid('args 必须是对象');
      if(args.__libraryRoot&&args.__libraryRoot!==services.dataRoot)throw Object.assign(new Error('作品库已切换，旧页面的编辑已保留，请刷新后继续'),{code:'LIBRARY_CHANGED'});
      delete args.__libraryRoot;
      if (sessionId !== undefined && (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 512)) {
        throw invalid('sessionId 必须是有效的会话标识');
      }
      if (!action.startsWith('library.')&&!action.startsWith('transfer.') && !['activity.today','activity.stats','pet.desktop','novel.list', 'novel.create', 'novel.import', 'legacy.preview', 'settings.get', 'maintenance.status', 'maintenance.verify', 'workspace.status', 'workspace.export', 'workspace.preview', 'workspace.import'].includes(action) && !sessionId) {
        throw Object.assign(new Error('请选择一个 DSH 会话'), { code: 'SESSION_REQUIRED' });
      }
      if (action === 'settings.get') {
        return { ok: true, value: { dataRoot:services.dataRoot, pluginVersion: manifest.version, supportedDsh: manifest.peerDependencies['@deepseek-ai/dsh-tools'] } };
      }
      if(action.startsWith('library.')){
        if(!libraries)throw invalid('作品库管理服务未初始化');
        if(action==='library.pick'){
          const capability=ctx.get?.('directoryPicker')?.capability();
          return {ok:true,value:{path:capability?.kind==='native'?await capability.pick(signal):null,manual:capability?.kind!=='native'}};
        }
        return {ok:true,value:action==='library.status'?await libraries.status():action==='library.inspect'?await libraries.inspect(args.path):await libraries.change(args)};
      }
      if (action === 'legacy.preview') return { ok: true, value: convertLegacyExport(args.input) };
      if (action === 'maintenance.status') {
        if (!maintenance) throw invalid('维护服务未初始化');
        return { ok: true, value: await maintenance.status() };
      }
      if (action === 'maintenance.verify') {
        if (!maintenance) throw invalid('维护服务未初始化');
        return { ok: true, value: await maintenance.verify(args) };
      }
      if (action.startsWith('transfer.')) {
        await ensureReady();
        if (!transfer) throw invalid('导入 / 导出服务未初始化');
        const method = {'transfer.catalog':'catalog','transfer.inspect':'inspect','transfer.preview':'preview','transfer.import':'import','transfer.exportPreview':'exportPreview','transfer.export':'export'}[action];
        return {ok: true, value: await transfer[method](args, {sessionId})};
      }
      if (action.startsWith('workspace.')) {
        await ensureReady();
        if (!workData) throw invalid('工作数据服务未初始化');
        const method = { 'workspace.status':'status', 'workspace.export':'export', 'workspace.preview':'preview', 'workspace.import':'import' }[action];
        return { ok: true, value: await workData[method](args.backup) };
      }
      await ensureReady();
      if (action === 'pet.desktop') {
        return {ok: true, value: desktopPet ? await desktopPet.sync({...args, sessionId: sessionId || ''}) : {supported: false, available: false}};
      }

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
