import { createHash, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, basename } from "node:path";
import { IMAGE_MAX_BYTES, imageGalleryKey, galleryIndex } from "./image-types.js";
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function decode(data, max = IMAGE_MAX_BYTES) {
  if (typeof data !== "string" || data.length > Math.ceil(max / 3) * 4 + 128) fail("INVALID_IMAGE", "\u56FE\u7247\u987B\u4E3A 12 MB \u4EE5\u5185\u7684 PNG\u3001JPEG\u3001WebP \u6216 GIF");
  const base64 = data.replace(/^data:image\/(?:png|jpeg|webp|gif);base64,/, "");
  if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0) fail("INVALID_IMAGE", "\u56FE\u7247\u7F16\u7801\u65E0\u6548");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > max || bytes.toString("base64") !== base64) fail("INVALID_IMAGE", "\u56FE\u7247\u7F16\u7801\u6216\u5927\u5C0F\u65E0\u6548");
  return bytes;
}
function identify(bytes) {
  if (bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString("ascii", 12, 16) === "IHDR") return { mimeType: "image/png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes.length >= 13 && /^GIF8[79]a$/.test(bytes.toString("ascii", 0, 6))) return { mimeType: "image/gif", width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (bytes.length >= 30 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    const type = bytes.toString("ascii", 12, 16);
    if (type === "VP8X") return { mimeType: "image/webp", width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (type === "VP8 " && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return { mimeType: "image/webp", width: bytes.readUInt16LE(26) & 16383, height: bytes.readUInt16LE(28) & 16383 };
    if (type === "VP8L" && bytes[20] === 47) {
      const bits = bytes.readUInt32LE(21);
      return { mimeType: "image/webp", width: (bits & 16383) + 1, height: (bits >>> 14 & 16383) + 1 };
    }
  }
  if (bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216) {
    for (let offset = 2; offset + 8 < bytes.length; ) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) return { mimeType: "image/jpeg", height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
      offset += length;
    }
  }
  return fail("INVALID_IMAGE", "\u65E0\u6CD5\u8BC6\u522B\u56FE\u7247\uFF0C\u8BF7\u4F7F\u7528 PNG\u3001JPEG\u3001WebP \u6216 GIF");
}
function checkedBytes(data, max = IMAGE_MAX_BYTES) {
  const bytes = decode(data, max), info = identify(bytes);
  if (!info.width || !info.height || info.width * info.height > 1e8) fail("INVALID_IMAGE", "\u56FE\u7247\u5C3A\u5BF8\u8FC7\u5927\u6216\u65E0\u6548");
  return { bytes, ...info };
}
function validateCardImages(novel) {
  if (novel.cardImages === void 0) return;
  if (!object(novel.cardImages)) fail("INVALID_IMAGE", "\u5361\u7247\u914D\u56FE\u6570\u636E\u65E0\u6548");
  for (const [key, gallery] of Object.entries(novel.cardImages)) {
    const match = /^(memory|planning):(.+)$/.exec(key), owners = match && (match[1] === "memory" ? novel.nodes : novel.planning?.nodes), owner = match && owners && Object.hasOwn(owners, match[2]) && owners[match[2]];
    if (!owner || !object(gallery) || !Number.isSafeInteger(gallery.revision) || gallery.revision < 1 || !Array.isArray(gallery.images) || gallery.images.length > 100 || new Set(gallery.images.map((image) => image?.id)).size !== gallery.images.length || !(gallery.coverId === null && !gallery.images.length || gallery.images.some((image) => image?.id === gallery.coverId))) fail("INVALID_IMAGE", "\u5361\u7247\u914D\u56FE\u5F52\u5C5E\u6216\u7248\u672C\u65E0\u6548");
    for (const image of gallery.images) {
      if (!object(image) || typeof image.id !== "string" || typeof image.name !== "string" || image.name.length > 240) fail("INVALID_IMAGE", "\u914D\u56FE\u4FE1\u606F\u65E0\u6548");
      const info = checkedBytes(image.data);
      if (image.mimeType !== info.mimeType || image.bytes !== info.bytes.length || image.sha256 !== hash(info.bytes) || image.width !== info.width || image.height !== info.height) fail("INVALID_IMAGE", "\u914D\u56FE\u5185\u5BB9\u4E0E\u6821\u9A8C\u4FE1\u606F\u4E0D\u4E00\u81F4");
      if (image.thumbnail) {
        const thumb = checkedBytes(image.thumbnail.data, 192 * 1024);
        if (thumb.mimeType !== image.thumbnail.mimeType) fail("INVALID_IMAGE", "\u914D\u56FE\u7F29\u7565\u56FE\u65E0\u6548");
      }
    }
  }
}
async function cardImageAction(novel, action, args, actor) {
  if (!["image.list", "image.read", "image.import", "image.update", "image.delete"].includes(action)) fail("UNKNOWN_ACTION", "\u672A\u77E5\u914D\u56FE\u64CD\u4F5C");
  if (args.kind !== void 0 && !["memory", "planning"].includes(args.kind)) fail("INVALID_INPUT", "kind \u987B\u4E3A memory \u6216 planning");
  if (action === "image.list") {
    const galleries = Object.fromEntries(Object.entries(novel.cardImages || {}).filter(([key2]) => (!args.kind || key2.startsWith(args.kind + ":")) && (!args.nodeId || key2.slice(key2.indexOf(":") + 1) === args.nodeId)).map(([key2, gallery2]) => [key2, galleryIndex(gallery2, actor.kind === "human" && args.includeThumbnails === true)]));
    return { galleries };
  }
  if (!args.kind || typeof args.nodeId !== "string") fail("INVALID_INPUT", "\u8BF7\u63D0\u4F9B kind \u548C nodeId");
  const owners = args.kind === "memory" ? novel.nodes : novel.planning?.nodes;
  const owner = owners && Object.hasOwn(owners, args.nodeId) && owners[args.nodeId];
  if (!owner || owner.deleted) fail("NOT_FOUND", "\u914D\u56FE\u6240\u5C5E\u5361\u7247\u5DF2\u5220\u9664\u6216\u4E0D\u5B58\u5728");
  const key = imageGalleryKey(args.kind, args.nodeId), previous = novel.cardImages?.[key] || { revision: 0, coverId: null, images: [] };
  if (action === "image.read") {
    const image = previous.images.find((image2) => image2.id === args.imageId) ?? fail("NOT_FOUND", "\u914D\u56FE\u4E0D\u5B58\u5728");
    return { format: "cuigengji-image", id: image.id, name: image.name, mimeType: image.mimeType, data: image.data, width: image.width, height: image.height };
  }
  if (!Number.isSafeInteger(args.expectedRevision) || args.expectedRevision !== previous.revision) fail("CONFLICT", "\u914D\u56FE\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u914D\u56FE\u540E\u91CD\u8BD5");
  const gallery = structuredClone(previous);
  if (action === "image.import") {
    if (!Array.isArray(args.files) || !args.files.length || args.files.length > 12) fail("INVALID_INPUT", "\u4E00\u6B21\u8BF7\u9009\u62E9 1\u201312 \u5F20\u56FE\u7247");
    if (args.replaceImageId && (!gallery.images.some((image) => image.id === args.replaceImageId) || args.files.length !== 1)) fail("INVALID_INPUT", "\u66F4\u6362\u56FE\u7247\u987B\u6307\u5B9A\u73B0\u6709\u56FE\u7247\u4E14\u53EA\u9009\u62E9\u4E00\u5F20");
    if (!args.replaceImageId && gallery.images.length + args.files.length > 100) fail("INVALID_INPUT", "\u5355\u5F20\u5361\u7247\u6700\u591A\u4FDD\u5B58 100 \u5F20\u914D\u56FE");
    for (const input of args.files) {
      if (!object(input)) fail("INVALID_INPUT", "\u56FE\u7247\u53C2\u6570\u65E0\u6548");
      let data = input.data, name = input.name;
      if (input.filePath !== void 0) {
        if (actor.kind !== "agent" || typeof input.filePath !== "string" || !isAbsolute(input.filePath) || input.data !== void 0) fail("INVALID_INPUT", "\u672C\u5730\u56FE\u7247\u5BFC\u5165\u987B\u63D0\u4F9B\u7EDD\u5BF9 filePath\uFF0C\u4E0E data \u4E8C\u9009\u4E00");
        const file = await stat(input.filePath);
        if (!file.isFile() || file.size > IMAGE_MAX_BYTES) fail("INVALID_IMAGE", "\u672C\u5730\u56FE\u7247\u987B\u4E3A 12 MB \u4EE5\u5185\u7684\u6587\u4EF6");
        data = (await readFile(input.filePath)).toString("base64");
        name ??= basename(input.filePath);
      }
      if (typeof name !== "string" || !name.trim() || name.length > 240) fail("INVALID_INPUT", "\u8BF7\u63D0\u4F9B\u56FE\u7247\u540D\u79F0\uFF08\u6700\u591A 240 \u5B57\u7B26\uFF09");
      const info = checkedBytes(data);
      const image = { id: randomUUID(), name, mimeType: info.mimeType, bytes: info.bytes.length, sha256: hash(info.bytes), width: info.width, height: info.height, createdAt: (/* @__PURE__ */ new Date()).toISOString(), data: info.bytes.toString("base64") };
      if (input.thumbnail) {
        const thumbnail = checkedBytes(input.thumbnail.data, 192 * 1024);
        image.thumbnail = { mimeType: thumbnail.mimeType, data: thumbnail.bytes.toString("base64") };
      }
      if (args.replaceImageId) {
        gallery.images = gallery.images.map((old) => old.id === args.replaceImageId ? image : old);
        if (gallery.coverId === args.replaceImageId) gallery.coverId = image.id;
      } else {
        gallery.images.push(image);
        gallery.coverId ??= image.id;
      }
    }
  } else if (action === "image.update") {
    if (typeof args.coverId !== "string" || !gallery.images.some((image) => image.id === args.coverId)) fail("NOT_FOUND", "\u5C01\u9762\u56FE\u7247\u4E0D\u5B58\u5728");
    if (gallery.coverId === args.coverId) return galleryIndex(gallery, actor.kind === "human");
    gallery.coverId = args.coverId;
  } else {
    if (!gallery.images.some((image) => image.id === args.imageId)) fail("NOT_FOUND", "\u914D\u56FE\u4E0D\u5B58\u5728");
    gallery.images = gallery.images.filter((image) => image.id !== args.imageId);
    if (gallery.coverId === args.imageId) gallery.coverId = gallery.images[0]?.id || null;
  }
  gallery.revision++;
  novel.cardImages ??= {};
  novel.cardImages[key] = gallery;
  novel.revision++;
  novel.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return galleryIndex(gallery, actor.kind === "human");
}
export {
  cardImageAction,
  validateCardImages
};
