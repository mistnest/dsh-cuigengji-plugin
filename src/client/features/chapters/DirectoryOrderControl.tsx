import React from 'react';

export function DirectoryOrderControl({descending,disabled,toggle}: {descending:boolean;disabled:boolean;toggle:()=>void}) {
  return <button type="button" className="directory-order-toggle" disabled={disabled}
    aria-label={descending?'倒序，点击切换为正序':'正序，点击切换为倒序'}
    title={descending?'切换为正序（从第一章开始）':'切换为倒序（后面的章节在前）'} onClick={toggle}>
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d={descending?'M4 3v10m-2.5-2.5L4 13l2.5-2.5M9 4h2m-2 4h3.5M9 12h5':'M4 13V3M1.5 5.5 4 3l2.5 2.5M9 4h5M9 8h3.5M9 12h2'}/></svg>
    <span>{descending?'倒序':'正序'}</span>
  </button>;
}
