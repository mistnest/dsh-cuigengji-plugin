export type Json=string|number|boolean|null|Json[]|{[key:string]:Json};
export type Values=Record<string,Json>;
export interface VariableDefinition {path:string;name:string;type?:'string'|'number'|'boolean'|'object'|'array'|'null';description?:string;resourceId?:string;schema?:Record<string,any>}
export type StoryAnchor={kind:'initial'}|{kind:'chapter';chapterId:string;chapterRevision:number;position:'start'|'end';label?:string};
export interface VariablePatch {op:'set'|'inc'|'delete'|'test'|'add'|'replace'|'remove'|'copy'|'move';path:string;value?:Json;from?:string}
export interface VariableCommit {id:string;revision:number;parentId:string|null;anchor:StoryAnchor;scope:'story'|'session';sessionKey?:string;data:Values;operations:VariablePatch[];paths:string[];actor:{kind:string;sessionId?:string};time:string;reason:string;invalidatedBy?:number}
export interface VariableState {version:1;revision:number;definitionRevision:number;enabled:boolean;definitions:VariableDefinition[];initial:Values;localDefaults:Values;commits:VariableCommit[];imports:{digest:string;raw:Json;time:string}[]}
export const emptyVariables=():VariableState=>({version:1,revision:0,definitionRevision:0,enabled:false,definitions:[],initial:{},localDefaults:{},commits:[],imports:[]});
