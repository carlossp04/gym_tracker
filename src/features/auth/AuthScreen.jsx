import { Cloud, Database, Dumbbell, KeyRound, Lock, LogOut, Mail, ShieldCheck, UserPlus } from 'lucide-react';

export default function AuthScreen({
  hasVault, isRemoteStorage, isRemoteAuthReady, remoteUserEmail,
  accountEmail, accountPassword, accountMode, accountStatus, accountMessage,
  vaultId, password, rememberDevice, isUnlocking, isCheckingRememberedDevice, authError,
  onAccountEmailChange, onAccountPasswordChange, onAccountModeChange, onAccountSubmit, onAccountSignOut,
  onVaultIdChange, onPasswordChange, onRememberDeviceChange, onSubmit, onCreateRemoteVault, onResetVault,
}) {
  const needsRemoteAccount = isRemoteStorage && !remoteUserEmail;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <BrandHeader subtitle={needsRemoteAccount
          ? 'Identifícate para acceder únicamente a tus vaults.'
          : isRemoteStorage
            ? 'Abre o crea un vault cifrado de tu cuenta.'
            : hasVault ? 'Desbloquea tus entrenamientos cifrados.' : 'Crea un vault cifrado con el entreno inicial.'}
        />

        {needsRemoteAccount ? (
          <AccountForm
            isReady={isRemoteAuthReady} email={accountEmail} password={accountPassword}
            mode={accountMode} status={accountStatus} message={accountMessage}
            onEmailChange={onAccountEmailChange} onPasswordChange={onAccountPasswordChange}
            onModeChange={onAccountModeChange} onSubmit={onAccountSubmit}
          />
        ) : (
          <>
            {isRemoteStorage && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cuenta Supabase</p>
                  <p className="truncate text-sm font-bold text-slate-200">{remoteUserEmail}</p>
                </div>
                <button type="button" onClick={onAccountSignOut} className="p-2 text-slate-500 hover:text-red-300" title="Cerrar sesión"><LogOut size={18} /></button>
              </div>
            )}

            <form className="space-y-4" onSubmit={onSubmit}>
              {isRemoteStorage && (
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2"><KeyRound size={14} /> Vault ID</span>
                  <input type="text" value={vaultId} onChange={(event) => onVaultIdChange(event.target.value)} disabled={isCheckingRememberedDevice || isUnlocking} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="mi-vault" autoComplete="username" />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2"><Lock size={14} /> Contraseña del vault</span>
                <input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} disabled={isCheckingRememberedDevice || isUnlocking} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none" autoFocus minLength={6} placeholder="Mínimo 6 caracteres" autoComplete="current-password" />
              </label>

              <p className="text-xs text-slate-500">Esta contraseña cifra los datos en tu navegador y no se envía como credencial de la cuenta.</p>

              <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
                <input type="checkbox" checked={rememberDevice} onChange={(event) => onRememberDeviceChange(event.target.checked)} disabled={isCheckingRememberedDevice || isUnlocking} className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500 focus:ring-emerald-500" />
                <span><span className="block font-bold text-slate-200">Recordar este dispositivo</span><span className="block text-xs text-slate-500">Guarda una clave no extraíble en este navegador.</span></span>
              </label>

              {authError && <StatusMessage kind="error" message={authError} />}

              <button disabled={isCheckingRememberedDevice || isUnlocking || password.length < 6 || (isRemoteStorage && !vaultId.trim())} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                {isRemoteStorage ? <Cloud size={20} /> : hasVault ? <ShieldCheck size={20} /> : <Database size={20} />}
                {isCheckingRememberedDevice ? 'Comprobando dispositivo...' : isUnlocking ? 'Procesando...' : isRemoteStorage ? 'Abrir Vault' : hasVault ? 'Desbloquear' : 'Crear y Entrar'}
              </button>

              {isRemoteStorage && (
                <button type="button" onClick={onCreateRemoteVault} disabled={isCheckingRememberedDevice || isUnlocking || password.length < 6 || !vaultId.trim()} className="w-full border border-slate-700 hover:border-emerald-500 disabled:border-slate-800 disabled:text-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Database size={18} /> Crear vault nuevo
                </button>
              )}
            </form>

            {hasVault && !isRemoteStorage && <button type="button" onClick={onResetVault} className="w-full text-xs font-bold text-slate-500 hover:text-red-300 transition-colors">Recrear vault con export inicial</button>}
          </>
        )}
      </div>
    </div>
  );
}

function BrandHeader({ subtitle }) {
  return (
    <div className="text-center space-y-4">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full"></div>
        <div className="relative bg-slate-950 border border-slate-800 p-4 rounded-2xl"><Dumbbell size={48} className="text-emerald-400" /></div>
      </div>
      <div><h1 className="text-4xl font-black tracking-tight text-white">Gym<span className="text-emerald-400">Tracker</span></h1><p className="text-slate-400 text-sm mt-2">{subtitle}</p></div>
    </div>
  );
}

function AccountForm({ isReady, email, password, mode, status, message, onEmailChange, onPasswordChange, onModeChange, onSubmit }) {
  const isLoading = !isReady || status === 'loading';
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
        {['signin', 'signup'].map((option) => (
          <button key={option} type="button" onClick={() => onModeChange(option)} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === option ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
            {option === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2"><Mail size={14} /> Email</span>
        <input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} disabled={isLoading} required autoComplete="email" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2"><Lock size={14} /> Contraseña de cuenta</span>
        <input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} disabled={isLoading} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
      </label>
      {message && <StatusMessage kind={status === 'error' ? 'error' : 'success'} message={message} />}
      <button disabled={isLoading || !email.trim() || password.length < 8} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2">
        {mode === 'signup' ? <UserPlus size={20} /> : <ShieldCheck size={20} />}{isLoading ? 'Comprobando...' : mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
      </button>
    </form>
  );
}

function StatusMessage({ kind, message }) {
  const classes = kind === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
  return <div className={`border text-sm rounded-xl p-3 ${classes}`}>{message}</div>;
}
