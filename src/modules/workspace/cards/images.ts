import {createHash,randomUUID} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {isAbsolute,basename} from 'node:path';
import {IMAGE_MAX_BYTES,imageGalleryKey,galleryIndex,type CardImage,type CardImageGallery} from './image-types.ts';

const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
function decode(data:unknown,max=IMAGE_MAX_BYTES):Buffer {
  if(typeof data!=='string'||data.length>Math.ceil(max/3)*4+128)fail('INVALID_IMAGE','图片须为 12 MB 以内的 PNG、JPEG、WebP 或 GIF');
  const base64=(data as string).replace(/^data:image\/(?:png|jpeg|webp|gif);base64,/, '');
  if(!base64||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)||base64.length%4!==0)fail('INVALID_IMAGE','图片编码无效');
  const bytes=Buffer.from(base64,'base64');
  if(bytes.length>max||bytes.toString('base64')!==base64)fail('INVALID_IMAGE','图片编码或大小无效');
  return bytes;
}
function identify(bytes:Buffer){
  if(bytes.length>=33&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.toString('ascii',12,16)==='IHDR')return {mimeType:'image/png',width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  if(bytes.length>=13&&/^GIF8[79]a$/.test(bytes.toString('ascii',0,6)))return {mimeType:'image/gif',width:bytes.readUInt16LE(6),height:bytes.readUInt16LE(8)};
  if(bytes.length>=30&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
    const type=bytes.toString('ascii',12,16);
    if(type==='VP8X')return {mimeType:'image/webp',width:1+bytes.readUIntLE(24,3),height:1+bytes.readUIntLE(27,3)};
    if(type==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return {mimeType:'image/webp',width:bytes.readUInt16LE(26)&16383,height:bytes.readUInt16LE(28)&16383};
    if(type==='VP8L'&&bytes[20]===47){const bits=bytes.readUInt32LE(21);return {mimeType:'image/webp',width:(bits&16383)+1,height:((bits>>>14)&16383)+1};}
  }
  if(bytes.length>4&&bytes[0]===255&&bytes[1]===216){
    for(let offset=2;offset+8<bytes.length;){
      if(bytes[offset++]!==255)break;while(bytes[offset]===255)offset++;
      const marker=bytes[offset++];if(marker===217||marker===218)break;
      const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)break;
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return {mimeType:'image/jpeg',height:bytes.readUInt16BE(offset+3),width:bytes.readUInt16BE(offset+5)};
      offset+=length;
    }
  }
  return fail('INVALID_IMAGE','无法识别图片，请使用 PNG、JPEG、WebP 或 GIF');
}
function checkedBytes(data:unknown,max=IMAGE_MAX_BYTES){const bytes=decode(data,max),info=identify(bytes);if(!info.width||!info.height||info.width*info.height>100_000_000)fail('INVALID_IMAGE','图片尺寸过大或无效');return {bytes,...info};}
export function validateCardImages(novel:any){
  if(novel.cardImages===undefined)return;
  if(!object(novel.cardImages))fail('INVALID_IMAGE','卡片配图数据无效');
  for(const [key,gallery] of Object.entries(novel.cardImages) as [string,CardImageGallery][]){
    const match=/^(memory|planning):(.+)$/.exec(key),owners=match&&(match[1]==='memory'?novel.nodes:novel.planning?.nodes),owner=match&&owners&&Object.hasOwn(owners,match[2])&&owners[match[2]];
    if(!owner||!object(gallery)||!Number.isSafeInteger(gallery.revision)||gallery.revision<1||!Array.isArray(gallery.images)||gallery.images.length>100||new Set(gallery.images.map(image=>image?.id)).size!==gallery.images.length||!(gallery.coverId===null&&!gallery.images.length||gallery.images.some(image=>image?.id===gallery.coverId)))fail('INVALID_IMAGE','卡片配图归属或版本无效');
    for(const image of gallery.images){
      if(!object(image)||typeof image.id!=='string'||typeof image.name!=='string'||image.name.length>240)fail('INVALID_IMAGE','配图信息无效');
      const info=checkedBytes(image.data);
      if(image.mimeType!==info.mimeType||image.bytes!==info.bytes.length||image.sha256!==hash(info.bytes)||image.width!==info.width||image.height!==info.height)fail('INVALID_IMAGE','配图内容与校验信息不一致');
      if(image.thumbnail){const thumb=checkedBytes(image.thumbnail.data,192*1024);if(thumb.mimeType!==image.thumbnail.mimeType)fail('INVALID_IMAGE','配图缩略图无效');}
    }
  }
}
export async function cardImageAction(novel:any,action:string,args:any,actor:any){
  if(!['image.list','image.read','image.import','image.update','image.delete'].includes(action))fail('UNKNOWN_ACTION','未知配图操作');
  if(args.kind!==undefined&&!['memory','planning'].includes(args.kind))fail('INVALID_INPUT','kind 须为 memory 或 planning');
  if(action==='image.list'){
    const galleries=Object.fromEntries(Object.entries(novel.cardImages||{}).filter(([key])=>(!args.kind||key.startsWith(args.kind+':'))&&(!args.nodeId||key.slice(key.indexOf(':')+1)===args.nodeId)).map(([key,gallery])=>[key,galleryIndex(gallery as CardImageGallery,actor.kind==='human'&&args.includeThumbnails===true)]));
    return {galleries};
  }
  if(!args.kind||typeof args.nodeId!=='string')fail('INVALID_INPUT','请提供 kind 和 nodeId');
  const owners=args.kind==='memory'?novel.nodes:novel.planning?.nodes;
  const owner=owners&&Object.hasOwn(owners,args.nodeId)&&owners[args.nodeId];
  if(!owner||owner.deleted)fail('NOT_FOUND','配图所属卡片已删除或不存在');
  const key=imageGalleryKey(args.kind,args.nodeId),previous:CardImageGallery=novel.cardImages?.[key]||{revision:0,coverId:null,images:[]};
  if(action==='image.read'){
    const image=previous.images.find(image=>image.id===args.imageId)??fail('NOT_FOUND','配图不存在');
    return {format:'cuigengji-image',id:image.id,name:image.name,mimeType:image.mimeType,data:image.data,width:image.width,height:image.height};
  }
  if(!Number.isSafeInteger(args.expectedRevision)||args.expectedRevision!==previous.revision)fail('CONFLICT','配图已变化，请刷新配图后重试');
  const gallery=structuredClone(previous);
  if(action==='image.import'){
    if(!Array.isArray(args.files)||!args.files.length||args.files.length>12)fail('INVALID_INPUT','一次请选择 1–12 张图片');
    if(args.replaceImageId&&(!gallery.images.some(image=>image.id===args.replaceImageId)||args.files.length!==1))fail('INVALID_INPUT','更换图片须指定现有图片且只选择一张');
    if(!args.replaceImageId&&gallery.images.length+args.files.length>100)fail('INVALID_INPUT','单张卡片最多保存 100 张配图');
    for(const input of args.files){
      if(!object(input))fail('INVALID_INPUT','图片参数无效');
      let data=input.data,name=input.name;
      if(input.filePath!==undefined){
        if(actor.kind!=='agent'||typeof input.filePath!=='string'||!isAbsolute(input.filePath)||input.data!==undefined)fail('INVALID_INPUT','本地图片导入须提供绝对 filePath，与 data 二选一');
        const file=await stat(input.filePath);if(!file.isFile()||file.size>IMAGE_MAX_BYTES)fail('INVALID_IMAGE','本地图片须为 12 MB 以内的文件');
        data=(await readFile(input.filePath)).toString('base64');name??=basename(input.filePath);
      }
      if(typeof name!=='string'||!name.trim()||name.length>240)fail('INVALID_INPUT','请提供图片名称（最多 240 字符）');
      const info=checkedBytes(data);
      const image:CardImage={id:randomUUID(),name,mimeType:info.mimeType,bytes:info.bytes.length,sha256:hash(info.bytes),width:info.width,height:info.height,createdAt:new Date().toISOString(),data:info.bytes.toString('base64')};
      if(input.thumbnail){const thumbnail=checkedBytes(input.thumbnail.data,192*1024);image.thumbnail={mimeType:thumbnail.mimeType,data:thumbnail.bytes.toString('base64')};}
      if(args.replaceImageId){gallery.images=gallery.images.map(old=>old.id===args.replaceImageId?image:old);if(gallery.coverId===args.replaceImageId)gallery.coverId=image.id;}
      else{gallery.images.push(image);gallery.coverId??=image.id;}
    }
  }else if(action==='image.update'){
    if(typeof args.coverId!=='string'||!gallery.images.some(image=>image.id===args.coverId))fail('NOT_FOUND','封面图片不存在');
    if(gallery.coverId===args.coverId)return galleryIndex(gallery,actor.kind==='human');
    gallery.coverId=args.coverId;
  }else{
    if(!gallery.images.some(image=>image.id===args.imageId))fail('NOT_FOUND','配图不存在');
    gallery.images=gallery.images.filter(image=>image.id!==args.imageId);if(gallery.coverId===args.imageId)gallery.coverId=gallery.images[0]?.id||null;
  }
  gallery.revision++;novel.cardImages??={};novel.cardImages[key]=gallery;
  novel.revision++;novel.updatedAt=new Date().toISOString();
  return galleryIndex(gallery,actor.kind==='human');
}
