import React,{useState} from 'react';
import {Modal} from '../Modal.tsx';
import {Icon} from '../icons.tsx';
import {useWorkspacePreference,type FeatureCall} from '../workspace-state.ts';
import type {GuidanceProps} from '../GuidanceToggle.tsx';
import {PetSettings} from '../../features/pet/Settings.tsx';
import {UsageSettings} from '../../features/pet/UsageSettings.tsx';
import {SettingsAction,SettingsGroup,SettingsRow} from './SettingsRow.tsx';
import {EditorSettings} from './EditorSettings.tsx';
import {LibraryDirectory} from './LibraryDirectory.tsx';
import {ExternalAccessSettings} from './ExternalAccess.tsx';
import {defaults,useWorkbenchPreferences} from './preferences-state.tsx';
import {categories,settingsItems,matchesSetting,type SettingId,type SettingsCategory} from './model.ts';

interface Props {
  close:()=>void;novelTitle?:string;onPreset?:()=>void;guidance?:GuidanceProps;
  onData?:()=>void;onRecords:()=>void;call?:FeatureCall;onVariables?:()=>void;
}

export function SettingsDialog({close,novelTitle,onPreset,guidance,onData,onRecords,call,onVariables}:Props) {
  const [usageOpen,setUsageOpen]=useState(false);
  const [savedCategory,setCategory]=useWorkspacePreference<SettingsCategory>('settings-category','editor');
  const category=categories.some(item=>item.id===savedCategory)?savedCategory:'editor';
  const [query,setQuery]=useWorkspacePreference('settings-search','');
  const {update,error}=useWorkbenchPreferences();
  const searching=Boolean(query.trim());
  const available=(id:SettingId)=>id==='guidance'?Boolean(guidance):id==='preset'?Boolean(onPreset):id==='variables'?Boolean(onVariables):id==='transfer'?Boolean(onData):id==='directoryPath'||id==='external-access'?Boolean(call):true;
  const matched=(id:SettingId)=>available(id)&&matchesSetting(id,query);
  const ids=Object.keys(settingsItems) as SettingId[];
  const visibleCategories=categories.filter(item=>ids.some(id=>settingsItems[id].category===item.id&&matched(id))&&(searching||item.id===category));
  const show=(id:SettingId)=>matched(id)&&(searching||settingsItems[id].category===category);
  const select=(value:SettingsCategory)=>{setCategory(value);setQuery('');};

  return <><Modal title="设置" close={close} className="settings-modal">
    <div className="settings-layout">
      <aside className="settings-rail">
        <div className="settings-rail-controls">
          <div className="settings-search"><Icon name="search"/><input autoFocus aria-label="搜索设置" placeholder="搜索字号、变量、MCP…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="清除设置搜索" onClick={()=>setQuery('')}>×</button>}</div>
          <label className="settings-mobile-category"><span className="sr-only">设置分类</span><select aria-label="设置分类" value={category} onChange={e=>select(e.target.value as SettingsCategory)}>{categories.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        </div>
        <nav className="settings-categories" aria-label="设置分类">{categories.map(item=><button type="button" key={item.id} aria-current={!searching&&item.id===category?'page':undefined} onClick={()=>select(item.id)}><Icon name={item.icon}/><span>{item.title}</span>{searching&&<small>{ids.filter(id=>settingsItems[id].category===item.id&&matched(id)).length}</small>}</button>)}</nav>
      </aside>
      <div className="settings-sections" key={searching?'search':category}>
        {error&&<p className="notice error settings-error-banner" role="alert">{error}</p>}
        {!visibleCategories.length&&<div className="settings-empty"><Icon name="search"/><p>没有找到相关设置</p><button type="button" onClick={()=>setQuery('')}>清除搜索</button></div>}
        {visibleCategories.map(item=><section className="settings-category" key={item.id} aria-label={item.title}>
          <header><h3>{item.title}</h3><p>{item.description}</p></header>
          {item.id==='editor'&&<EditorSettings show={show}/>}
          {item.id==='writing'&&<>
            <SettingsGroup title="当前对话">
              {show('guidance')&&guidance&&<SettingsRow title="当前会话写作指引" description="开启后 AI 会自动了解催更姬工具与本书设定；聊其他话题或写代码时可关掉。"><input type="checkbox" role="switch" aria-label="当前会话写作指引" checked={guidance.enabled===true} disabled={guidance.disabled||guidance.enabled===undefined} onChange={guidance.onToggle}/></SettingsRow>}
            </SettingsGroup>
            <SettingsGroup title="当前作品" subtitle={novelTitle?`《${novelTitle}》`:undefined}>
              {show('preset')&&onPreset&&<SettingsAction icon="note" title="创作记忆" description="查看或编辑本书定下的文风、视角与伏笔约定（也可从顶栏“记忆”进入）。" onClick={onPreset}/>}
              {show('variables')&&onVariables&&<SettingsAction icon="sliders" title="剧情变量" description="按章节跟踪人物属性、物品与状态变化，支持常见酒馆变量宏。" onClick={onVariables}/>}
            </SettingsGroup>
            {!onPreset&&!searching&&<p className="settings-hint">打开具体作品后，可在这里设置它的创作记忆与剧情变量。</p>}
            <SettingsGroup title="外部客户端接入">
              {show('external-access')&&call&&<ExternalAccessSettings call={call}/>}
            </SettingsGroup>
          </>}
          {item.id==='pet'&&<>
            <PetSettings onRecords={onRecords} show={show}/>
            <SettingsGroup title="统计与预算">
              {show('records')&&<SettingsAction icon="chart" title="查看写作记录" description="按天查看字数净增、各书明细与写作趋势。" actionLabel="查看" onClick={onRecords}/>}
              {show('pet-usage')&&call&&<SettingsAction icon="coin" title="用量、费用与气泡" description="设置模型单价与预算，自定义桌宠台词、音效和图片素材。" actionLabel="配置" onClick={()=>setUsageOpen(true)}/>}
            </SettingsGroup>
          </>}
          {item.id==='data'&&<>
            <SettingsGroup title="导入导出与备份">
              {show('transfer')&&onData&&<SettingsAction icon="download" title="数据管理" description="导入导出单本作品、世界书或角色卡，备份或恢复整个作品库。" onClick={onData}/>}
            </SettingsGroup>
            {show('directoryPath')&&call&&<LibraryDirectory call={call}/>}
          </>}
        </section>)}
        {!searching&&category==='editor'&&<div className="settings-category-foot"><button type="button" className="settings-category-reset" onClick={()=>update(defaults)}><Icon name="rotateCcw"/><span>恢复默认显示设置</span></button></div>}
      </div>
    </div>
  </Modal>{usageOpen&&call&&<UsageSettings rpc={call} onClose={()=>setUsageOpen(false)}/>}</>;
}
