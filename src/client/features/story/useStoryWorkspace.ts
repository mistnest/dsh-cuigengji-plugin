import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useDraft} from '../../shared/state.js';
import {useWorkspaceResource, type FeatureServices} from '../../shared/workspace-state.ts';
import type {StoryOperation, StorySnapshot} from '../../../contracts/story.ts';
import {prepareSubmission, sendSubmission, isConflict, type ChapterBasis, type StorySubmission} from './model.ts';

export interface StoryActions {
  snapshot:StorySnapshot;
  busy:boolean;
  save:(operations:StoryOperation[],expectedRevision:number,sources?:ChapterBasis[],onSaved?:(snapshot:StorySnapshot)=>void)=>Promise<void>;
}
export function useStoryWorkspace({call,novelId,tick,run,busy}:FeatureServices) {
  const live=useRef(false),running=useRef(false);
  useLayoutEffect(()=>{live.current=true;return()=>{live.current=false;};},[call,novelId]);
  const resource=useWorkspaceResource<StorySnapshot>(async()=>{
    const value=await call('story.get',{novelId}) as StorySnapshot;
    if(value?.novelId!==novelId||!value.story||!Array.isArray(value.chapters))throw new Error('创作数据不完整，请重试。');
    return value;
  },[call,novelId,tick],[call,novelId]);
  const [snapshot,setSnapshot]=useState<StorySnapshot|null>(null);
  const adopt=useCallback((next:StorySnapshot)=>{
    if(live.current&&next.novelId===novelId)setSnapshot(previous=>!previous||next.story.revision>=previous.story.revision?next:previous);
  },[novelId]);
  useEffect(()=>{if(resource.value)adopt(resource.value);},[resource.value,adopt]);
  const [error,setError]=useState(''),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
  // A lost receipt survives leaving this page, and can only be retried with the exact same identity.
  const pendingDraft=useDraft(`${novelId}:story-submission`,{revision:0,submission:null as StorySubmission|null});
  const pending=pendingDraft.value.submission as StorySubmission|null;
  const pendingRef=useRef(pending);pendingRef.current=pending;
  const afterWrite=useRef<((snapshot:StorySnapshot)=>void)|undefined>(undefined);
  const clearPending=()=>{pendingRef.current=null;pendingDraft.accept({revision:0,submission:null});};
  const execute=async(submission:StorySubmission)=>{
    const result=await sendSubmission(call,submission,()=>live.current);
    if(!result)return;
    adopt(result);clearPending();setError('');setNotice('已保存到当前作品。');
    afterWrite.current?.(result);afterWrite.current=undefined;
    // Re-read chapter metadata too; a refresh failure remains visible without undoing a confirmed save.
    void resource.reload().catch(()=>{});
  };
  const perform=async(work:()=>Promise<void>)=>{
    if(running.current||busy||!live.current)return;
    running.current=true;setSaving(true);setError('');setNotice('');
    try{
      await run(async()=>{
        if(!live.current)return;
        try{await work();}
        catch(failure){
          if(!live.current)return;
          const code=(failure as {code?:string})?.code;
          // Host rejections are definitive. Transport failures may have committed already.
          if(code&&code!=='BACKEND_UNAVAILABLE'||isConflict(failure))clearPending();
          setError(failure instanceof Error?failure.message:String(failure));
          void resource.reload().catch(()=>{});
        }
      });
    }finally{running.current=false;if(live.current)setSaving(false);}
  };
  const save:StoryActions['save']=async(operations,expectedRevision,sources=[],onSaved)=>{
    if(pendingRef.current){setError('上一次提交的回执尚未确认，请先重试本次提交。草稿仍保留。');return;}
    await perform(async()=>{
      const submission=await prepareSubmission(call,novelId,expectedRevision,operations,sources,()=>live.current,adopt);
      if(!submission||!live.current)return;
      afterWrite.current=onSaved;
      pendingRef.current=submission;pendingDraft.change({revision:expectedRevision,submission});
      await execute(submission);
    });
  };
  const retry=()=>perform(async()=>{const submission=pendingRef.current;if(submission)await execute(submission);});
  return {resource,snapshot,error,notice,pending,retry,busy:busy||saving||!!pending,working:busy||saving,save,cacheError:pendingDraft.cacheError as string};
}
