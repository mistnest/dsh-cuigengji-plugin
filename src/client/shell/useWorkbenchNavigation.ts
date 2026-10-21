import {useEffect,useState} from 'react';
import {useWorkspacePreference} from '../shared/workspace-state.ts';
import type {TransferShortcut} from '../../contracts/transfer.ts';

export type BookPage='chapters'|'plan'|'memory';
type BaseRoute={kind:'home'}|{kind:'book';page:BookPage};
type ManagementRoute={kind:'management';page:'preset'|'manage';initialView:'overview'|'recycle';returnTo:BaseRoute};
type Route=BaseRoute|ManagementRoute|{kind:'transfer';initial:TransferShortcut|null;visit:number;returnTo:BaseRoute|ManagementRoute};
const pageNames={chapters:'正文',plan:'规划',memory:'设定',preset:'写作预设',manage:'作品与备份'};
const bookPage=(value:string):BookPage=>value==='plan'||value==='memory'?value:'chapters';

/** UI navigation is independent of the Agent's session/book association. */
export function useWorkbenchNavigation(sessionId:string,novelId?:string) {
  const [savedPage,setSavedPage]=useWorkspacePreference<string>('page','chapters');
  const [savedReturn,setSavedReturn]=useWorkspacePreference<string>('management-return','chapters');
  const [route,setRoute]=useState<Route>(()=>{
    const returnTo:BaseRoute=savedReturn==='welcome'?{kind:'home'}:{kind:'book',page:bookPage(savedReturn)};
    if(savedPage==='data')return {kind:'transfer',initial:null,visit:0,returnTo};
    if(savedPage==='preset'||savedPage==='manage')return {kind:'management',page:savedPage,initialView:'overview',returnTo};
    return savedPage==='welcome'?{kind:'home'}:{kind:'book',page:bookPage(savedPage)};
  });
  const [referenceReturn,setReferenceReturn]=useState<BookPage|null>(null);
  const tab=route.kind==='home'?'chapters':route.kind==='transfer'?'data':route.page;
  useEffect(()=>{
    setSavedPage(route.kind==='home'?'welcome':tab);
    if(route.kind==='management'||route.kind==='transfer')setSavedReturn(route.returnTo.kind==='home'?'welcome':route.returnTo.page);
  },[route]);
  const baseRoute=():BaseRoute=>!novelId||route.kind==='home'?{kind:'home'}:route.kind==='book'?route:route.returnTo.kind==='management'?route.returnTo.returnTo:route.returnTo;
  const goHome=()=>{setReferenceReturn(null);setRoute({kind:'home'});};
  const openBookPage=(page:BookPage='chapters')=>{setReferenceReturn(null);setRoute({kind:'book',page});};
  const openManagement=(page:'preset'|'manage',initialView:'overview'|'recycle'='overview')=>{setReferenceReturn(null);setRoute({kind:'management',page,initialView,returnTo:baseRoute()});};
  const openTransfer=(initial:TransferShortcut)=>{setReferenceReturn(null);const returnTo=route.kind==='management'?route:baseRoute();setRoute(previous=>({kind:'transfer',initial,visit:previous.kind==='transfer'?previous.visit+1:Date.now(),returnTo:previous.kind==='transfer'?previous.returnTo:returnTo}));};
  const returnFromManagement=()=>{setReferenceReturn(null);setRoute(previous=>previous.kind==='management'||previous.kind==='transfer'?previous.returnTo:{kind:'book',page:'chapters'});};
  const origin=route.kind==='management'||route.kind==='transfer'?route.returnTo:null;
  const managementBack={onBack:returnFromManagement,backLabel:origin?.kind==='home'?'返回作品首页':origin?.kind==='management'?'返回'+pageNames[origin.page]:origin?.kind==='book'?'返回'+pageNames[origin.page]:'返回正文'};
  const jump=(page:BookPage,key:string,id:string)=>{
    if(route.kind==='book')setReferenceReturn(route.page);
    try{localStorage.setItem(`cuigengji:ui:${sessionId}:${novelId}:${key}`,JSON.stringify(id));}catch{}
    setRoute({kind:'book',page});
  };
  const backFromReference=()=>{if(referenceReturn)setRoute({kind:'book',page:referenceReturn});setReferenceReturn(null);};
  return {tab,homeOpen:route.kind==='home',route,referenceReturn,goHome,openBookPage,openManagement,openTransfer,managementBack,jump,backFromReference,
    transferInitial:route.kind==='transfer'?route.initial:null,transferVisit:route.kind==='transfer'?route.visit:0,
    manageInitial:route.kind==='management'?route.initialView:'overview' as const};
}
