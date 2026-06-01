import { Dumbbell, Lock } from 'lucide-react';

export default function AppHeader({ mode, onReset }) {
  const isEditMode = mode === 'edit';

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
          <span className={`text-[11px] font-black uppercase tracking-wider rounded-full border px-3 py-1 ${
            isEditMode
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-200'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
          }`}
          >
            {isEditMode ? 'Edición' : 'Lectura'}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
