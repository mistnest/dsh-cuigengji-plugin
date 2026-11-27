import {join} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {AtomicStore} from '../../../platform/files/atomic-store.ts';
import {emptyUsage,isUsageDay,usageError} from '../pricing/settings.ts';
import type {UsageMeta,UsageRecord} from '../types.ts';
type Page={version:1;records:Record<string,UsageRecord>};
export type LoadUsageDay = (day: string) => Promise<Page>;
export interface UsageRunControls {
  cancelWrite(): void;
}
/** All pages and source cursors share one cross-process lock and recovery journal. */
export class UsageStore {
  readonly root:string;private metadata:AtomicStore<UsageMeta>;
  constructor(root:string){this.root=root;this.metadata=new AtomicStore(root,emptyUsage,(v:unknown):asserts v is UsageMeta=>{if(!v||typeof v!=='object'||(v as UsageMeta).version!==1||!Array.isArray((v as UsageMeta).days)||!(v as UsageMeta).cursors)usageError('记账索引格式无效，原文件已保留','CORRUPT_STORE');});}
  private page(day:string){if(!isUsageDay(day))usageError('记账日期无效');return new AtomicStore<Page>(join(this.root,'ledger',day.slice(0,4),day),()=>({version:1,records:{}}),(v:unknown):asserts v is Page=>{if(!v||typeof v!=='object'||(v as Page).version!==1||!(v as Page).records)usageError(`记账明细无法读取：${day}`,'CORRUPT_STORE');});}
  async run<T>(fn:(meta:UsageMeta,load:LoadUsageDay,controls:UsageRunControls)=>Promise<T>|T,write=false):Promise<T>{
    return this.metadata.withLock(async () => {
      let meta=await this.metadata.load();
      if(meta.pending){for(const p of meta.pending.pages){const page=this.page(p.day);await mkdir(page.root,{recursive:true,mode:0o700});await page.save({version:1,records:p.records});}delete meta.pending;await this.metadata.save(meta);}
      const pages=new Map<string,Page>(),initialPages=new Map<string,string>();
      let cancelled=false;
      const load=async(day:string)=>{
        if(!pages.has(day)){
          const loaded=await this.page(day).load();
          if(write)initialPages.set(day,JSON.stringify(loaded.records));
          pages.set(day,loaded);
        }
        return pages.get(day)!;
      };
      const result=await fn(meta,load,{cancelWrite:()=>{cancelled=true;}});
      if(write&&!cancelled){
        const modifiedPages=[...pages].filter(([day,page])=>JSON.stringify(page.records)!==initialPages.get(day));
        meta.revision++;
        if(modifiedPages.length>0){
          meta.pending={pages:modifiedPages.map(([day,page])=>({day,records:page.records}))};await this.metadata.save(meta);
          for(const [day,page] of modifiedPages){const target=this.page(day);await mkdir(target.root,{recursive:true,mode:0o700});await target.save(page);}
          delete meta.pending;
        }
        await this.metadata.save(meta);
      }
      return result;
    });
  }
}
