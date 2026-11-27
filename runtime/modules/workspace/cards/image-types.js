const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
const IMAGE_CARD_HEIGHT = 280;
const imageGalleryKey = (kind, nodeId) => `${kind}:${nodeId}`;
const imageCardSize = (galleries, kind, id) => galleries?.[imageGalleryKey(kind, id)]?.images.length ? { height: IMAGE_CARD_HEIGHT } : {};
function galleryIndex(gallery, thumbnails = true) {
  return { ...gallery, images: gallery.images.map(({ data, thumbnail, ...metadata }) => ({ ...metadata, ...thumbnails && thumbnail ? { thumbnail } : {} })) };
}
export {
  IMAGE_CARD_HEIGHT,
  IMAGE_MAX_BYTES,
  galleryIndex,
  imageCardSize,
  imageGalleryKey
};
