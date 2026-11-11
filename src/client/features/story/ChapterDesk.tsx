import React from 'react';
import type {StoryChapter, StoryOutline, StorySnapshot} from '../../../contracts/story.ts';
import {useWorkspacePreference} from '../../shared/workspace-state.ts';
import {saveShortcut} from '../../shared/ui.jsx';
import {Badge, DraftFooter, useStoryDraft} from './shared.tsx';
import {asText, chapterProgress, lines} from './model.ts';
import type {StoryActions} from './useStoryWorkspace.ts';

type Props=StoryActions&{onChapter:(id?:string)=>void;selectedChapter?:string;onSelectChapter?:(id:string)=>void};
export function ChapterDesk(props:Props) {
  const {snapshot}=props;
  // The health matrix and this directory address the same chapter, so the selection is owned by the page.
  const [stored,setStored]=useWorkspacePreference(`${snapshot.novelId}:story-chapter`,'');
  const selected=props.selectedChapter??stored;
  const setSelected=props.onSelectChapter??setStored;
  const [view,setView]=useWorkspacePreference<'outline'|'tracking'>(`${snapshot.novelId}:story-chapter-view`,'outline');
  const chapter=snapshot.chapters.find(value=>value.id===selected)||snapshot.chapters[0];
  if(!chapter)return <section className="story-empty"><h2>先留下一章，故事就有了落点</h2><p>在正文页建立章节后，这里可以逐章安排蓝图、记录正文事实和后续义务。</p><button onClick={()=>props.onChapter()}>打开正文页 →</button></section>;
  return <section aria-label="章节蓝图与追踪" className="story-chapter-layout">
    <aside className="story-chapter-directory" aria-label="创作章节列表"><h2>逐章推进</h2><p className="story-muted">{snapshot.chapters.length} 章 · 蓝图是计划，追踪依据正文</p><ul>{snapshot.chapters.map((item,index)=>{const progress=chapterProgress(snapshot,item.id);return <li key={item.id}><button aria-pressed={item.id===chapter.id} onClick={()=>setSelected(item.id)}><span className="story-chapter-number">{index+1}</span><span><strong>{item.title}</strong><small>{progress.outlined?'已有蓝图':'待写蓝图'} · {progress.stale?'追踪来源已变化':progress.tracked?'已追踪':'未追踪'}{progress.blocking?` · ${progress.blocking} 项阻断`:''}</small></span></button></li>;})}</ul></aside>
    <div className="story-chapter-detail">
      <header className="story-section-heading"><div><h2>{chapter.title}</h2><p>正文 v{chapter.revision} · {chapter.textCount.toLocaleString('zh-CN')} 字</p></div><button onClick={()=>props.onChapter(chapter.id)}>查看正文 →</button></header>
      <div className="segmented story-segmented" role="group" aria-label="章节创作视图"><button aria-pressed={view==='outline'} onClick={()=>setView('outline')}>章节蓝图</button><button aria-pressed={view==='tracking'} onClick={()=>setView('tracking')}>正文事实追踪</button></div>
      {view==='tracking'?<TrackingEditor key={`${chapter.id}:tracking`} {...props} chapter={chapter}/>:<OutlineEditor key={`${chapter.id}:outline`} {...props} chapter={chapter}/>} 
    </div>
  </section>;
}
type OutlineDraft={revision:number;intent:string;beats:string;endingHook:string;minWords:string;maxWords:string};
const outlineInitial=(snapshot:StorySnapshot,chapterId:string):OutlineDraft=>{
  const outline=snapshot.story.outlines[chapterId];
  return {revision:snapshot.story.revision,intent:outline?.intent||'',beats:asText(outline?.beats),endingHook:outline?.endingHook||'',minWords:outline?.minWords?.toString()||'',maxWords:outline?.maxWords?.toString()||''};
};
function OutlineEditor({snapshot,chapter,busy,save}:Props&{chapter:StoryChapter}) {
  const draft=useStoryDraft(`${snapshot.novelId}:story-outline:${chapter.id}`,outlineInitial(snapshot,chapter.id));
  const value=draft.value;
  const invalid=[value.minWords,value.maxWords].some(text=>text!==''&&(!/^\d+$/.test(text)||!Number.isSafeInteger(Number(text))))?'篇幅请输入非负整数':value.minWords!==''&&value.maxWords!==''&&Number(value.minWords)>Number(value.maxWords)?'篇幅下限不能超过上限':'';
  const submit=()=>{
    if(busy||!draft.dirty||draft.updated||invalid)return;
    const outline:StoryOutline={chapterId:chapter.id,intent:value.intent,beats:lines(value.beats),endingHook:value.endingHook,...(value.minWords!==''?{minWords:Number(value.minWords)}:{}),...(value.maxWords!==''?{maxWords:Number(value.maxWords)}:{})};
    void save([{op:'outline.upsert',value:outline}],draft.base.revision,[],result=>draft.accept(outlineInitial(result,chapter.id)));
  };
  return <section className="story-panel" aria-label="章节蓝图编辑" onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><h3>这一章承担什么</h3><Badge tone="brand">待写计划</Badge></div><p className="story-muted">记录想要写出的变化，正文完成后再核对实际发生的事实。</p>
    <fieldset disabled={busy} className="editor-fields">
      <label>章节意图<textarea rows={3} maxLength={12000} value={value.intent} onChange={event=>draft.change({...value,intent:event.target.value})} placeholder="这章让人物、矛盾或读者认识发生什么变化？"/></label>
      <label>情节点（每行一项）<textarea rows={5} maxLength={20000} value={value.beats} onChange={event=>draft.change({...value,beats:event.target.value})} placeholder="按因果顺序写出关键行动与结果。"/></label>
      <label>章尾钩子<textarea rows={3} maxLength={12000} value={value.endingHook} onChange={event=>draft.change({...value,endingHook:event.target.value})} placeholder="读者带着什么悬念、选择或情绪进入下一章？"/></label>
      <div className="story-field-grid"><label>计划字数下限<input type="number" inputMode="numeric" min="0" step="1" value={value.minWords} onChange={event=>draft.change({...value,minWords:event.target.value})}/></label><label>计划字数上限<input type="number" inputMode="numeric" min="0" step="1" value={value.maxWords} onChange={event=>draft.change({...value,maxWords:event.target.value})}/></label></div>
    </fieldset>
    <DraftFooter draft={draft} busy={busy} invalid={invalid} onSave={submit} label="保存章节蓝图" latest={<><p>{snapshot.story.outlines[chapter.id]?.intent||'尚未记录章节意图'}</p><p>{asText(snapshot.story.outlines[chapter.id]?.beats)}</p><p>{snapshot.story.outlines[chapter.id]?.endingHook}</p></>}/>
  </section>;
}
type TrackingDraft={revision:number;basisRevision:number;summary:string;storyTime:string;storyTimeOrder:string;location:string;activeCharacterIds:string[];commitments:string;risks:string;authorTruth:string;readerKnown:string};
const trackingInitial=(snapshot:StorySnapshot,chapter:StoryChapter):TrackingDraft=>{
  const tracking=snapshot.story.tracking[chapter.id];
  return {revision:snapshot.story.revision,basisRevision:tracking?.chapterRevision??chapter.revision,summary:tracking?.summary||'',storyTime:tracking?.storyTime||'',storyTimeOrder:tracking?.storyTimeOrder?.toString()||'',location:tracking?.location||'',activeCharacterIds:tracking?.activeCharacterIds||[],commitments:asText(tracking?.commitments),risks:asText(tracking?.risks),authorTruth:asText(tracking?.authorTruth),readerKnown:asText(tracking?.readerKnown)};
};
function TrackingEditor({snapshot,chapter,busy,save,onChapter}:Props&{chapter:StoryChapter}) {
  const draft=useStoryDraft(`${snapshot.novelId}:story-tracking:${chapter.id}`,trackingInitial(snapshot,chapter));
  const value=draft.value,tracking=snapshot.story.tracking[chapter.id];
  const stale=value.basisRevision!==chapter.revision;
  const missingCharacters=value.activeCharacterIds.filter(id=>!snapshot.characters.some(character=>character.id===id));
  // The order is optional; when it is given it must be an integer, and clearing it
  // removes the ordering instead of guessing one from the text.
  const orderInvalid=value.storyTimeOrder!==''&&(!/^-?\d+$/.test(value.storyTimeOrder)||!Number.isSafeInteger(Number(value.storyTimeOrder)));
  const submit=()=>{
    if(busy||!draft.dirty||draft.updated||stale||!value.summary.trim()||orderInvalid)return;
    void save([{op:'tracking.commit',value:{chapterId:chapter.id,expectedChapterRevision:value.basisRevision,summary:value.summary,storyTime:value.storyTime,storyTimeOrder:value.storyTimeOrder!==''?Number(value.storyTimeOrder):null,location:value.location,activeCharacterIds:value.activeCharacterIds,commitments:lines(value.commitments),risks:lines(value.risks),authorTruth:lines(value.authorTruth),readerKnown:lines(value.readerKnown)}}],draft.base.revision,[{chapterId:chapter.id,revision:value.basisRevision}],result=>draft.accept(trackingInitial(result,result.chapters.find(item=>item.id===chapter.id)||chapter)));
  };
  const toggle=(id:string)=>draft.change({...value,activeCharacterIds:value.activeCharacterIds.includes(id)?value.activeCharacterIds.filter(item=>item!==id):[...value.activeCharacterIds,id]});
  return <section className="story-panel" aria-label="正文事实追踪编辑" onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><h3>只记正文已经发生的事</h3><Badge tone={stale?'warning':tracking?'success':'idle'}>{stale?'来源已变化':tracking?'已有追踪':'尚未追踪'}</Badge></div>
    <p className="story-muted">保存依据：正文 v{value.basisRevision} · 当前正文 v{chapter.revision}{tracking?` · 上次追踪 v${tracking.chapterRevision}`:''}。下章承诺与风险作为后续义务单独记录。</p>
    <fieldset disabled={busy} className="editor-fields">
      <label>本章事实小结<textarea rows={5} maxLength={12000} value={value.summary} onChange={event=>draft.change({...value,summary:event.target.value})} placeholder="谁做了什么，造成什么结果？请依据当前正文。"/></label>
      <div className="story-field-grid"><label>故事时间<input maxLength={2000} value={value.storyTime} onChange={event=>draft.change({...value,storyTime:event.target.value})} placeholder="例如：同日傍晚"/></label><label>发生地点<input maxLength={2000} value={value.location} onChange={event=>draft.change({...value,location:event.target.value})}/></label><label>故事时间序（可选）<input type="number" inputMode="numeric" step="1" value={value.storyTimeOrder} onChange={event=>draft.change({...value,storyTimeOrder:event.target.value})} placeholder="数字越小越早" title="故事内的先后排序值；留空表示尚未排序，不会从「故事时间」文本自动推断"/></label></div>
      <fieldset className="story-character-picker"><legend>活跃角色</legend>{snapshot.characters.length?snapshot.characters.map(character=><label key={character.id} title={character.summary}><input type="checkbox" checked={value.activeCharacterIds.includes(character.id)} onChange={()=>toggle(character.id)}/>{character.name}</label>):<p className="story-muted">设定中还没有角色卡，可先记录事实小结。</p>}{missingCharacters.map(id=><label key={id}><input type="checkbox" checked onChange={()=>toggle(id)}/>已移除的角色（取消勾选后可保存）</label>)}</fieldset>
      <label>下章承诺（每行一项，属于后续义务）<textarea rows={3} maxLength={20000} value={value.commitments} onChange={event=>draft.change({...value,commitments:event.target.value})} placeholder="正文已经提出、后续仍须兑现的承诺。"/></label>
      <label>连续性风险（每行一项）<textarea rows={3} maxLength={20000} value={value.risks} onChange={event=>draft.change({...value,risks:event.target.value})} placeholder="时间、人物动机、持有物或悬而未决的事实。"/></label>
      <div className="story-field-grid"><label>作者真相（每行一项，读者未必知道）<textarea rows={3} maxLength={20000} value={value.authorTruth} onChange={event=>draft.change({...value,authorTruth:event.target.value})} placeholder="故事里已经成立、但还没向读者挑明的事实。"/></label><label>读者已知（每行一项，正文已披露）<textarea rows={3} maxLength={20000} value={value.readerKnown} onChange={event=>draft.change({...value,readerKnown:event.target.value})} placeholder="读者从已写正文里实际得知的信息。"/></label></div>
    </fieldset>
    <DraftFooter draft={draft} busy={busy} invalid={!value.summary.trim()?'请填写本章事实小结':missingCharacters.length?'请取消已移除的角色':orderInvalid?'故事时间序请输入整数':''} onSave={submit} label="保存正文事实追踪" source={{basis:value.basisRevision,current:chapter.revision,onOpen:()=>onChapter(chapter.id),onVerify:()=>draft.change({...value,basisRevision:chapter.revision})}} latest={<><p>{tracking?.summary||'尚未保存事实追踪'}</p><p>{tracking?.storyTime} · {tracking?.location}{typeof tracking?.storyTimeOrder==='number'?` · 时间序 ${tracking.storyTimeOrder}`:''}</p><p>{asText(tracking?.commitments)}</p></>}/>
  </section>;
}
