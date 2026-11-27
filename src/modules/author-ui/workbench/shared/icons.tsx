import React from 'react';

export type IconName = 'folder' | 'folderPlus' | 'folderArrow' | 'pagePlus' | 'collapseAll' | 'home' | 'refresh' | 'settings' | 'filter' | 'edit' | 'about' | 'person' | 'world' | 'trash' | 'restore' | 'sidebar' | 'search' | 'expand' | 'collapse' | 'plan' | 'book' | 'star' | 'download' | 'image' | 'clock' | 'link' | 'typography' | 'pen' | 'companion' | 'database' | 'note' | 'sliders' | 'chart' | 'coin' | 'chevronRight' | 'rotateCcw';
const paths: Record<IconName, React.ReactNode> = {
  download:<><path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/></>,
  folderPlus:<><path d="M13 20H3V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v4"/><path d="M15 17h8M19 13v8"/></>,
  folderArrow:<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"/><path d="M10 14h6"/><path d="m13 11 3 3-3 3"/></>,
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
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-5-5L5 20"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  typography: <><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></>,
  pen: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
  companion: <><rect x="3" y="4" width="18" height="12" rx="2.5"/><path d="M8 20h8"/><path d="M12 16v4"/><circle cx="9.5" cy="10" r="1"/><circle cx="14.5" cy="10" r="1"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></>,
  note: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/></>,
  chart: <><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></>,
  coin: <><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5a2.5 2.5 0 0 0-5 0c0 2.5 5 2 5 4.5a2.5 2.5 0 0 1-5 0"/><path d="M12 6.5v11"/></>,
  chevronRight: <path d="m9 18 6-6-6-6"/>,
  rotateCcw: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
};

export function Icon({name}: {name: IconName}) {
  return <svg className="app-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
