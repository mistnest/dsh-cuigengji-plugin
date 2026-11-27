import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {useDraftScope} from '../../shared/state.ts';
import {chapterDraftKey, openChapterDraft} from './draft-sessions.ts';
import type {Chapter} from './sync.ts';

export function useChapterSync({novelId,chapterId,initial,latest,read,write,onSaved}: {
  novelId:string;chapterId:string;initial:Chapter;latest?:{revision:number};
  read:()=>Promise<Chapter>;write:(value:Chapter,base:Chapter,requestId:string)=>Promise<Partial<Chapter>>;onSaved:()=>void;
}){
  const scope = useDraftScope();
  const key = chapterDraftKey(scope, novelId, chapterId);
  const controller = useMemo(() => openChapterDraft(key, initial, {read, write, onSaved}), [key]);
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
