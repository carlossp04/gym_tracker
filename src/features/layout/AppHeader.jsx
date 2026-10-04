import { Dumbbell, Lock, Settings } from 'lucide-react';

export default function AppHeader({ onReset, onNavigate, onExport, onImport }) {

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            <Dumbbell size={24} className="text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold hidden sm:block tracking-tight">
            Gym<span className="text-emerald-400">Tracker</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <details className="relative"><summary className="list-none cursor-pointer flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-slate-800"><Settings size={18} /> Opciones</summary><div className="absolute right-0 top-full mt-3 w-64 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-xl z-40">
            <button type="button" onClick={(event) => { onNavigate('exercises'); event.currentTarget.closest('details').open = false; }} className="w-full text-left p-3 text-sm hover:bg-slate-800 rounded-lg">Gestionar ejercicios</button>
            <button type="button" onClick={(event) => { onNavigate('aiResume'); event.currentTarget.closest('details').open = false; }} className="w-full text-left p-3 text-sm hover:bg-slate-800 rounded-lg">Exportar resumen para IA</button>
            <button type="button" onClick={onExport} className="w-full text-left p-3 text-sm hover:bg-slate-800 rounded-lg">Descargar copia de seguridad</button>
            <label className="block p-3 text-sm hover:bg-slate-800 rounded-lg cursor-pointer">Restaurar copia de seguridad<input type="file" accept=".txt,.json" className="hidden" onChange={onImport} /></label>
          </div></details>
          <button
            onClick={onReset}
            className="text-xs font-bold bg-[#E65F57] hover:bg-[#d44b43] text-white py-2 px-4 rounded-lg transition-all shadow-lg shadow-red-900/20 flex items-center gap-2"
          >
            <Lock size={14} />
            Bloquear
          </button>
        </div>
      </div>
    </header>
  );
}
