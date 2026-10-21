import React, {useEffect, useState, type RefObject} from 'react';
import {countManuscript} from '../../domain/manuscript.ts';

function selectedText(scope: HTMLElement): string | null {
  if (!scope.isConnected || !scope.getClientRects().length) return null;
  const document = scope.ownerDocument, active = document.activeElement;
  if (active?.tagName === 'TEXTAREA') {
    if (!scope.contains(active)) return null;
    const editor = active as HTMLTextAreaElement;
    return editor.selectionEnd > editor.selectionStart ? editor.value.slice(editor.selectionStart, editor.selectionEnd) : null;
  }
  if (active?.tagName === 'INPUT') return null;
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount
      || !scope.contains(selection.anchorNode) || !scope.contains(selection.focusNode)) return null;
  return selection.toString();
}

/** A shared count for native textarea selections and reading-view text ranges. */
export function SelectionCount({scope}: {scope: RefObject<HTMLElement>}) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const document = scope.current?.ownerDocument;
    if (!document) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const text = scope.current ? selectedText(scope.current) : null;
      setCount(text === null ? null : countManuscript(text));
    };
    const schedule = () => {if (!frame) frame = requestAnimationFrame(update);};
    const events = ['selectionchange', 'select', 'input', 'keyup', 'pointerup', 'focusin', 'focusout'];
    for (const event of events) document.addEventListener(event, schedule, true);
    update();
    return () => {
      cancelAnimationFrame(frame);
      for (const event of events) document.removeEventListener(event, schedule, true);
    };
  }, [scope]);
  return count === null ? null : <span className="selection-count" aria-label="选中文字数" title="含标点、不计空白">已选 {count.toLocaleString('zh-CN')} 字</span>;
}
