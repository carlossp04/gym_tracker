import { KeyRound, ShieldCheck, XCircle } from 'lucide-react';

export default function EditModeModal({
  password,
  error,
  isChecking,
  onPasswordChange,
  onCancel,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={onSubmit}
        className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-5"
      >
        <button type="button" onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <XCircle size={24} />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="bg-amber-400/10 border border-amber-400/20 p-3 rounded-xl">
            <ShieldCheck size={28} className="text-amber-300" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Modo Edición</h3>
            <p className="text-xs text-slate-500">Introduce la contraseña de edición</p>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2">
            <KeyRound size={14} /> Contraseña
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            disabled={isChecking}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-400 outline-none"
            autoFocus
            autoComplete="current-password"
          />
        </label>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            disabled={isChecking || !password}
            className="flex-1 py-3 rounded-xl font-black bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 transition-colors"
          >
            {isChecking ? 'Comprobando...' : 'Activar'}
          </button>
        </div>
      </form>
    </div>
  );
}
