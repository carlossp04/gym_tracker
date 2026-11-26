import { Check, ChevronDown, CircleStop, Dumbbell, Pause, Pencil, Play, Plus, Save, Settings2, SkipForward, Timer, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { canCompleteSet, isValidSetReps, moreWeightReminderKey } from '../../lib/workoutFlow';

export default function ActiveWorkoutPanel({ workout, moreWeightReminders, restSeconds, onRestSecondsChange, saveStatus, saveMessage, onWorkoutChange, onSaveProgress, onFinish, onCancel }) {
  const [showFinish, setShowFinish] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const discardDialog = useRef(null);
  const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
  const completedSets = allSets.filter((set) => set.completed).length;
  const completion = allSets.length > 0 ? Math.round((completedSets / allSets.length) * 100) : 0;
  const rest = workout.restTimer;
  const showRestRow = restSeconds > 0 || Boolean(rest);
  const changeRest = (restTimer) => onWorkoutChange({ ...workout, restTimer });

  const updateSet = (exerciseId, setId, patch, completedAt) => {
    const current = allSets.find((set) => set.id === setId);
    const next = { ...current, ...patch };
    next.completed = next.completed && canCompleteSet(next);
    let restTimer = rest;
    if (completedAt && restSeconds > 0 && !current.completed && next.completed) {
      restTimer = { setId, endsAt: completedAt + restSeconds * 1000 };
    } else if (rest?.setId === setId && !next.completed) {
      restTimer = null;
    }

    onWorkoutChange({
      ...workout,
      restTimer,
      exercises: workout.exercises.map((exercise) => exercise.id === exerciseId
        ? { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? next : set) }
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

  const confirmDiscard = async () => {
    if (isDiscarding || saveStatus === 'saving') return;
    setIsDiscarding(true);
    try {
      if (await onCancel()) discardDialog.current?.close();
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div className="p-5 border-b border-slate-800 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 break-words">
              <p className="text-xs font-black uppercase tracking-wider text-fuchsia-400">{workout.routineName}</p>
              <h2 className="text-2xl font-black text-white mt-1">{workout.sessionName}</h2>
              <p className="text-sm text-slate-400 mt-1">{workout.user} · {formatDate(workout.date)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {workout.exercises.map((exercise, index) => {
            const reminderKey = moreWeightReminderKey(workout.user, exercise.exercise);
            return (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                reminderKey={reminderKey}
                reminderWeight={moreWeightReminders[reminderKey]}
                onUpdateSet={(setId, patch, completedAt) => updateSet(exercise.id, setId, patch, completedAt)}
                onUpdateExercise={(updater) => updateExercise(exercise.id, updater)}
                onRemove={() => removeExercise(exercise.id)}
              />
            );
          })}
          {workout.exercises.length === 0 && <p className="p-8 text-center text-slate-500">No quedan ejercicios en esta sesión.</p>}
        </div>
      </section>

      <button type="button" onClick={() => discardDialog.current.showModal()} disabled={saveStatus === 'saving'} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-600 disabled:opacity-50">
        <Trash2 size={18} /> Descartar sesión
      </button>

      <dialog
        ref={discardDialog}
        aria-labelledby="discard-title"
        aria-describedby="discard-description"
        onCancel={(event) => { if (isDiscarding) event.preventDefault(); }}
        className="m-auto w-[calc(100%-2rem)] max-w-md space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl backdrop:bg-black/80 sm:p-6"
      >
        <h2 id="discard-title" className="text-xl font-black">¿Descartar esta sesión?</h2>
        <p id="discard-description" className="text-sm text-slate-300">Se eliminará la sesión en curso y se perderán todas sus series.</p>
        {saveStatus === 'error' && <p role="alert" className="text-sm text-red-300">{saveMessage}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => discardDialog.current.close()} disabled={isDiscarding} className="min-h-11 rounded-xl bg-slate-800 px-2 py-2 text-sm font-bold hover:bg-slate-700 disabled:opacity-50">Seguir entrenando</button>
          <button type="button" onClick={confirmDiscard} disabled={isDiscarding || saveStatus === 'saving'} className="min-h-11 rounded-xl bg-red-700 px-2 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
            {isDiscarding ? 'Descartando…' : 'Descartar sesión'}
          </button>
        </div>
      </dialog>

      {saveMessage && <p className={`text-sm rounded-xl border p-3 ${saveStatus === 'error' ? 'text-red-300 bg-red-500/10 border-red-500/30' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'}`}>{saveMessage}</p>}

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 z-20 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-2xl backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm text-slate-300"><strong className="text-emerald-300">{completedSets}/{allSets.length}</strong> series completadas</p>
          <div className="mt-1 h-1.5 max-w-64 overflow-hidden rounded-full bg-slate-950"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${completion}%` }} /></div>
        </div>
        <div className={showRestRow ? 'col-span-3 row-start-2 flex min-w-0 items-center gap-2 border-t border-slate-800 pt-2' : 'col-start-2 row-start-1'}>
          {rest && <RestTimer key={rest.endsAt ?? `paused-${rest.setId}`} rest={rest} onChange={changeRest} />}
          <RestSettings restSeconds={restSeconds} onRestSecondsChange={onRestSecondsChange} hasTimer={Boolean(rest)} iconOnly={!showRestRow} />
        </div>
        <button type="button" onClick={() => setShowFinish(true)} disabled={completedSets === 0} className="col-start-3 row-start-1 min-h-11 px-3 py-2 rounded-xl text-sm font-black bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center gap-2"><CircleStop size={17} /> Finalizar</button>
        {saveStatus === 'error' && <button type="button" onClick={onSaveProgress} className="col-span-3 min-h-11 px-3 py-2 rounded-xl text-sm font-bold bg-slate-800 text-white flex items-center justify-center gap-2"><Save size={17} /> Reintentar guardado</button>}
      </div>
      {showFinish && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="finish-title"><section className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-4"><h2 id="finish-title" className="text-xl font-black">Resumen de la sesión</h2><p className="text-slate-300">Se guardarán {completedSets} series completadas de {allSets.length}.</p>{allSets.length > completedSets && <p className="text-amber-300 text-sm">Quedan {allSets.length - completedSets} series pendientes. Puedes volver para completarlas o finalizar solo con las marcadas.</p>}<ul className="space-y-2 text-sm max-h-56 overflow-auto">{workout.exercises.map((exercise) => <li key={exercise.id} className="flex justify-between gap-3"><span>{exercise.exercise}</span><span className="whitespace-nowrap">{exercise.sets.filter((set) => set.completed).length}/{exercise.sets.length}</span></li>)}</ul><div className="flex gap-3"><button autoFocus type="button" disabled={saveStatus === 'saving'} onClick={() => setShowFinish(false)} className="flex-1 bg-slate-800 rounded-xl py-3 font-bold">Seguir entrenando</button><button type="button" disabled={saveStatus === 'saving'} onClick={async () => { if (await onFinish()) setShowFinish(false); }} className="flex-1 bg-emerald-500 text-slate-950 rounded-xl py-3 font-bold">Guardar y finalizar</button></div>{saveStatus === 'error' && <p role="alert" className="text-sm text-red-300">{saveMessage}</p>}</section></div>}
    </div>
  );
}

const restPresets = [[0, 'Desactivado'], [30, '30 s'], [60, '1 min'], [90, '1 min 30 s'], [120, '2 min'], [180, '3 min']];
const restInputClasses = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2 text-slate-100';

function formatRestTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function RestSettings({ restSeconds, onRestSecondsChange, hasTimer, iconOnly }) {
  const [isCustomRest, setIsCustomRest] = useState(() => !restPresets.some(([seconds]) => seconds === restSeconds));
  const compact = hasTimer || iconOnly;
  const RestIcon = hasTimer ? Settings2 : Timer;

  const saveCustomRest = (event) => {
    event.preventDefault();
    const { minutes, seconds } = event.currentTarget.elements;
    if (!minutes.checkValidity() || !seconds.checkValidity()) return;
    onRestSecondsChange(minutes.valueAsNumber * 60 + seconds.valueAsNumber);
    event.currentTarget.closest('details').open = false;
  };

  return (
    <details className={`${iconOnly ? '' : 'relative'} ${compact ? 'shrink-0' : 'min-w-0 flex-1'}`}>
      <summary aria-label={compact ? 'Configurar descanso' : undefined} title="Configurar descanso" className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg bg-slate-800 text-sm font-bold text-slate-200 hover:bg-slate-700 ${compact ? 'w-11 justify-center' : 'px-3'}`}>
        <RestIcon size={17} className={compact ? 'shrink-0' : 'shrink-0 text-emerald-300'} />
        {!compact && <>
          Descanso · {formatRestTime(restSeconds)}
          <ChevronDown size={16} className="ml-auto shrink-0" />
        </>}
      </summary>
      <div className="absolute bottom-full right-0 z-10 mb-2 max-h-[45dvh] w-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-lg">
        <p className="px-3 pt-2 text-xs text-slate-400">Se aplica al marcar la próxima serie.</p>
        <label className="grid gap-1 px-3 py-2 text-sm font-bold text-slate-300">
          Descanso automático
          <select value={isCustomRest ? 'custom' : restSeconds} onChange={(event) => {
            const value = event.target.value;
            setIsCustomRest(value === 'custom');
            if (value !== 'custom') onRestSecondsChange(Number(value));
          }} className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-2 text-slate-100">
            {restPresets.map(([seconds, label]) => <option key={seconds} value={seconds}>{label}</option>)}
            <option value="custom">Personalizado</option>
          </select>
        </label>
        {isCustomRest && (
          <form onSubmit={saveCustomRest} className="grid grid-cols-2 gap-2 px-3 pb-2 text-sm text-slate-300">
            <label className="grid gap-1">
              Minutos
              <input type="number" name="minutes" inputMode="numeric" min="0" max="59" step="1" required defaultValue={Math.floor(restSeconds / 60)} className={restInputClasses} />
            </label>
            <label className="grid gap-1">
              Segundos
              <input type="number" name="seconds" inputMode="numeric" min="0" max="59" step="1" required defaultValue={restSeconds % 60} className={restInputClasses} />
            </label>
            <button type="submit" className="col-span-2 min-h-11 rounded-lg bg-slate-800 px-3 font-bold text-emerald-300">Guardar duración</button>
          </form>
        )}
      </div>
    </details>
  );
}

function RestTimer({ rest, onChange }) {
  const { endsAt, remainingMs, setId } = rest;
  const [now, setNow] = useState(Date.now);
  const seconds = Math.ceil(Math.max(0, endsAt ? endsAt - now : remainingMs) / 1000);
  const finished = seconds === 0;
  const paused = !endsAt;

  useEffect(() => {
    if (paused || finished) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [paused, finished]);

  function togglePause() {
    if (paused) {
      onChange({ setId, endsAt: Date.now() + remainingMs });
    } else {
      onChange({ setId, remainingMs: Math.max(0, endsAt - Date.now()) });
    }
  }

  return (
    <>
      <Timer size={17} className="shrink-0 text-emerald-300" />
      <div className="min-w-0 flex-1 text-sm text-slate-300">
        {finished ? <span role="status">Descanso terminado</span> : (
          <span>Descanso <strong role="timer" className="ml-1 tabular-nums text-emerald-300">{formatRestTime(seconds)}</strong>{paused && <span className="ml-1 text-xs">En pausa</span>}</span>
        )}
      </div>
      {!finished && (
        <button type="button" onClick={togglePause} aria-label={paused ? 'Reanudar descanso' : 'Pausar descanso'} title={paused ? 'Reanudar descanso' : 'Pausar descanso'} className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-200">
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      )}
      <button type="button" onClick={() => onChange(null)} aria-label={finished ? 'Cerrar aviso de descanso' : 'Saltar descanso'} title={finished ? 'Cerrar aviso de descanso' : 'Saltar descanso'} className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-200">
        {finished ? <X size={17} /> : <SkipForward size={17} />}
      </button>
    </>
  );
}

function ExerciseCard({ exercise, index, reminderKey, reminderWeight, onUpdateSet, onUpdateExercise, onRemove }) {
  const [draftName, setDraftName] = useState(null);
  const dismissedReminderKeys = exercise.dismissMoreWeightReminder === true
    ? [reminderKey]
    : exercise.dismissMoreWeightReminder || [];
  const completed = exercise.sets.filter((set) => set.completed).length;
  const saveName = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    if (name !== exercise.exercise) {
      onUpdateExercise((current) => ({
        ...current,
        exercise: name,
        dismissMoreWeightReminder: dismissedReminderKeys,
      }));
    }
    setDraftName(null);
  };

  const applyToPending = (event, field) => {
    event.preventDefault();
    const input = event.currentTarget.elements.valueToApply;
    if (!input.checkValidity()) return;
    const value = input.value;
    onUpdateExercise((current) => ({
      ...current,
      sets: current.sets.map((set) => set.completed ? set : { ...set, [field]: value }),
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
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400 font-black">EJERCICIO {index + 1}</p>
          <div className="flex items-center gap-3">
            {draftName === null ? (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <h3 className="min-w-0 break-words text-lg font-black text-white">{exercise.exercise}</h3>
                <button type="button" aria-label={`Editar nombre de ${exercise.exercise}`} title="Editar nombre" onClick={() => setDraftName(exercise.exercise)} className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
                  <Pencil size={15} />
                </button>
              </div>
            ) : (
              <form className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] min-w-0 flex-1 items-center gap-1" onSubmit={saveName} onKeyDown={(event) => {
                if (event.key === 'Escape') setDraftName(null);
              }}>
                <input autoFocus type="text" aria-label="Nombre del ejercicio" value={draftName} onChange={(event) => setDraftName(event.target.value)} className={`${setInputClasses} ${neutralInputColors}`} />
                <button type="submit" disabled={!draftName.trim()} aria-label="Guardar nombre" title="Guardar nombre" className="grid size-11 place-items-center rounded-lg bg-slate-800 text-emerald-300 disabled:opacity-40"><Check size={18} /></button>
                <button type="button" onClick={() => setDraftName(null)} aria-label="Cancelar edición del nombre" title="Cancelar" className="grid size-11 place-items-center rounded-lg text-slate-400 hover:bg-slate-800"><X size={18} /></button>
              </form>
            )}
            <button type="button" onClick={onRemove} aria-label="Omitir ejercicio" title="Omitir ejercicio" className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-300">
              <Trash2 size={17} />
            </button>
          </div>
          {exercise.notes && <p className="text-xs text-amber-300 mt-1">{exercise.notes}</p>}
          {exercise.previousWeight != null && <p className="text-xs text-slate-400 mt-1">Último peso registrado: {exercise.previousWeight} kg</p>}
          {reminderWeight != null && !dismissedReminderKeys.includes(reminderKey) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
              <p className="text-emerald-300">Pendiente: probar más peso que {reminderWeight} kg</p>
              <button type="button" onClick={() => onUpdateExercise((current) => ({ ...current, dismissMoreWeightReminder: [...dismissedReminderKeys, reminderKey] }))} className="py-2 text-slate-400 underline hover:text-white">Quitar aviso</button>
            </div>
          )}
          <p className="text-xs text-emerald-400 mt-1">{completed}/{exercise.sets.length} series</p>
        </div>
      </div>

      <div>
        <div>
          <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem_2.75rem] sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_4rem_2.75rem] gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400"><span>Serie</span><span>Reps</span><span>Peso kg</span><span className="text-center">Hecha</span></div>
          {exercise.sets.map((set) => {
            const canComplete = canCompleteSet(set);
            const invalidReps = String(set.actualReps ?? '') !== '' && !isValidSetReps(set.actualReps);
            return (
              <div key={set.id} className={`grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem_2.75rem] sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_4rem_2.75rem] gap-x-2 gap-y-1 items-center px-3 py-3 border-t border-slate-800/70 ${set.completed ? 'bg-emerald-500/[0.06]' : ''}`}>
                <span className="text-center font-black text-white">{set.number}</span>
                <input aria-invalid={invalidReps} aria-describedby={`set-target-${set.id}`} aria-label={`Repeticiones serie ${set.number} de ${exercise.exercise}`} inputMode="numeric" type="number" min="1" step="1" value={set.actualReps} onChange={(event) => onUpdateSet(set.id, { actualReps: event.target.value })} className={`${setInputClasses} ${neutralInputColors}`} />
                <input aria-label={`Peso serie ${set.number} de ${exercise.exercise}`} inputMode="decimal" type="number" min="0.1" step="0.1" value={set.weight} onChange={(event) => onUpdateSet(set.id, { weight: event.target.value })} className={`${setInputClasses} ${weightInputColors}`} />
                <div className="flex justify-center"><button type="button" onClick={() => onUpdateSet(set.id, { completed: !set.completed }, Date.now())} disabled={!canComplete && !set.completed} aria-pressed={set.completed} className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${set.completed ? 'bg-emerald-500 border-emerald-400 text-slate-950' : canComplete ? 'bg-slate-900 border-slate-700 text-slate-500 hover:border-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-700 opacity-40'}`} aria-label={`Marcar serie ${set.number} de ${exercise.exercise}`}><Check size={20} strokeWidth={3} /></button></div>
                <button type="button" onClick={() => removeSet(set.id)} disabled={exercise.sets.length <= 1} aria-label={`Eliminar serie ${set.number} de ${exercise.exercise}`} className="grid size-11 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300 disabled:invisible"><Trash2 size={16} /></button>
                <span id={`set-target-${set.id}`} className={`col-start-2 row-start-2 text-[10px] ${invalidReps ? 'text-red-300' : 'text-slate-400'}`}>{invalidReps ? 'Reps sin decimales, mínimo 1' : `Objetivo: ${set.targetReps}`}</span>
              </div>
            );
          })}
        </div>
      </div>
      <button type="button" onClick={addSet} className="w-full border-t border-slate-800 py-3 text-sm font-bold text-slate-500 hover:text-emerald-400 hover:bg-slate-900 flex items-center justify-center gap-2"><Plus size={15} /> Añadir serie</button>
      <details className="group border-t border-slate-800">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-bold text-slate-300">
          Ajustar pendientes <ChevronDown size={16} className="group-open:rotate-180" />
        </summary>
        <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
          <PendingSetsField label="Reps" buttonLabel="Aplicar repeticiones a pendientes" min="1" step="1" inputMode="numeric" defaultValue={exercise.sets.find((set) => isValidSetReps(set.actualReps))?.actualReps ?? ''} onSubmit={(event) => applyToPending(event, 'actualReps')} />
          <PendingSetsField label="Peso kg" inputColors={weightInputColors} buttonLabel="Aplicar peso a pendientes" min="0.1" step="0.1" inputMode="decimal" defaultValue={exercise.sets.find((set) => set.weight)?.weight || ''} onSubmit={(event) => applyToPending(event, 'weight')} />
        </div>
      </details>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 border-t border-slate-800 px-3 py-2 text-sm text-slate-300">
        <input type="checkbox" checked={Boolean(exercise.moreWeightNextTime)} onChange={(event) => {
          const moreWeightNextTime = event.target.checked;
          onUpdateExercise((current) => ({ ...current, moreWeightNextTime }));
        }} className="size-4 shrink-0 accent-emerald-500" />
        Más peso la siguiente vez
      </label>
    </article>
  );
}

function PendingSetsField({ label, inputColors = neutralInputColors, buttonLabel, min, step, inputMode, defaultValue, onSubmit }) {
  return (
    <form className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-end gap-2" onSubmit={onSubmit}>
      <label className="grid gap-1 text-xs font-bold text-slate-300">
        {label}
        <input name="valueToApply" type="number" required min={min} step={step} inputMode={inputMode} defaultValue={defaultValue} className={`w-full min-w-0 min-h-11 border rounded-lg px-3 text-sm font-normal text-white ${inputColors}`} />
      </label>
      <button type="submit" aria-label={buttonLabel} className="min-h-11 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-black text-slate-200">Aplicar a pendientes</button>
    </form>
  );
}

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

const setInputClasses = 'w-full min-w-0 h-11 border rounded-lg px-2 text-white focus:outline-none focus:border-emerald-500';

const neutralInputColors = 'bg-slate-900 border-slate-700';
const weightInputColors = 'bg-emerald-500/10 border-emerald-500/25';
