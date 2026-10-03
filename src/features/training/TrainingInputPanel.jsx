import { useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardPaste, Copy, Download, Dumbbell, FileUp, LayoutTemplate, Play, Plus, Save, Trash2, User, XCircle } from 'lucide-react';

const MANUAL_MODE = 'manual';
const PASTE_MODE = 'paste';
const TEMPLATE_MODE = 'template';

export default function TrainingInputPanel({
  newTrainingText,
  availableUsers,
  exerciseOptions,
  routines,
  saveStatus,
  saveMessage,
  onNewTrainingTextChange,
  onAppendTraining,
  onAddManualWorkout,
  onStartTemplateWorkout,
  onExportEncrypted,
  onImportEncrypted,
}) {
  const [inputMode, setInputMode] = useState(() => routines.length > 0 ? TEMPLATE_MODE : MANUAL_MODE);
  const [user, setUser] = useState(() => availableUsers[0] || '');
  const [date, setDate] = useState(getTodayInputValue);
  const [dayLabel, setDayLabel] = useState('Entrenamiento manual');
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [draftEntries, setDraftEntries] = useState([]);
  const [manualError, setManualError] = useState('');
  const [selectedRoutineId, setSelectedRoutineId] = useState(() => routines[0]?.id || '');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId) || routines[0] || null;
  const selectedSession = selectedRoutine?.sessions.find((session) => session.id === selectedSessionId)
    || selectedRoutine?.sessions[0]
    || null;

  const addDraftExercise = (event) => {
    event.preventDefault();
    const numericSets = Number(sets);
    const numericReps = Number(reps);
    const numericWeight = Number(weight);

    if (!exercise.trim() || !Number.isInteger(numericSets) || numericSets <= 0 || !Number.isInteger(numericReps) || numericReps <= 0 || !Number.isFinite(numericWeight) || numericWeight <= 0) {
      setManualError('Completa ejercicio, series, repeticiones y un peso mayor que cero.');
      return;
    }

    setDraftEntries((current) => [...current, {
      id: crypto.randomUUID(),
      exercise: exercise.trim(),
      sets: numericSets,
      reps: numericReps,
      weight: numericWeight,
    }]);
    setExercise('');
    setWeight('');
    setManualError('');
  };

  const saveManualWorkout = async () => {
    if (!user.trim() || user.includes(':') || !date || !dayLabel.trim() || draftEntries.length === 0) {
      setManualError(user.includes(':')
        ? 'El nombre del usuario no puede contener dos puntos.'
        : 'Completa usuario, fecha, nombre del entrenamiento y al menos un ejercicio.');
      return;
    }

    const wasSaved = await onAddManualWorkout({
      user: user.trim(),
      date,
      dayLabel: dayLabel.trim(),
      entries: draftEntries,
    });

    if (wasSaved) {
      setDraftEntries([]);
      setExercise('');
      setWeight('');
      setManualError('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Plus className="text-emerald-400" /> Añadir entrenamiento</h2>
            <p className="text-sm text-slate-400 mt-1">Crea el entrenamiento con el formulario o pega un bloque exportado de WhatsApp.</p>
          </div>
          <BackupActions onExportEncrypted={onExportEncrypted} onImportEncrypted={onImportEncrypted} />
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 bg-slate-950 border border-slate-800 rounded-xl p-1 max-w-2xl">
            <ModeButton active={inputMode === TEMPLATE_MODE} icon={LayoutTemplate} label="Plantilla" onClick={() => setInputMode(TEMPLATE_MODE)} />
            <ModeButton active={inputMode === MANUAL_MODE} icon={Dumbbell} label="Formulario" onClick={() => setInputMode(MANUAL_MODE)} />
            <ModeButton active={inputMode === PASTE_MODE} icon={ClipboardPaste} label="Copiar y pegar" onClick={() => setInputMode(PASTE_MODE)} />
          </div>

          {inputMode === TEMPLATE_MODE ? (
            <RoutineLauncher
              routines={routines} selectedRoutine={selectedRoutine} selectedSession={selectedSession}
              user={user} date={date} availableUsers={availableUsers} isSaving={saveStatus === 'saving'}
              onRoutineChange={(routineId) => {
                setSelectedRoutineId(routineId);
                setSelectedSessionId('');
              }}
              onSessionChange={setSelectedSessionId} onUserChange={setUser} onDateChange={setDate}
              onStart={() => onStartTemplateWorkout({
                routineId: selectedRoutine?.id,
                sessionId: selectedSession?.id,
                user,
                date,
              })}
            />
          ) : inputMode === MANUAL_MODE ? (
            <ManualWorkoutBuilder
              user={user} date={date} dayLabel={dayLabel} exercise={exercise}
              sets={sets} reps={reps} weight={weight} draftEntries={draftEntries}
              availableUsers={availableUsers} exerciseOptions={exerciseOptions}
              manualError={manualError} isSaving={saveStatus === 'saving'}
              onUserChange={setUser} onDateChange={setDate} onDayLabelChange={setDayLabel}
              onExerciseChange={setExercise} onSetsChange={setSets} onRepsChange={setReps} onWeightChange={setWeight}
              onAddDraftExercise={addDraftExercise}
              onRemoveDraftExercise={(id) => setDraftEntries((current) => current.filter((entry) => entry.id !== id))}
              onClearDraft={() => setDraftEntries([])} onSave={saveManualWorkout}
            />
          ) : (
            <PasteTrainingForm
              value={newTrainingText} isSaving={saveStatus === 'saving'}
              onChange={onNewTrainingTextChange} onSave={onAppendTraining}
            />
          )}

          <SaveFeedback status={saveStatus} message={saveMessage} />
        </div>
      </section>
    </div>
  );
}

function RoutineLauncher({
  routines, selectedRoutine, selectedSession, user, date, availableUsers, isSaving,
  onRoutineChange, onSessionChange, onUserChange, onDateChange, onStart,
}) {
  if (routines.length === 0) {
    return (
      <div className="border border-dashed border-slate-700 rounded-2xl p-8 text-center">
        <LayoutTemplate size={36} className="mx-auto text-slate-600 mb-3" />
        <h3 className="font-black text-white">Todavía no hay rutinas</h3>
        <p className="text-sm text-slate-500 mt-1">Créala primero en la pestaña Rutinas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Rutina" icon={LayoutTemplate}>
          <select value={selectedRoutine?.id || ''} onChange={(event) => onRoutineChange(event.target.value)} className={inputClasses}>
            {routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}
          </select>
        </Field>
        <Field label="Sesión" icon={Dumbbell}>
          <select value={selectedSession?.id || ''} onChange={(event) => onSessionChange(event.target.value)} className={inputClasses}>
            {(selectedRoutine?.sessions || []).map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
          </select>
        </Field>
        <Field label="Usuario" icon={User}>
          <input list="template-workout-users" value={user} onChange={(event) => onUserChange(event.target.value)} className={inputClasses} />
          <datalist id="template-workout-users">{availableUsers.map((option) => <option key={option} value={option} />)}</datalist>
        </Field>
        <Field label="Fecha" icon={CalendarDays}>
          <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className={inputClasses} />
        </Field>
      </div>

      {selectedSession ? (
        <div className="border border-slate-800 rounded-2xl overflow-hidden">
          <div className="bg-slate-950 px-4 py-3"><h3 className="font-black text-white">{selectedSession.name}</h3><p className="text-xs text-slate-500">{selectedSession.exercises.length} ejercicios</p></div>
          <div className="divide-y divide-slate-800">
            {selectedSession.exercises.map((item, index) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="font-bold text-slate-200"><span className="text-slate-600 mr-2">{index + 1}.</span>{item.exercise}</span>
                <span className="text-sm font-mono text-emerald-400 whitespace-nowrap">{item.targetSets} × {item.targetReps}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="text-sm text-amber-300">Esta rutina aún no tiene sesiones.</p>}

      <div className="flex justify-end">
        <button type="button" onClick={onStart} disabled={isSaving || !selectedSession || selectedSession.exercises.length === 0 || !user.trim() || !date} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2"><Play size={17} /> Comenzar entrenamiento</button>
      </div>
    </div>
  );
}

function ManualWorkoutBuilder(props) {
  const {
    user, date, dayLabel, exercise, sets, reps, weight, draftEntries,
    availableUsers, exerciseOptions, manualError, isSaving,
    onUserChange, onDateChange, onDayLabelChange, onExerciseChange,
    onSetsChange, onRepsChange, onWeightChange, onAddDraftExercise,
    onRemoveDraftExercise, onClearDraft, onSave,
  } = props;

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Usuario" icon={User}>
          <input list="manual-workout-users" value={user} onChange={(event) => onUserChange(event.target.value)} placeholder="Nombre" className={inputClasses} />
          <datalist id="manual-workout-users">{availableUsers.map((option) => <option key={option} value={option} />)}</datalist>
        </Field>
        <Field label="Fecha" icon={CalendarDays}>
          <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className={inputClasses} />
        </Field>
        <Field label="Nombre de la sesión" icon={Dumbbell}>
          <input value={dayLabel} onChange={(event) => onDayLabelChange(event.target.value)} placeholder="Día 1, Push..." className={inputClasses} />
        </Field>
      </div>

      <form onSubmit={onAddDraftExercise} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div>
          <h3 className="font-black text-white">Nuevo ejercicio</h3>
          <p className="text-xs text-slate-500 mt-1">Añade una línea por cada combinación distinta de series, repeticiones y peso.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_7rem_7rem_8rem_auto] gap-3 items-end">
          <Field label="Ejercicio">
            <input list="manual-workout-exercises" value={exercise} onChange={(event) => onExerciseChange(event.target.value)} placeholder="Press banca" className={inputClasses} autoFocus />
            <datalist id="manual-workout-exercises">{exerciseOptions.map((option) => <option key={option} value={option} />)}</datalist>
          </Field>
          <Field label="Series"><input type="number" min="1" step="1" value={sets} onChange={(event) => onSetsChange(event.target.value)} className={inputClasses} /></Field>
          <Field label="Reps"><input type="number" min="1" step="1" value={reps} onChange={(event) => onRepsChange(event.target.value)} className={inputClasses} /></Field>
          <Field label="Peso (kg)"><input type="number" min="0.1" step="0.1" value={weight} onChange={(event) => onWeightChange(event.target.value)} placeholder="60" className={inputClasses} /></Field>
          <button disabled={isSaving} className="h-[46px] px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2"><Plus size={17} /> Añadir</button>
        </div>
      </form>

      <div className="border border-slate-800 rounded-2xl overflow-hidden">
        <div className="bg-slate-950 px-4 py-3 flex items-center justify-between gap-3">
          <div><h3 className="font-black text-white">Ejercicios preparados</h3><p className="text-xs text-slate-500">{draftEntries.length} registro(s)</p></div>
          {draftEntries.length > 0 && <button type="button" onClick={onClearDraft} className="text-xs font-bold text-slate-500 hover:text-red-300">Vaciar</button>}
        </div>
        {draftEntries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-600">Añade el primer ejercicio para preparar el entrenamiento.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {draftEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center justify-between gap-4 bg-slate-900/40">
                <div className="min-w-0"><p className="font-bold text-white truncate">{entry.exercise}</p><p className="text-sm text-slate-400"><strong className="text-slate-200">{entry.sets}</strong> series × <strong className="text-slate-200">{entry.reps}</strong> reps × <strong className="text-emerald-400">{entry.weight} kg</strong></p></div>
                <button type="button" onClick={() => onRemoveDraftExercise(entry.id)} className="p-2 text-slate-500 hover:text-red-300" title="Quitar ejercicio"><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {manualError && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{manualError}</p>}
      <div className="flex justify-end">
        <button type="button" onClick={onSave} disabled={isSaving || draftEntries.length === 0} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2"><Save size={17} /> {isSaving ? 'Guardando...' : 'Guardar entrenamiento'}</button>
      </div>
    </div>
  );
}

function PasteTrainingForm({ value, isSaving, onChange, onSave }) {
  return (
    <div className="space-y-4">
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="[16/5, 14:26] Masi: ..." className="w-full min-h-48 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 font-mono" />
      <div className="flex justify-end"><button type="button" onClick={onSave} disabled={!value.trim() || isSaving} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 px-5 py-3 rounded-xl font-black flex items-center justify-center gap-2"><Copy size={16} /> Añadir y cifrar</button></div>
    </div>
  );
}

function ModeButton({ active, icon, label, onClick }) {
  const Icon = icon;
  return <button type="button" onClick={onClick} className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${active ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}><Icon size={16} /> {label}</button>;
}

function Field({ label, icon, children }) {
  const Icon = icon;
  return <label className="block"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">{Icon && <Icon size={13} />}{label}</span>{children}</label>;
}

function BackupActions({ onExportEncrypted, onImportEncrypted }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onExportEncrypted} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-2"><Download size={14} /> Backup</button>
      <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer"><FileUp size={14} /> Importar<input type="file" accept=".txt,.json" className="hidden" onChange={onImportEncrypted} /></label>
    </div>
  );
}

function SaveFeedback({ status, message }) {
  if (status === 'idle' || !message) return null;
  const config = status === 'success'
    ? { icon: CheckCircle2, className: 'text-emerald-400' }
    : status === 'error'
      ? { icon: XCircle, className: 'text-red-400' }
      : { icon: Save, className: 'text-blue-400' };
  const Icon = config.icon;
  return <p className={`text-sm flex items-center gap-2 ${config.className}`}><Icon size={16} /> {message || 'Guardando cifrado...'}</p>;
}

function getTodayInputValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

const inputClasses = 'w-full h-[46px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60';
