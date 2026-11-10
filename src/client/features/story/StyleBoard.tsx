import React, {useMemo, useState} from 'react';
import type {StyleProfile, StyleSample, StorySnapshot} from '../../../contracts/story.ts';
import {saveShortcut} from '../../shared/ui.jsx';
import {Badge, DraftFooter, useStoryDraft} from './shared.tsx';
import {chapterTitle, asText, lines} from './model.ts';
import type {StoryActions} from './useStoryWorkspace.ts';

/** The written requirement on top, the prose measured against it below; the requirement is editable here. */
type Props=StoryActions;
type Kind='length'|'dialogue';
type Diff='none'|'over'|'under'|'match';
type DeviationState='value'|'unset'|'unmeasured';
type TextField='viewpoint'|'tense'|'diction'|'avoid';
const profileFields:[TextField,string,string][]=[
  ['viewpoint','视角','从谁的眼光、以第几人称叙述'],
  ['tense','时态','叙述使用的时间基准'],
  ['diction','用词','选词的口径：书面、口语、方言、文白相间'],
  ['avoid','避免','明确不要出现的东西'],
];
const barTones=['business','success','warn','error'];
export function StyleBoard({snapshot,save,busy}:Props) {
  const profile=snapshot.story.style,comparison=snapshot.style;
  const model=useMemo(()=>layoutStyle(snapshot),[snapshot]);
  const draft=useStyleDraft(snapshot);
  const stance=profileFields.filter(([field])=>Boolean(profile[field])).length;
  if(profileEmpty(profile)&&!model.samples.length)return <section className="story-figure" aria-label="文风对照">
    <div className="story-figure-heading"><div><h3>文风对照</h3><p>一边是写下的文风要求，一边是正文实际读起来的样子。</p></div><Badge>尚无文风要求</Badge></div>
    <div className="story-empty">
      <h3>还没有写下文风要求</h3>
      <p>这一页的写作要求来自作品的文风档案：目标平均句长、目标对白占比、视角、时态、用词、要避免的写法，以及若干写作锚点。现在它还是空的，所以既没有目标线，也没有可对照的实测值。</p>
      <p>在下面的表单里写下要求并保存即可；留空的项表示「未设定」，不会按 0 计算，也不会被当成达标。目标与视角同样可以在「写作预设」页面维护，两边指的是同一份档案。</p>
      <p>正文也还没有可测量的样子，所以样本表同样是空的。写完正文后，这里会按章列出句数、平均句长、对白占比与段落数。</p>
    </div>
    <StyleForm snapshot={snapshot} draft={draft} busy={busy} save={save}/>
  </section>;
  return <section className="story-figure" aria-label="文风对照">
    <div className="story-figure-heading"><div><h3>文风对照</h3><p>上方是写下的要求，可直接编辑；图和表是正文里量出来的实际值。目标线是水平参考线；柱高按正文中的最大值等比缩放，这样章节之间的落差才可比。</p></div><Badge tone={stance?'success':'idle'}>{stance?`已写下 ${stance} 项写作要求`:'文风要求尚未填写'}</Badge></div>
    <StyleForm snapshot={snapshot} draft={draft} busy={busy} save={save}/>
    <div className="story-style-deviations" aria-label="与目标的差值">
      <DeviationTile kind="length" label="平均句长" value={comparison.deviation.sentence} target={profile.targetSentence} state={deviationState(profile.targetSentence,model.measured)} average={model.average.sentence} unit="字"/>
      <DeviationTile kind="dialogue" label="平均对白占比" value={comparison.deviation.dialogue} target={profile.dialogueRatio} state={deviationState(profile.dialogueRatio,model.measured)} average={model.average.dialogue} unit="%"/>
    </div>
    {model.samples.length?<>
      <div className="story-style-charts">
        <StyleChart kind="length" model={model}/>
        <StyleChart kind="dialogue" model={model}/>
      </div>
      <div className="story-style-scroll">
        <table className="story-style-table">
          <caption>每章实测样本，按章节顺序。差值只与已设定的目标比较。</caption>
          <thead><tr><th scope="col">章节</th><th scope="col">句数</th><th scope="col">平均句长</th><th scope="col">对白占比</th><th scope="col">段落数</th><th scope="col">正文版本</th></tr></thead>
          <tbody>{model.samples.map((sample,index)=><tr key={sample.chapterId}>
            <th scope="row"><span className="story-chapter-number">{index+1}</span>{chapterTitle(snapshot,sample.chapterId)}</th>
            <td>{sample.sentences}</td>
            <td className={diffClass(diffOf(sample.avgSentenceLength,profile.targetSentence))}>{sample.avgSentenceLength}{diffNote(sample.avgSentenceLength,profile.targetSentence,'字')}</td>
            <td className={diffClass(diffOf(sample.dialogueRatio,profile.dialogueRatio))}>{sample.dialogueRatio}%{diffNote(sample.dialogueRatio,profile.dialogueRatio,'个点')}</td>
            <td>{sample.paragraphs}</td>
            <td>v{sample.chapterRevision}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>:<p className="story-figure-empty">正文还没有可测量的样本，所以平均句长与对白占比对照图和样本表都是空的。写完正文后，这里会按章列出实测值。</p>}
    {!draft.dirty&&<p className="story-figure-empty">目标与正文的对照只在这份档案和已保存的正文之间计算：改了要求并保存后，参考线与差值会一起更新。</p>}
  </section>;
}
type StyleDraft={revision:number;targetSentence:string;dialogueRatio:string;viewpoint:string;tense:string;diction:string;avoid:string;anchors:string};
/** Numbers stay text in the draft: an empty box means "unset", and must never become 0. */
const styleInitial=(profile:StyleProfile):StyleDraft=>({revision:0,
  targetSentence:profile.targetSentence===null?'':String(profile.targetSentence),
  dialogueRatio:profile.dialogueRatio===null?'':String(profile.dialogueRatio),
  viewpoint:profile.viewpoint,tense:profile.tense,diction:profile.diction,avoid:profile.avoid,anchors:asText(profile.anchors)});
const parseTarget=(text:string,max:number)=>{
  if(text.trim()==='')return {value:null as number|null,error:''};
  if(!/^\d+$/.test(text.trim()))return {value:null,error:'请输入非负整数'};
  const value=Number(text);
  return {value,error:value>max?`不能超过 ${max}`:''};
};
function useStyleDraft(snapshot:StorySnapshot) {
  return useStoryDraft<StyleDraft>(`${snapshot.novelId}:story-style`,styleInitial(snapshot.story.style));
}
function StyleForm({snapshot,busy,save,draft}:Props&{draft:ReturnType<typeof useStyleDraft>}) {
  const value=draft.value;
  const sentence=parseTarget(value.targetSentence,400),dialogue=parseTarget(value.dialogueRatio,100);
  const invalid=sentence.error?sentence.error:dialogue.error?dialogue.error:'';
  const change=(next:Partial<StyleDraft>)=>draft.change({...value,...next});
  const submit=()=>{
    if(busy||!draft.dirty||invalid)return;
    // Only the edited fields are sent; the op merges, so everything else keeps its saved value.
    const patch:{targetSentence?:number|null;dialogueRatio?:number|null;viewpoint?:string;tense?:string;diction?:string;avoid?:string;anchors?:string[]}={};
    if(value.targetSentence!==styleInitial(snapshot.story.style).targetSentence)patch.targetSentence=sentence.value;
    if(value.dialogueRatio!==styleInitial(snapshot.story.style).dialogueRatio)patch.dialogueRatio=dialogue.value;
    for(const [field] of profileFields)if(value[field]!==snapshot.story.style[field])patch[field]=value[field];
    if(value.anchors!==asText(snapshot.story.style.anchors))patch.anchors=lines(value.anchors).slice(0,20);
    if(!Object.keys(patch).length){draft.reset();return;}
    void save([{op:'style.upsert',value:patch}],snapshot.story.revision,[],result=>draft.accept(styleInitial(result.story.style)));
  };
  return <section className="story-panel story-style-editor" aria-label="写作要求" onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><div><h3>写作要求</h3><p className="story-muted">留空表示未设定，不会被当作 0，也不会被算成达标。</p></div></div>
    <fieldset className="editor-fields" disabled={busy}>
      <div className="story-style-requirements">
        <label className="story-style-tile"><span>目标平均句长</span><input type="number" inputMode="numeric" min="0" max="400" step="1" placeholder="未设定" value={value.targetSentence} onChange={event=>change({targetSentence:event.target.value})}/><small>{sentence.error||'0–400 的整数；按平均每句可见字数测量'}</small></label>
        <label className="story-style-tile"><span>目标对白占比</span><input type="number" inputMode="numeric" min="0" max="100" step="1" placeholder="未设定" value={value.dialogueRatio} onChange={event=>change({dialogueRatio:event.target.value})}/><small>{dialogue.error||'0–100 的百分比；引号内字数占全章的比例'}</small></label>
        {profileFields.map(([field,label,hint])=><label className="story-style-tile story-style-tile-wide" key={field}><span>{label}</span><textarea rows={2} maxLength={2000} placeholder="未设定" value={value[field]} onChange={event=>change({[field]:event.target.value})}/><small>{hint}</small></label>)}
        <label className="story-style-tile story-style-tile-wide"><span>写作锚点</span><textarea rows={3} maxLength={20000} placeholder="每行一句可以引用的范例，最多 20 条" value={value.anchors} onChange={event=>change({anchors:event.target.value})}/><small>{lines(value.anchors).length?`已写 ${lines(value.anchors).length} 条，每行一条`:'还没有锚点；每行一条，最多 20 条'}</small></label>
      </div>
    </fieldset>
    <DraftFooter draft={draft} busy={busy} invalid={invalid} onSave={submit} label="保存写作要求"/>
  </section>;
}
/** A value needs both halves; a null can mean "no requirement" or "no sample", never "matched". */
const deviationState=(target:number|null,measured:boolean):DeviationState=>target===null?'unset':measured?'value':'unmeasured';
function DeviationTile({kind,label,value,target,state,average,unit}:{kind:Kind;label:string;value:number|null;target:number|null;state:DeviationState;average:number|null;unit:string}) {
  const measure=kind==='length'?'平均句长':'对白占比';
  return <div className="story-style-deviation" data-state={state}>
    <span>{label} 与目标之差</span>
    {/* Only a computed deviation gets a number; the two null cases are named in words, never shown as 0. */}
    {state==='value'&&value!==null?<><strong data-tone={value===0?'match':value>0?'over':'under'}>{`${value>0?'+':''}${value}${unit}`}</strong>
      <small>{value===0?'与目标持平':`${value>0?'高于':'低于'}目标 ${Math.abs(value)}${unit}`} · 实测平均 {average}{unit} · 目标 {target}{unit}</small></>
      :<><strong className="story-style-unset">{state==='unset'?'未设定目标':'样本不足'}</strong>
        <small>{state==='unset'?`文风档案里还没有写目标的${measure}，所以没有差值可算。这不是“达标”。`:`文风档案已写了目标的${measure}，但正文里没有足够的${measure}样本，所以没有差值可算。这不是“达标”。`}</small></>}
  </div>;
}
/** Bars scale to the largest measured value, so a target line above every bar stays on the chart. */
function StyleChart({kind,model}:{kind:Kind;model:StyleLayout}) {
  const values=model.samples.map(sample=>kind==='length'?sample.avgSentenceLength:sample.dialogueRatio);
  const target=kind==='length'?model.targetSentence:model.targetDialogue;
  const unit=kind==='length'?'字':'%';
  const label=kind==='length'?'平均句长':'对白占比';
  // Half a step of headroom keeps the top label and the target label inside the viewBox.
  const max=Math.max(1,target??0,...values)*1.12;
  const ticks=Array.from({length:5},(_,index)=>Math.round(max*index/4));
  const pitch=Math.max(30,Math.min(56,480/Math.max(model.samples.length,1))),slot=Math.max(12,Math.min(28,pitch-10));
  const left=4,top=14,plot=118,bottom=top+plot,width=left+model.samples.length*pitch+8,height=bottom+16;
  const y=(value:number)=>bottom-(value/max)*plot;
  const axis=(value:number)=>kind==='dialogue'?`${value}%`:String(value);
  return <figure className="story-style-chart" aria-label={`${label}逐章柱状图`}>
    <figcaption><strong>{label}</strong><span>{target===null?'目标未设定':`目标线 ${target}${unit}`}</span></figcaption>
    <div className="story-style-chart-scroll">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`${label}逐章柱状图，${target===null?'没有目标线':`目标线 ${target}${unit}`}`}>
        <g className="story-style-grid" aria-hidden="true">{ticks.map((tick,index)=><g key={`${index}:${tick}`}><line x1={left} x2={width-2} y1={y(tick)} y2={y(tick)}/><text x={left} y={y(tick)-3}>{axis(tick)}</text></g>)}</g>
        <g className="story-style-bars">{model.samples.map((sample,index)=>{
          // Two heights per bar: the real ratio (it stays honest) and a floor so a low value is still clickable and labelled.
          const value=values[index],x=left+index*pitch+(pitch-slot)/2,real=bottom-y(Math.max(value,0));
          const shown=Math.max(real,4),topOfBar=bottom-shown,diff=diffOf(value,target);
          return <g key={sample.chapterId} className={`story-style-bar tone-${diff}`} tabIndex={0}>
            <title>{`${chapterTitle(model.snapshot,sample.chapterId)}：${label} ${axis(value)}${diff==='none'?'（未设定目标）':`（${diff==='over'?'高于目标':diff==='under'?'低于目标':'与目标持平'}）`}`}</title>
            <rect className="story-style-bar-hit" x={left+index*pitch} y={top} width={pitch} height={plot}/>
            <rect className={`story-style-bar-rect bar-${barTones[index%barTones.length]}`} x={x} y={topOfBar} width={slot} height={shown}/>
            <text className="story-style-bar-value" x={x+slot/2} y={topOfBar-4} textAnchor="middle">{axis(value)}</text>
            <text className="story-style-bar-tick" x={x+slot/2} y={bottom+12} textAnchor="middle">{index+1}</text>
          </g>;
        })}</g>
        {target!==null&&<g className="story-style-target"><line x1={left} x2={width-2} y1={y(target)} y2={y(target)}/><text x={left+2} y={y(target)-4}>{`目标 ${axis(target)}`}</text></g>}
      </svg>
    </div>
  </figure>;
}
type StyleLayout=ReturnType<typeof layoutStyle>;
export function layoutStyle(snapshot:StorySnapshot) {
  const profile=snapshot.story.style;
  // A sample for a removed chapter has no title to show, so it is dropped rather than drawn as a blank column.
  const samples:StyleSample[]=snapshot.style.samples.filter(sample=>snapshot.chapters.some(chapter=>chapter.id===sample.chapterId));
  const measured=snapshot.style.chapterIds.length>0;
  const usable=samples.filter(sample=>snapshot.style.chapterIds.includes(sample.chapterId));
  const average=(pick:(sample:StyleSample)=>number)=>usable.length?Math.round(usable.reduce((sum,sample)=>sum+pick(sample),0)/usable.length):null;
  return {snapshot,samples,measured,targetSentence:profile.targetSentence,targetDialogue:profile.dialogueRatio,
    average:{sentence:average(sample=>sample.avgSentenceLength),dialogue:average(sample=>sample.dialogueRatio)}};
}
/** The explicit requirement is optional: a project without one is not invalid. */
export function profileEmpty(profile:StyleProfile) {
  return profile.targetSentence===null&&profile.dialogueRatio===null&&profileFields.every(([field])=>!profile[field])&&!profile.anchors.length;
}
/** A per-chapter deviation is only shown against a requirement that exists. */
function diffOf(value:number,target:number|null):'none'|Diff {
  if(target===null)return 'none';
  return value===target?'match':value>target?'over':'under';
}
function diffClass(diff:'none'|Diff) {return diff==='none'?'':`story-style-diff tone-${diff==='over'?'error':diff==='under'?'warn':'success'}`;}
function diffNote(value:number,target:number|null,unit:string) {
  const diff=diffOf(value,target);
  if(diff==='none'||target===null)return null;
  if(diff==='match')return <small> · 命中</small>;
  return <small>{` · ${diff==='over'?'高':'低'} ${Math.abs(value-target)}${unit}`}</small>;
}
