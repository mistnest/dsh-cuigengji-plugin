import {createHandoff} from '../queries/handoff.ts';
import {pagination,type Row} from '../queries/common.ts';
export function workspaceQuery(state:Row,novel:Row|undefined,action:string,args:Row,novelIds?:readonly string[]|null){
  if(action==='novel.list'){
    const visible=novelIds?new Set(novelIds):null;
    const matches=Object.values(state.novels).filter((book:any)=>!book.archived && (!visible||visible.has(book.id)) && (!args.query||`${book.title}\n${book.description||''}`.toLowerCase().includes(args.query.toLowerCase())));
    return pagination(matches.map((book:any)=>Object.fromEntries(['id','title','description','revision','updatedAt'].filter(key=>book[key]!==undefined).map(key=>[key,book[key]]))),args);
  }
  if(action==='novel.handoff')return createHandoff(novel!,null,args);
  const book=novel!;
  return {...Object.fromEntries(['id','title','description','revision','createdAt','updatedAt'].filter(key=>book[key]!==undefined).map(key=>[key,book[key]])),counts:{chapters:Object.values(book.chapters).filter((value:any)=>!value.deleted).length,settings:Object.values(book.nodes).filter((value:any)=>!value.deleted).length,planning:Object.values(book.planning?.nodes||{}).filter((value:any)=>!value.deleted).length}};
}
