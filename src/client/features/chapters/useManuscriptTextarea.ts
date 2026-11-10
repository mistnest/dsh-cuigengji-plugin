import {useLayoutEffect, useRef} from 'react';
import {mapSelection} from './selection.ts';

export function useManuscriptTextarea(content: string) {
  const ref = useRef<HTMLTextAreaElement>(null), initialContent = useRef(content), composing = useRef(false);
  useLayoutEffect(() => {
    const element = ref.current;
    // Textarea DOM values use LF even when an imported document uses CRLF.
    const next = content.replace(/\r\n?/g, '\n');
    // Native input owns text, caret and undo during author edits. A save receipt
    // changes the revision only; it must never restore an old selection snapshot.
    if (!element || composing.current || element.value === next) return;
    const selection = mapSelection(element.value, next, {
      start: element.selectionStart, end: element.selectionEnd, direction: element.selectionDirection,
    });
    const top = element.scrollTop;
    element.value = next;
    // Apply remote edits without focusing the textarea, mapping the selection
    // when AI inserts text above the author's current position.
    element.setSelectionRange(selection.start, selection.end, selection.direction);
    element.scrollTop = top;
  }, [content]);
  return {ref, defaultValue: initialContent.current,
    onCompositionStart: () => {composing.current = true;},
    onCompositionEnd: () => {composing.current = false;},
  };
}
