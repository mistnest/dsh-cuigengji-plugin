import React, {useMemo, useState} from 'react';
import type {StoryReference, StorySnapshot} from '../../../contracts/story.ts';
import {useWorkspacePreference, type FeatureCall} from '../../shared/workspace-state.ts';
import {Badge} from './shared.tsx';
import {chapterTitle, toneKey} from './model.ts';
import {toneNames} from './RhythmHeatmap.tsx';
import type {StoryActions} from './useStoryWorkspace.ts';

type Props = StoryActions & {onChapter: (id?: string) => void; call: FeatureCall; reload: () => Promise<unknown>};
const detailText = ['report', 'style', 'rhythm', 'emotion'] as const;
const detailNames: Record<typeof detailText[number], string> = {report: '拆文报告', style: '文风档案', rhythm: '节奏索引', emotion: '情绪模块'};

/** Project-scoped 对标 view: an imported analysis copy, never the original library.
 * Importing reads a local folder; deleting removes only this project's copy. */
export function ReferenceBoard({snapshot, onChapter, call, reload, save, busy}: Props) {
  const [stored, setStored] = useWorkspacePreference(`${snapshot.novelId}:story-reference`, '');
  const references = Object.values(snapshot.story.references);
  const selected = references.find(item => item.id === stored) || references[0] || null;
  const [path, setPath] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const runImport = async () => {
    const trimmed = path.trim();
    if (!trimmed || importing) { if (!trimmed) setError('请填写拆文库文件夹路径'); return; }
    setImporting(true); setError(''); setNotice('');
    try {
      await call('story.reference.import', {novelId: snapshot.novelId, path: trimmed});
      setPath(''); setNotice('已导入到本书的对标区。原拆文库未被修改。');
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally { setImporting(false); }
  };
  const remove = async (reference: StoryReference) => {
    if (!window.confirm(`从本书移除对标书「${reference.title}」？原拆文库不受影响。`)) return;
    try {
      await save([{op: 'reference.remove', value: {id: reference.id}}], snapshot.story.revision);
      if (stored === reference.id) setStored('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
  };
  return <section className="story-reference-workspace" aria-label="拆文库与对标">
    <div className="story-section-heading"><div><h2>把拆文库变成可以对照的对标书</h2><p>导入后保存的是本书内的副本，原拆文库不动；对标报告、文风、节奏与情绪模块都从分析文件读取。</p></div><Badge tone={references.length ? 'success' : 'idle'}>{references.length ? `${references.length} 本对标书` : '尚未导入'}</Badge></div>
    <div className="story-reference-import">
      <label className="story-inline-field story-reference-path">拆文库文件夹<input value={path} onChange={event => setPath(event.target.value)} placeholder="例如：D:\\hermes\\拆文库\\书名" spellCheck={false}/></label>
      <button disabled={busy || importing} onClick={() => void runImport()}>{importing ? '正在读取…' : '导入对标书'}</button>
      <span className="story-muted">支持「拆文库/书名」文件夹（章节/*_摘要.md、文风.md、剧情/节奏.md、剧情/情绪模块.md、拆文报告.md）</span>
    </div>
    {error && <p className="story-alert story-error" role="alert">{error}</p>}
    {notice && <p className="story-save-notice" role="status">{notice}</p>}
    {!references.length ? <div className="story-empty"><h3>还没有对标书</h3><p>先用拆文流程分析一本参考书，再把它的文件夹路径填到上面导入。导入后这里会出现文风档案、节奏与章摘要，并和本书的节奏记录并排对照。</p><p>对标是项目内的副本：换书不会修改拆文库，删除本书对标也不会动原文件。</p></div> : <div className="story-reference-layout">
      <aside className="story-reference-list" aria-label="对标书列表">{references.map(reference => <button key={reference.id} aria-pressed={selected?.id === reference.id} onClick={() => setStored(reference.id)}>
        <strong>{reference.title}</strong><small>{reference.chapters.length} 章 · {reference.counts.characters} 个角色</small>{reference.importedAt && <small>{new Date(reference.importedAt).toLocaleDateString('zh-CN')}</small>}
      </button>)}</aside>
      {selected && <div className="story-reference-detail">
        <header className="story-section-heading"><div><h3>{selected.title}</h3><p>{selected.source ? `来源：${selected.source}` : '来源未记录'}</p></div><button className="story-reference-remove" disabled={busy} onClick={() => void remove(selected)}>移除此对标</button></header>
        <div className="story-metrics story-reference-metrics">
          <div><strong>{selected.counts.chapters}</strong><span>参考章节</span></div>
          <div><strong>{selected.counts.characters}</strong><span>角色文件</span></div>
          <div><strong>{selected.counts.settings}</strong><span>设定文件</span></div>
          <div><strong>{selected.style ? '有' : '无'}</strong><span>文风档案</span></div>
        </div>
        <RhythmCompare snapshot={snapshot} reference={selected} onChapter={onChapter}/>
        <details className="story-reference-text" open><summary>逐章摘要与基调</summary>
          <div className="story-matrix-scroll"><table className="story-matrix story-reference-chapters"><thead><tr><th scope="col">章</th><th scope="col">标题</th><th scope="col">基调</th><th scope="col">角色定位</th><th scope="col">字数</th><th scope="col">摘要</th></tr></thead>
            <tbody>{selected.chapters.map((chapter, index) => <tr key={`${chapter.index}:${index}`}><td>{index + 1}</td><td>{chapter.title}</td><td>{chapter.tone ? <span className={`story-tone-chip tone-${toneKey(chapter.tone)}`}>{chapter.tone}</span> : <span className="story-muted">—</span>}</td><td>{chapter.role || '—'}</td><td>{chapter.wordCount === null ? '—' : chapter.wordCount.toLocaleString('zh-CN')}</td><td className="story-reference-summary">{chapter.summary || '—'}</td></tr>)}</tbody></table></div>
        </details>
        {detailText.map(field => <details className="story-reference-text" key={field} open={field === 'style'}><summary>{detailNames[field]}{selected[field] ? '' : '（未提供）'}</summary><pre>{selected[field] || '拆文库中没有这份文件。'}</pre></details>)}
      </div>}
    </div>}
  </section>;
}

/** Two lanes aligned by chapter position; each side uses its own records. */
function RhythmCompare({snapshot, reference, onChapter}: {snapshot: StorySnapshot; reference: StoryReference; onChapter: (id?: string) => void}) {
  const author = useMemo(() => snapshot.chapters.map(chapter => ({chapter, rhythm: snapshot.story.rhythms[chapter.id]})).filter(item => item.rhythm), [snapshot]);
  const max = Math.max(author.length, reference.chapters.length);
  if (!max) return null;
  const width = Math.min(max, 80);
  return <section className="story-figure" aria-label="对标节奏对照">
    <div className="story-figure-heading"><div><h3>节奏对照</h3><p>左边是本书已记录的章节节奏，右边是对标书摘要里的基调。只按章序并排，不把参考书的情节当成本书事实。</p></div></div>
    <div className="story-matrix-scroll"><table className="story-matrix story-reference-rhythm"><thead><tr><th scope="col">章</th>{Array.from({length: width}, (_, index) => <th scope="col" key={index}>{index + 1}</th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">本书</th>{Array.from({length: width}, (_, index) => {const item = author[index]; return <td key={index}>{item?.rhythm ? <button className={`story-tone-chip tone-${item.rhythm.tone}`} title={`${chapterTitle(snapshot, item.chapter.id)} · ${toneNames[item.rhythm.tone]}`} onClick={() => onChapter(item.chapter.id)}>{toneNames[item.rhythm.tone]}</button> : <span className="story-muted">—</span>}</td>;})}</tr>
        <tr><th scope="row">对标</th>{Array.from({length: width}, (_, index) => {const item = reference.chapters[index]; return <td key={index}>{item?.tone ? <span className={`story-tone-chip tone-${toneKey(item.tone)}`} title={item.title}>{item.tone}</span> : <span className="story-muted">—</span>}</td>;})}</tr>
      </tbody></table></div>
    <p className="story-figure-empty">节奏对照只帮助看“参考书怎样安排起伏”，不是要求本书按同样节奏写。两边章节数不等时按前面对齐，多出的章节不补造。</p>
  </section>;
}
