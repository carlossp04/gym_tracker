import { CheckCircle2, Copy, Download, FileUp, PlusCircle, Save, XCircle } from 'lucide-react';

export default function TrainingInputPanel({
  newTrainingText,
  saveStatus,
  saveMessage,
  onNewTrainingTextChange,
  onAppendTraining,
  onExportEncrypted,
  onImportEncrypted,
}) {
  return (
    <section className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PlusCircle className="text-emerald-400" /> Añadir Entreno
          </h2>
          <p className="text-sm text-slate-400 mt-1">Pega el bloque copiado de WhatsApp y guarda. Se cifra al momento.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExportEncrypted} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-2">
            <Download size={14} /> Backup
          </button>
          <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer">
            <FileUp size={14} /> Importar
            <input type="file" accept=".txt,.json" className="hidden" onChange={onImportEncrypted} />
          </label>
        </div>
      </div>

      <textarea
        value={newTrainingText}
        onChange={(event) => onNewTrainingTextChange(event.target.value)}
        placeholder="[16/5, 14:26] Masi: ..."
        className="w-full min-h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 font-mono"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-h-6">
          {saveStatus === 'success' && (
            <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 size={16} /> {saveMessage}</p>
          )}
          {saveStatus === 'error' && (
            <p className="text-sm text-red-400 flex items-center gap-2"><XCircle size={16} /> {saveMessage}</p>
          )}
          {saveStatus === 'saving' && (
            <p className="text-sm text-blue-400 flex items-center gap-2"><Save size={16} /> Guardando cifrado...</p>
          )}
        </div>
        <button
          onClick={onAppendTraining}
          disabled={!newTrainingText.trim() || saveStatus === 'saving'}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 px-5 py-3 rounded-xl font-black flex items-center justify-center gap-2"
        >
          <Copy size={16} /> Añadir y Cifrar
        </button>
      </div>
    </section>
  );
}
