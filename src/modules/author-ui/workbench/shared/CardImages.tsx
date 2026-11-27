import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Modal} from './Modal.tsx';
import {Icon} from './icons.tsx';
import {useWorkspaceResource,type FeatureServices} from './workspace-state.ts';
import {IMAGE_MAX_BYTES,imageGalleryKey,imageCardSize,type CardImageKind,type CardGallerySummary,type CardImageSummary} from '../../../workspace/cards/image-types.ts';
import {LibraryScope} from './state.ts';

const source=(image:{data:string;mimeType:string})=>`data:${image.mimeType};base64,${image.data}`;
const empty:CardGallerySummary={revision:0,coverId:null,images:[]};
interface ImageContext {
  kind:CardImageKind;
  galleries:Record<string,CardGallerySummary>;busy:boolean;error:string;
  resolved:Map<string,string>;
  read:(kind:CardImageKind,nodeId:string,imageId:string)=>Promise<string>;
  mutate:(kind:CardImageKind,nodeId:string,action:string,args:Record<string,unknown>)=>Promise<boolean|undefined>;
  upload:(kind:CardImageKind,nodeId:string,files:File[],replaceImageId?:string)=>Promise<void>;
  preview:(kind:CardImageKind,nodeId:string,imageId:string)=>void;
}
const Images=createContext<ImageContext|null>(null);
export const useCardImages=()=>useContext(Images);
export function useImageCardSizes<T extends {id:string}>(nodes:T[],kind:CardImageKind){
  const images=useCardImages();
  return useMemo(()=>nodes.map(node=>({...node,...imageCardSize(images?.galleries,kind,node.id)})),[nodes,images?.galleries,kind]);
}
async function prepareFile(file:File){
  if(file.size>IMAGE_MAX_BYTES)throw new Error('单张图片不能超过 12 MB');
  if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw new Error('请选择 PNG、JPEG、WebP 或 GIF 图片');
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('读取图片失败'));reader.readAsDataURL(file);});
  const image=new Image();image.src=data;await image.decode();
  if(image.naturalWidth*image.naturalHeight>100_000_000)throw new Error('图片尺寸过大，请缩小后再添加');
  const scale=Math.min(1,512/image.naturalWidth,300/image.naturalHeight),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('暂时无法生成图片预览');context.drawImage(image,0,0,canvas.width,canvas.height);
  const thumbnail=canvas.toDataURL('image/webp',.82);
  return {name:file.name||'配图.png',data:data.slice(data.indexOf(',')+1),thumbnail:{mimeType:thumbnail.slice(5,thumbnail.indexOf(';')),data:thumbnail.slice(thumbnail.indexOf(',')+1)}};
}
export function CardImagesProvider({kind,children,...services}:FeatureServices&{kind:CardImageKind;children:React.ReactNode}){
  const library=useContext(LibraryScope);
  return <ImageWorkspace key={`${library}:${services.novelId}:${kind}`} {...services} kind={kind}>{children}</ImageWorkspace>;
}
function ImageWorkspace({kind,children,...services}:FeatureServices&{kind:CardImageKind;children:React.ReactNode}){
  const {call,novelId,run,busy,tick}=services;
  const resource=useWorkspaceResource<{galleries:Record<string,CardGallerySummary>}>(()=>call('image.list',{novelId,kind,includeThumbnails:true}),[call,novelId,kind,tick],[call,novelId,kind]);
  const [overrides,setOverrides]=useState<Record<string,CardGallerySummary>>({}),[error,setError]=useState(''),[writing,setWriting]=useState(false);
  const [viewer,setViewer]=useState<{kind:CardImageKind;nodeId:string;imageId:string}|null>(null);
  const cache=useMemo(()=>new Map<string,Promise<string>>(),[call,novelId]);
  const resolved=useMemo(()=>new Map<string,string>(),[call,novelId]);
  const galleries=useMemo(()=>{const result={...resource.value?.galleries};for(const [key,value] of Object.entries(overrides))if(value.revision>(result[key]?.revision??-1))result[key]=value;return result;},[resource.value,overrides]);
  const current=useRef(galleries);current.current=galleries;
  const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const locked=useRef(false);
  const read=async(type:CardImageKind,nodeId:string,imageId:string)=>{
    const key=imageGalleryKey(type,nodeId)+':'+imageId;
    if(!cache.has(key))cache.set(key,call('image.read',{novelId,kind:type,nodeId,imageId}).then(image=>{const url=source(image);resolved.set(key,url);return url;}).catch(error=>{cache.delete(key);throw error;}));
    return cache.get(key)!;
  };
  const mutate=async(type:CardImageKind,nodeId:string,action:string,args:Record<string,unknown>)=>{
    if(busy||locked.current||resource.loading&&!resource.value)return false;
    locked.current=true;setWriting(true);setError('');
    try{return await run(async()=>{
      const key=imageGalleryKey(type,nodeId);
      try{
        const value=await call(action,{novelId,kind:type,nodeId,expectedRevision:current.current[key]?.revision||0,requestId:crypto.randomUUID(),...args});
        for(const image of current.current[key]?.images||[])if(!value.images.some((next:CardImageSummary)=>next.id===image.id)){const removed=key+':'+image.id;cache.delete(removed);resolved.delete(removed);}
        if(alive.current){current.current={...current.current,[key]:value};setOverrides(previous=>({...previous,[key]:value}));}
        await resource.reload();
      }catch(error){if(alive.current)setError((error as Error).message);if((error as {code?:string}).code==='CONFLICT')await resource.reload();throw error;}
    });}finally{locked.current=false;if(alive.current)setWriting(false);}
  };
  const upload=async(type:CardImageKind,nodeId:string,files:File[],replaceImageId?:string)=>{
    if(locked.current||busy)return;
    try{
      if(!files.length)return;if(files.length>12)throw new Error('一次最多添加 12 张图片');
      const prepared=await Promise.all((replaceImageId?files.slice(0,1):files).map(prepareFile));
      await mutate(type,nodeId,'image.import',{files:prepared,...(replaceImageId?{replaceImageId}:{})});
    }catch(error){if(alive.current)setError((error as Error).message);}
  };
  const value={kind,galleries,resolved,busy:busy||writing||!resource.value,error:error||resource.error,read,mutate,upload,preview:(kind:CardImageKind,nodeId:string,imageId:string)=>setViewer({kind,nodeId,imageId})};
  return <Images.Provider value={value}>{children}{viewer&&<CardImageViewer {...viewer} change={imageId=>setViewer({...viewer,imageId})} close={()=>setViewer(null)}/>}</Images.Provider>;
}
export function cardCoverSource(context:ImageContext|null,kind:CardImageKind,nodeId:string){const key=imageGalleryKey(kind,nodeId),gallery=context?.galleries[key],cover=gallery?.images.find(image=>image.id===gallery.coverId);return cover?.thumbnail?source(cover.thumbnail):cover?context?.resolved.get(key+':'+cover.id):undefined;}
function useImageSource(kind:CardImageKind,nodeId:string,image:CardImageSummary|undefined,original=false){
  const context=useCardImages(),key=image?.id||'';
  const [loaded,setLoaded]=useState({key:'',src:'',error:''});
  const thumbnail=!original&&image?.thumbnail?source(image.thumbnail):'';
  useEffect(()=>{let active=true;if(!image||thumbnail||!context)return;if(loaded.key===key&&loaded.src)return;void context.read(kind,nodeId,image.id).then(src=>{if(active)setLoaded({key,src,error:''});}).catch(error=>{if(active)setLoaded({key,src:'',error:error.message});});return()=>{active=false;};},[key,kind,nodeId,thumbnail,original,context?.read]);
  return {src:thumbnail||(loaded.key===key?loaded.src:''),error:loaded.key===key?loaded.error:''};
}
export function CardCover({kind,nodeId,title}:{kind:CardImageKind;nodeId:string;title:string}){
  const context=useCardImages(),gallery=context?.galleries[imageGalleryKey(kind,nodeId)],cover=gallery?.images.find(image=>image.id===gallery.coverId);
  const {src,error}=useImageSource(kind,nodeId,cover);
  if(!cover)return null;
  return <button type="button" data-no-drag="true" className="card-image-cover" aria-label={`放大${title}配图`} onClick={event=>{event.stopPropagation();context?.preview(kind,nodeId,cover.id);}} onDoubleClick={event=>event.stopPropagation()}>{src?<img src={src} alt={cover.name} draggable={false}/>:<span>{error?'图片读取失败':'读取配图…'}</span>}<small>{gallery!.images.length} 张</small></button>;
}
export function useCardImageDrop(kind:CardImageKind,nodeId:string){
  const context=useCardImages();return {
    onDragOver:(event:React.DragEvent)=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect=context?.busy?'none':'copy';}},
    onDrop:(event:React.DragEvent)=>{if(!event.dataTransfer.files.length)return;event.preventDefault();event.stopPropagation();void context?.upload(kind,nodeId,Array.from(event.dataTransfer.files));},
  };
}
export function CardGallery({kind,nodeId,disabled=false}:{kind:CardImageKind;nodeId:string;disabled?:boolean}){
  const context=useCardImages(),gallery=context?.galleries[imageGalleryKey(kind,nodeId)]||empty;
  const [selected,setSelected]=useState(''),[dragging,setDragging]=useState(false),[clipboardError,setClipboardError]=useState('');
  const input=useRef<HTMLInputElement>(null),replacing=useRef<string|undefined>(undefined),root=useRef<HTMLElement>(null);
  const image=gallery.images.find(image=>image.id===selected)||gallery.images.find(image=>image.id===gallery.coverId)||gallery.images[0];
  const {src,error}=useImageSource(kind,nodeId,image);
  const busy=disabled||Boolean(context?.busy);
  useEffect(()=>{const owner=root.current?.closest('.entry-document');if(!owner)return;const paste=(event:Event)=>{const e=event as ClipboardEvent;if((e.target as Element).closest('input,textarea,[contenteditable=true]'))return;const files=Array.from(e.clipboardData?.files||[]);if(files.length&&!busy){e.preventDefault();void context?.upload(kind,nodeId,files);}};owner.addEventListener('paste',paste);return()=>owner.removeEventListener('paste',paste);},[context,kind,nodeId,busy]);
  if(!context)return null;
  const pick=(replace?:string)=>{replacing.current=replace;if(input.current){input.current.multiple=!replace;input.current.click();}};
  const paste=async()=>{try{setClipboardError('');const items=await navigator.clipboard.read();const files:File[]=[];for(const item of items){const type=item.types.find(type=>/^image\/(png|jpeg|webp|gif)$/.test(type));if(type)files.push(new File([await item.getType(type)],'粘贴图片.'+type.split('/')[1],{type}));}if(!files.length)throw new Error('剪贴板中没有图片');await context.upload(kind,nodeId,files);}catch{setClipboardError('无法读取剪贴板，可将图片拖到这里或使用“添加图片”。');}};
  return <section ref={root} className={`card-image-gallery ${!image?'is-empty':''} ${dragging?'is-dragging':''}`} aria-label="卡片配图" data-no-drag="true" onDragOver={event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();setDragging(true);}}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false);}} onDrop={event=>{event.preventDefault();event.stopPropagation();setDragging(false);if(!busy)void context.upload(kind,nodeId,Array.from(event.dataTransfer.files));}}>
    <header><span className="card-image-heading"><Icon name="image"/><h3>配图</h3></span>{gallery.images.length>0?<small>{gallery.images.length} 张</small>:<small className="card-image-empty-hint">可拖入或粘贴图片</small>}<button type="button" disabled={busy} onClick={()=>pick()}>{image?'＋ 添加':'＋ 添加图片'}</button><button type="button" disabled={busy} onClick={()=>void paste()}>粘贴</button></header>
    {image&&<><button type="button" className="card-image-main" aria-label="放大当前配图" onClick={()=>context.preview(kind,nodeId,image.id)}>{src?<img src={src} alt={image.name} draggable={false}/>:<span>读取图片…</span>}<span><Icon name="expand"/>查看大图</span></button><div className="card-image-caption"><span title={image.name}>{image.name}</span>{image.id===gallery.coverId&&<small>卡片封面</small>}</div><div className="card-image-thumbnails">{gallery.images.map(item=><ImageThumbnail key={item.id} {...{kind,nodeId}} image={item} active={item.id===image.id} choose={()=>setSelected(item.id)}/>)}<button className="card-image-add" type="button" aria-label="继续添加配图" disabled={busy} onClick={()=>pick()}>＋</button></div><div className="card-image-actions"><button type="button" disabled={busy||image.id===gallery.coverId} onClick={()=>void context.mutate(kind,nodeId,'image.update',{coverId:image.id})}>{image.id===gallery.coverId?'已设为封面':'设为封面'}</button><button type="button" disabled={busy} onClick={()=>pick(image.id)}>更换</button><button type="button" className="danger" disabled={busy} onClick={()=>void context.mutate(kind,nodeId,'image.delete',{imageId:image.id})}>移除</button></div></>}
    {(context.error||error||clipboardError)&&<p className="notice error" role="alert">{context.error||error||clipboardError}</p>}
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden aria-label="选择卡片配图" onChange={event=>{const files=Array.from(event.currentTarget.files||[]);event.currentTarget.value='';void context.upload(kind,nodeId,files,replacing.current);replacing.current=undefined;}}/>
  </section>;
}
function ImageThumbnail({kind,nodeId,image,active,choose}:{kind:CardImageKind;nodeId:string;image:CardImageSummary;active:boolean;choose:()=>void}){
  const {src}=useImageSource(kind,nodeId,image);return <button type="button" className="card-image-thumb" aria-label={`预览${image.name}`} aria-pressed={active} onClick={choose}>{src&&<img src={src} alt="" draggable={false}/>}</button>;
}
function CardImageViewer({kind,nodeId,imageId,change,close}:{kind:CardImageKind;nodeId:string;imageId:string;change:(id:string)=>void;close:()=>void}){
  const context=useCardImages()!,gallery=context.galleries[imageGalleryKey(kind,nodeId)]||empty,image=gallery.images.find(image=>image.id===imageId),index=gallery.images.findIndex(image=>image.id===imageId);
  const {src,error}=useImageSource(kind,nodeId,image,true);
  const next=(step:number)=>change(gallery.images[(index+step+gallery.images.length)%gallery.images.length].id);
  return <Modal title={image?.name||'配图'} close={close} className="card-image-viewer"><div className="card-image-view-stage" onKeyDown={event=>{if(event.key==='ArrowLeft'&&gallery.images.length>1)next(-1);if(event.key==='ArrowRight'&&gallery.images.length>1)next(1);}}>{gallery.images.length>1&&<button type="button" aria-label="上一张图片" onClick={()=>next(-1)}>‹</button>}{src?<img src={src} alt={image?.name} draggable={false}/>:<p role="status">{error||'正在读取原图…'}</p>}{gallery.images.length>1&&<button type="button" aria-label="下一张图片" onClick={()=>next(1)}>›</button>}</div><footer><span>{index+1} / {gallery.images.length}</span>{gallery.images.map(item=><ImageThumbnail key={item.id} {...{kind,nodeId}} image={item} active={item.id===imageId} choose={()=>change(item.id)}/>)}</footer></Modal>;
}
