import type {StorySnapshot, StoryOperation, StoryState, StoryThread, StoryReview} from '../../../contracts/story.ts';
import type {FeatureCall} from '../../shared/workspace-state.ts';

export const stageNames = {idea:'构思', design:'设计', outline:'细纲', draft:'正文', review:'审稿', ready:'定稿'} as const;
export const threadKinds = {foreshadow:'伏笔', promise:'下章承诺', expectation:'长期期待', constraint:'设定约束'} as const;
export const toneKey = (label: string) => ({紧张:'tense',轻松:'light',悲伤:'sad',热血:'hot',爽:'satisfying',甜蜜:'sweet',温馨:'warm',惊悚:'horror',压抑:'oppressive'} as Record<string, string>)[label] || 'other';
export const threadStatuses = {open:'待推进', progressing:'推进中', resolved:'已兑现', retired:'已撤回'} as const;
export const severityNames = {blocking:'阻断', suggestion:'建议', note:'提示'} as const;
export const reviewStatuses = {open:'待处理', resolved:'已解决', dismissed:'已忽略'} as const;
export const categoryNames = {causality:'因果', character:'人物', continuity:'连续性', pacing:'节奏', prose:'表达', promise:'承诺兑现'} as const;
export const briefFields = {premise:'故事前提', readerPromise:'读者期待', protagonistGoal:'主角目标', coreConflict:'核心冲突', ending:'结局方向', style:'表达与文风'} as const;
export const stageGuidance: Record<StoryState['stage'], {long:string; short:string}> = {
  idea:{long:'先写清主角想要什么、面临什么阻碍，以及读者为什么愿意追下去。', short:'先确定一个核心矛盾、读者情绪与结局落点。'},
  design:{long:'核对主角动机、冲突升级和长期读者期待，再规划各章职责。', short:'把核心矛盾压到关键选择上，明确反转与情绪变化。'},
  outline:{long:'逐章安排意图、情节点和章尾钩子，计划仍是待写内容。', short:'围绕开场、升级、转折和收束安排篇幅，保留必需的情节。'},
  draft:{long:'在正文页写作；完成一章后记录已发生事实，并检查承诺是否到期。', short:'在正文页完成故事，再核对情绪、反转和结局是否落实。'},
  review:{long:'按正文证据记录因果、人物、连续性与承诺问题，优先处理阻断项。', short:'按证据检查动机、节奏、反转与表达，先解决影响成立的问题。'},
  ready:{long:'核对来源版本与未兑现事项，确认本轮章节可以交付。', short:'核对结局兑现、证据审稿与正文版本，确认成稿可以交付。'},
};
export const lines = (text:string) => text.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
export const asText = (value:readonly string[]|undefined) => (value||[]).join('\n');
export const chapterTitle = (snapshot:StorySnapshot,id?:string) => snapshot.chapters.find(chapter=>chapter.id===id)?.title || (id?'章节已移除':'未指定');
export function chapterProgress(snapshot:StorySnapshot,chapterId:string) {
  const chapter=snapshot.chapters.find(value=>value.id===chapterId);
  const tracking=snapshot.story.tracking[chapterId];
  return {outlined:!!snapshot.story.outlines[chapterId], tracked:!!tracking,
    stale:!!tracking&&(!chapter||tracking.chapterRevision!==chapter.revision),
    blocking:Object.values(snapshot.story.reviews).filter(review=>review.chapterId===chapterId&&review.status==='open'&&review.severity==='blocking').length};
}
export const isThreadStale = (snapshot:StorySnapshot,thread:StoryThread) => !!thread.sourceChapterId && thread.sourceRevision!==snapshot.chapters.find(chapter=>chapter.id===thread.sourceChapterId)?.revision;
export const isReviewStale = (snapshot:StorySnapshot,review:StoryReview) => review.chapterRevision!==snapshot.chapters.find(chapter=>chapter.id===review.chapterId)?.revision;
export function filterReviews(reviews:StoryReview[],filter:{severity:string;status:string;chapterId:string;staleOnly:boolean;category?:string},snapshot:StorySnapshot) {
  return reviews.filter(review=>(!filter.severity||review.severity===filter.severity)&&(!filter.status||review.status===filter.status)&&(!filter.chapterId||review.chapterId===filter.chapterId)&&(!filter.category||review.category===filter.category)&&(!filter.staleOnly||isReviewStale(snapshot,review)))
    .sort((a,b)=>({blocking:0,suggestion:1,note:2}[a.severity]-{blocking:0,suggestion:1,note:2}[b.severity]));
}
export interface ChapterBasis {chapterId:string; revision:number}
export interface StorySubmission {novelId:string;expectedRevision:number;requestId:string;operations:StoryOperation[]}
export class StoryConflict extends Error {code='CONFLICT';constructor(message:string){super(message);this.name='StoryConflict';}}
export function isConflict(error:unknown) {
  return (error as {code?:string})?.code==='CONFLICT'||/版本已变化|版本冲突|来源已变化|CONFLICT/.test(error instanceof Error?error.message:String(error));
}
/** Read-only preflight never rebases an author's evidence onto unseen prose. The Host repeats these checks atomically. */
export async function prepareSubmission(call:FeatureCall,novelId:string,expectedRevision:number,operations:StoryOperation[],sources:ChapterBasis[],isCurrent:()=>boolean,onSnapshot:(snapshot:StorySnapshot)=>void):Promise<StorySubmission|null> {
  if(!isCurrent())return null;
  const latest=await call('story.get',{novelId}) as StorySnapshot;
  if(!isCurrent())return null;
  if(latest.novelId!==novelId)throw new Error('返回的作品不一致，请刷新后重试。');
  onSnapshot(latest);
  if(latest.story.revision!==expectedRevision)throw new StoryConflict(`创作版本已变化（草稿依据 v${expectedRevision}，当前 v${latest.story.revision}）。草稿已保留，请核对最新内容后再保存。`);
  for(const source of sources){
    const chapter=latest.chapters.find(value=>value.id===source.chapterId);
    if(!chapter)throw new StoryConflict('来源章节已移除。草稿已保留，请重新选择章节。');
    if(chapter.revision!==source.revision)throw new StoryConflict(`《${chapter.title}》正文来源已变化（草稿依据 v${source.revision}，当前 v${chapter.revision}）。请阅读当前正文并核对草稿。`);
  }
  return {novelId,expectedRevision,requestId:crypto.randomUUID(),operations};
}
/** Exact receipt retries retain the request ID, CAS base and evidence versions. */
export async function sendSubmission(call:FeatureCall,submission:StorySubmission,isCurrent:()=>boolean):Promise<StorySnapshot|null> {
  if(!isCurrent())return null;
  const result=await call('story.apply',submission as unknown as Record<string,unknown>) as StorySnapshot;
  if(!isCurrent())return null;
  if(result.novelId!==submission.novelId||!result.story)throw new Error('保存回执不完整，请重试本次提交以核对结果。');
  return result;
}
