import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function TrainingProfilePicker({ user, users, onUserChange, onCreateProfile }) {
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newProfile, setNewProfile] = useState('');
  const [profileError, setProfileError] = useState('');

  function closeProfileForm() {
    setShowCreateProfile(false);
    setNewProfile('');
    setProfileError('');
  }

  function createProfile(event) {
    event.preventDefault();
    const error = onCreateProfile(newProfile.trim());
    if (error) setProfileError(error);
    else closeProfileForm();
  }

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2">
        <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-sm text-slate-400">
          Perfil
          <select value={user.trim() ? user : ''} onChange={(event) => onUserChange(event.target.value)} className="h-11 w-full min-w-0 truncate rounded-xl border border-slate-700 bg-slate-900 px-2 text-slate-100">
            <option value="" disabled>Elige perfil</option>
            {users.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button type="button" aria-expanded={showCreateProfile} onClick={() => showCreateProfile ? closeProfileForm() : setShowCreateProfile(true)} className="flex h-11 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10">
          <Plus size={15} className="shrink-0" /> Crear perfil
        </button>
      </div>
      {showCreateProfile && (
        <form onSubmit={createProfile} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <label className="grid gap-1 text-sm font-bold text-slate-300">
            Nombre del perfil
            <input autoFocus required value={newProfile} onChange={(event) => {
              setNewProfile(event.target.value);
              setProfileError('');
            }} className="min-h-11 min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-100" />
          </label>
          {profileError && <p role="alert" className="text-sm text-red-300">{profileError}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="min-h-11 rounded-lg bg-emerald-500 px-3 text-sm font-bold text-slate-950">Guardar perfil</button>
            <button type="button" onClick={closeProfileForm} className="min-h-11 px-3 text-sm font-bold text-slate-300">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
