import { createHash } from "node:crypto";
import { usageError } from "./settings.js";
const hash = (v) => createHash("sha256").update(v).digest("hex");
function companionAsset(input) {
  const mime = input.mime === "audio/x-wav" ? "audio/wav" : input.mime;
  const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "audio/wav": "wav", "audio/mpeg": "mp3" };
  if (!extensions[mime] || !["image", "audio", "role"].includes(input.kind) || !mime.startsWith(input.kind === "audio" ? "audio/" : "image/")) usageError("\u684C\u9762\u5171\u7528\u7D20\u6750\u652F\u6301 PNG/JPEG/GIF\u3001WAV/MP3\uFF1BWebP \u548C\u5176\u4ED6\u97F3\u9891\u8BF7\u901A\u8FC7\u7D20\u6750\u9875\u8F6C\u6362");
  if (typeof input.data !== "string" || input.data.length > 20 * 1024 * 1024 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.data) || typeof input.name !== "string" || !input.name.trim()) usageError("\u7D20\u6750\u540D\u79F0\u4E3A\u7A7A\u3001\u7F16\u7801\u65E0\u6548\u6216\u6587\u4EF6\u8D85\u8FC7 15 MB");
  const data = Buffer.from(input.data, "base64");
  const valid = mime === "image/png" ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : mime === "image/jpeg" ? data[0] === 255 && data[1] === 216 && data[2] === 255 : mime === "image/gif" ? ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString()) : mime === "audio/wav" ? data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WAVE" : data.subarray(0, 3).toString() === "ID3" || data[0] === 255 && (data[1] & 224) === 224;
  if (!valid) usageError("\u6587\u4EF6\u5185\u5BB9\u4E0E\u58F0\u660E\u7684\u56FE\u7247 / \u97F3\u9891\u683C\u5F0F\u4E0D\u7B26");
  const digest = hash(data), group = typeof input.group === "string" ? input.group.slice(0, 80) : void 0, id = hash(input.kind + ":" + (group || "") + ":" + digest);
  const asset = { id, digest, file: digest + "." + extensions[mime], name: input.name.slice(0, 120), kind: input.kind, mime, size: data.length, group };
  if (input.id && input.id !== digest && input.id !== id) usageError("\u5907\u4EFD\u7D20\u6750\u6821\u9A8C\u5931\u8D25");
  if (input.id) asset.id = input.id;
  return { asset, data };
}
export {
  companionAsset
};
