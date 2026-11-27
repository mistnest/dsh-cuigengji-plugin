import {chapterCounts} from '../chapters/metadata.ts';
export type Row=Record<string,any>;
export const queryFail=(code:string,message:string,details:Row={}):never=>{throw Object.assign(new Error(message),{code,details});};
export function current(map:Row,id:string,label:string){const value=Object.hasOwn(map,id)?map[id]:null;if(!value||value.deleted)return queryFail('NOT_FOUND',`${label}不存在或已删除`);return value;}
export const chapterMetadata=(chapter:Row)=>{const {content,versions,...metadata}=chapter;return {...metadata,...chapterCounts(chapter as any)};};
export const pagination=(rows:any[],args:Row)=>{const offset=args.offset??0,limit=args.limit??50;return {items:rows.slice(offset,offset+limit),total:rows.length,nextOffset:offset+limit<rows.length?offset+limit:null};};
export function checkReadRevision(value:Row,args:Row){if(args.expectedRevision!==undefined&&args.expectedRevision!==value.revision)queryFail('CONFLICT','内容已更新，请重新读取；不能把不同版本的片段拼接起来',{expectedRevision:args.expectedRevision,currentRevision:value.revision,id:value.id});}
