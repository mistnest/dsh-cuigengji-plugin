import {orderedDirectory} from './order.ts';
import {chapterMetadata,current,checkReadRevision,pagination,queryFail,type Row} from '../queries/common.ts';
export function readChapter(novel:Row,args:Row,includeDeleted=false){
  const chapter=includeDeleted?(Object.hasOwn(novel.chapters,args.chapterId)?novel.chapters[args.chapterId]:queryFail('NOT_FOUND','章节不存在')):current(novel.chapters,args.chapterId,'章节');checkReadRevision(chapter,args);
  return {...chapterMetadata(chapter), ...contentWindow(chapter.content,args.start??0,args.maxChars??12000)};
}
export function contentWindow(content:string, offset=0, maxChars=12000) {
  let start=Math.min(offset,content.length),end=Math.min(content.length,start+maxChars);
  // Offsets use the same UTF-16 units as stored hashes and existing search.
  const split=(at:number)=>at>0&&at<content.length&&/^[\uDC00-\uDFFF]$/.test(content[at])&&/^[\uD800-\uDBFF]$/.test(content[at-1]);
  if(split(start))start--;if(split(end))end++;
  return {content:content.slice(start,end),start,end,nextStart:end<content.length?end:null,totalLength:content.length,offsetUnit:'utf16'};
}
export function manuscriptQuery(novel:Row,action:string,args:Row){
  if(action==='volume.list')return Object.values(novel.volumes).filter((v:any)=>!v.deleted).sort((a:any,b:any)=>a.order-b.order);
  if(action==='chapter.get')return readChapter(novel,args);
  const ordered=orderedDirectory(Object.values(novel.chapters) as any[],Object.values(novel.volumes) as any[]) as Row[];
  if(action==='chapter.list')return {...pagination(ordered.filter(chapter=>(args.volumeId===undefined||(chapter.volumeId??null)===args.volumeId)&&(!args.query||chapter.title.toLowerCase().includes(args.query.toLowerCase()))).map(chapterMetadata),args),novelRevision:novel.revision};
  const hits=[];
  for(const chapter of ordered){
    if(args.chapterId&&chapter.id!==args.chapterId)continue;
    let start=chapter.content.indexOf(args.query);
    while(start>=0){hits.push({chapterId:chapter.id,title:chapter.title,volumeId:chapter.volumeId,revision:chapter.revision,start,excerpt:chapter.content.slice(Math.max(0,start-80),start+args.query.length+120)});start=chapter.content.indexOf(args.query,start+args.query.length);}
  }
  return {...pagination(hits,args),offsetUnit:'utf16'};
}
