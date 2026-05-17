import { Dumbbell, Lock } from 'lucide-react';

export default function AppHeader({ onReset }) {
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
        <button
          onClick={onReset}
          className="text-xs font-bold bg-[#E65F57] hover:bg-[#d44b43] text-white py-2 px-4 rounded-lg transition-all shadow-lg shadow-red-900/20 flex items-center gap-2"
        >
          <Lock size={14} />
          Bloquear
        </button>
      </div>
    </header>
  );
}
