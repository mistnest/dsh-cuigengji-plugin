import type {FeatureCall} from '../../shared/workspace-state.ts';
import {readFullChapter, type ChapterPage} from '../../../../workspace/chapters/pages.ts';
import {chapterChanges, type Chapter} from './sync.ts';

/** A save or retry always refers to the chapter for which the draft was opened. */
export function chapterDocument(call: FeatureCall, novelId: string, chapterId: string) {
  return {
    read: () => readFullChapter<Chapter & ChapterPage>(page => call('chapter.get', {novelId, chapterId, ...page})),
    write: (value: Chapter, base: Chapter, requestId: string): Promise<Partial<Chapter>> =>
      call('chapter.update', {
        novelId, chapterId, requestId, ...chapterChanges(value, base),
        expectedRevision: base.revision, expectedHash: base.contentHash, reason: '作者自动保存',
      }),
  };
}
