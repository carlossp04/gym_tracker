import { useMemo, useState } from 'react';
import { Check, ClipboardCopy, FileJson, FileUp, Sparkles, X } from 'lucide-react';
import { buildRoutineImportPrompt, materializeImportedRoutine, parseRoutineImportJson } from '../../lib/routineImport';

export default function RoutineImportModal({ existingRoutines, isSaving, onImport, onClose }) {
  const [routineName, setRoutineName] = useState('Mi rutina');
  const [sourceText, setSourceText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const [error, setError] = useState('');
  const [validatedRoutine, setValidatedRoutine] = useState(null);
  const prompt = useMemo(() => buildRoutineImportPrompt(routineName, sourceText), [routineName, sourceText]);

  const copyPrompt = async () => {
    if (!routineName.trim() || !sourceText.trim()) {
      setError('Escribe el nombre y pega primero la rutina original.');
      return;
    }
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState('copied');
      setError('');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      setError('No se pudo copiar automáticamente. Selecciona y copia el prompt mostrado.');
    }
  };

  const validateJson = (value = jsonText) => {
    try {
      const routine = parseRoutineImportJson(value);
      setValidatedRoutine(routine);
      setError('');
      return routine;
    } catch (validationError) {
      setValidatedRoutine(null);
      setError(validationError.message);
      return null;
    }
  };

  const readJsonFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setJsonText(text);
      validateJson(text);
    } catch {
      setError('No se pudo leer el archivo seleccionado.');
    } finally {
      event.target.value = '';
    }
  };

  const importRoutine = async () => {
    const routine = validatedRoutine || validateJson();
    if (!routine) return;
    if (existingRoutines.some((item) => item.name.toLocaleLowerCase('es') === routine.name.toLocaleLowerCase('es'))
      && !window.confirm(`Ya existe una rutina llamada "${routine.name}". ¿Importarla igualmente?`)) return;

    if (await onImport(materializeImportedRoutine(routine))) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto my-4 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        <header className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-black text-white flex items-center gap-2"><Sparkles className="text-fuchsia-400" /> Importar rutina con IA</h2><p className="text-sm text-slate-400 mt-1">La IA solo transforma el texto. La app valida el resultado antes de guardarlo.</p></div>
          <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X size={22} /></button>
        </header>

        <div className="grid lg:grid-cols-2">
          <section className="p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-800">
            <div><p className="text-xs font-black uppercase tracking-wider text-fuchsia-400">Paso 1</p><h3 className="font-black text-white mt-1">Preparar instrucciones para la IA</h3></div>
            <label className="block"><span className={labelClasses}>Nombre que tendrá la rutina</span><input value={routineName} onChange={(event) => setRoutineName(event.target.value)} maxLength={100} className={inputClasses} /></label>
            <label className="block"><span className={labelClasses}>Texto original de la rutina</span><textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="Pega aquí DÍA 1, ejercicios, series y repeticiones..." className={`${textareaClasses} min-h-64`} /></label>
            <button type="button" onClick={copyPrompt} disabled={!routineName.trim() || !sourceText.trim()} className={primaryButtonClasses}>{copyState === 'copied' ? <Check size={17} /> : <ClipboardCopy size={17} />}{copyState === 'copied' ? 'Directrices copiadas' : 'Copiar directrices + rutina'}</button>
            <details className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-300">Ver directrices completas</summary><textarea readOnly value={prompt} className={`${textareaClasses} min-h-80 border-0 border-t rounded-none font-mono text-xs`} /></details>
          </section>

          <section className="p-5 space-y-4">
            <div><p className="text-xs font-black uppercase tracking-wider text-emerald-400">Paso 2</p><h3 className="font-black text-white mt-1">Validar e importar la respuesta</h3></div>
            <p className="text-sm text-slate-500">Pega exactamente el JSON devuelto por ChatGPT, Gemini u otra IA. También puedes cargar un archivo.</p>
            <textarea value={jsonText} onChange={(event) => { setJsonText(event.target.value); setValidatedRoutine(null); setError(''); }} placeholder={'{"schema":"gym_tracker_routine_v1",...}'} className={`${textareaClasses} min-h-72 font-mono text-xs`} />
            <div className="flex flex-col sm:flex-row gap-2">
              <label className={secondaryButtonClasses}><FileUp size={17} /> Cargar archivo<input type="file" accept=".json,.txt,application/json" onChange={readJsonFile} className="hidden" /></label>
              <button type="button" onClick={() => validateJson()} disabled={!jsonText.trim()} className={secondaryButtonClasses}><FileJson size={17} /> Validar JSON</button>
            </div>

            {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</p>}
            {validatedRoutine && <RoutinePreview routine={validatedRoutine} />}

            <button type="button" onClick={importRoutine} disabled={isSaving || !jsonText.trim()} className={`${primaryButtonClasses} w-full`}>{isSaving ? 'Guardando...' : 'Importar rutina al vault'}</button>
          </section>
        </div>
      </div>
    </div>
  );
}

function RoutinePreview({ routine }) {
  const exerciseCount = routine.sessions.reduce((total, session) => total + session.exercises.length, 0);
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
      <p className="text-xs font-black uppercase tracking-wider text-emerald-400">JSON válido</p>
      <h4 className="font-black text-white mt-1">{routine.name}</h4>
      <p className="text-sm text-slate-400 mt-1">{routine.sessions.length} sesiones · {exerciseCount} ejercicios</p>
      <div className="mt-3 flex flex-wrap gap-2">{routine.sessions.map((session) => <span key={session.name} className="text-xs bg-slate-950 border border-slate-800 rounded-full px-3 py-1 text-slate-300">{session.name}: {session.exercises.length}</span>)}</div>
    </div>
  );
}

const labelClasses = 'block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2';
const inputClasses = 'h-11 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 text-white focus:outline-none focus:border-fuchsia-400/60';
const textareaClasses = 'w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-fuchsia-400/60 resize-y';
const primaryButtonClasses = 'min-h-11 px-4 bg-fuchsia-500 hover:bg-fuchsia-400 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-black flex items-center justify-center gap-2 cursor-pointer';
const secondaryButtonClasses = 'min-h-11 px-4 bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer';
