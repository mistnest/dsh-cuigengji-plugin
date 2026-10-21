import React, {useEffect, useRef, useState} from 'react';
import {ManagementPage, FilePicker, ImportSteps, type Call, type Run, type BackProps} from '../../shared/management-page.tsx';
import type {Catalog, Selection, ExportFormat, TransferFile, Inspection, ImportOptions, TransferPreview, Counts, ImportResult, TransferShortcut, ExportKind} from '../../../contracts/transfer.ts';
import {ScopePicker, KindPicker, defaultSelection} from './ScopePicker.tsx';
import {readTransferFile, downloadFile} from './file.ts';
import {useWorkbenchRefresh} from '../../shared/refresh.tsx';

type Report = Pick<TransferPreview, 'counts' | 'dependencies' | 'warnings'>;
type Props = BackProps & {call: Call; run: Run; busy: boolean; novelId?: string; initial?: TransferShortcut; onOpen?: (id: string) => unknown};
const errorMessage = (e: unknown) => e instanceof Error ? e.message : String(e);
const caption: Record<ExportKind, string> = {chapters: '整本、某卷或几章，选好再带走。', memory: '按人物、世界或分组选择，条目之间的关系一起保留。', planning: '带走一张或多张画布，以及连线、讨论框和便签。', preset: '单独保存当前的写作要求，保留修改后的文本。', works: '选择要迁移的作品，包含各自的历史与回收站。', workspace: '换电脑或迁移 DSH 时，完整保留催更姬工作数据。'};

export function TransferPage({call, run, busy, novelId, initial, onOpen, onBack, backLabel}: Props) {
  const {revision: refreshRevision} = useWorkbenchRefresh();
  const initialized = useRef(false);
  const [mode, setMode] = useState(initial?.mode || 'import');
  const presetShortcut = initial?.mode === 'import' && initial.selection?.kind === 'preset';
  const presetTargetId = initial?.selection?.novelId || novelId;
  const [library, setLibrary] = useState<Catalog | null>(null), [loadError, setLoadError] = useState('');
  const [selection, setSelection] = useState<Selection>(initial?.selection || {kind: 'chapters', novelId}), [format, setFormat] = useState<ExportFormat>('package');
  const [exportReport, setExportReport] = useState<Report | null>(null), [exportError, setExportError] = useState('');
  const [file, setFile] = useState<TransferFile | null>(null), [identified, setIdentified] = useState<Inspection | null>(null);
  const [options, setOptions] = useState<ImportOptions>({}), [preview, setPreview] = useState<TransferPreview | null>(null);
  const [previewError, setPreviewError] = useState(''), [previewPending, setPreviewPending] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null), [notice, setNotice] = useState(''), [dragging, setDragging] = useState(false);
  const requestId = useRef(crypto.randomUUID()), exportKey = JSON.stringify({selection, format}), importKey = JSON.stringify(options);
  useEffect(() => {let live = true; call<Catalog>('transfer.catalog').then(value => {if (!live) return; setLibrary(value); setLoadError('');
    if (!initial?.selection && !initialized.current) setSelection(defaultSelection('chapters', value, novelId));
    initialized.current = true;
  }).catch(e => {if (live) setLoadError(errorMessage(e));}); return () => {live = false;};}, [call, refreshRevision]);
  useEffect(() => {
    if (!library || mode !== 'export') return;
    let live = true; setExportReport(null); setExportError('');
    const timer = setTimeout(() => {call<Report>('transfer.exportPreview', {selection, format}).then(value => {if (live) setExportReport(value);}).catch(e => {if (live) setExportError(errorMessage(e));});}, 180);
    return () => {live = false; clearTimeout(timer);};
  }, [call, library, mode, exportKey]);
  useEffect(() => {
    if (!file || !identified || result) return;
    let live = true; setPreview(null); setPreviewError(''); setPreviewPending(true);
    const timer = setTimeout(() => {call<TransferPreview>('transfer.preview', {file, options}).then(value => {if (live) setPreview(value);}).catch(e => {if (live) setPreviewError(errorMessage(e));}).finally(() => {if (live) setPreviewPending(false);});}, 250);
    return () => {live = false; clearTimeout(timer);};
  }, [call, file, identified, importKey, result, previewVersion, refreshRevision]);
  const editOptions = (value: ImportOptions) => {if (JSON.stringify(value) === importKey) return; setOptions(value); setPreview(null); setResult(null); setNotice(''); requestId.current = crypto.randomUUID();};
  const editExport = (value: Selection) => {setSelection(value); setExportReport(null); setNotice(''); if (value.kind !== 'chapters') setFormat('package');};
  const selectFile = (chosen: File) => {
    requestId.current = crypto.randomUUID();
    setFile(null); setIdentified(null); setPreview(null); setPreviewError(''); setResult(null); setNotice('');
    void run(async () => {
      const value = await readTransferFile(chosen), info = await call<Inspection>('transfer.inspect', {file: value, options: presetShortcut ? {intent: 'preset'} : {}});
      setIdentified(info); setFile(value);
      editOptions({mode: presetShortcut ? 'copy' : info.restorable ? 'restore' : 'copy', selection: defaultSelection(presetShortcut ? 'preset' : info.kind, info.catalog, info.catalog.books[0]?.id, !presetShortcut),
        targetId: presetShortcut ? presetTargetId : info.restorable || initial?.selection?.kind === 'works' ? null : novelId || null, title: info.catalog.books[0]?.title, presetPolicy: 'append',
        ...(presetShortcut ? {intent: 'preset' as const} : {}), ...(info.orderId ? {orderId: info.orderId} : {})});
    });
  };
  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {const chosen = event.target.files?.[0]; event.target.value = ''; if (chosen) selectFile(chosen);};
  const refresh = async () => setLibrary(await call<Catalog>('transfer.catalog'));
  const confirmImport = () => {if (!preview?.valid || !file || previewPending) return; void run(async () => {
    const done = await call<ImportResult>('transfer.import', {file, options, proof: preview.proof, requestId: requestId.current});
    setResult(done); await refresh();
  });};
  const exportFile = () => run(async () => {downloadFile(await call('transfer.export', {selection, format})); setNotice('已开始下载，请在下载列表确认文件已保存。');});
  const importSelection = options.selection;
  const canExtract = identified?.kind === 'works' || identified?.kind === 'workspace';
  const allowedKinds: ExportKind[] = presetShortcut ? ['preset'] : options.mode === 'restore' ? identified?.kind === 'workspace' ? ['works', 'workspace'] : ['works'] : canExtract ? ['chapters', 'memory', 'planning', 'preset', 'works'] : identified ? [identified.kind] : [];
  const importTarget = library?.books.find(b => b.id === options.targetId);
  const changeImportKind = (kind: ExportKind) => editOptions({...options, selection: defaultSelection(kind, identified!.catalog, importSelection?.novelId, true), ...(kind === 'works' || kind === 'workspace' ? {targetId: null} : {})});
  const footer = mode === 'export' ? <div className="transfer-footer"><span>{exportReport ? countLabel(exportReport.counts, selection.kind) : exportError || '选择要导出的内容'}<small>{format === 'package' ? '催更姬数据包 · JSON' : format === 'md' ? 'Markdown · UTF-8' : 'TXT · UTF-8'}</small></span><button className="primary" disabled={busy || !exportReport} onClick={exportFile}>下载文件</button></div>
    : identified && !result ? <div className="transfer-footer"><span>{preview ? countLabel(preview.counts, importSelection?.kind || 'works') : previewPending ? '正在核对内容…' : '选择范围与目标'}<small>{preview ? preview.target : '导入前自动备份当前工作库'}</small></span><button className="primary" disabled={busy || !preview?.valid || previewPending} onClick={confirmImport}>确认导入</button></div> : null;
  return <ManagementPage title={presetShortcut ? '导入写作预设' : '导入 / 导出'} description={presetShortcut ? `保存到《${library?.books.find(b => b.id === presetTargetId)?.title || '当前作品'}》的写作预设。` : '带走作品，也把需要的写作内容带进来。'} {...{onBack, backLabel}} documentClass="transfer-document" footer={footer}
    actions={presetShortcut ? undefined : <div className="transfer-mode" role="group" aria-label="导入导出切换"><button disabled={busy} aria-pressed={mode === 'import'} onClick={() => {setMode('import'); setNotice('');}}>导入</button><button disabled={busy} aria-pressed={mode === 'export'} onClick={() => {setMode('export'); setNotice('');}}>导出</button></div>}>
    {loadError && <p role="alert">{loadError}</p>}
    {!library && !loadError && <p role="status">正在读取作品库…</p>}
    {mode === 'export' && library && <>
      <KindPicker value={selection.kind} disabled={busy} change={kind => editExport(defaultSelection(kind, library, selection.novelId || novelId))}/>
      <p className="transfer-caption">{caption[selection.kind]}</p>
      <div className="transfer-grid"><section className="transfer-form" aria-label="导出范围"><ScopePicker key={`${selection.kind}:${selection.novelId}`} catalog={library} selection={selection} change={editExport} disabled={busy}/>
        <label className="management-field">文件格式<select aria-label="导出格式" value={format} disabled={busy} onChange={e => {setFormat(e.target.value as ExportFormat); setNotice('');}}><option value="package">催更姬数据包（JSON）</option>{selection.kind === 'chapters' && <><option value="txt">纯文本（TXT）</option><option value="md">Markdown</option></>}</select></label>
        {format === 'package' && ['memory', 'planning'].includes(selection.kind) && <label className="transfer-checkbox transfer-dependency-choice"><input type="checkbox" aria-label="携带关联正文与设定" disabled={busy} checked={!!selection.includeDependencies} onChange={e => editExport({...selection, includeDependencies: e.target.checked})}/><span>携带关联正文与设定<small>预览会列出额外带走的内容</small></span></label>}
        {format !== 'package' && <p className="management-hint">仅导出当前正文与标题，版本历史保留在催更姬数据包中。</p>}
      </section><aside className="transfer-summary" aria-label="导出预览"><h3>这次带走</h3>{exportReport ? <ReportSummary report={exportReport} kind={selection.kind}/> : <p className="management-hint" role={exportError ? 'alert' : 'status'}>{exportError || '正在读取所选范围…'}</p>}</aside></div>
    </>}
    {mode === 'import' && <>
      <ImportSteps preview={!!identified} done={!!result}/>
      {!result && <div className={'transfer-upload ' + (dragging ? 'is-dragging' : '')} onDragOver={e => {e.preventDefault(); if (!busy) setDragging(true);}} onDragLeave={e => {if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);}} onDrop={e => {e.preventDefault(); setDragging(false); if (!busy && e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);}}>
        <div className="transfer-upload-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 26H5V17M27 17v9h-3M16 23V5M9 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
        <div><h3>{file ? file.name : '选择文件，或拖到这里'}</h3><p>{identified ? identified.label : presetShortcut ? '预设 JSON、TXT、Markdown，或从催更姬备份中提取预设' : '催更姬数据包、酒馆角色卡／世界书／预设、TXT、Markdown'}</p></div>
        <FilePicker label={file ? '更换文件' : '选择文件'} name="导入文件" hint="" accept={presetShortcut ? '.json,.txt,.md' : '.json,.png,.txt,.md'} disabled={busy} onChange={choose}/>
      </div>}
      {identified && importSelection && !result && <>
        <div className="transfer-import-options">{!presetShortcut && identified.restorable && <label className="management-field">导入方式<select aria-label="导入方式" disabled={busy} value={options.mode} onChange={e => {const value = e.target.value as 'copy' | 'restore'; editOptions({...options, mode: value, targetId: null,
          selection: defaultSelection(identified.kind === 'workspace' && value === 'restore' ? 'workspace' : 'works', identified.catalog, identified.catalog.books[0]?.id, true)});}}><option value="restore">恢复备份 · 保留原作品和版本</option><option value="copy">复用内容 · 使用新的 ID</option></select></label>}
          {identified.orders.length > 1 && <label className="management-field">提示词排列<select aria-label="提示词排列" disabled={busy} value={options.orderId} onChange={e => editOptions({...options, orderId: e.target.value})}>{identified.orders.map(order => <option key={order.id} value={order.id}>{order.name}</option>)}</select></label>}</div>
        {allowedKinds.length > 1 && <KindPicker kinds={allowedKinds} value={importSelection.kind} change={changeImportKind} disabled={busy}/>}
        <div className="transfer-grid"><section className="transfer-form" aria-label="导入范围"><ScopePicker key={`${identified.fingerprint}:${importSelection.kind}:${importSelection.novelId}`} catalog={identified.catalog} selection={importSelection} change={selection => editOptions({...options, selection})} disabled={busy}/>
          {options.mode === 'copy' && <div className="transfer-destination"><h3>放到哪里</h3>{presetShortcut ? <p className="management-hint">《{importTarget?.title || '当前作品'}》的写作预设</p> : importSelection.kind !== 'works' && <label className="management-field">目标作品<select aria-label="目标作品" disabled={busy} value={options.targetId || ''} onChange={e => editOptions({...options, targetId: e.target.value || null})}><option value="">新建一部作品</option>{library?.books.filter(b=>!b.archived).map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>}
            {!presetShortcut && !options.targetId && (importSelection.kind !== 'works' || (importSelection.novelIds || []).length === 1) && <label className="management-field">新作品名称<input aria-label="新作品名称" disabled={busy} value={options.title || ''} onChange={e => editOptions({...options, title: e.target.value})}/></label>}
            {importSelection.kind === 'preset' && importTarget?.preset && <label className="management-field">现有预设<select aria-label="现有预设" disabled={busy} value={options.presetPolicy} onChange={e => editOptions({...options, presetPolicy: e.target.value as 'append' | 'replace'})}><option value="append">追加提示词，保留现有条目</option><option value="replace">替换当前预设</option></select></label>}
          </div>}
          {['memory', 'planning'].includes(importSelection.kind) && <label className="transfer-checkbox transfer-dependency-choice"><input type="checkbox" aria-label="携带文件内的关联正文与设定" disabled={busy} checked={!!importSelection.includeDependencies} onChange={e => editOptions({...options, selection: {...importSelection, includeDependencies: e.target.checked}})}/><span>携带文件内的关联正文与设定<small>只使用文件中已有的关联内容</small></span></label>}
        </section><aside className="transfer-summary" aria-label="导入预览"><h3>准备导入</h3>{preview ? <>
          <ReportSummary report={preview} kind={importSelection.kind}/>
          {!!preview.skipped.length && <p className="management-hint">相同内容跳过：{preview.skipped.join('、')}</p>}
          {!!preview.conflicts.length && <div className="transfer-conflicts" role="alert"><strong>这些内容有冲突，暂不能导入</strong><ul>{preview.conflicts.map((conflict, i) => <li key={i}>{conflict}</li>)}</ul><p>可选择“复用内容”，作为另一部作品保存。</p></div>}
          {!!preview.samples?.length && <details className="transfer-samples"><summary>看一下内容</summary>{preview.samples.map((sample, i) => <div key={i}><h4>{sample.title}</h4><pre>{sample.content || '暂时没有正文'}</pre></div>)}</details>}
        </> : <p className="management-hint" role={previewError ? 'alert' : 'status'}>{previewError || '正在核对范围与目标…'}</p>}<button className="quiet transfer-refresh" disabled={busy || previewPending} onClick={() => {setPreview(null); setPreviewVersion(v => v + 1);}}>刷新预览</button></aside></div>
      </>}
      {result && <div className="transfer-complete" role="status"><div className="transfer-complete-mark" aria-hidden="true">✓</div><h3>{result.repeated ? '这份内容已经导入过了' : '导入完成'}</h3><p>{result.repeated ? '保留上次导入的结果，没有重复创建。' : countLabel(result.counts, importSelection?.kind || 'works')}{result.skipped.length > 0 && ` · ${result.skipped.length} 部相同作品跳过`}</p><div className="management-actions">{result.novelIds.length === 1 && onOpen && <button className="primary" disabled={busy} onClick={() => onOpen(result.novelIds[0])}>打开作品</button>}<button disabled={busy} onClick={() => {setFile(null); setIdentified(null); setPreview(null); setResult(null);}}>继续导入</button></div>{result.backupDir && <details className="management-disclosure"><summary>导入前备份位置</summary><code className="work-data-path">{result.backupDir}</code></details>}</div>}
    </>}
    {notice && <p className="transfer-notice" role="status">{notice}</p>}
    {library?.dataRoot && <details className="management-disclosure transfer-storage"><summary>存储位置与备份范围</summary><code className="work-data-path">{library.dataRoot}</code><p>{library.books.length} 部作品 · {library.bindings || 0} 个绑定会话。导出使用已保存内容，请先保存正在编辑的草稿。</p><p>催更姬管理小说工作数据；DSH 的聊天、附件与 API 配置由 DSH 保存。</p></details>}
  </ManagementPage>;
}
function countLabel(value: Counts, kind: ExportKind) {
  if (kind === 'works' || kind === 'workspace') return `${value.works} 部作品 · ${value.chapters} 章 · ${value.memory} 条设定`;
  if (kind === 'chapters') return `${value.chapters} 个章节`;
  if (kind === 'memory') return `${value.memory} 条设定${value.chapters ? ' · ' + value.chapters + ' 章关联正文' : ''}`;
  if (kind === 'planning') return `${value.beats} 个情节 · ${value.decorations} 个框与便签`;
  return `${value.presets} 套写作预设`;
}
function ReportSummary({report, kind}: {report: Report; kind: ExportKind}) {
  const c = report.counts;
  const values = [{label: '作品', count: kind === 'workspace' || kind === 'works' ? c.works : 0}, {label: '章节', count: c.chapters}, {label: '设定', count: c.memory}, {label: '画布', count: c.pages}, {label: '情节', count: c.beats}, {label: '框与便签', count: c.decorations}, {label: '预设', count: c.presets}].filter(item => item.count > 0);
  return <><dl className="transfer-counts">{values.map(v => <div key={v.label}><dd>{v.count.toLocaleString('zh-CN')}</dd><dt>{v.label}</dt></div>)}</dl>{!values.length && <p className="management-hint">所选范围为空</p>}
    {report.dependencies.length > 0 && <details className="transfer-dependencies" open><summary>额外携带 {report.dependencies.length} 项关联</summary><ul>{report.dependencies.map((d, i) => <li key={i}><small>{d.kind}</small>{d.title}</li>)}</ul></details>}
    {report.warnings.length > 0 && <details className="transfer-details"><summary>导入导出说明{report.warnings.length > 1 ? ' · ' + report.warnings.length : ''}</summary><ul>{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
  </>;
}
