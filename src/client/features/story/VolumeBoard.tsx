import React, {useMemo, useState} from 'react';
import type {StoryLine, StorySnapshot, StoryUnit} from '../../../contracts/story.ts';
import {useWorkspacePreference} from '../../shared/workspace-state.ts';
import {saveShortcut} from '../../shared/ui.jsx';
import {useDialog} from '../../dialog.tsx';
import {Badge, DraftFooter, useStoryDraft} from './shared.tsx';
import {chapterTitle} from './model.ts';
import type {StoryActions} from './useStoryWorkspace.ts';

type Props=StoryActions&{onChapter:(id?:string)=>void};
type Tone='idle'|'brand'|'warning'|'error'|'success';
/** The contract fields of a unit, in the order an author checks them. */
const contractFields=[
  {key:'promise',label:'承诺',hint:'读者在这一单元结束时必须拿到的东西。'},
  {key:'emotionEngine',label:'情绪引擎',hint:'情绪怎么起伏：从什么感受，到什么感受。'},
  {key:'causeEntry',label:'因果入口',hint:'什么事件把人物推进这一单元。'},
  {key:'blocker',label:'核心阻碍',hint:'谁或什么在阻止目标达成。'},
  {key:'choice',label:'关键选择',hint:'人物做出的选择，以及选择的代价。'},
  {key:'payoff',label:'兑现与归属',hint:'兑现了什么，功劳归谁。'},
  {key:'hook',label:'下一单元钩子',hint:'读者带着什么疑问进入下一单元。'},
] as const;
type ContractKey=typeof contractFields[number]['key'];
const contractRisks:Record<StoryUnit['contractRisk'],string>={'':'未评估',safe:'契约安全',reinforce:'需补强',broken:'契约已破坏'};
const lineKinds:Record<StoryLine['kind'],string>={main:'主线',subplot:'支线'};
/** Whether a line can supply a whole chapter on its own when the main plot stalls. */
const carryNames:Record<StoryLine['canCarryChapter'],string>={yes:'能独立扛章',half:'只能半章',no:'不能'};
const contractTones:Record<StoryUnit['contractRisk'],Tone>={'':'idle',safe:'success',reinforce:'warning',broken:'error'};
const orderCode=(unit:StoryUnit)=>typeof unit.order==='number'?String(unit.order):unit.order;
const sortUnits=(items:StoryUnit[])=>[...items].sort((a,b)=>String(orderCode(a)).localeCompare(String(orderCode(b)),'zh-CN',{numeric:true})||a.title.localeCompare(b.title,'zh-CN'));
const lineTone=(carry:StoryLine['canCarryChapter']):Tone=>carry==='yes'?'success':carry==='half'?'warning':'idle';
const unitLineIds=(unit:StoryUnit,lineId:string)=>unit.lineIds.includes(lineId)?unit.lineIds.filter(id=>id!==lineId):[...unit.lineIds,lineId];

export function VolumeBoard(props:Props) {
  const {snapshot,busy,save,onChapter}=props;
  const [editing,setEditing]=useState<{id?:string;volumeId?:string|null}|null>(null);
  const [lineEditing,setLineEditing]=useState<string|null>(null);
  const [stored,setStored]=useWorkspacePreference<string>(`${snapshot.novelId}:story-unit-volumes`,'');
  const [selected,setSelected]=useWorkspacePreference(`${snapshot.novelId}:story-unit`,'');
  // An empty preference means "not chosen yet": show every volume open, because
  // a board that opens fully collapsed hides the structure it exists to show.
  const openIds=useMemo(()=>{if(!stored)return snapshot.volumes.map(volume=>volume.id);try{const value=JSON.parse(stored);return Array.isArray(value)?value.map(String):[];}catch{return snapshot.volumes.map(volume=>volume.id);}},[stored,snapshot.volumes]);
  const toggleVolume=(id:string)=>setStored(JSON.stringify(openIds.includes(id)?openIds.filter(item=>item!==id):[...openIds,id]));
  const units=Object.values(snapshot.story.units),lines=Object.values(snapshot.story.storylines);
  const unitsIn=(volumeId:string|null)=>sortUnits(units.filter(unit=>(unit.volumeId??null)===volumeId));
  if(editing)return <UnitEditor {...props} unit={editing.id?snapshot.story.units[editing.id]:undefined} volumeId={editing.volumeId??null} onClose={()=>setEditing(null)}/>;
  if(lineEditing!==null)return <StorylineEditor snapshot={snapshot} busy={busy} save={save} line={lineEditing?snapshot.story.storylines[lineEditing]:undefined} onClose={()=>setLineEditing(null)}/>;
  const nothingYet=!snapshot.volumes.length&&!snapshot.chapters.length;
  return <div className="story-visual-stack story-unit-workspace">
    <section className="story-figure" aria-label="卷纲与单元">
      <div className="story-figure-heading"><div><h3>卷 → 剧情单元 → 章</h3><p>单元是卷内一个完整弧线，不是一章。点开单元核对它是否兑现了承诺读者的事。</p></div>{!nothingYet&&<button disabled={busy||!snapshot.volumes.length} onClick={()=>setEditing({volumeId:snapshot.volumes[0]?.id??null})}>＋ 新增剧情单元</button>}</div>
      {snapshot.diagnostics.overdueUnitIds.length>0&&<div className="story-warning" role="status"><p>有 {snapshot.diagnostics.overdueUnitIds.length} 个单元的章节范围已经写完，但契约仍是“需补强”或“已破坏”。请在下方标红的单元里回到正文核对承诺。</p></div>}
      {nothingYet?<div className="story-empty"><h2>先在正文页建卷和章节</h2><p>剧情单元挂在卷下面，章节由单元串起来。先建一卷、写几章，再回来安排单元。</p><button onClick={()=>onChapter()}>打开正文页 →</button></div>
      :<div className="story-unit-tree">
        {!snapshot.volumes.length?<p className="story-figure-empty">还没有卷。请在正文页建卷后，单元才能归属到卷下面。</p>:null}
        {snapshot.volumes.map(volume=>{const items=unitsIn(volume.id),chapters=snapshot.chapters.filter(chapter=>chapter.volumeId===volume.id),open=openIds.includes(volume.id);
          return <section className="story-unit-volume" key={volume.id} aria-label={volume.title}>
            <header><button className="story-unit-volume-toggle" aria-expanded={open} onClick={()=>toggleVolume(volume.id)}><span aria-hidden="true">{open?'▾':'▸'}</span>{volume.title}<small>{items.length} 个单元 · {chapters.length} 章</small></button><button disabled={busy} onClick={()=>setEditing({volumeId:volume.id})}>＋ 在此卷新增单元</button></header>
            {open&&<div className="story-unit-list">
              {items.length?items.map(unit=><UnitCard key={unit.id} {...props} unit={unit} onEdit={()=>setEditing({id:unit.id})}/>):<p className="story-column-empty">这一卷还没有剧情单元，新增一个再把章节挂上去。</p>}
              {chapters.length?<div className="story-unit-chapters"><strong>本卷章节</strong>{chapters.map(chapter=>{const owner=units.find(unit=>unit.chapterIds.includes(chapter.id));return <button key={chapter.id} className={owner?'is-hooked':'is-free'} onClick={()=>onChapter(chapter.id)}>{chapter.title}<small>{owner?`归属：${owner.title}`:'尚未归属单元'}</small></button>;})}</div>:null}
            </div>}
          </section>;})}
        {(()=>{const loose=unitsIn(null);return loose.length?<section className="story-unit-volume" aria-label="未归属卷的单元"><header><span className="story-unit-volume-toggle is-static">未归属卷的单元<small>{loose.length} 个单元</small></span></header><div className="story-unit-list">{loose.map(unit=><UnitCard key={unit.id} {...props} unit={unit} onEdit={()=>setEditing({id:unit.id})}/>)}</div></section>:null;})()}
        {!units.length&&<p className="story-figure-empty">还没有剧情单元。{snapshot.volumes.length?'从上面的卷里新增一个单元。':'先在正文页建卷，再回来安排单元。'}</p>}
      </div>}
    </section>
    <StorylineMatrix {...props} lines={lines} onEditLine={setLineEditing} selected={selected} onSelect={setSelected}/>
    <section className="story-figure" aria-label="故事线清单">
      <div className="story-figure-heading"><div><h3>故事线清单</h3><p>能独立扛章的故事线，是主线停摆时可以顶上一章的备用动力。</p></div><button disabled={busy} onClick={()=>setLineEditing('')}>＋ 新增故事线</button></div>
      {lines.length?<ul className="story-unit-lines">{lines.map(line=><li key={line.id}><Badge tone={line.kind==='main'?'brand':'idle'}>{lineKinds[line.kind]}</Badge><button className="story-card-title" onClick={()=>setLineEditing(line.id)}>{line.title}</button><Badge tone={lineTone(line.canCarryChapter)}>{carryNames[line.canCarryChapter]}</Badge><small>{units.filter(unit=>unit.lineIds.includes(line.id)).length} 个单元引用</small></li>)}</ul>:<p className="story-figure-empty">还没有故事线。先建一条主线，再让单元挂到它上面。</p>}
    </section>
  </div>;
}

function UnitCard(props:Props&{unit:StoryUnit;onEdit:()=>void}) {
  const {snapshot,save,busy,unit,onEdit}=props;
  const {confirm}=useDialog();
  const [open,setOpen]=useState(false);
  const isOverdue=snapshot.diagnostics.overdueUnitIds.includes(unit.id);
  const lines=unit.lineIds.map(id=>snapshot.story.storylines[id]).filter((line):line is StoryLine=>!!line);
  const chapters=unit.chapterIds.map(id=>({id,title:chapterTitle(snapshot,id)}));
  return <article className={isOverdue?'story-unit-card is-overdue':'story-unit-card'} aria-label={unit.title} data-unit={unit.id}>
    <div className="story-unit-card-head"><span className="story-unit-order">{orderCode(unit)}</span><button className="story-card-title" aria-expanded={open} onClick={()=>setOpen(!open)}>{unit.title}</button></div>
    <div className="story-card-flags"><Badge tone={contractTones[unit.contractRisk]}>{contractRisks[unit.contractRisk]}</Badge><Badge tone="idle">{chapters.length} 章</Badge><Badge tone="idle">{lines.length} 条故事线</Badge>{isOverdue&&<Badge tone="error">章节已写完 · 契约待补</Badge>}{unit.retired&&<Badge tone="idle">已退役</Badge>}</div>
    <p className="story-unit-meta">{chapters.length?chapters.map(item=>item.title).join('、'):'尚未挂章节'}{lines.length?` · ${lines.map(line=>line.title).join('、')}`:''}</p>
    {isOverdue&&<p className="story-unit-overdue" role="status">本单元的 {chapters.length} 章正文都已写完，但契约仍是“{contractRisks[unit.contractRisk]}”。请回到正文核对承诺是否兑现，再更新契约状态。</p>}
    {open&&<dl className="story-unit-contract">{contractFields.map(field=><div key={field.key}><dt>{field.label}</dt><dd>{unit[field.key]||'尚未填写'}</dd></div>)}</dl>}
    <div className="story-unit-card-actions">
      <button onClick={onEdit}>编辑</button>
      <button disabled={busy} onClick={()=>void save([{op:'unit.upsert',value:{id:unit.id,contractRisk:unit.contractRisk==='safe'?'':'safe'}}],snapshot.story.revision)}>{unit.contractRisk==='safe'?'标为未评估':'标为契约安全'}</button>
      {chapters.slice(0,3).map(item=><button key={item.id} className="story-unit-chip" onClick={()=>props.onChapter(item.id)}>{item.title}</button>)}
      <button className="story-unit-danger" disabled={busy} onClick={async()=>{if(await confirm(`移除剧情单元《${unit.title}》？章节与故事线本身不会被删除。`))void save([{op:'unit.remove',value:{id:unit.id}}],snapshot.story.revision);}}>移除</button>
    </div>
  </article>;
}

function StorylineMatrix(props:Props&{lines:StoryLine[];onEditLine:(id:string)=>void;selected:string;onSelect:(id:string)=>void}) {
  const {snapshot,lines,busy,save,onEditLine,selected,onSelect}=props;
  const units=useMemo(()=>sortUnits(Object.values(snapshot.story.units)),[snapshot]);
  if(!units.length)return null;
  const carryable=lines.filter(line=>line.canCarryChapter==='yes').length;
  return <section className="story-figure" aria-label="故事线矩阵">
    <div className="story-figure-heading"><div><h3>故事线矩阵</h3><p>每行一条故事线，每列一个剧情单元，点亮即“这个单元在推进这条线”。{carryable?`其中 ${carryable} 条能独立扛章。`:'目前没有能独立扛章的故事线，主线停摆时没有别的线能顶上一章。'}</p></div>
      <ul className="story-legend" aria-label="图例"><li><i className="story-legend-square tone-ok"/>推进中</li><li><i className="story-legend-square tone-warn"/>能独立扛章</li><li><i className="story-legend-square tone-idle"/>未推进</li></ul></div>
    <div className="story-matrix-scroll">
      <table className="story-matrix story-unit-matrix">
        <thead><tr><th scope="col" className="story-unit-matrix-line">故事线</th><th scope="col" className="story-unit-matrix-carry">扛章</th>{units.map(unit=><th scope="col" key={unit.id} data-selected={unit.chapterIds.includes(selected)||undefined}><button className="story-unit-matrix-head" onClick={()=>onSelect(unit.chapterIds[0]||'')} title={`${orderCode(unit)} ${unit.title}`}><span className="story-unit-matrix-code">{orderCode(unit)}</span>{unit.title}</button></th>)}</tr></thead>
        <tbody>{lines.map(line=><tr key={line.id} data-can-carry={line.canCarryChapter}>
          <th scope="row"><button onClick={()=>onEditLine(line.id)}>{line.title}</button><small className="story-unit-matrix-kind">{lineKinds[line.kind]}{line.junction?` · ${line.junction}`:''}</small></th>
          <td><span className={`story-badge story-tone-${lineTone(line.canCarryChapter)}`}>{carryNames[line.canCarryChapter]}</span></td>
          {units.map(unit=>{const on=unit.lineIds.includes(line.id);return <td key={unit.id} className={line.canCarryChapter==='yes'?'is-carry':undefined}><button className={`story-matrix-cell tone-${on?'ok':'idle'}`} aria-pressed={on} aria-label={`${line.title} × ${unit.title}：${on?'推进中':'未推进'}`} disabled={busy} onClick={()=>void save([{op:'unit.upsert',value:{id:unit.id,lineIds:unitLineIds(unit,line.id)}}],snapshot.story.revision)}>{on?'✓':'—'}</button></td>;})}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="story-muted">主线停摆时，先看“能独立扛章”那几行里哪一列还空着——空着的单元就是可以先写的备用章。</p>
  </section>;
}

type UnitDraft=Record<ContractKey,string>&{revision:number;title:string;volumeId:string;order:string;basisOrder:number|string;contractRisk:StoryUnit['contractRisk'];chapterIds:string[];lineIds:string[]};
const unitInitial=(snapshot:StorySnapshot,volumeId:string|null,unit?:StoryUnit):UnitDraft=>({
  revision:snapshot.story.revision,title:unit?.title||'',volumeId:unit?unit.volumeId??'':volumeId??'',order:unit?String(unit.order):'',basisOrder:unit?.order??Object.keys(snapshot.story.units).length,
  contractRisk:unit?.contractRisk||'',
  ...Object.fromEntries(contractFields.map(field=>[field.key,unit?.[field.key]||''])) as Record<ContractKey,string>,
  chapterIds:unit?.chapterIds||[],lineIds:unit?.lineIds||[]});
function UnitEditor({snapshot,busy,save,onChapter,unit,volumeId,onClose}:Props&{unit?:StoryUnit;volumeId:string|null;onClose:()=>void}) {
  const draft=useStoryDraft(`${snapshot.novelId}:story-unit:${unit?.id||`new:${volumeId??'none'}`}`,unitInitial(snapshot,volumeId,unit));
  const value=draft.value,lines=Object.values(snapshot.story.storylines);
  const removed=value.chapterIds.filter(id=>!snapshot.chapters.some(chapter=>chapter.id===id));
  const invalid=!value.title.trim()?'请填写单元标题':!value.volumeId?'请选择所属卷（无卷请先在正文页建卷）':'';
  const toggleChapter=(id:string)=>draft.change({...value,chapterIds:value.chapterIds.includes(id)?value.chapterIds.filter(item=>item!==id):[...value.chapterIds,id]});
  const toggleLine=(id:string)=>draft.change({...value,lineIds:value.lineIds.includes(id)?value.lineIds.filter(item=>item!==id):[...value.lineIds,id]});
  const submit=()=>{
    if(busy||!draft.dirty||draft.updated||invalid)return;
    const order=value.order.trim();
    const payload={...(unit?{id:unit.id}:{}),title:value.title.trim(),volumeId:value.volumeId||null,
      order:order?(/^-?\d{1,9}$/.test(order)?Number(order):order):value.basisOrder,
      ...Object.fromEntries(contractFields.map(field=>[field.key,value[field.key]])),contractRisk:value.contractRisk,chapterIds:value.chapterIds,lineIds:value.lineIds};
    void save([{op:'unit.upsert',value:payload as unknown as StoryUnit}],draft.base.revision,[],result=>{draft.accept(unitInitial(result,volumeId,unit?result.story.units[unit.id]:undefined));if(!unit)onClose();});
  };
  return <section className="story-panel story-item-editor" aria-label="剧情单元编辑" onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><div><button className="story-back" onClick={onClose}>‹ 返回卷纲</button><h3>{unit?'编辑剧情单元':'新增剧情单元'}</h3></div><Badge tone={contractTones[value.contractRisk]}>{contractRisks[value.contractRisk]}</Badge></div>
    <fieldset className="editor-fields" disabled={busy}>
      <div className="story-field-grid"><label>所属卷<select value={value.volumeId} onChange={event=>draft.change({...value,volumeId:event.target.value})}><option value="" disabled>请选择卷</option>{snapshot.volumes.map(volume=><option key={volume.id} value={volume.id}>{volume.title}</option>)}</select></label><label>编号<input maxLength={40} value={value.order} onChange={event=>draft.change({...value,order:event.target.value})} placeholder="如 L1-01"/></label><label>契约状态<select value={value.contractRisk} onChange={event=>draft.change({...value,contractRisk:event.target.value as StoryUnit['contractRisk']})}>{Object.entries(contractRisks).map(([id,name])=><option key={id||'none'} value={id}>{name}</option>)}</select></label></div>
      <label>单元标题<input maxLength={300} value={value.title} onChange={event=>draft.change({...value,title:event.target.value})}/></label>
      {contractFields.map(field=><label key={field.key}>{field.label}<textarea rows={2} maxLength={4000} className="story-unit-field" value={value[field.key]} onChange={event=>draft.change({...value,[field.key]:event.target.value})} placeholder={field.hint}/></label>)}
      <fieldset className="story-character-picker"><legend>本单元推进的故事线</legend>{lines.length?lines.map(line=><label key={line.id}><input type="checkbox" checked={value.lineIds.includes(line.id)} onChange={()=>toggleLine(line.id)}/>{line.title}<small className="story-muted">{lineKinds[line.kind]} · {carryNames[line.canCarryChapter]}</small></label>):<p className="story-muted">还没有故事线，可先保存单元，再在下方的矩阵里新建。</p>}</fieldset>
      <fieldset className="story-character-picker"><legend>本单元包含的章节</legend>{removed.map(id=><label key={id}><input type="checkbox" checked onChange={()=>toggleChapter(id)}/>{chapterTitle(snapshot,id)}（已移除，取消勾选后保存）</label>)}{snapshot.chapters.map(chapter=><label key={chapter.id}><input type="checkbox" checked={value.chapterIds.includes(chapter.id)} onChange={()=>toggleChapter(chapter.id)}/>{chapter.title}</label>)}</fieldset>
    </fieldset>
    {unit?.chapterIds.length?<div className="row"><button onClick={()=>onChapter(unit.chapterIds[0])}>查看首章正文 →</button></div>:null}
    <DraftFooter draft={draft} busy={busy} invalid={invalid} onSave={submit} label="保存剧情单元" latest={<><strong>{unit?.title||'尚未创建'}</strong><p>{unit?.promise}</p><p>{unit?contractRisks[unit.contractRisk]:''}</p></>}/>
  </section>;
}

type LineDraft={revision:number;title:string;kind:StoryLine['kind'];driver:string;junction:string;canCarryChapter:StoryLine['canCarryChapter']};
const lineInitial=(snapshot:StorySnapshot,line?:StoryLine):LineDraft=>({revision:snapshot.story.revision,title:line?.title||'',kind:line?.kind||'subplot',driver:line?.driver||'',junction:line?.junction||'',canCarryChapter:line?.canCarryChapter||'no'});
function StorylineEditor({snapshot,busy,save,line,onClose}:{snapshot:StorySnapshot;busy:boolean;save:StoryActions['save'];line?:StoryLine;onClose:()=>void}) {
  const draft=useStoryDraft(`${snapshot.novelId}:story-line:${line?.id||'new'}`,lineInitial(snapshot,line));
  const {confirm}=useDialog();
  const value=draft.value;
  const users=line?Object.values(snapshot.story.units).filter(unit=>unit.lineIds.includes(line.id)):[];
  const invalid=!value.title.trim()?'请填写故事线标题':'';
  const submit=()=>{
    if(busy||!draft.dirty||draft.updated||invalid)return;
    void save([{op:'storyline.upsert',value:{...(line?{id:line.id}:{}),title:value.title.trim(),kind:value.kind,driver:value.driver,junction:value.junction,canCarryChapter:value.canCarryChapter}}],draft.base.revision,[],result=>{draft.accept(lineInitial(result,line?result.story.storylines[line.id]:undefined));if(!line)onClose();});
  };
  return <section className="story-panel story-item-editor" aria-label="故事线编辑" onKeyDown={event=>saveShortcut(event,submit)}>
    <div className="story-section-heading"><div><button className="story-back" onClick={onClose}>‹ 返回卷纲</button><h3>{line?'编辑故事线':'新增故事线'}</h3></div><Badge tone={lineTone(value.canCarryChapter)}>{carryNames[value.canCarryChapter]}</Badge></div>
    <fieldset className="editor-fields" disabled={busy}>
      <label>故事线标题<input maxLength={300} value={value.title} onChange={event=>draft.change({...value,title:event.target.value})}/></label>
      <div className="story-field-grid"><label>主线还是支线<select value={value.kind} onChange={event=>draft.change({...value,kind:event.target.value as StoryLine['kind']})}>{Object.entries(lineKinds).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>能否独立扛章<select value={value.canCarryChapter} onChange={event=>draft.change({...value,canCarryChapter:event.target.value as StoryLine['canCarryChapter']})}>{Object.entries(carryNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>
      <label>驱动力<textarea rows={2} maxLength={2000} value={value.driver} onChange={event=>draft.change({...value,driver:event.target.value})} placeholder="谁想要什么，什么力量一直在推着这条线走？"/></label>
      <label>并回主线的位置<textarea rows={2} maxLength={2000} value={value.junction} onChange={event=>draft.change({...value,junction:event.target.value})} placeholder="这条线在哪个单元或哪一章与主线交汇？"/></label>
    </fieldset>
    {line&&<div className="story-source-note"><p>被 {users.length} 个单元引用{users.length?`：${users.map(unit=>unit.title).join('、')}`:'。'}仍被引用时不能移除，请先在单元里取消勾选。</p></div>}
    <DraftFooter draft={draft} busy={busy} invalid={invalid} onSave={submit} label="保存故事线" latest={<><strong>{line?.title||'尚未创建'}</strong><p>{line?.driver}</p><p>{line?carryNames[line.canCarryChapter]:''}</p></>}/>
    {line?<button className="story-unit-danger" disabled={busy} onClick={async()=>{if(await confirm(`移除故事线《${line.title}》？${users.length?'仍被单元引用，服务端会拒绝保存。':'单元本身不会被删除。'}`))void save([{op:'storyline.remove',value:{id:line.id}}],snapshot.story.revision,[],()=>onClose());}}>移除故事线</button>:null}
  </section>;
}
