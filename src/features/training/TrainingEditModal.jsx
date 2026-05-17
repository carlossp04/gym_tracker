import { Save, XCircle } from 'lucide-react';
import { estimateOneRepMax } from '../../lib/gymMetrics';

const inputClasses = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 sm:py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none';

export default function TrainingEditModal({
  editForm,
  onEditFormChange,
  onCancel,
  onConfirm,
  mode = 'single',
  selectedCount = 1,
  enabledFields = null,
  onFieldEnabledChange = null,
}) {
  const oneRepMax = estimateOneRepMax(editForm.weight, editForm.reps);
  const isBulk = mode === 'bulk';

  const updateField = (field, value) => {
    onEditFormChange((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 p-4 sm:p-6 rounded-2xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto my-3 sm:my-0 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white"><XCircle size={24} /></button>
        <div className="flex items-center gap-3 mb-4 sm:mb-5 pr-8 text-emerald-400">
          <Save size={30} />
          <div>
            <h3 className="text-xl font-bold text-white">Editar entrenamiento</h3>
            <p className="text-xs text-slate-500">
              {isBulk
                ? `${selectedCount} registros seleccionados. Solo se actualizan campos marcados.`
                : 'Corrige datos parseados. El texto original queda intacto.'}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <Field
            label="Usuario"
            field="user"
            isBulk={isBulk}
            enabledFields={enabledFields}
            onFieldEnabledChange={onFieldEnabledChange}
          >
            <input
              type="text"
              value={editForm.user}
              onChange={(event) => updateField('user', event.target.value)}
              className={inputClasses}
              autoFocus
              disabled={isBulk && !enabledFields?.user}
            />
          </Field>
          <Field
            label="Fecha"
            field="date"
            isBulk={isBulk}
            enabledFields={enabledFields}
            onFieldEnabledChange={onFieldEnabledChange}
          >
            <input
              type="text"
              value={editForm.date}
              onChange={(event) => updateField('date', event.target.value)}
              className={inputClasses}
              placeholder="dd/mm/aa"
              disabled={isBulk && !enabledFields?.date}
            />
          </Field>
          <Field
            label="Día / bloque"
            field="dayLabel"
            isBulk={isBulk}
            enabledFields={enabledFields}
            onFieldEnabledChange={onFieldEnabledChange}
          >
            <input
              type="text"
              value={editForm.dayLabel}
              onChange={(event) => updateField('dayLabel', event.target.value)}
              className={inputClasses}
              disabled={isBulk && !enabledFields?.dayLabel}
            />
          </Field>
          <Field
            label="Ejercicio"
            field="exercise"
            isBulk={isBulk}
            enabledFields={enabledFields}
            onFieldEnabledChange={onFieldEnabledChange}
          >
            <input
              type="text"
              value={editForm.exercise}
              onChange={(event) => updateField('exercise', event.target.value)}
              className={inputClasses}
              disabled={isBulk && !enabledFields?.exercise}
            />
          </Field>
          <Field
            label="Series"
            field="sets"
            isBulk={isBulk}
            enabledFields={enabledFields}
            onFieldEnabledChange={onFieldEnabledChange}
          >
            <input
              type="number"
              min="1"
              step="1"
              value={editForm.sets}
              onChange={(event) => updateField('sets', event.target.value)}
              className={inputClasses}
              disabled={isBulk && !enabledFields?.sets}
            />
          </Field>
          <Field
            label="Reps"
            field="reps"
            isBulk={isBulk}
            enabledFields={enabledFields}
            onFieldEnabledChange={onFieldEnabledChange}
          >
            <input
              type="number"
              min="1"
              step="1"
              value={editForm.reps}
              onChange={(event) => updateField('reps', event.target.value)}
              className={inputClasses}
              disabled={isBulk && !enabledFields?.reps}
            />
          </Field>
          <Field
            label="Peso kg"
            field="weight"
            isBulk={isBulk}
            enabledFields={enabledFields}
            onFieldEnabledChange={onFieldEnabledChange}
          >
            <input
              type="number"
              min="0"
              step="0.5"
              value={editForm.weight}
              onChange={(event) => updateField('weight', event.target.value)}
              className={inputClasses}
              disabled={isBulk && !enabledFields?.weight}
            />
          </Field>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1RM estimado</span>
            <span className="text-2xl font-black text-emerald-400">{oneRepMax || '-'} kg</span>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-1 bg-slate-900 flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-900/20 transition-colors">
            {isBulk ? 'Guardar cambios masivos' : 'Guardar corrección'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, field, isBulk, enabledFields, onFieldEnabledChange, children }) {
  const enabled = !isBulk || enabledFields?.[field];

  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
        {isBulk && (
          <input
            type="checkbox"
            checked={Boolean(enabled)}
            onChange={(event) => onFieldEnabledChange(field, event.target.checked)}
            className="h-3.5 w-3.5 accent-emerald-500"
          />
        )}
        {label}
      </span>
      {children}
    </label>
  );
}
