import { Check, CircleStop, Dumbbell, Plus, Save, Trash2, X } from 'lucide-react';

export default function ActiveWorkoutPanel({ workout, saveStatus, saveMessage, onWorkoutChange, onSaveProgress, onFinish, onCancel }) {
  const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
  const completedSets = allSets.filter((set) => set.completed).length;
  const completion = allSets.length > 0 ? Math.round((completedSets / allSets.length) * 100) : 0;

  const updateSet = (exerciseId, setId, patch) => {
    onWorkoutChange({
      ...workout,
      exercises: workout.exercises.map((exercise) => exercise.id === exerciseId
        ? { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }
        : exercise),
    });
  };

  const updateExercise = (exerciseId, updater) => {
    onWorkoutChange({
      ...workout,
      exercises: workout.exercises.map((exercise) => exercise.id === exerciseId ? updater(exercise) : exercise),
    });
  };

  const removeExercise = (exerciseId) => {
    if (!window.confirm('¿Omitir este ejercicio del entrenamiento actual?')) return;
    onWorkoutChange({ ...workout, exercises: workout.exercises.filter((exercise) => exercise.id !== exerciseId) });
  };

  const finishWorkout = () => {
    const incomplete = allSets.length - completedSets;
    const message = incomplete > 0
      ? `Hay ${incomplete} serie(s) sin completar. Solo se guardarán las ${completedSets} marcadas. ¿Finalizar?`
      : `Se guardarán ${completedSets} series completadas. ¿Finalizar entrenamiento?`;
    if (window.confirm(message)) onFinish();
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-fuchsia-400">{workout.routineName}</p>
              <h2 className="text-2xl font-black text-white mt-1">{workout.sessionName}</h2>
              <p className="text-sm text-slate-400 mt-1">{workout.user} · {formatDate(workout.date)}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-3xl font-black text-emerald-400">{completedSets}/{allSets.length}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">series completadas</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-950 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${completion}%` }} /></div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {workout.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              onUpdateSet={(setId, patch) => updateSet(exercise.id, setId, patch)}
              onUpdateExercise={(updater) => updateExercise(exercise.id, updater)}
              onRemove={() => removeExercise(exercise.id)}
            />
          ))}
          {workout.exercises.length === 0 && <p className="p-8 text-center text-slate-500">No quedan ejercicios en esta sesión.</p>}
        </div>
      </section>

      {saveMessage && <p className={`text-sm rounded-xl border p-3 ${saveStatus === 'error' ? 'text-red-300 bg-red-500/10 border-red-500/30' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'}`}>{saveMessage}</p>}

      <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl p-3 shadow-2xl flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={onCancel} disabled={saveStatus === 'saving'} className="px-4 py-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/10 flex items-center justify-center gap-2"><X size={17} /> Descartar</button>
        <button type="button" onClick={onSaveProgress} disabled={saveStatus === 'saving'} className="sm:ml-auto px-5 py-3 rounded-xl text-sm font-black bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 text-white flex items-center justify-center gap-2"><Save size={17} /> Guardar progreso</button>
        <button type="button" onClick={finishWorkout} disabled={saveStatus === 'saving' || completedSets === 0} className="px-5 py-3 rounded-xl text-sm font-black bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center gap-2"><CircleStop size={17} /> Finalizar</button>
      </div>
    </div>
  );
}

function ExerciseCard({ exercise, index, onUpdateSet, onUpdateExercise, onRemove }) {
  const completed = exercise.sets.filter((set) => set.completed).length;
  const applyWeightToAll = (event) => {
    const weight = event.currentTarget.form.elements.bulkWeight.value;
    if (!weight || Number(weight) <= 0) return;
    onUpdateExercise((current) => ({
      ...current,
      sets: current.sets.map((set) => ({ ...set, weight, completed: false })),
    }));
  };

  const addSet = () => {
    const previous = exercise.sets[exercise.sets.length - 1];
    onUpdateExercise((current) => ({
      ...current,
      sets: [...current.sets, {
        id: crypto.randomUUID(),
        number: current.sets.length + 1,
        targetReps: previous?.targetReps || 10,
        actualReps: previous?.actualReps || previous?.targetReps || 10,
        weight: previous?.weight || '',
        completed: false,
      }],
    }));
  };

  const removeSet = (setId) => {
    onUpdateExercise((current) => ({
      ...current,
      sets: current.sets
        .filter((set) => set.id !== setId)
        .map((set, setIndex) => ({ ...set, number: setIndex + 1 })),
    }));
  };

  return (
    <article className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="min-w-0 flex-1"><p className="text-xs text-slate-600 font-black">EJERCICIO {index + 1}</p><h3 className="text-lg font-black text-white truncate">{exercise.exercise}</h3><p className="text-xs text-emerald-400 mt-1">{completed}/{exercise.sets.length} series</p></div>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); applyWeightToAll(event); }}>
          <input name="bulkWeight" type="number" min="0.1" step="0.1" defaultValue={exercise.sets.find((set) => set.weight)?.weight || ''} placeholder="Peso kg" className="w-28 h-10 bg-slate-900 border border-slate-700 rounded-lg px-3 text-sm text-white" />
          <button className="h-10 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-black text-slate-200">Aplicar a todas</button>
        </form>
        <button type="button" onClick={onRemove} className="p-2 text-slate-600 hover:text-red-300 self-end lg:self-auto" title="Omitir ejercicio"><Trash2 size={17} /></button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[530px]">
          <div className="grid grid-cols-[4rem_1fr_1fr_5rem] gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600"><span>Serie</span><span>Reps reales</span><span>Peso</span><span className="text-center">Hecha</span></div>
          {exercise.sets.map((set) => {
            const canComplete = Number(set.actualReps) > 0 && Number(set.weight) > 0;
            return (
              <div key={set.id} className={`grid grid-cols-[4rem_1fr_1fr_5rem] gap-3 items-center px-4 py-3 border-t border-slate-800/70 ${set.completed ? 'bg-emerald-500/[0.06]' : ''}`}>
                <div className="flex items-center gap-1"><span className="font-black text-white">{set.number}</span><button type="button" onClick={() => removeSet(set.id)} disabled={exercise.sets.length <= 1} className="p-1 text-slate-700 hover:text-red-300 disabled:hidden"><Trash2 size={12} /></button></div>
                <label className="relative"><input type="number" min="1" step="1" value={set.actualReps} onChange={(event) => onUpdateSet(set.id, { actualReps: event.target.value, completed: false })} className={setInputClasses} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">/ {set.targetReps}</span></label>
                <label className="relative"><input type="number" min="0.1" step="0.1" value={set.weight} onChange={(event) => onUpdateSet(set.id, { weight: event.target.value, completed: false })} className={setInputClasses} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">kg</span></label>
                <div className="flex justify-center"><button type="button" onClick={() => canComplete && onUpdateSet(set.id, { completed: !set.completed })} disabled={!canComplete} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${set.completed ? 'bg-emerald-500 border-emerald-400 text-slate-950' : canComplete ? 'bg-slate-900 border-slate-700 text-transparent hover:border-emerald-500' : 'bg-slate-900 border-slate-800 text-transparent opacity-40'}`} aria-label={`Marcar serie ${set.number}`}><Check size={20} strokeWidth={3} /></button></div>
              </div>
            );
          })}
        </div>
      </div>
      <button type="button" onClick={addSet} className="w-full border-t border-slate-800 py-3 text-sm font-bold text-slate-500 hover:text-emerald-400 hover:bg-slate-900 flex items-center justify-center gap-2"><Plus size={15} /> Añadir serie</button>
    </article>
  );
}

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

const setInputClasses = 'w-full h-10 bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-12 text-white focus:outline-none focus:border-emerald-500';
