import React from 'react';
import {LocaleContext,registerLocale} from './locale.js';
import {Launcher} from './launcher.tsx';
import {openWritingLibrary} from './shared/library-workspace.ts';
import {WorkbenchBoundary} from './shared/WorkbenchBoundary.tsx';
import {WorkbenchRoot,type WorkbenchRPC} from './WorkbenchShell.tsx';
import {createWorkbenchRPC} from './shared/rpc.ts';
import {PetOverlay,PetBoundary} from './features/pet/index.tsx';
import {createRecordsNavigation} from './features/pet/records-navigation.ts';
import {invalidatePetActivity} from './features/pet/activity.ts';
import {SurfaceActivity} from './shared/surface-activity.ts';
export {Workbench} from './WorkbenchShell.tsx';
const ID = 'dsh-cuigengji-plugin';
const PET_ID = 'dsh-cuigengji-pet';
const RPC_ENDPOINT = 'cuigengji/dispatch';
export const inject = ['connection', 'slots', 'sidebarRight', 'sidebarRightTabs', 'locale', 'layout', 'uiWorkspace', 'workspaces','sessions','uiSession'];
export function apply(ctx:any) {
  const lifetime=new AbortController();
  ctx.effect(()=>()=>lifetime.abort());
  const rpc=createWorkbenchRPC((action,args,sessionId,signal)=>ctx.connection.rpc.call('/api',RPC_ENDPOINT,{action,args,sessionId},signal),{signal:lifetime.signal});
  return applyWithRPC(ctx, rpc);
}

export function applyWithRPC(ctx:any, rpc:WorkbenchRPC) {
  const recordsNavigation = createRecordsNavigation();
  const transport = rpc;
  rpc = async (action, args, sessionId) => {
    const value = await transport(action, args, sessionId);
    if (/^(chapter\.(create|update|replace|delete|restore)|volume\.delete|graph\.(create|update|continue)|planning\.(apply|continue|page\.|group\.)|novel\.(create|import|archive|restore|purge)|binding\.set)/.test(action)) {
      invalidatePetActivity(rpc, action === 'binding.set' || action.startsWith('novel.'));
    }
    return value;
  };
  const t = ctx.locale ? registerLocale(ctx) : (key:string) => ({ title: '催更姬', open: '打开小说目录、正文和设定' } as Record<string,string>)[key];
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: ID, kind: 'cuigengji', keepMounted: true,
    patterns: ['dsh-resource://cuigengji/**'], title: () => t('title'),
  }));
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: ID, order: 40,
    inject: () => ({
      hooks: {novelSession:ctx.sidebarRight.mounted,novelWorkspaces:ctx.workspaces.list},
      openNovel: (sessionId:string) => ctx.sidebarRight.openResource(`dsh-resource://cuigengji/${encodeURIComponent(sessionId)}`),
      revealConversation: () => ctx.layout.selectPanel(null),
      openWorkspace: (id:string,beforeOpen:()=>void) => ctx.uiWorkspace.openWorkspace(id,beforeOpen),
      openLibrary:ctx.workspaces.create ? (beforeOpen:()=>void)=>openWritingLibrary((action,args)=>rpc(action,args as Record<string,unknown>),input=>ctx.workspaces.create(input),(id,before)=>ctx.uiWorkspace.openWorkspace(id,before),beforeOpen) : undefined,
    }),
  }, Launcher));
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: ID,
  }, (props:any) => <WorkbenchBoundary key={props.sessionId}><WorkbenchTab {...props} locale={ctx.locale} rpc={rpc} recordsNavigation={recordsNavigation}/></WorkbenchBoundary>));
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: `${PET_ID}-overlay`, order: 45,
    inject: () => ({
      // mounted is the public on-screen session even with the sidebar closed.
      // retainedBy.mainView is a lifetime count, not the selected conversation.
      hooks: { mounted: ctx.sidebarRight.mounted },
      rpc, statusSource: ctx.uiSession?.sessionStatus,
      openConversation:(id:string)=>{ctx.uiWorkspace.openSession(id);ctx.layout.selectPanel(null);},
      openPet: () => {
        const sessionId = ctx.sidebarRight.mounted.getSnapshot();
        if (sessionId) {
          recordsNavigation.request(sessionId);
          ctx.sidebarRight.openResource(`dsh-resource://cuigengji/${encodeURIComponent(sessionId)}`);
        }
      },
    }),
  }, (props:any) => <PetBoundary><PetOverlay useMounted={props.useMounted} openPet={props.openPet} openConversation={props.openConversation} rpc={props.rpc} statusSource={props.statusSource}/></PetBoundary>));
}

function WorkbenchTab(props:any) {
  const tab = props.useTabInfo();
  const address = tab.tab.navigation.address;
  const sessionId = decodeURIComponent(address.slice(address.lastIndexOf('/') + 1));
  return <LocaleContext.Provider value={props.locale}><SurfaceActivity.Provider value={tab.tab.visible!==false}><WorkbenchRoot key={sessionId} sessionId={sessionId} rpc={props.rpc} recordsNavigation={props.recordsNavigation}/></SurfaceActivity.Provider></LocaleContext.Provider>;
}
