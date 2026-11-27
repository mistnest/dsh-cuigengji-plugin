import type {Context} from '@deepseek-ai/cordis';
import type {LibraryRoots} from '../../library/roots/service.ts';
import type {Row} from '../../workspace/operations/record-reader.ts';
import type {ProjectStore} from '../../library/records/project-store.ts';
import type {WorkData} from '../../library/archives/workspace-archive.ts';
import type {TransferService} from '../../library/archives/transfer-service.ts';
import type {UpgradeCoordinator} from '../../library/upgrade/upgrade.ts';
import type {UsageService} from '../../usage/reports/service.ts';
import type {ExternalAccess} from '../../collaboration/grants/service.ts';

export interface HumanServices {
  readonly dataRoot: string;
  dispatch(action: string, args: Row, actor: Row): Promise<unknown>;
  workData?: Pick<WorkData, 'status' | 'export' | 'preview' | 'import'>;
  transfer?: Pick<TransferService, 'catalog' | 'inspect' | 'preview' | 'import' | 'exportPreview' | 'export'>;
  maintenance?: Pick<UpgradeCoordinator, 'status' | 'ensureReady' | 'verify'>;
  desktopPet?: {sync(args: Row): Promise<unknown>};
  libraries?: Pick<LibraryRoots<{store: ProjectStore; maintenance: UpgradeCoordinator; workData: WorkData}>, 'current' | 'use' | 'status' | 'inspect' | 'change'>;
  usage?: Pick<UsageService, 'dispatch'>;
  external?: Pick<ExternalAccess, 'status' | 'create' | 'update' | 'revoke' | 'records'>;
}

import { readFileSync } from 'node:fs';
import { HUMAN_ACTIONS } from '../catalog/actions.ts';
import { convertLegacyExport } from '../../workspace/transfer/formats/legacy.ts';
import { errorInfo } from '../../../platform/errors.ts';

const manifest = JSON.parse(readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8'));
export const record = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
export const invalid = (message: string) => Object.assign(new Error(message), { code: 'INVALID_INPUT' });

export function failure(error: unknown) {
  return {
    ok: false,
    error: errorInfo(error),
  };
}

export function createHumanDispatcher(ctx: Context, services: HumanServices) {
  const {dispatch,workData,transfer,maintenance,desktopPet,libraries,usage,external}=services;
  const ensureReady = () => maintenance?.ensureReady();
  const dispatchRpc = async (payload: unknown, signal: AbortSignal, admitted=false): Promise<{ok: true; value: unknown} | ReturnType<typeof failure>> => {
    if(libraries&&!admitted&&!String(record(payload) ? payload.action : '').startsWith('library.')&&!String(record(payload) ? payload.action : '').startsWith('usage.'))return libraries.use(()=>dispatchRpc(payload,signal,true)).catch(failure);
    try {
      signal.throwIfAborted();
      if (!record(payload) || !HUMAN_ACTIONS.includes(payload.action)) throw invalid('无效的催更姬操作');
      const { action, args:input = {}, sessionId } = payload as {action: string; args?: unknown; sessionId?: string};
      const args=record(input)?{...input}:input;
      if (!record(args)) throw invalid('args 必须是对象');
      if(action.startsWith('usage.')){if(!usage)throw invalid('记账服务尚未就绪');delete args.__libraryRoot;return {ok:true,value:await usage.dispatch(action,args)};}
      if(args.__libraryRoot&&args.__libraryRoot!==services.dataRoot)throw Object.assign(new Error('作品库已切换，旧页面的编辑已保留，请刷新后继续'),{code:'LIBRARY_CHANGED'});
      delete args.__libraryRoot;
      if(action.startsWith('external.')){
        if(!external)throw invalid('外部连接服务尚未就绪');
        if(action==='external.create')await ensureReady();
        if (action === 'external.status') return {ok: true, value: await external.status()};
        const methods = {'external.create': 'create', 'external.update': 'update', 'external.revoke': 'revoke', 'external.records': 'records'} as const;
        const method = methods[action as keyof typeof methods];
        if (!method) throw invalid('无效的外部连接操作');
        return {ok: true, value: await external[method](args)};
      }
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
        if(action==='library.restoreIndex')return {ok:true,value:await libraries.use(()=>libraries.current.store.restoreIndexCopy(args.confirm===true))};
        if(action==='library.pick'){
          const picker = ctx.get?.('directoryPicker') as {capability(): {kind: string; pick(signal: AbortSignal): Promise<string | null>} | undefined} | undefined;
          const capability=picker?.capability();
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
        // The transfer service validates each wire payload at its public entry point.
        switch (action) {
          case 'transfer.catalog': return {ok: true, value: await transfer.catalog()};
          case 'transfer.inspect': return {ok: true, value: transfer.inspect(args as Parameters<TransferService['inspect']>[0])};
          case 'transfer.preview': return {ok: true, value: await transfer.preview(args as Parameters<TransferService['preview']>[0])};
          case 'transfer.import': return {ok: true, value: await transfer.import(args as Parameters<TransferService['import']>[0], {sessionId})};
          case 'transfer.exportPreview': return {ok: true, value: await transfer.exportPreview(args as Parameters<TransferService['exportPreview']>[0])};
          case 'transfer.export': return {ok: true, value: await transfer.export(args as Parameters<TransferService['export']>[0])};
          default: throw invalid('无效的导入导出操作');
        }
      }
      if (action.startsWith('workspace.')) {
        await ensureReady();
        if (!workData) throw invalid('工作数据服务未初始化');
        if (action === 'workspace.status') return {ok: true, value: await workData.status()};
        if (action === 'workspace.export') return {ok: true, value: await workData.export()};
        return {ok: true, value: action === 'workspace.preview' ? await workData.preview(args.backup) : await workData.import(args.backup)};
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

  return dispatchRpc;
}
