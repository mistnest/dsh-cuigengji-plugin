/** Legacy writer associations become ordinary per-session book preferences.
 * This is intentionally independent of DSH's parent/child execution model. */
export function ordinaryBindings<T extends Record<string,any>>(bindings:T):T {
  return Object.fromEntries(Object.entries(bindings).map(([key,value])=>{
    const {parentSessionId,taskId,...binding}=value;
    const target=binding.activeNovelId||binding.novelId;
    return [key,{...binding,scope:'library',activeNovelId:target,novelId:target}];
  })) as T;
}
