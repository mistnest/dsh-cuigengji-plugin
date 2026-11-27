export const memoryVersionFields = ['type','groupId','pageId','name','summary','content','storyTime','status','factType','sources','aliases','knownBy','dependsOn','deleted'];
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
type Version=Record<string,any> & {revision:number;content:string};
/** Summaries describe real differences; full text is returned only for one explicit revision. */
export function memoryHistory(versions:Version[],args:{revision?:number;includeContent?:boolean}) {
  return versions.flatMap((version,index)=>{
    if(args.revision!==undefined&&version.revision!==args.revision)return [];
    const previous=versions[index-1],changedFields=previous?memoryVersionFields.filter(key=>!same(version[key],previous[key])):[];
    const kind=!previous?'baseline':changedFields.some(key=>!['groupId','pageId'].includes(key))?'content':changedFields.length?'organization':'layout';
    const {content,...metadata}=version;
    return [{...metadata,previousRevision:previous?.revision??null,changedFields,kind,...(args.includeContent===true?{content}:{})}];
  });
}
