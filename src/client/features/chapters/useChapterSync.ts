import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {useDraftScope} from '../../shared/state.js';
import {draftKey,claimLegacyDraft} from '../../shared/drafts.js';
import {ChapterSync,type Chapter} from './sync.ts';

const sessions=new Map<string,ChapterSync>();
/** Flush dormant local drafts too, before searching/replacing the saved whole book. */
export async function prepareManuscriptSearch({scope,novelId,chapters,read,write,onSaved}: {
  scope:string;novelId:string;chapters:{id:string}[];read:(id:string)=>Promise<Chapter>;
  write:(id:string,value:Chapter,base:Chapter,requestId:string)=>Promise<Partial<Chapter>>;onSaved:()=>void;
}) {
  for (const chapter of chapters) {
    const key=draftKey(scope,`${novelId}:chapter:${chapter.id}`);
    claimLegacyDraft(localStorage,key);
    if (!sessions.has(key) && !localStorage.getItem(key)) continue;
    await prepareChapterRemoval({scope,novelId,chapterId:chapter.id,read:()=>read(chapter.id),
      write:(value,base,requestId)=>write(chapter.id,value,base,requestId),onSaved});
  }
}
/** Also hydrate cached drafts for chapters no longer open in the editor. */
export async function prepareChapterRemoval({scope,novelId,chapterId,read,write,onSaved}: {
  scope:string;novelId:string;chapterId:string;read:()=>Promise<Chapter>;
  write:(value:Chapter,base:Chapter,requestId:string)=>Promise<Partial<Chapter>>;onSaved:()=>void;
}) {
  const key=draftKey(scope,`${novelId}:chapter:${chapterId}`);
  let controller=sessions.get(key);
  if(!controller){controller=new ChapterSync({key,initial:await read(),storage:localStorage,read,write,onSaved});sessions.set(key,controller);}
  controller.options={...controller.options,read,write,onSaved};
  return {chapter:await controller.prepareRemoval(),accept:controller.accept};
}
export function useChapterSync({novelId,chapterId,initial,latest,read,write,onSaved}: {
  novelId:string;chapterId:string;initial:Chapter;latest?:{revision:number};
  read:()=>Promise<Chapter>;write:(value:Chapter,base:Chapter,requestId:string)=>Promise<Partial<Chapter>>;onSaved:()=>void;
}){
  const scope=useDraftScope(),key=draftKey(scope,`${novelId}:chapter:${chapterId}`);
  const controller=useMemo(()=>{
    let existing=sessions.get(key);
    if(!existing){existing=new ChapterSync({key,initial,storage:localStorage,read,write,onSaved});sessions.set(key,existing);}
    return existing;
  },[key]);
  controller.options={...controller.options,read,write,onSaved};
  const state=useSyncExternalStore(controller.subscribe,controller.snapshot,controller.snapshot);
  useEffect(()=>{void controller.refresh();void controller.flush();return()=>{void controller.flush();};},[controller]);
  useEffect(()=>{if(latest&&latest.revision>controller.state.base.revision)void controller.refresh();},[controller,latest?.revision,state.base.revision]);
  useEffect(()=>{
    const online=()=>{void controller.flush();void controller.refresh();};
    const leave=(event:BeforeUnloadEvent)=>{if(controller.dirty){void controller.flush();event.preventDefault();event.returnValue='';}};
    window.addEventListener('online',online);window.addEventListener('beforeunload',leave);
    return()=>{window.removeEventListener('online',online);window.removeEventListener('beforeunload',leave);};
  },[controller]);
  return {...state,dirty:controller.dirty,change:controller.change,accept:controller.accept,rebase:controller.rebase,save:controller.flush,composition:controller.composition};
}
