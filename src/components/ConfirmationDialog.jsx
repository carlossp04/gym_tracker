import { useEffect, useId, useRef } from 'react';

export default function ConfirmationDialog({
  title, description, confirmLabel, cancelLabel = 'Cancelar', onConfirm, onDismiss,
  busy = false, confirmDisabled = false, error,
}) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onDismiss();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl backdrop:bg-black/80 sm:p-6"
    >
      <h2 id={titleId} className="break-words text-xl font-black">{title}</h2>
      {description && <p id={descriptionId} className="break-words text-sm text-slate-300">{description}</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onDismiss} disabled={busy} className="min-h-11 rounded-xl bg-slate-800 px-2 py-2 text-sm font-bold hover:bg-slate-700 disabled:opacity-50">{cancelLabel}</button>
        <button type="button" onClick={onConfirm} disabled={busy || confirmDisabled} className="min-h-11 rounded-xl bg-red-700 px-2 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">{confirmLabel}</button>
      </div>
    </dialog>
  );
}
