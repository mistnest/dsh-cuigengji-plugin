import React,{useEffect,useState} from 'react';
import {Icon, type IconName} from '../icons.tsx';
import type {FeatureCall} from '../workspace-state.ts';
import {hasUnsavedDrafts} from '../state.ts';
import {notifyLibrarySwitched} from '../library-events.ts';
import {SettingsGroup} from './SettingsRow.tsx';

type Mode='switch'|'create'|'migrate';
interface Status {dataRoot:string;novels:number|null;recent:string[];canChange:boolean;hasIndexCopy?:boolean;error?:{message:string;details?:{directories?:string[]}}}
interface Inspection {path:string;kind:'empty'|'existing';recoveryPending?:boolean;books?:{id:string;title:string;archived?:boolean}[]}
const modes: readonly {id:Mode;title:string;description:string;action:string;icon:IconName}[]=[
  {id:'switch',title:'打开已有作品库',description:'切换到其他已有目录',action:'打开此作品库',icon:'folder'},
  {id:'create',title:'新建空作品库',description:'在空文件夹创建新库',action:'创建并打开',icon:'folderPlus'},
  {id:'migrate',title:'迁移当前作品库',description:'复制全部数据到新目录',action:'迁移并打开',icon:'folderArrow'},
];
export function LibraryDirectory({call}:{call:FeatureCall}){
  const [status,setStatus]=useState<Status|null>(null),[mode,setMode]=useState<Mode|null>(null);
  const [path,setPath]=useState(''),[inspection,setInspection]=useState<Inspection|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const [confirmIndex,setConfirmIndex]=useState(false);
  const restore=async()=>{
    if(!status)return;
    setBusy(true);setError('');
    try {
      await call('library.restoreIndex',{confirm:true,__libraryRoot:status.dataRoot});
      setConfirmIndex(false);setReload(value=>value+1);
    } catch(failure:any){setError(failure.message);}
    finally{setBusy(false);}
  };
  useEffect(()=>{let live=true;call('library.status').then(value=>{if(live)setStatus(value);}).catch(failure=>{if(live)setError(failure.message);});return()=>{live=false;};},[call,reload]);
  const choose=(next:Mode|null)=>{setMode(next);setInspection(null);setPath('');setError('');};
  const pick=async()=>{setBusy(true);setError('');try{const value=await call('library.pick');if(value.path){setPath(value.path);setInspection(null);}}catch(failure:any){setError(failure.message);}finally{setBusy(false);}};
  const inspect=async()=>{setBusy(true);setError('');setInspection(null);try{
    const value:Inspection=await call('library.inspect',{path});
    if(mode==='switch'&&value.kind!=='existing')throw Error('请选择已有作品库；空文件夹可使用“新建空作品库”。');
    if(mode!=='switch'&&value.kind!=='empty')throw Error('请选择空文件夹，已有内容不会被覆盖。');
    setInspection(value);
  }catch(failure:any){setError(failure.message);}finally{setBusy(false);}};
  const apply=async()=>{
    if(!inspection)return;
    if(hasUnsavedDrafts()){setError('还有未保存的编辑，请先保存或处理草稿，再切换作品库。');return;}
    setBusy(true);setError('');try{
      const value=await call('library.change',{mode,path:inspection.path,confirm:true});
      notifyLibrarySwitched(value.dataRoot);
    }catch(failure:any){setError(failure.message);setBusy(false);}
  };
  const option=modes.find(row=>row.id===mode);
  return <SettingsGroup title="本地存储位置"><section className="settings-data-path library-directory" aria-label="作品库目录管理">
    <strong>作品库目录</strong><p>正文、设定、规划、历史版本和写作记录都存放在这里。</p>
    {status?<><div className="settings-path-bar"><code aria-label="作品库目录">{status.dataRoot}</code><small className="library-count">{status.novels===null?'作品数量暂时无法读取':`${status.novels} 部作品`}</small></div>
      {status.error&&<p className="notice error" role="alert">{status.error.message}</p>}
      {status.error?.details?.directories?.length ? <details><summary>查看检测到的作品目录</summary><ul>{status.error.details.directories.map(name=><li key={name}>{name}</li>)}</ul></details>:null}
      {status.hasIndexCopy && (confirmIndex?<div><p>将核对索引副本与现存作品，核对通过后恢复书单。</p><button disabled={busy} onClick={restore}>确认恢复索引</button><button disabled={busy} onClick={()=>setConfirmIndex(false)}>取消</button></div>:<button disabled={busy} onClick={()=>setConfirmIndex(true)}>从本地副本恢复索引</button>)}
      <div className="library-modes">{modes.map(row=><button type="button" key={row.id} aria-pressed={mode===row.id} disabled={busy||!status.canChange||row.id==='migrate'&&Boolean(status.error)} onClick={()=>choose(mode===row.id?null:row.id)}><Icon name={row.icon}/><strong>{row.title}</strong><span>{row.description}</span></button>)}</div>
      {!status.canChange&&<p>当前 DSH 不支持保存目录配置，请更新 DSH 后使用。</p>}
      {mode&&<div className="library-destination">
        <label>目标文件夹<div className="library-path-input"><input aria-label="目标作品库目录" placeholder="选择文件夹，或输入完整路径" value={path} disabled={busy} onChange={event=>{setPath(event.target.value);setInspection(null);setError('');}}/><button type="button" disabled={busy} onClick={pick}>浏览…</button></div></label>
        {mode==='switch'&&status.recent.filter(value=>value!==status.dataRoot).length>0&&<label>最近使用<select aria-label="最近使用的作品库" value="" disabled={busy} onChange={event=>{setPath(event.target.value);setInspection(null);setError('');}}><option value="">选择最近的作品库</option>{status.recent.filter(value=>value!==status.dataRoot).map(value=><option key={value} value={value}>{value}</option>)}</select></label>}
        {inspection?<div className="library-preview"><strong>{inspection.recoveryPending?'作品库有未完成的保存，打开时会先恢复并校验。':inspection.kind==='existing'?`找到 ${inspection.books?.length||0} 部作品`:'目标文件夹为空'}</strong>{inspection.books?.length?<p>{inspection.books.slice(0,4).map(book=>book.title).join('、')}{inspection.books.length>4?'…':''}</p>:null}<p>{mode==='migrate'?'会迁移全部作品、历史和写作记录，并在校验成功后切换。':'当前作品库中的数据保留在原目录。'}</p><button type="button" className="primary" disabled={busy} onClick={apply}>{busy?'正在处理，请稍候…':option?.action}</button></div>:<button type="button" disabled={busy||!path.trim()} onClick={inspect}>{busy?'正在检查…':'检查目标目录'}</button>}
        <button type="button" className="library-cancel" disabled={busy} onClick={()=>setMode(null)}>取消</button>
      </div>}
    </>:!error?<p role="status">正在读取…</p>:<button type="button" onClick={()=>{setError('');setReload(value=>value+1);}}>重新读取</button>}
    {error&&<p className="notice error" role="alert">{error}</p>}
  </section></SettingsGroup>;
}
