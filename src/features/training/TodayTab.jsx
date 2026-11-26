import { ArrowRight, ChevronDown, Play, Plus } from 'lucide-react';

export default function TodayTab({
  user, users, onUserChange, activeWorkout, routines, entries, isSaving,
  routineId, onRoutineChange, onContinue, onFreeSession, onRoutineStart, onCreateRoutine, onRepeat, onOpenWorkout,
}) {
  const availableRoutines = routines.map((routine) => ({
    ...routine,
    sessions: routine.sessions.filter((session) => session.exercises.length > 0),
  })).filter((routine) => routine.sessions.length > 0);
  const routine = availableRoutines.find((item) => item.id === routineId) ?? availableRoutines[0];
  const profile = user.trim();
  const profileEntries = entries.filter((entry) => entry.user === profile);
  const latest = profileEntries[0];
  const latestEntries = latest ? profileEntries.filter((entry) => entry.workoutKey === latest.workoutKey) : [];
  const completedSets = activeWorkout?.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0,
  );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-3xl font-black text-white">Hoy</h2>
        <label className="flex min-w-0 items-center gap-2 text-sm text-slate-400">
          Perfil
          <input list="today-users" value={user} onChange={(event) => onUserChange(event.target.value)} placeholder="Tu nombre" className="min-h-11 w-32 min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-100 placeholder:text-slate-500 sm:w-44" />
          <datalist id="today-users">{users.map((name) => <option key={name} value={name} />)}</datalist>
        </label>
      </header>

      <section className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 sm:p-5">
        {activeWorkout ? (
          <>
            <div>
              <p className="text-sm font-bold text-emerald-300">En curso</p>
              <h3 className="mt-1 break-words text-xl font-black text-white">{activeWorkout.sessionName}</h3>
              <p className="mt-1 text-sm text-slate-400">{activeWorkout.user} · {completedSets} {completedSets === 1 ? 'serie completada' : 'series completadas'}</p>
            </div>
            <button type="button" onClick={onContinue} className={startButtonClasses}><Play size={18} /> Continuar entrenamiento</button>
          </>
        ) : routine ? (
          <>
            {availableRoutines.length > 1 ? (
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                Rutina
                <select value={routine.id} onChange={(event) => onRoutineChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base font-medium text-slate-100">
                  {availableRoutines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            ) : <h3 className="break-words text-xl font-black text-white">{routine.name}</h3>}
            {!profile && <p className="text-sm text-slate-400">Escribe tu nombre en Perfil para empezar.</p>}
            <div className="space-y-2">
              {routine.sessions.map((session) => {
                const previous = profileEntries.find((entry) => entry.dayLabel === session.name);
                const exerciseCount = session.exercises.length;
                return (
                  <details key={JSON.stringify([routine.id, session.id])} name="today-session" className="group rounded-xl border border-slate-800 bg-slate-900">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 p-3">
                      <span className="min-w-0">
                        <span className="block break-words font-bold text-white">{session.name}</span>
                        <span className="block text-sm text-slate-400">
                          {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}{previous && ` · Última vez: ${previous.date}`}
                        </span>
                      </span>
                      <ChevronDown size={18} className="shrink-0 text-slate-400 group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 border-t border-slate-800 p-3">
                      <ul className="divide-y divide-slate-800 text-sm text-slate-200">
                        {session.exercises.map((exercise) => (
                          <li key={exercise.id} className="flex justify-between gap-3 py-2">
                            <span className="min-w-0 break-words">{exercise.exercise}</span>
                            <span className="shrink-0 text-slate-400">{exercise.targetSets} × {exercise.targetReps}</span>
                          </li>
                        ))}
                      </ul>
                      <button type="button" disabled={!profile || isSaving} onClick={() => onRoutineStart(routine.id, session.id, profile)} className={startButtonClasses}>
                        <Play size={18} /> Empezar sesión
                      </button>
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-black text-white">Empieza con una sesión libre</h3>
            <button type="button" onClick={onFreeSession} className={startButtonClasses}><Play size={18} /> Sesión libre</button>
          </>
        )}
      </section>

      {!activeWorkout && (
        <button type="button" onClick={routine ? onFreeSession : onCreateRoutine} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10">
          <Plus size={16} /> {routine ? 'Sesión libre' : 'Crear una rutina'}
        </button>
      )}

      {latest && (
        <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <p className="text-xs font-bold text-slate-400">Último entrenamiento · {latest.date}</p>
          <h3 className="break-words font-bold text-white">{latest.dayLabel}</h3>
          <p className="text-sm text-slate-400">{new Set(latestEntries.map((entry) => entry.exercise)).size} ejercicios · {latestEntries.reduce((sum, entry) => sum + entry.sets, 0)} series</p>
          <div className="flex flex-wrap gap-x-4">
            {!activeWorkout && <button type="button" disabled={isSaving} onClick={() => onRepeat(latestEntries)} className="min-h-11 text-sm font-bold text-slate-300 hover:text-white disabled:opacity-50">Repetir hoy</button>}
            <button type="button" onClick={() => onOpenWorkout(latest)} className="flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200">Ver detalle <ArrowRight size={15} /></button>
          </div>
        </section>
      )}
    </div>
  );
}

const startButtonClasses = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-black text-slate-950 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-400';
