export type CardImageKind = 'memory' | 'planning';
export interface CardImage {
  id:string; name:string; mimeType:string; bytes:number; sha256:string;
  width:number; height:number; createdAt:string; data:string;
  thumbnail?:{data:string;mimeType:string};
}
export interface CardImageGallery {revision:number;coverId:string|null;images:CardImage[]}
export type CardImages = Record<string,CardImageGallery>;
export type CardImageSummary = Omit<CardImage,'data'|'thumbnail'> & {thumbnail?:CardImage['thumbnail']};
export interface CardGallerySummary {revision:number;coverId:string|null;images:CardImageSummary[]}
export const IMAGE_MAX_BYTES=12*1024*1024;
export const IMAGE_CARD_HEIGHT=280;
export const imageGalleryKey=(kind:CardImageKind,nodeId:string)=>`${kind}:${nodeId}`;
export const imageCardSize=(galleries:Record<string,{images:unknown[]}>|undefined,kind:CardImageKind,id:string)=>galleries?.[imageGalleryKey(kind,id)]?.images.length?{height:IMAGE_CARD_HEIGHT}:{};
export function galleryIndex(gallery:CardImageGallery,thumbnails=true):CardGallerySummary{return {...gallery,images:gallery.images.map(({data,thumbnail,...metadata})=>({...metadata,...(thumbnails&&thumbnail?{thumbnail}:{})}))};}
