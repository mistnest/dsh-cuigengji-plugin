// Compatibility codec for backups created by the retired collaboration experiment.
// No scheduling, assignment, reporting or role authorization remains here.
import {createHash} from 'node:crypto';
import type {Row,Workspace} from '../../infrastructure/persistence/project-layout.ts';
import type {SourceSnapshot,SharedPlanRef,ProgressPhase} from '../../contracts/collaboration.ts';
const copy=<T>(value:T):T=>structuredClone(value);
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
const object=(value:unknown):value is Row=>!!value&&typeof value==='object'&&!Array.isArray(value);
const touchNovel=(novel:Row)=>{novel.revision=(novel.revision||0)+1;novel.updatedAt=new Date().toISOString();};
export function validateSharedPlan(value: unknown, name = '共同规划'): SharedPlanRef {
  if (!object(value) || typeof value.sourceNovelId !== 'string' || typeof value.sourceNovelTitle !== 'string' ||
      (value.sourcePageId !== null && typeof value.sourcePageId !== 'string') || typeof value.sourcePageTitle !== 'string' ||
      !/^[a-f0-9]{64}$/.test(value.snapshotId) || !Number.isSafeInteger(value.sequence) || value.sequence < 0 || typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) {
    fail('INVALID_INPUT', `${name}引用无效`);
  }
  return value as SharedPlanRef;
}

export function sharedPlanRefs(novel: Row): SharedPlanRef[] {
  const value = novel.collaboration;
  return [value?.sharedPlan, ...Object.values(value?.tasks || {}).map((task: any) => task.sharedPlan)].filter(Boolean) as SharedPlanRef[];
}

function sharedSnapshot(state: Workspace, novel: Row, ref: SharedPlanRef): SourceSnapshot {
  const snapshot = novel.collaboration?.snapshots?.[ref.snapshotId] || state.novels[ref.sourceNovelId]?.collaboration?.snapshots?.[ref.snapshotId];
  if (!snapshot || snapshot.novelId !== ref.sourceNovelId || snapshot.pageId !== ref.sourcePageId || snapshot.sequence !== ref.sequence) fail('NO_SOURCE', '共同规划版本不存在或与引用不符，请检查备份中的来源数据');
  return snapshot;
}

/** Whole-work exports are self-contained. Only the backup receives these
 * immutable reference bodies; the live writer canvas/settings stay empty. */
export function portableNovel<T extends Row>(state: Workspace, novel: T): T {
  const result = copy(novel);
  for (const ref of sharedPlanRefs(novel)) result.collaboration.snapshots[ref.snapshotId] ??= copy(sharedSnapshot(state, novel, ref));
  return result;
}

/** Validate pointers after the complete library has been hydrated. Live books
 * may keep snapshots in their source; standalone exports carry them locally. */
export function validateSharedPlans(state: {novels:Record<string,Row>}) {
  for (const novel of Object.values(state.novels)) for (const ref of sharedPlanRefs(novel)) sharedSnapshot(state as Workspace,novel,ref);
}

export function withoutSharedCache(novel: Row): Row {
  const result = copy(novel);
  for (const ref of sharedPlanRefs(novel)) if (ref.sourceNovelId !== novel.id) delete result.collaboration.snapshots[ref.snapshotId];
  return result;
}

/** Before removing a source, retain only versions still referenced by books.
 * The enclosing Store transaction commits retention and removal together. */
export function retainSharedPlans(state: Workspace, source: Row) {
  for (const novel of Object.values(state.novels)) {
    if (novel.id === source.id) continue;
    let changed = false;
    for (const ref of sharedPlanRefs(novel).filter(ref => ref.sourceNovelId === source.id)) {
      if (!novel.collaboration.snapshots[ref.snapshotId]) {
        novel.collaboration.snapshots[ref.snapshotId] = copy(sharedSnapshot(state, novel, ref)); changed = true;
      }
    }
    if (changed) touchNovel(novel);
  }
}

export function validateCollaboration(novel: Row) {
  if (novel.collaboration === undefined) return;
  const value = novel.collaboration;
  if (!object(value) || ![1,2].includes(value.formatVersion) || !object(value.snapshots) || !object(value.tasks)) fail('INVALID_BACKUP', '写作协作数据无效');
  if (value.sharedPlan !== undefined && value.sharedPlan !== null) validateSharedPlan(value.sharedPlan, '共同规划');
  for (const [id, snapshot] of Object.entries(value.snapshots) as [string, Row][]) {
    if (!object(snapshot) || id !== snapshot.id) fail('INVALID_BACKUP', '共同策划版本无效');
    const {id: _id, createdAt, ...payload} = snapshot;
    if (hash(JSON.stringify(payload)) !== id || !['nodes', 'edges', 'decorations', 'groups', 'settings', 'relations', 'settingGroups'].every(key => object(snapshot[key]))) fail('INVALID_BACKUP', '共同策划版本校验失败');
  }
  if (value.origin && (!object(value.origin) || typeof value.origin.novelId !== 'string' || typeof value.origin.creatorSessionId !== 'string' || !value.snapshots[value.origin.snapshotId])) fail('INVALID_BACKUP', '派生来源无效');
  for (const [id, task] of Object.entries(value.tasks) as [string, Row][]) {
    if (!object(task) || task.id !== id || task.novelId !== novel.id || typeof task.parentSessionId !== 'string' || typeof task.childSessionId !== 'string' || !['prepared', 'accepted', 'failed'].includes(task.dispatchState) || !Number.isSafeInteger(task.revision) || task.revision < 1 || typeof task.goal !== 'string' || (task.snapshotId && !task.sharedPlan && !value.snapshots[task.snapshotId])) fail('INVALID_BACKUP', '写作任务关联无效');
    if (task.sharedPlan !== undefined && task.sharedPlan !== null) {
      validateSharedPlan(task.sharedPlan, '任务规划');
      if (task.snapshotId !== task.sharedPlan.snapshotId) fail('INVALID_BACKUP','写作任务与规划版本不符');
    }
  }
  for (const ref of sharedPlanRefs(novel)) if (value.snapshots[ref.snapshotId]) sharedSnapshot({novels:{}} as Workspace,novel,ref);
}


const phases:ProgressPhase[]=['starting','planning','writing','revising','awaiting_feedback','delivered','paused'];
const safe=(id:unknown):id is string=>typeof id==='string'&&!!id&&!['__proto__','constructor','prototype'].includes(id);
const nativeTaskId=(sessionId:string)=>'native:'+sessionId;
export function validateProgress(novel:Row) {
  if(novel.collaborationProgress===undefined)return;
  const data=novel.collaborationProgress;
  if(!object(data)||data.formatVersion!==1||!object(data.reports))fail('INVALID_BACKUP','协作进展数据无效');
  for(const [id,report] of Object.entries(data.reports) as [string,Row][]) {
    if(!safe(id)||!object(report)||id!==report.taskId||typeof report.sessionId!=='string'||typeof report.parentSessionId!=='string'||!Number.isSafeInteger(report.revision)||report.revision<1||!phases.includes(report.phase)||typeof report.updatedAt!=='string'||Number.isNaN(Date.parse(report.updatedAt))||typeof report.summary!=='string'||report.summary.length>400||typeof report.question!=='string'||report.question.length>1200||!Array.isArray(report.artifacts)||report.artifacts.length>20)fail('INVALID_BACKUP','写手进展记录无效');
    const task=novel.collaboration?.tasks[id];
    if(task?task.childSessionId!==report.sessionId||task.parentSessionId!==report.parentSessionId:id!==nativeTaskId(report.sessionId))fail('INVALID_BACKUP','进展不属于本作品的写手');
    for(const ref of report.artifacts){
      if(!object(ref)||!['chapter','planning_node','setting','planning_page','discussion'].includes(ref.kind)||ref.kind!=='discussion'&&((!safe(ref.id)&&!(ref.kind==='planning_page'&&ref.id===null))||!Number.isSafeInteger(ref.revision)||ref.revision<1))fail('INVALID_BACKUP','协作成果引用无效');
    }
  }
}
