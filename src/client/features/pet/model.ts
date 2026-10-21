export type PetRole = 'bigfish' | 'cuigengji';
export type PetMood = 'idle' | 'thinking' | 'writing' | 'waiting' | 'celebrate' | 'sleepy' | 'reacting' | 'error';
export type PetRPC = (action: string, args: Record<string, unknown>, sessionId?: string) => Promise<any>;
export interface ActivityStats {
  proseAdded: number; settingAdded: number; planningChanges: number; conversationInput:number;
  chaptersTouched: number; settingsTouched: number;
  byActor?: Record<'human' | 'agent', Omit<ActivityStats, 'byActor'>>;
}
export interface ActivityResult {
  date: string; novelId: string | null; title: string | null; stats: ActivityStats;
  novels?: { novelId: string; title: string; stats: ActivityStats }[];
}
export interface PetSessionStatus { running?: boolean; pendingInteraction?: { kind: string } | null }
export interface RecordNovel {
  novelId:string;title:string;archived?:boolean;removed?:boolean;stats:ActivityStats;
}
export interface WritingRecordResult {
  from:string;to:string;novelId:string|null;title:string|null;stats:ActivityStats;
  novels:RecordNovel[];daily:{date:string;stats:ActivityStats;novels:RecordNovel[]}[];activeDays:number;
}
export interface PetStatusSource {
  getSnapshot: () => ReadonlyMap<string, PetSessionStatus>;
  subscribe: (callback: () => void) => () => void;
}
export const roles: Record<PetRole, { name: string; hint: string }> = {
  bigfish: { name: '大肥鱼', hint: '和你一起把故事写下去' },
  cuigengji: { name: '催更姬', hint: '陪你守住今天的写作节奏' },
};
export const moodLabels: Record<PetMood, string> = {
  idle: '安静陪着你', thinking: '正在读取今日进度', writing: 'AI 正在工作', waiting: 'AI 正在等你回应',
  celebrate: '又有新进展啦', sleepy: '夜深了，慢慢来', reacting: '收到你的招呼', error: '统计暂时未连接',
};
export const emptyStats: ActivityStats = Object.freeze({ proseAdded: 0, settingAdded: 0, planningChanges: 0, conversationInput:0, chaptersTouched: 0, settingsTouched: 0 });
export const formatCount = (value: number | undefined) => Math.max(0, Number(value) || 0).toLocaleString('zh-CN');
export function dateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${Number(match[2])}月${Number(match[3])}日` : '今天';
}
export function petMessage(role: PetRole, mood: PetMood, stats: ActivityStats, hasSession: boolean): string {
  if (!hasSession) return '我在这儿。打开一个对话，就能一起看看今天的写作进度。';
  if (mood === 'reacting') return role === 'bigfish' ? '收到！我在旁边给你鼓劲。' : '在呢，陪你把下一段故事写好。';
  if (mood === 'error') return '暂时读不到进度，可以稍后重试。已经保存的作品不受影响。';
  if (mood === 'thinking') return '让我看看今天已经写下了多少故事。';
  if (mood === 'waiting') return 'AI 有一步需要你回应，看看对话里有没有待确认的消息吧。';
  if (mood === 'writing') return 'AI 正在处理当前对话，我陪你一起等它。';
  if (mood === 'celebrate') return '刚刚又保存了一点新进展，给你一颗小星星！';
  if (mood === 'sleepy') return '夜深了，记下这个念头，明天也能接着写。';
  if (stats.proseAdded) return `今天已写下 ${formatCount(stats.proseAdded)} 字正文，一点点把故事变完整。`;
  if (stats.settingAdded || stats.planningChanges) return '人物和情节在慢慢变清楚，构思也算进展。';
  return role === 'bigfish' ? '从一句开始也很好，我在这里陪着你。' : '今天想先写一段，还是聊聊接下来的情节？';
}
