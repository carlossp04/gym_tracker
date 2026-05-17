import { CheckCircle2, Copy, Download, FileUp, Pencil, PlusCircle, Save, XCircle } from 'lucide-react';

export default function TrainingInputPanel({
  newTrainingText,
  saveStatus,
  saveMessage,
  trainingEntries,
  onNewTrainingTextChange,
  onAppendTraining,
  onExportEncrypted,
  onImportEncrypted,
  onOpenTrainingEdit,
}) {
  return (
    <div className="space-y-6">
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

      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Registros editables</h2>
            <p className="text-sm text-slate-400 mt-1">Corrige usuario, fecha, ejercicio, series, reps o peso.</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 rounded-full px-3 py-1">{trainingEntries.length} sets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead className="bg-slate-950 text-slate-500 uppercase text-xs tracking-wider font-bold">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Ejercicio</th>
                <th className="p-4 text-right">Series</th>
                <th className="p-4 text-right">Reps</th>
                <th className="p-4 text-right">Kg</th>
                <th className="p-4 text-right">1RM</th>
                <th className="p-4 text-center">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {trainingEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-400 font-mono whitespace-nowrap">{entry.date}</td>
                  <td className="p-4 text-slate-300 font-bold whitespace-nowrap">{entry.user}</td>
                  <td className="p-4 text-white font-bold max-w-[260px] truncate" title={entry.exercise}>{entry.exercise}</td>
                  <td className="p-4 text-right text-slate-300">{entry.sets}</td>
                  <td className="p-4 text-right text-slate-300">{entry.reps}</td>
                  <td className="p-4 text-right text-slate-300">{entry.weight}</td>
                  <td className="p-4 text-right text-emerald-400 font-black">{entry.oneRepMax} kg</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => onOpenTrainingEdit(entry)}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors"
                      title="Editar registro"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
