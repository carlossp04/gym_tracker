import { Pencil, XCircle } from 'lucide-react';

export default function RenameExerciseModal({
  renameInput,
  onRenameInputChange,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white"><XCircle size={24} /></button>
        <div className="flex items-center gap-3 mb-4 text-blue-400">
          <Pencil size={32} />
          <h3 className="text-xl font-bold text-white">Renombrar Ejercicio</h3>
        </div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nuevo nombre</label>
        <input
          type="text"
          value={renameInput}
          onChange={(event) => onRenameInputChange(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none mb-6"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  );
}
