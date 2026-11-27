function presetMarkdown(blocks = []) {
  return blocks.filter((block) => block.enabled && block.content?.trim()).map((block) => "## " + (block.name || block.identifier).replace(/[\r\n]+/g, " ") + "\n\n" + block.content).join("\n\n");
}
export {
  presetMarkdown
};
