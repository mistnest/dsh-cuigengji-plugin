export type UsageRow=Record<string,any>;
export const pricingIssues={missing_model:'未报告模型',unknown_price:'未配置这个模型的单价',missing_usage:'未报告有效用量',incomplete_usage:'Token 拆分与总量不一致',cache_write_price:'未配置缓存写入单价'};
export interface TokenCounts {input:number;output:number;cacheRead?:number;cacheWrite?:number;reasoning?:number;total?:number}
export interface UsageRecord {
  id:string;source:string;sessionId:string;turn:number;step:number;attempt:number;time:number;
  provider:string|null;model:string|null;tokens:TokenCounts|null;partial:boolean;
  novelId?:string;price?:UsageRow|null;cost?:string|null;currency?:string;origin?:string;reportCurrency?:string;exchangeRate?:string;reportCost?:string|null;pricingIssue?:string;
}
export interface UsageCursor {seq:number;turn:number;step:number;attempt:number;day?:string;id?:string;provider?:string;model?:string;title?:string}
export interface UsageSource {id:string;name:string;template:string;enabled:boolean;keyRef:string;provider?:string;models?:string[];currency:string;baseUrl?:string;balance?:UsageRow;quota?:UsageRow;limit?:{total:number;used:number;automatic:boolean;reset:'none'|'day'|'month';baseline?:number;period?:string};codexRoot?:string;dailyBudget?:string;lowBalance?:string}
export interface PriceSchedule {utcOffsetMinutes:number;weekdays:number[];excludeChinaHolidays:boolean;windows:{start:string;end:string}[]}
export interface PriceRule {id:string;provider:string;model:string;currency:string;input:string;output:string;cacheRead:string;cacheWrite?:string;peak?:{input:string;output:string;cacheRead:string;cacheWrite?:string};schedule?:PriceSchedule;revision:number;source?:string;effectiveFrom?:number}
export type PetEventKind='press'|'release'|'complete'|'question'|'approval'|'balance'|'budget';
export interface BubbleModule {id:string;kind:'text'|'metric'|'link'|'randomText'|'image'|'randomImage';value:string;choices?:string[];choiceWeights?:number[];label?:string;style?:{size?:number;color?:string;bold?:boolean;italic?:boolean;underline?:boolean;background?:string;gradient?:string;font?:string}}
export interface BubbleEntry {id:string;name:string;weight:number;group?:string;lines:BubbleModule[][]}
/** Preserve the legacy bubble flag in saved settings. TTL is the notice lifetime, not a window timer. */
export interface PetEventOptions {on:boolean;bubble:boolean;sound?:string;volume?:number;ttl:number;entry?:string}
export interface CompanionSettings {
  enabled:boolean;currency:string;exchangeRates:Record<string,string>;dailyBudget:string;lowBalance:string;
  bubbleMode:'sequence'|'weighted';bubbles:BubbleEntry[];events:Record<PetEventKind,PetEventOptions>;
  volume:number;scale:number;flipped:boolean;snap:'none'|'edges'|'corners'|'custom';customRole?:string;
  snapZones?:{unit:'percent'|'px';left:number;right:number;top:number;bottom:number};autoFlip?:boolean;
  moduleLibrary?:BubbleModule[];advanceOnClick?:boolean;
}
export interface CompanionAsset {id:string;digest?:string;name:string;kind:'image'|'audio'|'role';mime:string;file:string;size:number;group?:string}
export interface CompanionEvent {id:string;kind:PetEventKind;sessionId:string;time:number;text:string;pending:boolean;requestId?:string;resolved?:boolean;deliveredAt?:number}
export interface UsageMeta {
  version:1;revision:number;configRevision?:number;settings:CompanionSettings;prices:PriceRule[];sources:UsageSource[];
  days:string[];cursors:Record<string,UsageCursor>;summaries:Record<string,UsageRow>;
  balances:Record<string,UsageRow>;balanceBooks:UsageRow;events:CompanionEvent[];assets:CompanionAsset[];
  imported:string[];pricingVersion?:string;pending?:{pages:{day:string;records:Record<string,UsageRecord>}[]};
  turns?:Record<string,{turn:number;title?:string;records:Record<string,UsageRecord>}>;
}
export interface PetUsageSummary {
  tokens:number;cost:string;currency:string;unpriced:number;
  date?:string;calls?:number;input?:number;output?:number;cacheRead?:number;cacheWrite?:number;
  costs?:Record<string,string>;balanceTotals?:Record<string,string>;balanceCount?:number;
  balances?:{id:string;name:string;currency:string;balance:string|null;at:number|null;error:string|null}[];
}
export interface PetPresentation {lines:{segments:{kind:'text'|'link'|'image';text?:string;url?:string;assetId?:string;path?:string;mime?:string;style?:BubbleModule['style']}[]}[];event?:CompanionEvent;notification?:CompanionEvent;showBubble:boolean;ttl:number;advanceOnClick:boolean;customContent?:boolean;bubbleName?:string;summary:PetUsageSummary;appearance:{scale:number;flipped:boolean;snap:string;snapZones?:CompanionSettings['snapZones'];autoFlip?:boolean;rolePath?:string;roleMime?:string;roleAssetId?:string};sound?:{path:string;assetId:string;id:string;volume:number};revision:number}
