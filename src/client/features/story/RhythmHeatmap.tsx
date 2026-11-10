import React, {useMemo, useState} from 'react';
import type {ChapterRhythm, StorySnapshot} from '../../../contracts/story.ts';
import {saveShortcut} from '../../shared/ui.jsx';
import {Badge, DraftFooter, useStoryDraft} from './shared.tsx';
import type {StoryActions} from './useStoryWorkspace.ts';

/** The recorded reading of a chapter: one tone plus its role inside the unit. Nothing here is inferred from prose. */
type Props=StoryActions;
type Tone=ChapterRhythm['tone'];
type Role=ChapterRhythm['role'];
export const toneNames:Record<Tone,string>={tense:'紧张',light:'轻松',sad:'悲伤',hot:'热血',satisfying:'爽快',sweet:'甜蜜',warm:'温暖',horror:'惊悚',oppressive:'压抑',other:'其他'};
export const roleNames:Record<Role,string>={'' :'未标注',setup:'建立',escalate:'升级',turn:'转折',payoff:'兑现',aftermath:'余波'};
const toneOrder=Object.keys(toneNames) as Tone[];
const roleOrder=(Object.keys(roleNames) as Role[]).filter(role=>role!=='');
/** Each cell carries a one-character role glyph; the detail panel spells the role out in words. */
const roleGlyphs:Record<Role,string>={'' :'·',setup:'建',escalate:'升',turn:'转',payoff:'兑',aftermath:'余'};
type Column={chapter:StorySnapshot['chapters'][number];index:number;chapterId:string;rhythm:ChapterRhythm|undefined;stale:boolean;heightRatio:number;words:string};
type Run={key:string;start:number;length:number;tone:Tone|null};
/** One explicit column per chapter: a run strip above, then the cells. */
const heatTemplate=(count:number)=>`repeat(${Math.max(count,1)},minmax(26px,1fr))`;
export function RhythmHeatmap({snapshot,save,busy}:Props) {
  // A record for a chapter that is no longer on the board would be a phantom column, so columns come from chapters.
  const model=useMemo(()=>layoutRhythm(snapshot),[snapshot]);
  const firstRecorded=model.columns.find(column=>column.rhythm)?.chapterId;
  const [picked,setPicked]=useState<string|undefined>(undefined);
  const [editing,setEditing]=useState(false);
  const exposed=picked&&model.columns.some(column=>column.chapterId===picked)?picked:firstRecorded??model.columns[0]?.chapterId;
  const active=exposed?model.columns.find(column=>column.chapterId===exposed):undefined;
  if(!model.recorded)return <section className="story-figure" aria-label="节奏热力图">
    <div className="story-figure-heading"><div><h3>节奏热力图</h3><p>每列一章：颜色是该章记录的基调，格内小字是它在本单元里的角色定位。点一格就能记录这一章的基调与角色。</p></div><Badge>尚无节奏记录</Badge></div>
    <p className="story-figure-empty">还没有任何章节节奏记录，所以这里没有可画的热力图。热力图的数据来自「章节节奏记录」：逐章记下这一章给人的主导基调、它承担的角色定位，以及一句备注。这些是作者写下的判断，不从正文自动推测。</p>
    {!!model.columns.length&&<div className="story-heat-toolbar"><button type="button" className="story-heat-action" onClick={()=>{setPicked(model.columns[0].chapterId);setEditing(true);}}>＋ 记录第一章的基调</button><span className="story-muted">也可以先在图例下方的空网格里选章；保存后热力图就会长出来。</span></div>}
    {!!model.columns.length&&<div className="story-heat-scroll" tabIndex={0} role="group" aria-label="章节基调热力图，可横向滚动">
      <div className="story-heat" style={{gridTemplateColumns:heatTemplate(model.columns.length)}}>
        <div className="story-heat-runs" aria-hidden="true" style={{gridColumn:`1 / span ${model.columns.length}`,gridTemplateColumns:heatTemplate(model.columns.length)}}/>
        {model.columns.map(column=><button type="button" key={column.chapterId} className="story-heat-cell tone-none" aria-pressed={column.chapterId===exposed} aria-label={`${column.chapter.title}，尚无节奏记录，${column.chapter.textCount.toLocaleString('zh-CN')} 字`} onClick={()=>{setPicked(column.chapterId);setEditing(true);}}>
          <span className="story-heat-role" aria-hidden="true">—</span>
          <span className="story-heat-bar" aria-hidden="true"><i style={{height:`${Math.max(6,column.heightRatio*100)}%`}}/></span>
          <span className="story-heat-words" aria-hidden="true">{column.words}</span>
          <span className="story-heat-index">{column.index+1}</span>
        </button>)}
      </div>
    </div>}
    {active&&<RhythmEditor key={active.chapterId} snapshot={snapshot} busy={busy} save={save} column={active} onClose={()=>setEditing(false)}/>}
  </section>;
  const color=active&&active.rhythm?`tone-${active.rhythm.tone}`:'tone-none';
  return <section className="story-figure" aria-label="节奏热力图">
    <div className="story-figure-heading"><div><h3>节奏热力图</h3><p>横轴按章节顺序，一列一章。色块是基调，格内小字是角色定位，格内竖条与该章字数成正比。顶部横条把相邻同基调的章节连成一段；两章以上就会在下方点名，一眼就能看到“连续三章都是压抑”这一类问题。点一格可以修改这一章的记录。</p></div>
      <ul className="story-legend" aria-label="基调图例">{toneOrder.map(tone=><li key={tone}><i className={`story-tone-swatch tone-${tone}`}/>{toneNames[tone]}</li>)}</ul></div>
    <div className="story-heat-scroll" tabIndex={0} role="group" aria-label="章节基调热力图，可横向滚动">
      <div className="story-heat" style={{gridTemplateColumns:heatTemplate(model.columns.length)}}>
        <div className="story-heat-runs" aria-hidden="true" style={{gridColumn:`1 / span ${model.columns.length}`,gridTemplateColumns:heatTemplate(model.columns.length)}}>{model.runs.map(run=><div className={`story-heat-run tone-${run.tone??'none'}`} key={run.key} style={{gridColumn:`${run.start+1} / span ${run.length}`}}><i/></div>)}</div>
        {model.columns.map(column=><button type="button" key={column.chapterId} className={`story-heat-cell tone-${column.rhythm?column.rhythm.tone:'none'}`} aria-pressed={column.chapterId===active?.chapterId} aria-label={`${column.chapter.title}，${column.rhythm?`基调${toneNames[column.rhythm.tone]}，角色定位${roleNames[column.rhythm.role]}`:'尚无节奏记录'}，${column.chapter.textCount.toLocaleString('zh-CN')} 字`} onClick={()=>setPicked(column.chapterId)}>
          <span className="story-heat-role" aria-hidden="true">{column.rhythm?roleGlyphs[column.rhythm.role]:'—'}</span>
          <span className="story-heat-bar" aria-hidden="true"><i style={{height:`${Math.max(6,column.heightRatio*100)}%`}}/></span>
          <span className="story-heat-words" aria-hidden="true">{column.words}</span>
          <span className="story-heat-index">{column.index+1}</span>
          {column.stale&&<span className="story-heat-dot" title="记录之后正文已改过"/>}
        </button>)}
      </div>
    </div>
    {!!model.blocks.length&&<ul className="story-heat-run-list" aria-label="连续同基调段">{model.blocks.map(block=>{const tone=block.tone;return <li key={block.key}><i className={`story-tone-swatch tone-${tone||'none'}`}/><strong>{tone?toneNames[tone]:'未记录'}</strong><span>第 {block.start+1}–{block.start+block.length} 章连续 {block.length} 章同基调</span></li>;})}</ul>}
    {active&&<dl className={`story-heat-detail ${color}`} aria-live="polite">
      <div className="story-heat-detail-title"><dt>章节</dt><dd>{active.chapter.title}{active.stale&&<Badge tone="warning">记录后正文已改</Badge>}</dd></div>
      <div><dt>基调</dt><dd>{active.rhythm?toneNames[active.rhythm.tone]:'未记录'}</dd></div>
      <div><dt>角色定位</dt><dd>{roleNames[active.rhythm?active.rhythm.role:'']}</dd></div>
      <div><dt>字数</dt><dd>{active.chapter.textCount.toLocaleString('zh-CN')}</dd></div>
      <div><dt>句数</dt><dd>{active.chapter.sentences}</dd></div>
      <div><dt>对白占比</dt><dd>{active.chapter.dialogueRatio}%</dd></div>
      <div className="story-heat-detail-note"><dt>备注</dt><dd>{active.rhythm?.note||'未写下备注。'}</dd></div>
      <div className="story-heat-detail-actions"><button type="button" className="story-heat-action" disabled={busy} onClick={()=>setEditing(value=>!value)} aria-expanded={editing} aria-controls="story-heat-editor">{editing?'收起编辑':active.rhythm?'编辑这一章的基调':'给这一章记录基调'}</button></div>
    </dl>}
    {active&&editing&&<RhythmEditor key={active.chapterId} snapshot={snapshot} busy={busy} save={save} column={active} onClose={()=>setEditing(false)}/>}
    <ul className="story-legend" aria-label="角色定位图例">{roleOrder.map(role=><li key={role}>{`${roleGlyphs[role]} ${roleNames[role]}`}</li>)}</ul>
  </section>;
}
type Draft={revision:number;basis:number;tone:Tone;role:Role;note:string};
/** A record describes a chapter version, so the draft carries the version it was read from. */
const initial=(column:Column):Draft=>({revision:0,basis:column.rhythm?.chapterRevision??column.chapter.revision,
  tone:column.rhythm?.tone??'other',role:column.rhythm?.role??'',note:column.rhythm?.note??''});
function RhythmEditor({snapshot,save,busy,column,onClose}:Props&{column:Column;onClose:()=>void}) {
  const draft=useStoryDraft<Draft>(`${snapshot.novelId}:story-rhythm:${column.chapterId}`,initial(column));
  const value=draft.value,chapter=column.chapter;
  // The draft may describe an older read of the chapter; the author has to re-check the current prose first.
  const stale=value.basis!==chapter.revision;
  const change=(next:Partial<Draft>)=>draft.change({...value,...next});
  const submit=()=>{
    if(busy||!draft.dirty||stale)return;
    void save([{op:'rhythm.upsert',value:{chapterId:chapter.id,expectedChapterRevision:value.basis,tone:value.tone,role:value.role,note:value.note}}],snapshot.story.revision,[],result=>{
      // Rebuild from the receipt so the saved record is never still shown as a dirty draft.
      const fresh=layoutRhythm(result).columns.find(item=>item.chapterId===chapter.id);
      if(!fresh)return;
      const basis=fresh.rhythm?.chapterRevision??chapter.revision;
      draft.accept({revision:0,basis,tone:fresh.rhythm?.tone??value.tone,role:fresh.rhythm?.role??value.role,note:fresh.rhythm?.note??value.note});
      onClose();
    });
  };
  const remove=()=>{if(busy)return;void save([{op:'rhythm.remove',value:{chapterId:chapter.id}}],snapshot.story.revision,[],()=>onClose());};
  return <section id="story-heat-editor" className="story-panel story-rhythm-editor" aria-label={`节奏记录编辑：${chapter.title}`} onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><div><button type="button" className="story-back" onClick={onClose}>‹ 收起</button><h4>{chapter.title}</h4><p className="story-muted">正文 v{chapter.revision} · {chapter.textCount.toLocaleString('zh-CN')} 字 · {chapter.sentences} 句 · 对白 {chapter.dialogueRatio}%{column.rhythm?` · 现有记录依据 v${column.rhythm.chapterRevision}`:' · 尚无记录'}</p></div><Badge tone={column.stale?'warning':column.rhythm?'success':'idle'}>{column.stale?'记录后正文已改':column.rhythm?'已有记录':'尚未记录'}</Badge></div>
    <fieldset className="editor-fields" disabled={busy}>
      <div className="story-field-grid">
        <label>基调<select value={value.tone} onChange={event=>change({tone:event.target.value as Tone})}>{toneOrder.map(tone=><option key={tone} value={tone}>{toneNames[tone]}</option>)}</select></label>
        <label>角色定位<select value={value.role} onChange={event=>change({role:event.target.value as Role})}>{Object.entries(roleNames).map(([role,label])=><option key={role} value={role}>{role===''?'不标注':label}</option>)}</select></label>
      </div>
      <label>备注<textarea rows={3} maxLength={2000} value={value.note} onChange={event=>change({note:event.target.value})} placeholder="这一章为什么是这个基调？例如：压着写完，等下一章才给兑现。"/></label>
    </fieldset>
    {stale&&<div className="story-warning" role="status"><p>这份记录的依据是正文 v{value.basis}，当前正文为 v{chapter.revision}。正文变化后，原有的基调判断需要重新核对；请先看当前正文，再按当前版本保存。</p><div className="row"><button type="button" className="story-heat-action" disabled={busy} onClick={()=>change({basis:chapter.revision})}>已核对正文 v{chapter.revision}，按当前版本保存</button></div></div>}
    <DraftFooter draft={draft} busy={busy} invalid={stale?'请先核对当前正文版本':''} onSave={submit} label={column.rhythm?'保存节奏记录':'记录这一章的基调'}/>
    {column.rhythm&&<button type="button" className="story-reset" disabled={busy} onClick={remove}>删除这一章的节奏记录</button>}
  </section>;
}
export function layoutRhythm(snapshot:StorySnapshot) {
  const rhythms=snapshot.story.rhythms||{};
  const maxWords=Math.max(1,...snapshot.chapters.map(chapter=>chapter.textCount));
  const columns:Column[]=snapshot.chapters.map((chapter,index)=>{
    const rhythm=rhythms[chapter.id];
    return {chapter,index,chapterId:chapter.id,rhythm,stale:!!rhythm&&rhythm.chapterRevision!==chapter.revision,
      heightRatio:Math.min(1,chapter.textCount/maxWords),
      words:chapter.textCount>=1000?`${(chapter.textCount/1000).toFixed(chapter.textCount<10000?1:0)}k`:String(chapter.textCount)};
  });
  // Adjacent chapters with the same recorded tone form one run; an unrecorded chapter breaks the run.
  const runs:Run[]=[];
  columns.forEach((column,index)=>{
    const tone=column.rhythm?column.rhythm.tone:null,last=runs[runs.length-1];
    if(last&&last.tone===tone)last.length+=1;
    else runs.push({key:`${index}:${column.chapter.id}`,start:index,length:1,tone});
  });
  const blocks:Run[]=runs.filter(run=>run.tone!==null&&run.length>1);
  return {columns,runs,blocks,recorded:columns.some(column=>column.rhythm)};
}
