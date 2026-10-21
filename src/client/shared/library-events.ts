const eventName = 'cuigengji:library-changed';
const channelName = 'cuigengji:library';
const switchEvent='cuigengji:library-switched';
export function notifyLibrarySwitched(root:string){
  window.dispatchEvent(new CustomEvent(switchEvent,{detail:root}));
  if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel(channelName);channel.postMessage({type:'switched',root});channel.close();}
  notifyLibraryChanged();
}
export function subscribeLibrarySwitches(update:(root:string)=>void){
  const listener=(event:Event)=>update((event as CustomEvent<string>).detail);
  window.addEventListener(switchEvent,listener);
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(channelName):null;
  if(channel)channel.onmessage=event=>{if(event.data?.type==='switched'&&typeof event.data.root==='string')update(event.data.root);};
  return()=>{window.removeEventListener(switchEvent,listener);channel?.close();};
}

/** Refresh other mounted session panels without putting novel data in the bus. */
export function notifyLibraryChanged() {
  window.dispatchEvent(new Event(eventName));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage('changed'); channel.close();
  }
}

export function subscribeLibraryChanges(refresh: () => void) {
  window.addEventListener(eventName, refresh);
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : null;
  if (channel) channel.onmessage = refresh;
  return () => {window.removeEventListener(eventName, refresh); channel?.close();};
}
