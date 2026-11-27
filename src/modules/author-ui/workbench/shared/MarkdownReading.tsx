import React, {memo} from 'react';
import Markdown, {type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {markdownHeadingId, extractMarkdownHeadings} from './markdown-headings.ts';
export {markdownHeadingId, extractMarkdownHeadings};

const plugins = [remarkGfm];
const components: Components = {
  // Keep book text local: opening a card never fetches an embedded image.
  img: ({alt}) => alt ? <span>{alt}</span> : null,
  a: ({href, title, children, id}) => {
    if (href?.startsWith('#') && href.length > 1) {
      return <a href={href} id={id} title={title} onClick={event => {
        event.preventDefault();
        event.currentTarget.closest('.document-prose')?.querySelector('#' + CSS.escape(href.slice(1)))?.scrollIntoView({block:'nearest'});
      }}>{children}</a>;
    }
    return href && /^(https?:\/\/|mailto:)/i.test(href)
      ? <a href={href} title={title} target="_blank" rel="noopener noreferrer">{children}</a>
      : <span>{children}</span>;
  },
  table: ({children}) => <div className="markdown-table-scroll"><table>{children}</table></div>,
};

export const MarkdownReading = memo(function MarkdownReading({text, className = '', label}: {
  text: string; className?: string; label?: string;
}) {
  let headingSeq = 0;
  const headingTag = (Tag: 'h1' | 'h2' | 'h3') => ({children}: {children?: React.ReactNode}) => {
    headingSeq += 1;
    const plain = React.Children.toArray(children).map(item => typeof item === 'string' || typeof item === 'number' ? String(item) : '').join('');
    return <Tag id={markdownHeadingId(plain, headingSeq)}>{children}</Tag>;
  };
  return <article className={'document-prose ' + className} aria-label={label}>
    <Markdown remarkPlugins={plugins} components={{...components, h1: headingTag('h1'), h2: headingTag('h2'), h3: headingTag('h3')}}>{text}</Markdown>
  </article>;
});
