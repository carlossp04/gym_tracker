import { Check, CheckCircle2, Database, GitMerge, Pencil } from 'lucide-react';
import { truncateText } from '../../lib/gymMetrics';

export default function ExercisesTab({
  allUniqueExercises,
  processedData,
  selectedForMerge,
  onToggleSelection,
  onOpenMergeModal,
  onOpenRenameModal,
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3">
          <Database className="text-purple-500" size={32} /> Gestión de Ejercicios
        </h2>
        <p className="text-slate-400 text-sm">Gestiona nombres de ejercicios (fusionar o renombrar).</p>
      </div>
      {selectedForMerge.length > 1 && (
        <div className="sticky top-20 z-30 flex justify-center mb-6 animate-in slide-in-from-top-4">
          <button onClick={onOpenMergeModal} className="bg-purple-500 hover:bg-purple-400 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-purple-900/40 flex items-center gap-2 transform hover:scale-105 transition-all">
            <GitMerge size={20} /> Fusionar {selectedForMerge.length} seleccionados
          </button>
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-950 text-slate-500 uppercase text-xs tracking-wider font-bold">
              <tr>
                <th className="p-4 w-12 text-center"><CheckCircle2 size={16} /></th>
                <th className="p-6">Nombre del Ejercicio</th>
                <th className="p-6 text-center">Acciones</th>
                <th className="p-6 text-right">Registros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {allUniqueExercises.map((exercise) => {
                const count = Object.values(processedData).flat().filter((entry) => entry.exercise === exercise).length;
                const isSelected = selectedForMerge.includes(exercise);

                return (
                  <tr key={exercise} className={`transition-colors group ${isSelected ? 'bg-purple-500/10' : 'hover:bg-slate-800/30'}`}>
                    <td className="p-4 text-center cursor-pointer" onClick={() => onToggleSelection(exercise)}>
                      <div className={`w-5 h-5 rounded border mx-auto flex items-center justify-center transition-all ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-600 group-hover:border-purple-400'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </td>
                    <td className="p-6 font-bold text-slate-200 group-hover:text-white cursor-pointer max-w-[150px] sm:max-w-[300px] truncate" onClick={() => onToggleSelection(exercise)} title={exercise}>
                      {truncateText(exercise)}
                    </td>
                    <td className="p-6 text-center">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenRenameModal(exercise);
                        }}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors"
                        title="Renombrar"
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                    <td className="p-6 text-right cursor-pointer" onClick={() => onToggleSelection(exercise)}>
                      <span className="inline-block px-3 py-1 bg-slate-800 rounded-full text-slate-400 text-xs font-mono whitespace-nowrap">{count} sets</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
