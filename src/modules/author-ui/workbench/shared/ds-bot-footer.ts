import {useSyncExternalStore} from 'react';

// DS-Bot 0.3.8 portals its own sidebar to body, covering DSH's footer slot.
// Only the launcher follows that footer. The workbench remains a DSH tab.
const columnSelector = ':scope > .bt-leftcol';
const sideSelector = ':scope > .bt-side';

function footer() {
  return document.body.querySelector<HTMLElement>(`${columnSelector} > .bt-side > .bt-leftcol-foot`);
}

function subscribe(notify: () => void) {
  // The column can disappear on a mode switch and be rebuilt when the rail opens.
  // Watch only its ancestors' immediate children, outside the chat and Bot list.
  const observer = new MutationObserver(watch);
  function watch() {
    observer.disconnect();
    const body = document.body;
    const column = body.querySelector(columnSelector);
    const side = column?.querySelector(sideSelector);
    for (const parent of [body, column, side]) {
      if (parent) observer.observe(parent, {childList: true});
    }
    notify();
  }
  watch();
  return () => observer.disconnect();
}

export function useDsBotFooter() {
  return useSyncExternalStore(subscribe, footer, () => null);
}
