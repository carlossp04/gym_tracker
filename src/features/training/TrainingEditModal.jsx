import { Save, XCircle } from 'lucide-react';
import { estimateOneRepMax } from '../../lib/gymMetrics';

const inputClasses = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none';

export default function TrainingEditModal({
  editForm,
  onEditFormChange,
  onCancel,
  onConfirm,
}) {
  const oneRepMax = estimateOneRepMax(editForm.weight, editForm.reps);

  const updateField = (field, value) => {
    onEditFormChange((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white"><XCircle size={24} /></button>
        <div className="flex items-center gap-3 mb-5 text-emerald-400">
          <Save size={30} />
          <div>
            <h3 className="text-xl font-bold text-white">Editar entrenamiento</h3>
            <p className="text-xs text-slate-500">Corrige datos parseados. El texto original queda intacto.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Usuario">
            <input
              type="text"
              value={editForm.user}
              onChange={(event) => updateField('user', event.target.value)}
              className={inputClasses}
              autoFocus
            />
          </Field>
          <Field label="Fecha">
            <input
              type="text"
              value={editForm.date}
              onChange={(event) => updateField('date', event.target.value)}
              className={inputClasses}
              placeholder="dd/mm/aa"
            />
          </Field>
          <Field label="Día / bloque">
            <input
              type="text"
              value={editForm.dayLabel}
              onChange={(event) => updateField('dayLabel', event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Ejercicio">
            <input
              type="text"
              value={editForm.exercise}
              onChange={(event) => updateField('exercise', event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Series">
            <input
              type="number"
              min="1"
              step="1"
              value={editForm.sets}
              onChange={(event) => updateField('sets', event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Reps">
            <input
              type="number"
              min="1"
              step="1"
              value={editForm.reps}
              onChange={(event) => updateField('reps', event.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Peso kg">
            <input
              type="number"
              min="0"
              step="0.5"
              value={editForm.weight}
              onChange={(event) => updateField('weight', event.target.value)}
              className={inputClasses}
            />
          </Field>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1RM estimado</span>
            <span className="text-2xl font-black text-emerald-400">{oneRepMax || '-'} kg</span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-900/20 transition-colors">Guardar corrección</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{label}</span>
      {children}
    </label>
  );
}
