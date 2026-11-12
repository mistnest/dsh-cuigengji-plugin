export type CleanupScope='chapter-history'|'memory-history'|'planning-history'|'chapter-trash'|'novel-trash';
export type CleanupFilter={mode:'selected';revisions:number[]}|{mode:'keep';count:number}|{mode:'before';date:string};
export interface CleanupSelection {scope:CleanupScope;novelId?:string;entityId?:string;ids?:string[];filter?:CleanupFilter}
export interface CleanupReference {kind:'memory'|'planning'|'relation'|'variables'|'chapter'|'legacy';id:string;title:string;revision?:number;locatable?:boolean}
export interface CleanupRow {id:string;title:string;revision?:number;time?:string;selected:boolean;protected:boolean;reason?:string;references:CleanupReference[]}
export interface CleanupPreview {token:string;title:string;scope:CleanupScope;rows:CleanupRow[];count:number;protectedCount:number;unit:string}
export interface CleanupResult {deleted:number}
