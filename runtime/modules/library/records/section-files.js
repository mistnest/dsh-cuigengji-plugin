const sectionPaths = {
  edges: "settings/relations.json",
  memoryGroups: "settings/groups.json",
  variables: "variables.json",
  preset: "preset.json",
  plan: "planning/legacy.json",
  tavernSources: "imports/originals.json",
  collaboration: "collaboration.json",
  collaborationProgress: "collaboration-progress.json"
};
const sectionFiles = Object.entries(sectionPaths);
const creativeMemoryFile = "memory.md";
export {
  creativeMemoryFile,
  sectionFiles,
  sectionPaths
};
