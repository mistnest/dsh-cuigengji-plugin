import React from 'react';

export type IconName = 'folder' | 'folderPlus' | 'pagePlus' | 'collapseAll' | 'home' | 'refresh' | 'settings' | 'filter' | 'edit' | 'about' | 'person' | 'world' | 'trash' | 'restore' | 'sidebar' | 'search' | 'expand' | 'collapse' | 'plan' | 'book' | 'star';
const paths: Record<IconName, React.ReactNode> = {
  folderPlus:<><path d="M13 20H3V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v4"/><path d="M15 17h8M19 13v8"/></>,
  pagePlus:<><path d="M13 21H5V3h10l4 4v5M14 3v5h5M15 17h8M19 13v8"/></>,
  collapseAll:<><path d="M8 3h13v13"/><rect x="3" y="8" width="13" height="13" rx="1"/><path d="M6 14.5h7"/></>,
  star:<path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2-4.5-4.4 6.3-.9Z"/>,
  folder:<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11H3Z"/>,
  book: <><path d="M12 5c-2-2-6-2-9-1v15c3-1 7-1 9 1 2-2 6-2 9-1V4c-3-1-7-1-9 1Z"/><path d="M12 5v15"/></>,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M5.5 8h1M5.5 12h1"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  expand: <><path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"/></>,
  collapse: <><path d="M3 9h6V3M21 9h-6V3M15 21v-6h6M9 21v-6H3"/></>,
  plan: <><rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M10 7h7v7M7 10v7h7"/></>,
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h5v-6h4v6h5V9"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.5 6.5A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.5 5.5"/></>,
  settings: <><path d="m9 3-1 3-3 1 .3 3L3 12l2.3 2-.3 3 3 1 1 3h6l1-3 3-1-.3-3 2.3-2-2.3-2 .3-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/></>,
  edit: <><path d="m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16Z"/></>,
  about: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  person: <><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
  world: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>,
  restore: <><path d="M4 4v6h6M4 10a8 8 0 1 1 1 8M12 7v5l3 2"/></>,
};

export function Icon({name}: {name: IconName}) {
  return <svg className="app-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
