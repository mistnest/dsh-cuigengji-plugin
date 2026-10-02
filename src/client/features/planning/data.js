// Keep a paginated overview on one board revision, without retrying forever during edits.
export async function readPlanningSnapshot(call,novelId,scope={}) {
 let offset=0,items=[],result,sequence;
 do {
  result=await call('planning.list',{novelId,...scope,offset,limit:200});
  if(sequence!==undefined&&result.sequence!==sequence)throw new Error('读取期间规划已更新，请重试。已有画布和草稿仍保留。');
  sequence=result.sequence;items.push(...result.items);offset=result.nextOffset;
 } while(offset!==null);
 return {...result,items};
}

export async function readDecorations(call,novelId,pageId){
 let offset=0,items=[],sequence;
 do{const result=await call('planning.decorations',{novelId,pageId,offset,limit:200});if(sequence!==undefined&&sequence!==result.sequence)throw new Error('读取期间批注已更新，请重试');sequence=result.sequence;items.push(...result.items);offset=result.nextOffset;}while(offset!==null);
 return items;
}
