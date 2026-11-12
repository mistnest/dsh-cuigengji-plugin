import type {BubbleModule} from '../../../contracts/usage.ts';
/** A module keeps its identity when joining/splitting lines. Validate before
 * returning so a rejected drop never leaves an item removed from the editor. */
export function moveBubbleModule(input:BubbleModule[][],fromRow:number,fromIndex:number,toRow:number,toIndex:number){
  const lines=input.map(line=>[...line]),module=lines[fromRow]?.[fromIndex];
  if(!module||toRow<0||toRow>lines.length)throw Error('拖动位置已变化，请重试');
  lines[fromRow].splice(fromIndex,1);
  if(toRow===lines.length)lines.push([]);
  if(fromRow===toRow&&fromIndex<toIndex)toIndex--;
  lines[toRow].splice(Math.max(0,toIndex),0,module);
  const result=lines.filter(line=>line.length);
  if(result.length>6||result.some(line=>line.length>6))throw Error('每个气泡最多六行，每行最多六个模块');
  if(result.some(line=>line.length>1&&line.some(m=>['image','randomImage'].includes(m.kind))))throw Error('图片模块需要独占一行');
  return result;
}
