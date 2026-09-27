import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useText } from './locale.js';

const DialogContext = createContext(null);
export const useDialog = () => useContext(DialogContext);

export function DialogProvider({ children }) {
  const t = useText();
  const [dialog, setDialog] = useState(null);
  const pending = useRef(null);
  const element = useRef(null);
  const finish = useCallback(value => {
    const current = pending.current;
    pending.current = null;
    setDialog(null);
    current?.resolve(value);
  }, []);
  const request = useCallback((kind, label, value = '') => new Promise(resolve => {
    pending.current?.resolve(pending.current.kind === 'prompt' ? null : false);
    pending.current = { kind, resolve };
    setDialog({ kind, label, value });
  }), []);
  useEffect(() => () => {
    pending.current?.resolve(pending.current.kind === 'prompt' ? null : false);
    pending.current = null;
  }, []);
  useEffect(() => {
    if (dialog && !element.current.open) element.current.showModal();
  }, [dialog]);
  return <DialogContext.Provider value={{ ask: (label, value = '') => request('prompt', label, value), confirm: label => request('confirm', label) }}>
    {children}
    {dialog && <dialog ref={element} className="cuigengji cuigengji-dialog" aria-label={dialog.label}
      onCancel={event => { event.preventDefault(); finish(dialog.kind === 'prompt' ? null : false); }}>
      <form onSubmit={event => { event.preventDefault(); finish(dialog.kind === 'prompt' ? dialog.value : true); }}>
        <p>{dialog.label}</p>
        {dialog.kind === 'prompt' && <input autoFocus aria-label="输入值" value={dialog.value} onChange={event => setDialog(current => ({ ...current, value: event.target.value }))} />}
        <div className="row">
          <button type="button" autoFocus={dialog.kind === 'confirm'} onClick={() => finish(dialog.kind === 'prompt' ? null : false)}>{t('cancel')}</button>
          <button type="submit">{t('confirm')}</button>
        </div>
      </form>
    </dialog>}
  </DialogContext.Provider>;
}
