const imageArgsProperties = {
  kind: { type: "string", enum: ["memory", "planning"], description: "\u914D\u56FE\u6240\u5C5E\u5361\u7247\u7C7B\u522B\uFF1B\u53EA\u5728\u4F5C\u8005\u8981\u6C42\u64CD\u4F5C\u56FE\u7247\u65F6\u4F7F\u7528 image.*" },
  imageId: { type: "string", description: "image.read/delete \u7684\u56FE\u7247 ID\uFF0C\u5148 image.list\uFF1B\u666E\u901A\u5199\u4F5C\u4E0D\u9700\u8BFB\u56FE" },
  coverId: { type: "string", description: "image.update \u8BBE\u7F6E\u5C01\u9762\uFF0C\u6765\u81EA image.list \u7684\u56FE\u7247 ID" },
  replaceImageId: { type: "string", description: "image.import \u66F4\u6362\u73B0\u6709\u914D\u56FE\uFF0C\u53EF\u9009\uFF1B\u6B64\u65F6 files \u53EA\u80FD\u4E00\u9879" },
  files: { type: "array", description: "image.import \u7684\u56FE\u7247\uFF1B\u5355\u56FE\u4E0D\u8D85\u8FC7 12 MB\uFF0CPNG/JPEG/WebP/GIF\u3002data \u4E0E filePath \u4E8C\u9009\u4E00\uFF0C\u5BFC\u5165\u4F1A\u590D\u5236\u5230\u4F5C\u54C1\u5185", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, data: { type: "string", description: "\u56FE\u7247\u7684 base64 \u7F16\u7801" }, filePath: { type: "string", description: "\u5DF2\u7ECF\u53D6\u5F97\u7684\u672C\u5730\u56FE\u7247\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u4E0D\u63A5\u53D7 URL" } } } }
};
const imageArgsSchema = { type: "object", additionalProperties: true, properties: { ...imageArgsProperties, novelId: { type: "string" }, nodeId: { type: "string" }, expectedRevision: { type: "integer", description: "image.list \u8FD4\u56DE\u7684\u914D\u56FE\u72EC\u7ACB\u7248\u672C\uFF0C\u5C1A\u65E0\u914D\u56FE\u4E3A 0\uFF1B\u4E0D\u662F\u6B63\u6587/\u8BBE\u5B9A\u7248\u672C" }, requestId: { type: "string" } } };
const imageActionDescription = (action) => `${action}\uFF1A\u5361\u7247\u5C55\u793A\u914D\u56FE\u7684\u6309\u9700\u63A5\u53E3\u3002kind \u4E3A memory/planning\uFF0CnodeId \u662F\u5DF2\u6709\u5361\u7247\uFF1B\u4E0D\u81EA\u52A8\u6CE8\u5165\u56FE\u7247\uFF0C\u4E0D\u4F5C\u4E3A\u5199\u4F5C\u524D\u7F6E\u68C0\u67E5\u3002image.list \u53EA\u5217\u56FE\u7247\u4FE1\u606F\uFF1Bimage.read \u660E\u786E\u8BFB\u53D6\u4E00\u5F20\u56FE\uFF1Bimage.import \u590D\u5236\u56FE\u7247\u5230\u4F5C\u54C1\uFF0Cimage.update \u8BBE\u7F6E coverId\uFF0Cimage.delete \u79FB\u9664 imageId\u3002\u4FEE\u6539\u987B\u4F7F\u7528\u914D\u56FE\u81EA\u8EAB\u7684 expectedRevision \u548C requestId\u3002`;
async function prepareImageToolResult(ctx, result) {
  if (!result || typeof result !== "object" || !("format" in result) || result.format !== "cuigengji-image") return result;
  if (!("data" in result) || typeof result.data !== "string" || !("mimeType" in result) || typeof result.mimeType !== "string" || !("name" in result) || typeof result.name !== "string") throw new Error("\u56FE\u7247\u5DE5\u5177\u8FD4\u56DE\u7684\u6570\u636E\u4E0D\u5B8C\u6574");
  const attachments = ctx.get?.("attachments");
  if (!attachments?.saveImage) throw Object.assign(new Error("\u5F53\u524D DSH \u672A\u63D0\u4F9B\u56FE\u7247\u8BFB\u53D6\u63A5\u53E3\uFF0C\u53EF\u5C06\u56FE\u7247\u53D1\u5230\u804A\u5929\u6846\uFF1B\u4F5C\u54C1\u914D\u56FE\u4ECD\u53EF\u5728\u9762\u677F\u67E5\u770B"), { code: "HOST_IMAGE_UNAVAILABLE" });
  const { data, ...metadata } = result;
  const attachment = await attachments.saveImage({ data: Buffer.from(data, "base64"), mediaType: result.mimeType, name: result.name });
  return { ...metadata, attachment };
}
function renderImageToolResult(value) {
  const result = JSON.parse(value);
  if (result?.format !== "cuigengji-image" || !result.attachment) return [{ type: "text", text: value }];
  const { attachment, ...metadata } = result;
  return [{ type: "text", text: JSON.stringify(metadata) }, { type: "image", attachment }];
}
export {
  imageActionDescription,
  imageArgsProperties,
  imageArgsSchema,
  prepareImageToolResult,
  renderImageToolResult
};
