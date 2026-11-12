import {companionAsset} from './assets.ts';
// Original synthesized chimes; no downloaded game/audio assets are bundled.
function chime(notes:number[],duration=.26){
  const rate=22050,length=Math.ceil(rate*duration*notes.length),data=Buffer.alloc(44+length*2);
  data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(length*2,40);
  for(let i=0;i<length;i++){const t=i/rate,index=Math.min(notes.length-1,Math.floor(t/duration)),local=t-index*duration,envelope=Math.min(1,local/.012)*Math.exp(-local*15);data.writeInt16LE(Math.round(Math.sin(2*Math.PI*notes[index]*local)*envelope*8000),44+i*2);}
  return data;
}
export const builtinUsageAssets=[['轻轻一点',[660]],['写完一段',[523.25,659.25,783.99]],['等你回答',[659.25,523.25]],['温柔提醒',[440,554.37]]].map(([name,notes])=>{
  const data=chime(notes as number[]),value=companionAsset({name,kind:'audio',mime:'audio/wav',data:data.toString('base64'),group:'内置轻提示'});
  return {...value,asset:{...value.asset,builtin:true}};
});
