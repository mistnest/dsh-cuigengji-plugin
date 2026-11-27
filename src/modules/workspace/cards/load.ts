import {imageGalleryKey} from './image-types.ts';
import type {BookReads, Row} from '../operations/record-reader.ts';

type ImageReads = Pick<BookReads, 'memoryIndex' | 'board' | 'imageIndex' | 'imageGallery'>;

export async function loadCardImages(action: string, args: Row, read: ImageReads) {
  await read.memoryIndex();
  await read.board();
  await read.imageIndex();
  if (action !== 'image.list' && ['memory', 'planning'].includes(args.kind) && typeof args.nodeId === 'string') {
    await read.imageGallery(imageGalleryKey(args.kind, args.nodeId));
  }
}

export async function loadCanvasImages(action: string, args: Row, read: Pick<ImageReads, 'imageIndex' | 'imageGallery'>) {
  if (['planning.layout', 'planning.layout.get', 'graph.arrange', 'graph.layout.get'].includes(action)) {
    await read.imageIndex();
  }
  if (action === 'graph.duplicate') {
    await read.imageIndex();
    for (const member of Array.isArray(args.members) ? args.members : []) {
      if (typeof member?.id === 'string') await read.imageGallery(imageGalleryKey('memory', member.id));
    }
  }
  if (action === 'planning.apply' && Array.isArray(args.imageCopies)) {
    await read.imageIndex();
    for (const copy of args.imageCopies) {
      if (typeof copy?.sourceId === 'string') await read.imageGallery(imageGalleryKey('planning', copy.sourceId));
    }
  }
}
