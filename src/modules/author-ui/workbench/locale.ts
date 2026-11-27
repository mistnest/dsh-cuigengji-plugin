import { createContext, useContext, useSyncExternalStore } from 'react';

interface LocaleService {
  subscribe(fn: () => void): () => void;
  getSnapshot(): unknown;
  bind(namespace: string): (key: string) => string;
  register(namespace: string, messages: Record<string, Record<string,string>>): () => void;
}

export const LocaleContext = createContext<LocaleService | null>(null);
const zh: Record<string,string> = { title: '催更姬', open: '打开小说目录、正文和设定', chapters: '卷章正文', memory: '世界与人物', plan: '情节规划', context: '参考资料', manage: '小说管理', create: '新建小说', refresh: '刷新', choose: '选择本会话的小说', saving: '正在保存…', unbound: '绑定一本小说后，在 DSH 对话中讨论、写作和修改。不同会话可共同使用一本小说。', cancel: '取消', confirm: '确定' };
const en = { title: 'Cuigengji', open: 'Open novel, chapters and world settings', chapters: 'Chapters', memory: 'World & characters', plan: 'Plot plan', context: 'References', manage: 'Manage novel', create: 'New novel', refresh: 'Refresh', choose: 'Select a novel for this session', saving: 'Saving…', unbound: 'Bind a novel to discuss, write and revise it in DSH. Sessions can share a novel.', cancel: 'Cancel', confirm: 'Confirm' };
export function registerLocale(ctx: {effect(fn: () => () => void): unknown; locale: LocaleService}) {
  ctx.effect(() => ctx.locale.register('cuigengji', { zh, en }));
  return ctx.locale.bind('cuigengji');
}
const noopSubscribe = () => () => {};
const emptySnapshot = () => null;
export function useText() {
  const locale = useContext(LocaleContext);
  useSyncExternalStore(locale ? fn => locale.subscribe(fn) : noopSubscribe,
    locale ? () => locale.getSnapshot() : emptySnapshot);
  return locale ? locale.bind('cuigengji') : (key: string) => zh[key] || key;
}
