import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useText } from './locale.js';

interface DialogAPI { ask(label: string, value?: string): Promise<string | null>; confirm(label: string): Promise<boolean> }
interface DialogState { kind: 'prompt' | 'confirm'; label: string; value: string }
const DialogContext = createContext<DialogAPI | null>(null);
export const useDialog = () => { const value = useContext(DialogContext); if (!value) throw new Error('DialogProvider is required'); return value; };

export function DialogProvider({ children }: {children: React.ReactNode}) {
  const t = useText();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const pending = useRef<{kind: DialogState['kind'];resolve: (value: string | boolean | null) => void} | null>(null);
  const element = useRef<HTMLDialogElement>(null);
  const finish = useCallback((value: string | boolean | null) => {
    const current = pending.current;
    pending.current = null;
    setDialog(null);
    current?.resolve(value);
  }, []);
  const request = useCallback((kind: DialogState['kind'], label: string, value = '') => new Promise<string | boolean | null>(resolve => {
    pending.current?.resolve(pending.current.kind === 'prompt' ? null : false);
    pending.current = { kind, resolve };
    setDialog({ kind, label, value });
  }), []);
  useEffect(() => () => {
    pending.current?.resolve(pending.current.kind === 'prompt' ? null : false);
    pending.current = null;
  }, []);
  useEffect(() => {
    if (dialog && element.current && !element.current.open) element.current.showModal();
  }, [dialog]);
  return <DialogContext.Provider value={{ ask: (label, value = '') => request('prompt', label, value) as Promise<string | null>, confirm: label => request('confirm', label) as Promise<boolean> }}>
    {children}
    {dialog && <dialog ref={element} className="cuigengji cuigengji-dialog" aria-label={dialog.label}
      onCancel={event => { event.preventDefault(); finish(dialog.kind === 'prompt' ? null : false); }}>
      <form onSubmit={event => { event.preventDefault(); finish(dialog.kind === 'prompt' ? dialog.value : true); }}>
        <p>{dialog.label}</p>
        {dialog.kind === 'prompt' && <input autoFocus aria-label="输入值" value={dialog.value} onChange={event => setDialog(current => current && ({ ...current, value: event.target.value }))} />}
        <div className="row">
          <button type="button" autoFocus={dialog.kind === 'confirm'} onClick={() => finish(dialog.kind === 'prompt' ? null : false)}>{t('cancel')}</button>
          <button type="submit">{t('confirm')}</button>
        </div>
      </form>
    </dialog>}
  </DialogContext.Provider>;
}
