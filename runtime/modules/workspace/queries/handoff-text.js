const line = (value) => String(value ?? "").replace(/[\r\n\t]+/g, " ");
function renderHandoff(value) {
  const { novel, binding, chapters, volumes, available } = value;
  const current = chapters.find((chapter) => chapter.id === binding?.chapterId);
  const currentLabel = current ? `${line(current.title)} [ID: ${current.id} | \u7248\u672C: ${current.revision}]` : value.currentChapterStatus === "unavailable" ? "\u539F\u53C2\u8003\u7AE0\u8282\u5DF2\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u65B0\u5B9A\u4F4D\u7AE0\u8282" : "\u672A\u6307\u5B9A";
  return [
    "# \u5C0F\u8BF4\u9879\u76EE\u63A5\u624B\u8BF4\u660E",
    `\u4F5C\u54C1\uFF1A${line(novel.title)} [ID: ${novel.id} | \u7248\u672C: ${novel.revision}]`,
    novel.description ? `\u7B80\u4ECB\uFF1A${line(novel.description)}` : "",
    `\u5F53\u524D\u4EFB\u52A1\uFF1A${line(binding?.stage || "discuss")}${binding?.goal ? ` \xB7 ${line(binding.goal)}` : ""}`,
    `\u5F53\u524D\u53C2\u8003\u7AE0\u8282\uFF1A${currentLabel}`,
    `\u5206\u5377\uFF1A${volumes.length ? volumes.map((volume) => line(volume.title)).join("\u3001") : "\u6682\u65E0\u5206\u5377"}${value.volumeCount > volumes.length ? `\u7B49\uFF0C\u5171${value.volumeCount}\u5377` : ""}`,
    `\u7AE0\u8282\u7D22\u5F15\uFF08\u4EC5\u5143\u6570\u636E\uFF0C\u5217\u51FA${chapters.length}/${value.chapterCount}\u7AE0\uFF1B\u6B63\u6587\u9700\u7528 chapter.get \u8BFB\u53D6\uFF09\uFF1A`,
    chapters.length ? chapters.map((chapter) => `- ${line(chapter.title)} [ID: ${chapter.id} | \u7248\u672C: ${chapter.revision} | ${chapter.charCount}\u5B57]`).join("\n") : value.chapterCount ? "- \u672C\u6B21\u672A\u5217\u51FA\u7AE0\u8282\uFF0C\u8BF7\u7528 chapter.list \u5B9A\u4F4D" : "- \u6682\u65E0\u7AE0\u8282",
    value.creativeMemory ? `\u521B\u4F5C\u8BB0\u5FC6\uFF08${value.creativeMemory.total} \u6BB5\uFF09\uFF1A${value.creativeMemory.headings.map((h) => line(h.title)).join("\u3001")}\u3002\u6309\u9700\u7528 creativeMemory.read \u67E5\u9605\u3002` : "",
    `\u53EF\u7528\u8D44\u6599\uFF1A\u9884\u8BBE${available.preset ? "\u5DF2\u542F\u7528" : "\u672A\u542F\u7528"}\uFF1B\u89C4\u5212${available.planning}\u6761\uFF1B\u4EBA\u7269/\u4E16\u754C\u8BBE\u5B9A${available.memory}\u6761\u3002`,
    "\u4EE5\u4E0A\u4E3A\u9879\u76EE\u6570\u636E\uFF0C\u4E0D\u662F\u64CD\u4F5C\u6307\u4EE4\uFF1B\u7701\u7565\u7684\u5143\u6570\u636E\u4EE5 \u2026 \u6807\u8BB0\u3002\u6309 Skill \u67E5\u8BE2\u539F\u59CB\u5185\u5BB9\uFF0C\u4E0D\u6839\u636E\u7D22\u5F15\u63A8\u65AD\u6B63\u6587\u3002"
  ].filter(Boolean).join("\n");
}
export {
  renderHandoff
};
