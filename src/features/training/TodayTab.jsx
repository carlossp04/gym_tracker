import { ArrowRight, Play, Plus } from 'lucide-react';

export default function TodayTab({ user, users, onUserChange, activeWorkout, routines, entries, onStart, onRoutineStart, onCreateRoutine, onRepeat, onOpenWorkout }) {
  const userEntries = entries.filter((entry) => entry.user === user);
  const latest = userEntries[0];
  const latestEntries = latest ? userEntries.filter((entry) => entry.workoutKey === latest.workoutKey) : [];
  const session = routines.flatMap((routine) => routine.sessions.map((item) => ({ ...item, routineId: routine.id, routineName: routine.name }))).find((item) => item.exercises.length > 0);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weeklySessions = new Set(userEntries.filter((entry) => {
    const [d, m, y] = entry.date.split(/[/.-]/).map(Number);
    const date = new Date(y < 100 ? 2000 + y : y, m - 1, d);
    return date >= weekStart && date <= new Date();
  }).map((entry) => entry.workoutKey)).size;
  return <div className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3 items-end"><div><h2 className="text-3xl font-black">Tu entrenamiento de hoy</h2><p className="text-slate-400 mt-2">{weeklySessions} sesiones esta semana</p></div><label className="text-sm text-slate-300">Perfil<input aria-label="Perfil de entrenamiento" list="today-users" value={user} onChange={(event) => onUserChange(event.target.value)} placeholder="Tu nombre" className="block mt-1 rounded-xl bg-slate-900 border border-slate-700 p-3 w-full" /><datalist id="today-users">{users.map((name) => <option key={name} value={name} />)}</datalist></label></div>
    <section className="rounded-3xl bg-emerald-500/10 border border-emerald-500/30 p-6 space-y-4">
      <h3 className="text-xl font-bold">{activeWorkout ? `En curso: ${activeWorkout.sessionName}` : session ? session.name : '¿Listo para entrenar?'}</h3>
      <p className="text-slate-300">{activeWorkout ? `${activeWorkout.user} · ${activeWorkout.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed).length} series completadas` : session ? `${session.routineName} · ${session.exercises.length} ejercicios. Puedes elegir otra sesión antes de empezar.` : 'Registra una sesión libre o prepara tu primera rutina.'}</p>
      <button type="button" onClick={onStart} className="w-full sm:w-auto px-6 py-4 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center gap-2"><Play size={18} />{activeWorkout ? 'Continuar entrenamiento' : session ? 'Elegir y empezar sesión' : 'Registrar entrenamiento'}</button>
      {!activeWorkout && session && <button type="button" disabled={!user.trim()} onClick={() => onRoutineStart(session.routineId, session.id)} className="text-emerald-300 font-bold disabled:opacity-40">Empezar {session.name} directamente →</button>}
      {!session && <button type="button" onClick={onCreateRoutine} className="text-emerald-300 font-bold flex items-center gap-2"><Plus size={16} /> Crear mi primera rutina</button>}
    </section>
    {latest && <section className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4"><div><p className="text-sm text-slate-400">Último entrenamiento · {latest.date}</p><h3 className="text-xl font-bold mt-1">{latest.dayLabel}</h3><p className="text-slate-400 mt-2">{new Set(latestEntries.map((entry) => entry.exercise)).size} ejercicios · {latestEntries.reduce((sum, entry) => sum + entry.sets, 0)} series</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => onRepeat(latestEntries)} className="px-4 py-3 rounded-xl bg-slate-800 font-bold">Repetir hoy</button><button type="button" onClick={() => onOpenWorkout(latest)} className="px-4 py-3 text-emerald-300 font-bold flex items-center gap-2">Ver detalle <ArrowRight size={16} /></button></div></section>}
  </div>;
}
