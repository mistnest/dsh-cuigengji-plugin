/** Flatten only selected, nonempty entries in their authored order. */
export function presetMarkdown(blocks: readonly {name?:string;identifier:string;enabled:boolean;content:string}[] = []) {
  return blocks.filter(block => block.enabled && block.content?.trim())
    .map(block => '## ' + (block.name || block.identifier).replace(/[\r\n]+/g, ' ') + '\n\n' + block.content)
    .join('\n\n');
}
