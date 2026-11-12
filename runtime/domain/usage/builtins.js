import { companionAsset } from "./assets.js";
function chime(notes, duration = 0.26) {
  const rate = 22050, length = Math.ceil(rate * duration * notes.length), data = Buffer.alloc(44 + length * 2);
  data.write("RIFF");
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) {
    const t = i / rate, index = Math.min(notes.length - 1, Math.floor(t / duration)), local = t - index * duration, envelope = Math.min(1, local / 0.012) * Math.exp(-local * 15);
    data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * notes[index] * local) * envelope * 8e3), 44 + i * 2);
  }
  return data;
}
const builtinUsageAssets = [["\u8F7B\u8F7B\u4E00\u70B9", [660]], ["\u5199\u5B8C\u4E00\u6BB5", [523.25, 659.25, 783.99]], ["\u7B49\u4F60\u56DE\u7B54", [659.25, 523.25]], ["\u6E29\u67D4\u63D0\u9192", [440, 554.37]]].map(([name, notes]) => {
  const data = chime(notes), value = companionAsset({ name, kind: "audio", mime: "audio/wav", data: data.toString("base64"), group: "\u5185\u7F6E\u8F7B\u63D0\u793A" });
  return { ...value, asset: { ...value.asset, builtin: true } };
});
export {
  builtinUsageAssets
};
