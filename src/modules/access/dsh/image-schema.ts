export const imageArgsProperties={
  kind:{type:'string',enum:['memory','planning'],description:'配图所属卡片类别；只在作者要求操作图片时使用 image.*'},
  imageId:{type:'string',description:'image.read/delete 的图片 ID，先 image.list；普通写作不需读图'},
  coverId:{type:'string',description:'image.update 设置封面，来自 image.list 的图片 ID'},
  replaceImageId:{type:'string',description:'image.import 更换现有配图，可选；此时 files 只能一项'},
  files:{type:'array',description:'image.import 的图片；单图不超过 12 MB，PNG/JPEG/WebP/GIF。data 与 filePath 二选一，导入会复制到作品内',items:{type:'object',additionalProperties:false,properties:{name:{type:'string'},data:{type:'string',description:'图片的 base64 编码'},filePath:{type:'string',description:'已经取得的本地图片绝对路径，不接受 URL'}}}},
};
export const imageArgsSchema={type:'object',additionalProperties:true,properties:{...imageArgsProperties,novelId:{type:'string'},nodeId:{type:'string'},expectedRevision:{type:'integer',description:'image.list 返回的配图独立版本，尚无配图为 0；不是正文/设定版本'},requestId:{type:'string'}}};
export const imageActionDescription=(action: string)=>`${action}：卡片展示配图的按需接口。kind 为 memory/planning，nodeId 是已有卡片；不自动注入图片，不作为写作前置检查。image.list 只列图片信息；image.read 明确读取一张图；image.import 复制图片到作品，image.update 设置 coverId，image.delete 移除 imageId。修改须使用配图自身的 expectedRevision 和 requestId。`;
export async function prepareImageToolResult(ctx: {get?(service: 'attachments'): {saveImage?(input: {data: Buffer; mediaType: string; name: string}): Promise<unknown>} | undefined}, result: unknown){
  if (!result || typeof result !== 'object' || !('format' in result) || result.format !== 'cuigengji-image') return result;
  if (!('data' in result) || typeof result.data !== 'string' || !('mimeType' in result) || typeof result.mimeType !== 'string' || !('name' in result) || typeof result.name !== 'string') throw new Error('图片工具返回的数据不完整');
  const attachments=ctx.get?.('attachments');
  if(!attachments?.saveImage)throw Object.assign(new Error('当前 DSH 未提供图片读取接口，可将图片发到聊天框；作品配图仍可在面板查看'),{code:'HOST_IMAGE_UNAVAILABLE'});
  const {data,...metadata}=result;
  const attachment=await attachments.saveImage({data:Buffer.from(data,'base64'),mediaType:result.mimeType,name:result.name});
  return {...metadata,attachment};
}
export function renderImageToolResult(value: string){
  const result=JSON.parse(value);
  if(result?.format!=='cuigengji-image'||!result.attachment)return [{type:'text' as const,text:value}];
  const {attachment,...metadata}=result;
  return [{type:'text' as const,text:JSON.stringify(metadata)},{type:'image' as const,attachment}];
}
