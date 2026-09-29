export interface Point { x: number; y: number }
export interface PlanningNode {
  id: string; revision: number; title: string; summary: string; content: string;
  scope: 'long' | 'phase' | 'near' | 'unspecified';
  status: 'idea' | 'selected' | 'written' | 'dropped';
  parentId: string | null; groupId?: string | null; position?: Point | null;
  threads: string[]; chapterRefs: { chapterId: string; revision: number }[]; memoryRefs: string[];
  deleted: boolean; updatedAt: string; lastSequence?: number;
  actor?: { kind: string; sessionId?: string | null };
}
export interface PlanningEdge { id: string; revision: number; from: string; to: string; type: 'next' | 'requires' | 'alternative'; label: string; deleted: boolean }
export interface PlanningGroup { id: string; revision: number; name: string; summary: string; deleted?: boolean }
export type NodeIndex = Omit<PlanningNode, 'content'>;
export type PlanningEntity = PlanningNode | PlanningEdge | PlanningGroup;
export type Collection = 'nodes' | 'edges' | 'groups';
export interface Change { collection: Collection; id: string; before: PlanningEntity | null; after: PlanningEntity }
export interface Transaction { id: string; sequence: number; lastSequence: number; updatedAt: string; actor: {kind: string; sessionId: string | null}; reason: string; changes: Change[] }
export interface Board {
  formatVersion: number; nodes: Record<string, PlanningNode>; edges: Record<string, PlanningEdge>;
  groups: Record<string, PlanningGroup>; sequence: number; transactions: Transaction[];
  legacy?: LegacyPlan;
}
export interface LegacyPlan { id: string; revision: number; content: string; updatedAt?: string; approved: boolean }
export interface PlanningNovel {
  planning?: Board; plan?: LegacyPlan | null;
  chapters: Record<string, {versions: {revision: number}[]}>; nodes: Record<string, unknown>;
}
export type Operation =
  | {op:'node.create';ref?:string;value?:Partial<PlanningNode>}
  | {op:'node.update';id:string;expectedRevision:number;value:Partial<PlanningNode>}
  | {op:'node.delete';id:string;expectedRevision:number;confirm?:boolean;childPolicy?:'detach'|'subtree'}
  | {op:'edge.create';value:Pick<PlanningEdge,'from'|'to'> & Partial<PlanningEdge>}
  | {op:'edge.update';id:string;expectedRevision:number;value:Partial<PlanningEdge>}
  | {op:'edge.delete';id:string;expectedRevision:number;confirm?:boolean}
  | {op:'group.create';ref?:string;value:Pick<PlanningGroup,'name'> & Partial<PlanningGroup>}
  | {op:'group.update';id:string;expectedRevision:number;value:Partial<PlanningGroup>}
  | {op:'group.delete';id:string;expectedRevision:number;confirm?:boolean};
export interface PlanningArgs {
  requestId?:string; expectedSequence?:number; transactionId?:string; operations?:Operation[]; reason?:string;
  nodeId?:string;groupId?:string|null;name?:string;summary?:string;expectedRevision?:number;confirm?:boolean;
  query?:string;includeDeleted?:boolean;parentId?:string|null;status?:string;thread?:string;
  after?:number;offset?:number;limit?:number;
}
