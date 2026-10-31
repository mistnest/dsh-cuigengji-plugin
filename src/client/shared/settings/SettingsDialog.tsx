import React from 'react';
import {Modal} from '../Modal.tsx';
import {Icon} from '../icons.tsx';
import {useWorkspacePreference,type FeatureCall} from '../workspace-state.ts';
import type {GuidanceProps} from '../GuidanceToggle.tsx';
import {PetSettings} from '../../features/pet/Settings.tsx';
import {SettingsAction,SettingsRow} from './SettingsRow.tsx';
import {EditorSettings} from './EditorSettings.tsx';
import {LibraryDirectory} from './LibraryDirectory.tsx';
import {defaults,useWorkbenchPreferences} from './preferences-state.tsx';
import {categories,settingsItems,matchesSetting,type SettingId,type SettingsCategory} from './model.ts';
interface Props {
  close:()=>void;novelTitle?:string;onPreset?:()=>void;guidance?:GuidanceProps;
  onData?:()=>void;onRecords:()=>void;call?:FeatureCall;
}
export function SettingsDialog({close,novelTitle,onPreset,guidance,onData,onRecords,call}:Props) {
  const [savedCategory,setCategory]=useWorkspacePreference<SettingsCategory>('settings-category','editor');
  const category=categories.some(item=>item.id===savedCategory)?savedCategory:'editor';
  const [query,setQuery]=useWorkspacePreference('settings-search','');
  const {update,error}=useWorkbenchPreferences();
  const available=(id:SettingId)=>id==='guidance'?Boolean(guidance):id==='preset'?Boolean(onPreset):id==='transfer'?Boolean(onData):id==='directoryPath'?Boolean(call):true;
  const matched=(id:SettingId)=>available(id)&&matchesSetting(id,query);
  const ids=Object.keys(settingsItems) as SettingId[];
  const visibleCategories=categories.filter(item=>ids.some(id=>settingsItems[id].category===item.id&&matched(id))&&(query.trim()||item.id===category));
  const show=(id:SettingId)=>matched(id)&&(Boolean(query.trim())||settingsItems[id].category===category);
  const select=(value:SettingsCategory)=>{setCategory(value);setQuery('');};
  return <Modal title="设置" close={close} className="settings-modal">
    <div className="settings-search"><Icon name="search"/><input autoFocus aria-label="搜索设置" placeholder="搜索设置，例如：字号、预设、备份" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="清除设置搜索" onClick={()=>setQuery('')}>×</button>}</div>
    <label className="settings-mobile-category">设置分类<select aria-label="设置分类" value={category} onChange={e=>select(e.target.value as SettingsCategory)}>{categories.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    <div className="settings-layout">
      <nav className="settings-categories" aria-label="设置分类">{categories.map(item=><button type="button" key={item.id} aria-current={!query.trim()&&item.id===category?'page':undefined} onClick={()=>select(item.id)}><Icon name={item.icon}/><span>{item.title}</span>{query.trim()&&<small>{ids.filter(id=>settingsItems[id].category===item.id&&matched(id)).length}</small>}</button>)}</nav>
      <div className="settings-sections" key={query.trim()?'search':category}>
        {!visibleCategories.length&&<div className="settings-empty"><Icon name="search"/><p>没有找到相关设置</p><button type="button" onClick={()=>setQuery('')}>清除搜索</button></div>}
        {visibleCategories.map(item=><section className="settings-category" key={item.id} aria-label={item.title}>
          <header><h3>{item.title}</h3><p>{item.description}</p></header>
          {item.id==='editor'&&<EditorSettings show={show}/>}
          {item.id==='writing'&&<>
            {show('guidance')&&guidance&&<SettingsRow title="当前会话写作指引" description={<>
              <p>开启（默认）：核心写作指引和当前作品已启用的预设自动加入提示词，适合写作、讨论情节。</p>
              <p>关闭：通过 MCP 按需读取指引，适合编程等其他任务。</p>
              <p>注：关闭后，AI 可能不会主动使用催更姬，可明确说“使用催更姬”。已有聊天记录保留。</p>
            </>} scope="当前会话"><input type="checkbox" role="switch" aria-label="当前会话写作指引" checked={guidance.enabled===true} disabled={guidance.disabled||guidance.enabled===undefined} onChange={guidance.onToggle}/></SettingsRow>}
            {show('preset')&&novelTitle&&<p className="settings-work-name" title={novelTitle}>当前查看的作品 <strong>{novelTitle}</strong></p>}
            {show('preset')&&onPreset&&<SettingsAction title="写作预设" description="为这本书设置叙述风格、表达习惯和希望 AI 遵守的写作要求。" scope="当前作品" onClick={onPreset}/>}
            {!onPreset&&!query.trim()&&<p className="settings-hint">进入一本作品后，可以在这里管理它的写作预设。</p>}
          </>}
          {item.id==='pet'&&<PetSettings onRecords={onRecords} show={show}/>}
          {item.id==='data'&&<>
            {show('transfer')&&onData&&<SettingsAction title="数据管理" description="导入或导出指定作品、章节、规划和设定，也可以备份、恢复整个作品库。" scope="作品库" onClick={onData}/>}
            {show('directoryPath')&&call&&<LibraryDirectory call={call}/>}
          </>}
        </section>)}
        {!query.trim()&&category==='editor'&&<button className="settings-category-reset" onClick={()=>update(defaults)}>重置编辑与外观</button>}
      </div>
    </div>
    <footer className="settings-footer"><small role="status">{error||'修改自动保存，按各项标注的范围生效。'}</small></footer>
  </Modal>;
}
