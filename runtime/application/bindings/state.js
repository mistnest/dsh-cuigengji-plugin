function ordinaryBindings(bindings) {
  return Object.fromEntries(Object.entries(bindings).map(([key, value]) => {
    const { parentSessionId, taskId, ...binding } = value;
    const target = binding.activeNovelId || binding.novelId;
    return [key, { ...binding, scope: "library", activeNovelId: target, novelId: target }];
  }));
}
export {
  ordinaryBindings
};
