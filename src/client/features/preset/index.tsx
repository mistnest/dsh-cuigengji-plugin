import React, {useEffect, useState} from 'react';
import {useDraft, useResource, usePreference} from '../../shared/state.js';
import {ResourceState, SaveBar} from '../../shared/ui.jsx';
import {compilePreset, presetBlockReason, presetBlockNotice} from '../../../domain/preset/index.js';
import {useDialog} from '../../dialog.tsx';
import {ManagementPage, downloadJSON, type Call, type Run, type BackProps} from '../../shared/management-page.tsx';
import {Icon} from '../../shared/icons.tsx';

type Block = {identifier: string; name: string; content: string; enabled: boolean; role?: string; marker?: boolean; [key: string]: unknown};
type PresetDocument = {name: string; enabled: boolean; blocks: Block[]; revision: number; raw?: unknown; importFormat?: string; warnings?: string[]; [key: string]: unknown};
type Props = BackProps & {call: Call; novelId: string; run: Run; busy: boolean; onTransfer: (value: import('../../../contracts/transfer.ts').TransferShortcut) => void};

const emptyPreset: PresetDocument = {name: '写作预设', enabled: false, blocks: [], revision: 0};

export function Preset(props: Props) {
  const resource = useResource(() => props.call<PresetDocument | null>('preset.get', {novelId: props.novelId}).then(value => value || emptyPreset), [props.call, props.novelId]);
  return <ResourceState resource={resource}>{resource.value && <PresetEditor {...props} initial={resource.value}/>}</ResourceState>;
}

function PresetEditor({call, novelId, run, busy, initial, onTransfer, onBack, backLabel}: Props & {initial: PresetDocument}) {
  const draft = useDraft(novelId + ':preset', initial);
  const value: PresetDocument = draft.value, base: PresetDocument = draft.base;
  const {change, accept, dirty, cacheError} = draft;
  useEffect(()=>{if(!busy&&!dirty&&initial.revision>base.revision)accept(initial);},[initial,busy,dirty,base.revision]);
  const [onlyUnsupported, setOnlyUnsupported] = useState(false);
  const [selected, setSelected] = usePreference(novelId + ':preset-selected', initial.blocks.length ? 0 : null) as [number | null, (value: number | null) => void];
  const {confirm} = useDialog();
  const index = selected !== null && value.blocks[selected] ? selected : null;
  const block = index !== null ? value.blocks[index] : null;
  const update = (i: number, patch: Partial<Block>) => change((current: PresetDocument) => ({...current, blocks: current.blocks.map((item, j) => j === i ? {...item, ...patch} : item)}));
  const move = (i: number, delta: number) => {
    setSelected(i + delta);
    change((current: PresetDocument) => {const blocks = [...current.blocks]; [blocks[i], blocks[i + delta]] = [blocks[i + delta], blocks[i]]; return {...current, blocks};});
  };
  let preview = '', candidate = '', invalid = '';
  try {preview = compilePreset(value); candidate = compilePreset({...value, enabled: true});} catch (error) {invalid = error instanceof Error ? error.message : String(error);}
  const active = value.blocks.filter(item => item.enabled && item.content.trim()).length;
  const state = (item: Block) => presetBlockReason(item) ? '无正文' : (item.enabled ? '启用' : '停用') + (presetBlockNotice(item) ? ' · 需检查' : '');
  const warnings = value.importFormat ? value.warnings || [] : [];
  const save = () => run(async () => accept(await call<PresetDocument>('preset.set', {novelId, expectedRevision: base.revision, preset: value})));
  const add = () => {
    setOnlyUnsupported(false); setSelected(value.blocks.length);
    change((current: PresetDocument) => ({...current, blocks: [...current.blocks, {identifier: crypto.randomUUID(), name: '新提示词', content: '', role: 'system', enabled: true}]}));
  };
  return <ManagementPage title="写作预设" description={value.name + ' · ' + (value.enabled ? '已启用，保存后从下一次回复生效' : '整套停用，条目仍保留')} {...{onBack, backLabel}}
    documentClass="preset-management"
    actions={<>{!!value.blocks.length&&<label className="switch-control"><input type="checkbox" aria-label="启用" disabled={busy} checked={value.enabled} onChange={event => change({...value, enabled: event.target.checked})}/>启用预设</label>}<button disabled={busy} onClick={() => onTransfer({mode: 'import', selection: {kind: 'preset', novelId}})}>导入预设</button>{!!value.blocks.length&&<button disabled={busy || dirty} title={dirty ? '先保存当前预设后导出' : undefined} onClick={() => onTransfer({mode: 'export', selection: {kind: 'preset', novelId}})}>导出预设</button>}</>}
    footer={(dirty||!!value.blocks.length)&&<SaveBar {...{dirty, busy}} error={cacheError} invalid={invalid || (!value.name.trim() ? '请填写预设名称' : '')} onSave={save} label="保存预设" children={null}/>}
  >
    {initial.revision > base.revision && <p className="notice">已保存的预设有更新，当前草稿仍保留。可保存后核对，或在预设设置里读取最新版本。</p>}
    {!value.blocks.length?<div className="preset-onboarding"><span><Icon name="edit"/></span><h3>给这本书写下要求</h3><p>文风、叙述视角、你希望保留的表达习惯。<br/>从一条要求开始，也可以导入已有预设。</p><button className="primary" disabled={busy} onClick={add}>＋ 新增提示词</button></div>:<div className="preset-workspace">
      <aside className={'preset-list ' + (index !== null ? 'is-selected' : '')} aria-label="提示词条目列表">
        <div className="preset-list-heading"><h3>提示词条目</h3><button disabled={busy} aria-label="新增提示词" title="新增提示词" onClick={add}>＋</button></div>
        {value.blocks.map((item, i) => onlyUnsupported && !presetBlockNotice(item) ? null : <button className={index === i ? 'selected' : ''} aria-pressed={index === i} key={item.identifier} onClick={() => setSelected(i)}><span className="prompt-list-title"><span>{i + 1}</span>{item.name || '未命名条目'}</span><small>{state(item)}</small></button>)}
        {!value.blocks.length && <p className="preset-empty">还没有提示词条目。点击 ＋ 新增，或导入已有预设。</p>}
        {onlyUnsupported && !value.blocks.some(item => presetBlockNotice(item)) && <p className="preset-empty">没有需要检查的条目。</p>}
        {!!value.blocks.length && <label className="preset-review-filter"><input type="checkbox" checked={onlyUnsupported} onChange={event => {setOnlyUnsupported(event.target.checked); setSelected(null);}}/>只看需检查</label>}
      </aside>
      <main className={'prompt-document ' + (!block ? 'preset-empty' : '')}>
        {block && index !== null ? <>
          <button className="prompt-list-back" onClick={() => setSelected(null)}>‹ 条目列表</button>
          <header className="prompt-document-head"><label className="prompt-title-field">条目名称<input aria-label="条目名称" disabled={busy} value={block.name} onChange={event => update(index, {name: event.target.value})}/></label><label className="switch-control"><input type="checkbox" disabled={busy || !!presetBlockReason(block)} checked={block.enabled} onChange={event => update(index, {enabled: event.target.checked})}/>启用条目</label><details className="menu"><summary aria-label="提示词条目操作">···</summary><div className="menu-panel"><button disabled={busy || index === 0} onClick={() => move(index, -1)}>上移</button><button disabled={busy || index === value.blocks.length - 1} onClick={() => move(index, 1)}>下移</button><button className="danger" disabled={busy} onClick={() => {change({...value, blocks: value.blocks.filter((_, i) => i !== index)}); setSelected(value.blocks.length > 1 ? Math.min(index, value.blocks.length - 2) : null);}}>移除条目</button></div></details></header>
          {presetBlockNotice(block) && <p className="notice">{presetBlockNotice(block)}</p>}
          <label className="prompt-content-field"><span>提示词内容</span><textarea aria-label="提示词内容" placeholder="写下这条要求的具体内容…" disabled={busy} value={block.content} onChange={event => {const content = event.target.value; update(index, {content, enabled: block.enabled && !presetBlockReason({...block, content})});}}/></label>
        </> : '从左侧选择一条提示词，开始编辑。'}
      </main>
    </div>}
    {!!value.blocks.length&&<p role="status" className="management-hint preset-effective-summary">{value.blocks.length} 个条目 · {active} 个有效条目 · 启用后 {candidate.length.toLocaleString('zh-CN')} 字符</p>}
    {!!value.blocks.length&&!candidate.trim() && <p className="management-hint">当前没有可生效的提示词正文。请启用有内容的条目，或新增写作要求。</p>}
    <details className="management-disclosure"><summary>预设设置</summary><label className="management-field">预设名称<input disabled={busy} value={value.name} onChange={event => change({...value, name: event.target.value})}/></label>
      <div className="management-actions"><button disabled={busy} onClick={async () => {if (!dirty || await confirm('丢弃预设草稿并读取已保存版本？')) void run(async () => {const saved = await call<PresetDocument | null>('preset.get', {novelId}) || emptyPreset; accept(saved); setSelected(saved.blocks.length ? 0 : null); setOnlyUnsupported(false);});}}>读取已保存版本</button>{value.raw !== undefined && <button disabled={busy} onClick={() => downloadJSON(value.raw, 'original-tavern-preset.json')}>下载原始文件（不含编辑）</button>}</div>
      {value.raw !== undefined && !value.importFormat && <p>旧版导入的停用状态已保留；重新导入原文件可按新的内容优先规则解析。</p>}
      {!!warnings.length && <details><summary>导入说明 · {warnings.length} 项</summary>{warnings.map((warning, i) => <p key={i}>{warning}</p>)}</details>}
    </details>
    {!!candidate.trim()&&<details className="management-disclosure"><summary>当前草稿的生效文本预览 · {preview.length} 字符</summary><pre>{preview || '预设未启用或没有启用的文本条目。'}</pre><p>保存并启用后，这些文本会在下次请求时加入当前作品绑定会话的系统提示词。酒馆的触发、角色与装填规则不执行，宏保留为原文。</p></details>}
  </ManagementPage>;
}
