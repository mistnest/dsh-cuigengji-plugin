import React,{useMemo,useState} from 'react';
import {Modal} from './preferences.tsx';
import {buildCanvasImage,canvasImagePNG,downloadImage,type CanvasImageScene,type ImageRange} from './canvas-image.ts';
export function CanvasExport({scene,busy}:{scene:()=>CanvasImageScene;busy:boolean}) {
  const [snapshot,setSnapshot]=useState<CanvasImageScene|null>(null);
  return <><button className="canvas-export-launch" disabled={busy} onClick={()=>setSnapshot(scene())}>导出图片</button>{snapshot&&<ExportDialog scene={snapshot} close={()=>setSnapshot(null)}/>}</>;
}
function ExportDialog({scene,close}:{scene:CanvasImageScene;close:()=>void}) {
  const [range,setRange]=useState<ImageRange>('all'),[format,setFormat]=useState('png'),[title,setTitle]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const preview=useMemo(()=>{try{return {result:buildCanvasImage(scene,range,title),error:''};}catch(error){return {result:null,error:error instanceof Error?error.message:String(error)};}},[scene,range,title]);
  const download=async()=>{
    if(!preview.result||saving)return;setSaving(true);setError('');
    try {const blob=format==='svg'?new Blob([preview.result.svg],{type:'image/svg+xml;charset=utf-8'}):await canvasImagePNG(preview.result);const filename=(scene.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').trim().slice(0,110)||'故事画布')+`.${format}`;downloadImage(blob,filename);}
    catch(error){setError(error instanceof Error?error.message:'图片生成失败，请重试。');}finally{setSaving(false);}
  };
  return <Modal title="导出画布图片" close={()=>{if(!saving)close();}} className="canvas-export-modal">
    <div className="canvas-export-options"><label>导出范围<select aria-label="图片导出范围" value={range} disabled={saving} onChange={e=>setRange(e.target.value as ImageRange)}><option value="all">本页全图</option><option value="selection" disabled={!scene.selectedIds.some(id=>scene.visibleIds.includes(id))}>所选区域</option><option value="viewport">当前视野</option></select></label><label>图片格式<select aria-label="图片格式" value={format} disabled={saving} onChange={e=>setFormat(e.target.value)}><option value="png">PNG 高清图片</option><option value="svg">SVG 矢量图片</option></select></label><label className="export-title-option"><input type="checkbox" checked={title} disabled={saving} onChange={e=>setTitle(e.target.checked)}/>显示作品与页面标题</label></div>
    <div className="canvas-export-preview">{preview.result?<img alt="画布图片预览" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview.result.svg)}`}/>:<p>{preview.error}</p>}</div>
    <footer className="canvas-export-footer"><div><small>{preview.result?`${preview.result.count} 项内容 · ${format==='png'?`${preview.result.pixels.width} × ${preview.result.pixels.height}`:'矢量图片，可自由放大'}`:''}</small><small>导出保留当前文件夹收纳状态；全图包含本画布全部内容。</small></div><button className="primary" disabled={saving||!preview.result} onClick={()=>void download()}>{saving?'正在生成…':'保存图片'}</button></footer>
    {error&&<p className="notice error" role="alert">{error}</p>}
  </Modal>;
}
