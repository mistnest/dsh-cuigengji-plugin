import React, {useId} from 'react';

export type Call = <T = unknown>(action: string, args?: Record<string, unknown>) => Promise<T>;
export type Run = (work: () => Promise<unknown>) => Promise<unknown>;
export type BackProps = {onBack?: () => void; backLabel?: string};

export function ManagementPage({title, description, actions, footer, children, onBack, backLabel = '返回正文', documentClass = ''}: BackProps & {
  title: string; description?: string; actions?: React.ReactNode; footer?: React.ReactNode;
  children: React.ReactNode; documentClass?: string;
}) {
  return <section className="management-page" aria-label={title}>
    <header className="management-header">
      {onBack && <button className="management-back" onClick={onBack}>‹ {backLabel}</button>}
      <div className="management-heading"><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {actions && <div className="management-head-actions">{actions}</div>}
    </header>
    <div className="management-scroll"><div className={'management-document ' + documentClass}>{children}</div></div>
    {footer && <div className="management-footer">{footer}</div>}
  </section>;
}

export function ManagementSection({title, description, children}: {title: string; description?: string; children: React.ReactNode}) {
  return <section className="management-section"><div className="management-section-heading"><h3>{title}</h3>{description && <p>{description}</p>}</div>{children}</section>;
}

export function FilePicker({label, name, hint = 'JSON 文件', accept = '.json,application/json', disabled, onChange}: {
  label: string; name: string; hint?: string; accept?: string; disabled?: boolean; onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  const id = useId();
  return <label className="management-file-picker" htmlFor={id}>
    <span className="file-picker-label">{label}<small>{hint}</small><span aria-hidden="true">↑</span></span>
    <input id={id} type="file" accept={accept} aria-label={name} disabled={disabled} onChange={onChange}/>
  </label>;
}

export function SummaryCounts({items}: {items: {label: string; value: string | number}[]}) {
  return <dl className="management-counts">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{typeof item.value === 'number' ? item.value.toLocaleString('zh-CN') : item.value}</dd></div>)}</dl>;
}

export function ImportSteps({preview, done = false}: {preview: boolean; done?: boolean}) {
  const current = done ? 2 : preview ? 1 : 0;
  return <ol className="management-import-steps" aria-label="导入步骤">{['选择文件', '核对内容', '完成导入'].map((label, i) => <li key={label} aria-current={i === current ? 'step' : undefined} className={i <= current ? 'reached' : ''}><span>{i + 1}</span>{label}</li>)}</ol>;
}

export function downloadJSON(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: 'application/json'}));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
