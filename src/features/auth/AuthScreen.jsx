import { Cloud, Database, Dumbbell, KeyRound, Lock, ShieldCheck } from 'lucide-react';

export default function AuthScreen({
  hasVault,
  isRemoteStorage,
  vaultId,
  password,
  isUnlocking,
  authError,
  onVaultIdChange,
  onPasswordChange,
  onSubmit,
  onResetVault,
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full"></div>
            <div className="relative bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <Dumbbell size={48} className="text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white">
              Gym<span className="text-emerald-400">Tracker</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {isRemoteStorage ? 'Sincroniza vault cifrado entre dispositivos.' : hasVault ? 'Desbloquea tus entrenamientos cifrados.' : 'Crea vault cifrado con entreno inicial.'}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {isRemoteStorage && (
            <label className="block">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                <KeyRound size={14} /> Vault ID
              </span>
              <input
                type="text"
                value={vaultId}
                onChange={(event) => onVaultIdChange(event.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="entrenamientos"
                autoComplete="username"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Lock size={14} /> Contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              autoFocus
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              autoComplete="current-password"
            />
          </label>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
              {authError}
            </div>
          )}

          <button
            disabled={isUnlocking || password.length < 6 || (isRemoteStorage && !vaultId.trim())}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isRemoteStorage ? <Cloud size={20} /> : hasVault ? <ShieldCheck size={20} /> : <Database size={20} />}
            {isUnlocking ? 'Procesando...' : isRemoteStorage ? 'Abrir Vault' : hasVault ? 'Desbloquear' : 'Crear y Entrar'}
          </button>
        </form>

        {hasVault && !isRemoteStorage && (
          <button
            type="button"
            onClick={onResetVault}
            className="w-full text-xs font-bold text-slate-500 hover:text-red-300 transition-colors"
          >
            Recrear vault con export inicial
          </button>
        )}
      </div>
    </div>
  );
}
