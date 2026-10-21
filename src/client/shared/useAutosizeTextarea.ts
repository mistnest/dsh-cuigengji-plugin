import {useLayoutEffect, type RefObject} from 'react';

/** Measure offscreen so the visible document never collapses and clamps its scroll. */
function fitTextarea(element: HTMLTextAreaElement) {
  if (!element.clientWidth) return;
  const computed = getComputedStyle(element);
  const mirror = element.ownerDocument.createElement('textarea');
  mirror.setAttribute('aria-hidden', 'true');
  mirror.tabIndex = -1;
  mirror.wrap = element.wrap;
  mirror.style.cssText = 'position:fixed;top:0;left:0;display:block;height:0;min-height:0;max-height:none;margin:0;overflow:hidden;resize:none;visibility:hidden;pointer-events:none;';
  for (const property of [
    'box-sizing', 'width', 'padding', 'border', 'font-family', 'font-size',
    'font-weight', 'font-style', 'font-stretch', 'font-variant', 'line-height',
    'letter-spacing', 'word-spacing', 'text-indent', 'text-transform',
    'text-align', 'text-rendering', 'white-space', 'word-break', 'overflow-wrap',
    'tab-size', 'direction',
  ]) mirror.style.setProperty(property, computed.getPropertyValue(property));
  mirror.value = element.value;
  element.ownerDocument.body.appendChild(mirror);
  try {
    const number = (property: string) => Number.parseFloat(computed.getPropertyValue(property)) || 0;
    const height = mirror.scrollHeight + (computed.boxSizing === 'border-box'
      ? number('border-top-width') + number('border-bottom-width')
      : -number('padding-top') - number('padding-bottom'));
    element.style.height = `${Math.ceil(Math.max(number('min-height'), height))}px`;
  } finally {mirror.remove();}
}

export function useAutosizeTextarea(ref: RefObject<HTMLTextAreaElement>, value: unknown, appearance?: unknown) {
  useLayoutEffect(() => {if (ref.current) fitTextarea(ref.current);}, [ref, value, appearance]);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let width = -1;
    const observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width;
      if (next !== undefined && next !== width) {width = next; fitTextarea(element);}
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
}
