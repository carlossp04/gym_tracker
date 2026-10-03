import { useState } from 'react';
import { ArrowDown, ArrowUp, LayoutTemplate, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import RoutineImportModal from './RoutineImportModal';

export default function RoutinesTab({ canEdit, routines, exerciseOptions, saveStatus, saveMessage, onSaveRoutines }) {
  const [selectedRoutineId, setSelectedRoutineId] = useState(() => routines[0]?.id || '');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId) || routines[0] || null;
  const selectedSession = selectedRoutine?.sessions.find((session) => session.id === selectedSessionId)
    || selectedRoutine?.sessions[0]
    || null;

  const createRoutine = async (event) => {
    event.preventDefault();
    if (!newRoutineName.trim()) return;
    const routine = { id: crypto.randomUUID(), name: newRoutineName.trim(), sessions: [] };
    if (await onSaveRoutines([...routines, routine])) {
      setSelectedRoutineId(routine.id);
      setSelectedSessionId('');
      setNewRoutineName('');
    }
  };

  const createSession = async (event) => {
    event.preventDefault();
    if (!selectedRoutine || !newSessionName.trim()) return;
    const session = { id: crypto.randomUUID(), name: newSessionName.trim(), exercises: [] };
    const nextRoutines = updateRoutine(routines, selectedRoutine.id, (routine) => ({
      ...routine,
      sessions: [...routine.sessions, session],
    }));
    if (await onSaveRoutines(nextRoutines)) {
      setSelectedSessionId(session.id);
      setNewSessionName('');
    }
  };

  const deleteRoutine = async () => {
    if (!selectedRoutine || !window.confirm(`¿Eliminar la rutina "${selectedRoutine.name}"?`)) return;
    const nextRoutines = routines.filter((routine) => routine.id !== selectedRoutine.id);
    if (await onSaveRoutines(nextRoutines)) {
      setSelectedRoutineId(nextRoutines[0]?.id || '');
      setSelectedSessionId('');
    }
  };

  const deleteSession = async () => {
    if (!selectedRoutine || !selectedSession || !window.confirm(`¿Eliminar la sesión "${selectedSession.name}"?`)) return;
    const nextRoutines = updateRoutine(routines, selectedRoutine.id, (routine) => ({
      ...routine,
      sessions: routine.sessions.filter((session) => session.id !== selectedSession.id),
    }));
    if (await onSaveRoutines(nextRoutines)) setSelectedSessionId('');
  };

  const importRoutine = async (routine) => {
    if (await onSaveRoutines([...routines, routine])) {
      setSelectedRoutineId(routine.id);
      setSelectedSessionId(routine.sessions[0]?.id || '');
      return true;
    }
    return false;
  };

  if (!canEdit) return <RoutineReadView routines={routines} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3"><LayoutTemplate className="text-fuchsia-400" size={30} /> Rutinas y plantillas</h2>
        <p className="text-sm text-slate-400">Organiza una rutina en sesiones y define las series y repeticiones objetivo.</p>
      </header>

      <div className="flex justify-center">
        <button type="button" onClick={() => setShowImportModal(true)} className="px-5 py-3 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-200 rounded-xl font-black flex items-center gap-2"><Sparkles size={18} /> Importar rutina con IA</button>
      </div>

      {saveStatus === 'success' && saveMessage && <p className="max-w-2xl mx-auto text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">{saveMessage}</p>}

      <form onSubmit={createRoutine} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <input value={newRoutineName} onChange={(event) => setNewRoutineName(event.target.value)} placeholder="Nueva rutina, por ejemplo Torso/Pierna" className={`${inputClasses} flex-1`} />
        <button disabled={!newRoutineName.trim() || saveStatus === 'saving'} className={primaryButtonClasses}><Plus size={17} /> Crear rutina</button>
      </form>

      {routines.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-3xl p-10 text-center text-slate-500"><LayoutTemplate size={42} className="mx-auto mb-3 opacity-40" /><p className="font-bold">Crea tu primera rutina para empezar.</p></div>
      ) : (
        <div className="grid lg:grid-cols-[18rem_1fr] gap-5 items-start">
          <aside className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
            <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Rutinas</p>
            {routines.map((routine) => (
              <button key={routine.id} type="button" onClick={() => { setSelectedRoutineId(routine.id); setSelectedSessionId(''); }} className={`w-full text-left rounded-xl px-3 py-3 ${routine.id === selectedRoutine?.id ? 'bg-fuchsia-500 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}>
                <span className="block font-black truncate">{routine.name}</span><span className={`text-xs ${routine.id === selectedRoutine?.id ? 'text-fuchsia-100' : 'text-slate-600'}`}>{routine.sessions.length} sesiones</span>
              </button>
            ))}
          </aside>

          {selectedRoutine && (
            <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <RoutineHeader key={selectedRoutine.id} routine={selectedRoutine} routines={routines} isSaving={saveStatus === 'saving'} onSaveRoutines={onSaveRoutines} onDelete={deleteRoutine} />

              <div className="p-5 border-b border-slate-800 space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedRoutine.sessions.map((session) => (
                    <button key={session.id} type="button" onClick={() => setSelectedSessionId(session.id)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${session.id === selectedSession?.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-400'}`}>{session.name}</button>
                  ))}
                </div>
                <form onSubmit={createSession} className="flex flex-col sm:flex-row gap-2">
                  <input value={newSessionName} onChange={(event) => setNewSessionName(event.target.value)} placeholder="Nueva sesión, por ejemplo Tren superior A" className={`${inputClasses} flex-1`} />
                  <button disabled={!newSessionName.trim() || saveStatus === 'saving'} className={secondaryButtonClasses}><Plus size={17} /> Añadir sesión</button>
                </form>
              </div>

              {selectedSession ? (
                <SessionEditor key={selectedSession.id} routine={selectedRoutine} session={selectedSession} routines={routines} exerciseOptions={exerciseOptions} isSaving={saveStatus === 'saving'} onSaveRoutines={onSaveRoutines} onDelete={deleteSession} />
              ) : <p className="p-8 text-center text-slate-500">Añade una sesión a esta rutina.</p>}
            </section>
          )}
        </div>
      )}

      {showImportModal && (
        <RoutineImportModal
          existingRoutines={routines}
          isSaving={saveStatus === 'saving'}
          onImport={importRoutine}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}

function RoutineHeader({ routine, routines, isSaving, onSaveRoutines, onDelete }) {
  const [name, setName] = useState(routine.name);

  const saveName = async () => {
    if (!name.trim()) return;
    await onSaveRoutines(updateRoutine(routines, routine.id, (item) => ({ ...item, name: name.trim() })));
  };

  return (
    <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-end gap-3">
      <label className="block flex-1"><span className={labelClasses}>Nombre de la rutina</span><input value={name} onChange={(event) => setName(event.target.value)} className={inputClasses} /></label>
      <button type="button" onClick={saveName} disabled={isSaving || !name.trim() || name.trim() === routine.name} className={secondaryButtonClasses}><Save size={16} /> Guardar nombre</button>
      <button type="button" onClick={onDelete} disabled={isSaving} className={dangerButtonClasses}><Trash2 size={16} /> Eliminar</button>
    </div>
  );
}

function SessionEditor({ routine, session, routines, exerciseOptions, isSaving, onSaveRoutines, onDelete }) {
  const [name, setName] = useState(session.name);
  const [exercises, setExercises] = useState(() => session.exercises.map((item) => ({ ...item })));
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const addExercise = (event) => {
    event.preventDefault();
    const targetSets = Number(sets);
    const targetReps = Number(reps);
    if (!exercise.trim() || !Number.isInteger(targetSets) || targetSets <= 0 || !Number.isInteger(targetReps) || targetReps <= 0) {
      setError('Completa un ejercicio, series y repeticiones válidas.');
      return;
    }
    setExercises((current) => [...current, { id: crypto.randomUUID(), exercise: exercise.trim(), targetSets, targetReps, notes: notes.trim() }]);
    setExercise('');
    setNotes('');
    setError('');
  };

  const saveSession = async () => {
    const hasInvalidExercise = exercises.some((item) =>
      !item.exercise.trim()
      || !Number.isInteger(Number(item.targetSets))
      || Number(item.targetSets) <= 0
      || !Number.isInteger(Number(item.targetReps))
      || Number(item.targetReps) <= 0,
    );
    if (!name.trim() || exercises.length === 0 || hasInvalidExercise) {
      setError('La sesión necesita nombre y ejercicios con series y repeticiones válidas.');
      return;
    }
    const nextRoutines = updateRoutine(routines, routine.id, (item) => ({
      ...item,
      sessions: item.sessions.map((entry) => entry.id === session.id ? { ...entry, name: name.trim(), exercises } : entry),
    }));
    if (await onSaveRoutines(nextRoutines)) setError('');
  };

  const moveExercise = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return;
    setExercises((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateExercise = (exerciseId, patch) => {
    setExercises((current) => current.map((item) => item.id === exerciseId ? { ...item, ...patch } : item));
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="block flex-1"><span className={labelClasses}>Nombre de la sesión</span><input value={name} onChange={(event) => setName(event.target.value)} className={inputClasses} /></label>
        <button type="button" onClick={onDelete} disabled={isSaving} className={dangerButtonClasses}><Trash2 size={16} /> Eliminar sesión</button>
      </div>

      <form onSubmit={addExercise} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 grid sm:grid-cols-[1fr_7rem_7rem_auto] gap-3 items-end">
        <label className="block"><span className={labelClasses}>Ejercicio</span><input list="routine-exercises" value={exercise} onChange={(event) => setExercise(event.target.value)} placeholder="Press banca" className={inputClasses} /><datalist id="routine-exercises">{exerciseOptions.map((option) => <option key={option} value={option} />)}</datalist></label>
        <label className="block"><span className={labelClasses}>Series</span><input type="number" min="1" value={sets} onChange={(event) => setSets(event.target.value)} className={inputClasses} /></label>
        <label className="block"><span className={labelClasses}>Reps</span><input type="number" min="1" value={reps} onChange={(event) => setReps(event.target.value)} className={inputClasses} /></label>
        <button className={primaryButtonClasses}><Plus size={17} /> Añadir</button>
        <label className="block sm:col-span-4"><span className={labelClasses}>Notas opcionales</span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Por pierna, agarre neutro..." maxLength={250} className={inputClasses} /></label>
      </form>

      <div className="border border-slate-800 rounded-2xl overflow-hidden">
        {exercises.length === 0 ? <p className="p-6 text-center text-slate-600">Añade el primer ejercicio.</p> : exercises.map((item, index) => (
          <div key={item.id} className="px-4 py-3 border-b last:border-b-0 border-slate-800 grid sm:grid-cols-[2rem_1fr_6rem_6rem_auto] items-center gap-3">
            <span className="hidden sm:block text-slate-600 font-black">{index + 1}.</span>
            <div className="space-y-1"><input list="routine-exercises" value={item.exercise} onChange={(event) => updateExercise(item.id, { exercise: event.target.value })} aria-label={`Ejercicio ${index + 1}`} className={compactInputClasses} /><input value={item.notes || ''} onChange={(event) => updateExercise(item.id, { notes: event.target.value })} maxLength={250} placeholder="Notas opcionales" aria-label={`Notas de ${item.exercise}`} className={`${compactInputClasses} text-xs text-amber-200`} /></div>
            <label><span className="sm:hidden text-[10px] text-slate-500">Series</span><input type="number" min="1" step="1" value={item.targetSets} onChange={(event) => updateExercise(item.id, { targetSets: Number(event.target.value) })} aria-label={`Series de ${item.exercise}`} className={compactInputClasses} /></label>
            <label><span className="sm:hidden text-[10px] text-slate-500">Reps</span><input type="number" min="1" step="1" value={item.targetReps} onChange={(event) => updateExercise(item.id, { targetReps: Number(event.target.value) })} aria-label={`Repeticiones de ${item.exercise}`} className={compactInputClasses} /></label>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => moveExercise(index, -1)} disabled={index === 0} className={iconButtonClasses}><ArrowUp size={15} /></button>
              <button type="button" onClick={() => moveExercise(index, 1)} disabled={index === exercises.length - 1} className={iconButtonClasses}><ArrowDown size={15} /></button>
              <button type="button" onClick={() => setExercises((current) => current.filter((entry) => entry.id !== item.id))} className={`${iconButtonClasses} hover:text-red-300`}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</p>}
      <div className="flex justify-end"><button type="button" onClick={saveSession} disabled={isSaving || exercises.length === 0} className={primaryButtonClasses}><Save size={17} /> Guardar sesión</button></div>
    </div>
  );
}

function RoutineReadView({ routines }) {
  return (
    <div className="space-y-5">
      <header className="text-center"><h2 className="text-2xl font-black text-white flex items-center justify-center gap-3"><LayoutTemplate className="text-fuchsia-400" /> Rutinas</h2><p className="text-sm text-slate-500 mt-2">Activa el modo edición para modificar plantillas.</p></header>
      {routines.length === 0 ? <p className="text-center text-slate-500 p-10">No hay rutinas configuradas.</p> : routines.map((routine) => (
        <section key={routine.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5"><h3 className="text-xl font-black text-white mb-4">{routine.name}</h3><div className="grid md:grid-cols-2 gap-3">{routine.sessions.map((session) => <div key={session.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4"><h4 className="font-black text-emerald-400">{session.name}</h4><div className="mt-3 space-y-2">{session.exercises.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span className="text-slate-300">{item.exercise}{item.notes && <span className="block text-xs text-amber-300">{item.notes}</span>}</span><span className="font-mono text-slate-500">{item.targetSets} × {item.targetReps}</span></div>)}</div></div>)}</div></section>
      ))}
    </div>
  );
}

function updateRoutine(routines, routineId, updater) {
  return routines.map((routine) => routine.id === routineId ? updater(routine) : routine);
}

const inputClasses = 'h-[44px] w-full bg-slate-950 border border-slate-700 rounded-xl px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-400/60';
const labelClasses = 'block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2';
const primaryButtonClasses = 'h-[44px] px-4 bg-fuchsia-500 hover:bg-fuchsia-400 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-black flex items-center justify-center gap-2 whitespace-nowrap';
const secondaryButtonClasses = 'h-[44px] px-4 bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 whitespace-nowrap';
const dangerButtonClasses = 'h-[44px] px-4 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl font-bold flex items-center justify-center gap-2 whitespace-nowrap';
const iconButtonClasses = 'p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30';
const compactInputClasses = 'h-10 w-full min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-fuchsia-400/60';
