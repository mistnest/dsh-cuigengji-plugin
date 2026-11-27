import type {Workspace} from '../operations/record-reader.ts';
import {parseQuery,queryAllowed,type ReaderModule} from './catalog.ts';
import {queryFail,type Row} from './common.ts';
import {memoryRead} from '../creative-memory/document.ts';
import {workspaceQuery} from '../novels/query.ts';
import {manuscriptQuery} from '../chapters/query.ts';
import {settingsQuery} from '../settings/query.ts';
import {planningQuery} from '../planning/query.ts';
import {readerGuidance,readerPreset,type QueryReader} from './guidance.ts';
import {authorizeReadItems, parseReadItems} from './batch-input.ts';
import {readBatch} from './batch.ts';

interface QuerySource {
  withQuerySnapshot<Result>(action: string, args: Row, read: (state: Workspace) => Promise<Result>): Promise<Result>;
}

/** The query service receives only a reader for a consistent, saved snapshot. */
export class QueryService {
  readonly #readSnapshot: QuerySource['withQuerySnapshot'];

  constructor(source: QuerySource) {
    this.#readSnapshot = source.withQuerySnapshot.bind(source);
  }

  async query(action:string,input:unknown,reader:QueryReader,modules:readonly ReaderModule[],scope:{novelIds?:readonly string[]|null;writableModules?:readonly ReaderModule[]}={}){
    const {capability,args}=parseQuery(action,input);
    if(!queryAllowed(capability,modules))queryFail('CAPABILITY_DENIED','这个连接未开放所需的查询模块');
    if(args.novelId && scope.novelIds && !scope.novelIds.includes(args.novelId))queryFail('CAPABILITY_DENIED','这部作品未授权给此连接');
    const batch = action==='context.readMany' ? parseReadItems(args.items) : undefined;
    if(batch) authorizeReadItems(batch,modules);
    if(action==='guidance.read'&&!args.novelId)return readerGuidance(args.section||'core',modules,undefined,scope.writableModules);
    return this.#readSnapshot(capability.loadAction || 'preset.get', args, async state => {
      const novel = args.novelId && Object.hasOwn(state.novels, args.novelId) ? state.novels[args.novelId] : undefined;
      if(args.novelId&&(!novel||novel.archived))queryFail('NOT_FOUND','作品不存在或已在回收站');
      if(batch)return readBatch(novel!,batch);
      if(action==='preset.read')return {novelId:novel!.id,...await readerPreset(novel!,reader)};
      if(action==='guidance.read')return readerGuidance(args.section||'core',modules,['preset','all'].includes(args.section)?await readerPreset(novel!,reader):undefined,scope.writableModules);
      if(action==='creativeMemory.read')return memoryRead(novel!,args);
      if(action.startsWith('novel.'))return workspaceQuery(state,novel,action,{...args,includeCreativeMemory:modules.includes('guidance')},scope.novelIds);
      if(capability.module==='manuscript')return manuscriptQuery(novel!,action,args);
      if(capability.module==='settings')return settingsQuery(novel!,action,args);
      if(capability.module==='planning'){
        const result=planningQuery(novel!,action,args);
        if(action==='planning.get' && !modules.includes('settings'))result.resources={items:[],total:0,nextOffset:null};
        return result;
      }
      return queryFail('UNKNOWN_ACTION','查询模块尚未实现');
    });
  }
}
