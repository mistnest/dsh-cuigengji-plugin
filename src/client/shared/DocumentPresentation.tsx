import React from 'react';
export function DocumentHeading({title,kind,group,updatedAt,revision,summary}:{title:string;kind:string;group?:string;updatedAt?:string;revision?:number;summary?:string}) {
  return <header className="document-heading"><div className="document-eyebrow"><span>{kind}</span>{group&&<><i/><span>{group}</span></>}</div><h2>{title}</h2>{summary&&<p className="document-summary">{summary}</p>}<div className="document-meta">{revision!==undefined&&<span>v{revision}</span>}{updatedAt&&<time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} 更新</time>}</div></header>;
}
/** Render the common Markdown structure without HTML, remote images or executable links. */
export function DocumentBody({text,empty='尚未填写详细内容'}:{text:string;empty?:string}) {
  if(!text)return <article className="document-body document-empty">{empty}</article>;
  if(!/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s)/m.test(text))return <article className="document-body">{text}</article>;
  const blocks:React.ReactNode[]=[];const lines=text.replace(/\r/g,'').split('\n');let paragraph:string[]=[];
  const flush=()=>{if(paragraph.length){blocks.push(<p key={blocks.length}>{paragraph.join('\n')}</p>);paragraph=[];}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i],heading=/^(#{1,6})\s+(.+)$/.exec(line),list=/^\s*(?:[-*]|\d+\.)\s+/.test(line);
    if(heading){flush();blocks.push(<h3 key={blocks.length}>{heading[2]}</h3>);}
    else if(list){flush();const ordered=/^\s*\d+\./.test(line),items:string[]=[];while(i<lines.length&&(/^\s*\d+\.\s+/.test(lines[i])===ordered)&&/^\s*(?:[-*]|\d+\.)\s+/.test(lines[i]))items.push(lines[i++].replace(/^\s*(?:[-*]|\d+\.)\s+/,''));i--;const Tag=ordered?'ol':'ul';blocks.push(<Tag key={blocks.length}>{items.map((s,j)=><li key={j}>{s}</li>)}</Tag>);}
    else if(/^>\s/.test(line)){flush();blocks.push(<blockquote key={blocks.length}>{line.replace(/^>\s/,'')}</blockquote>);}
    else if(!line.trim())flush();else paragraph.push(line);
  }
  flush();return <article className="document-body document-prose">{blocks}</article>;
}
