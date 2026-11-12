import {useState} from 'react';

export interface SearchExpansion {expanded:(id:string)=>boolean;toggle:(id:string)=>void}
interface ExpansionState {
  query:string;event:number;normalCollapse:number;
  defaultCollapsed:boolean;overrides:Record<string,boolean>;
}

/** Search folds are temporary, including folds of children unmounted by a parent. */
export function useDirectorySearchExpansion(query:string,collapseKey:number,normalCollapse=0) {
  const [state,setState]=useState<ExpansionState>({query,event:collapseKey,normalCollapse,defaultCollapsed:false,overrides:{}});
  if(state.query!==query)setState({...state,query,event:collapseKey,defaultCollapsed:false,overrides:{}});
  else if(state.event!==collapseKey)setState({...state,event:collapseKey,...(query?{defaultCollapsed:true,overrides:{}}:{normalCollapse:collapseKey})});
  const searchExpansion:SearchExpansion|undefined=query?{
    expanded:id=>!(state.overrides[id]??state.defaultCollapsed),
    toggle:id=>setState(previous=>({...previous,overrides:{...previous.overrides,[id]:!(previous.overrides[id]??previous.defaultCollapsed)}})),
  }:undefined;
  return {searchExpansion,normalCollapse:state.normalCollapse};
}
