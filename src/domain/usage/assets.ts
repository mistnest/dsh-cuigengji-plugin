import {createHash} from 'node:crypto';
import {usageError} from './settings.ts';
const hash=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
export function companionAsset(input:Record<string,any>){
  const mime=input.mime==='audio/x-wav'?'audio/wav':input.mime;
  const extensions:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','audio/wav':'wav','audio/mpeg':'mp3'};
  if(!extensions[mime]||!['image','audio','role'].includes(input.kind)||!mime.startsWith(input.kind==='audio'?'audio/':'image/'))usageError('桌面共用素材支持 PNG/JPEG/GIF、WAV/MP3；WebP 和其他音频请通过素材页转换');
  if(typeof input.data!=='string'||input.data.length>20*1024*1024||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.data)||typeof input.name!=='string'||!input.name.trim())usageError('素材名称为空、编码无效或文件超过 15 MB');
  const data=Buffer.from(input.data,'base64');
  const valid=mime==='image/png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?data[0]===255&&data[1]===216&&data[2]===255:mime==='image/gif'?['GIF87a','GIF89a'].includes(data.subarray(0,6).toString()):mime==='audio/wav'?data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WAVE':data.subarray(0,3).toString()==='ID3'||data[0]===255&&(data[1]&224)===224;
  if(!valid)usageError('文件内容与声明的图片 / 音频格式不符');
  const digest=hash(data),group=typeof input.group==='string'?input.group.slice(0,80):undefined,id=hash(input.kind+':'+(group||'')+':'+digest);
  // Multiple uses/groups can share file bytes without overwriting each other's metadata.
  const asset={id,digest,file:digest+'.'+extensions[mime],name:input.name.slice(0,120),kind:input.kind,mime,size:data.length,group};
  if(input.id&&input.id!==digest&&input.id!==id)usageError('备份素材校验失败');
  if(input.id)asset.id=input.id;
  return {asset,data};
}
