/** Safe to import in the settings UI without loading server query schemas. */
export const READER_MODULES=['manuscript','settings','planning','guidance'] as const;
export type ReaderModule=typeof READER_MODULES[number];
export const readerModuleNames:Record<ReaderModule,string>={manuscript:'正文与目录',settings:'人物与世界设定',planning:'剧情规划',guidance:'写作指引与创作记忆'};
