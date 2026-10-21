import {mkdir,readdir,lstat,realpath,cp} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../store.js';
import {WorkData} from '../backup/workspace.js';
import {TransferService} from '../transfer/service.ts';
import {UpgradeCoordinator,workspaceDigest} from '../maintenance/upgrade.ts';
import {createUpgradeBackup,backupParent,verifyUpgradeBackup} from '../../infrastructure/persistence/upgrade-backup.ts';

type Row=Record<string,any>;
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
export const within=(root:string,path:string)=>{const rel=relative(resolve(root),resolve(path));return !rel||rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel);};
export function createLibraryRuntime(root:string) {
  const store=new Store(root),workData=new WorkData(store),maintenance=new UpgradeCoordinator(store);
  return {store,workData,maintenance,transfer:new TransferService(store,workData)};
}
export type LibraryRuntime=ReturnType<typeof createLibraryRuntime>;

/** The only owner of the active library. One gate covers complete UI/tool
 * operations, so a library can never change halfway through a request. */
export class LibraryService {
  current:LibraryRuntime;
  private readers=0;
  private changing=false;
  private generation=0;
  private recent:string[];
  private busy:()=>boolean=()=>false;
  private changed:()=>Promise<void>=async()=>{};
  private options:{recent?:string[];persist?:(root:string,recent:string[])=>Promise<void>};
  constructor(root:string,options:{recent?:string[];persist?:(root:string,recent:string[])=>Promise<void>}={}) {
    this.options=options;
    this.current=createLibraryRuntime(root);this.recent=[...new Set([resolve(root),...(options.recent||[])])].slice(0,8);
  }
  configure({busy,changed}:{busy:()=>boolean;changed:()=>Promise<void>}){this.busy=busy;this.changed=changed;}
  async use<T>(fn:()=>Promise<T>):Promise<T>{
    if(this.changing)fail('LIBRARY_CHANGING','作品库正在切换，请稍后重试');
    this.readers++;
    try{return await fn();}finally{this.readers--;}
  }
  proxy<K extends keyof LibraryRuntime>(key:K):LibraryRuntime[K] {
    return new Proxy({} as LibraryRuntime[K],{get:(_target,name)=>{const service:any=this.current[key],value=service[name];return typeof value==='function'?value.bind(service):value;}});
  }
  async status(){return {...await this.current.workData.status(),recent:this.recent,changing:this.changing,generation:this.generation,canChange:Boolean(this.options.persist)};}
  async inspect(input:unknown){
    if(typeof input!=='string'||!input.trim()||!isAbsolute(input))return fail('INVALID_INPUT','请选择绝对路径的文件夹');
    const path=resolve(input);
    let names:string[];
    try {const stat=await lstat(path);if(!stat.isDirectory()||stat.isSymbolicLink())return fail('INVALID_PATH','请选择实际文件夹，不能使用文件或链接目录');names=await readdir(path);}
    catch(error:any){if(error.code==='ENOENT')return {path,kind:'empty',exists:false};throw error;}
    if(!names.length)return {path,kind:'empty',exists:true};
    if(!names.includes('library.json')&&!names.includes('store.json')&&!names.includes('store.pending.json'))return fail('INVALID_LIBRARY','这个文件夹不是作品库，也不是空文件夹');
    const store=new Store(path),release=await store.acquire();
    try{
      // Preview is read-only: a partially published transaction is recovered
      // only after the author chooses to open this library.
      if((await readdir(path)).includes('transaction.pending.json'))return {path,kind:'existing',exists:true,recoveryPending:true};
      const state=await store.readStoredWorkspace();
      return {path,kind:'existing',exists:true,books:Object.values(state.novels).map((row:any)=>({id:row.id,title:row.title,archived:Boolean(row.archived)}))};
    }finally{await release();}
  }
  async change(args:Row){
    if(!['switch','create','migrate'].includes(args.mode)||args.confirm!==true)return fail('INVALID_INPUT','请先检查目标目录并确认操作');
    if(!this.options.persist)return fail('CONFIG_UNAVAILABLE','当前 DSH 未提供插件配置保存能力，请更新 DSH 后重试');
    if(this.changing||this.readers||this.busy())return fail('LIBRARY_BUSY','请先保存编辑，等待正在进行的写作或数据操作结束后再切换作品库');
    this.changing=true;
    try{
      const old=this.current;
      await old.maintenance.ensureReady();
      const source=await realpath(old.store.root),target=await this.inspect(args.path);
      await mkdir(target.path,{recursive:true});
      const destination=await realpath(target.path);
      if(within(source,destination)||within(destination,source))return fail('INVALID_PATH','新旧作品库不能是相同目录或互相嵌套的目录');
      if(args.mode==='switch'&&target.kind!=='existing')return fail('INVALID_LIBRARY','切换作品库需要选择已有作品库');
      if(args.mode!=='switch'&&target.kind!=='empty')return fail('DIRECTORY_NOT_EMPTY','新建或迁移需要空文件夹，已有内容会保留');
      let expected:string|undefined,activity:string|undefined;
      if(args.mode==='migrate'){
        const release=await old.store.acquire();
        try{
          await old.store.transaction.recover();
          const state=await old.store.load();expected=workspaceDigest(state);activity=JSON.stringify(state.activity);
          const backup=join(backupParent(source),`${Date.now()}-${randomUUID()}`);
          const manifest=await createUpgradeBackup(source,backup);await verifyUpgradeBackup(source,backup);
          if(manifest.entries.some(entry=>entry.kind==='link'))return fail('LINKED_LIBRARY','作品库中含链接文件，请先将其整理为实际文件后迁移');
          // Copy the verified, quiescent snapshot; never move/delete the old library.
          if((await readdir(destination)).length)return fail('DIRECTORY_NOT_EMPTY','目标文件夹已有内容，迁移已停止；原作品库和备份保留');
          for(const name of await readdir(join(backup,'data')))await cp(join(backup,'data',name),join(destination,name),{recursive:true,errorOnExist:true,force:false});
        }finally{await release();}
      }
      const next=createLibraryRuntime(destination);
      await next.maintenance.ensureReady();
      if(expected){const release=await next.store.acquire();try{const state=await next.store.load();if(workspaceDigest(state)!==expected||JSON.stringify(state.activity)!==activity)return fail('MIGRATION_MISMATCH','迁移校验未通过，继续使用原作品库；新目录和备份均已保留');}finally{await release();}}
      const recent=[...new Set([destination,...this.recent])].slice(0,8);
      await this.options.persist(destination,recent);
      this.current=next;this.recent=recent;this.generation++;
      let warning:string|undefined;
      try{await this.changed();}catch{warning='作品库已切换，部分连接需要刷新后重新连接。';}
      return {...await this.status(),changing:false,...(warning?{warning}:{})};
    }finally{this.changing=false;}
  }
}
