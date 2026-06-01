import { useMemo, useState } from 'react';
import { CalendarDays, FilterX, ListX, Pencil, Search, SquarePen, Trash2, X } from 'lucide-react';
import { normalizeSearchText } from '../../lib/textSearch';

const ALL_OPTIONS = 'Todos';

export default function TrainingRecordsTab({
  canEdit = false,
  trainingEntries,
  focusedWorkout,
  onOpenTrainingEdit,
  onOpenBulkTrainingEdit,
  onDeleteTrainingEntry,
  onDeleteWorkoutExercise,
  onDeleteSelectedTrainingEntries,
}) {
  const [filters, setFilters] = useState(() => getInitialFilters(focusedWorkout));
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);

  const users = useMemo(
    () => [ALL_OPTIONS, ...new Set(trainingEntries.map((entry) => entry.user).sort())],
    [trainingEntries],
  );

  const exercises = useMemo(
    () => [ALL_OPTIONS, ...new Set(trainingEntries.map((entry) => entry.exercise).sort())],
    [trainingEntries],
  );

  const filteredEntries = useMemo(() => {
    const searchTerm = normalizeSearchText(filters.search);
    const fromDate = filters.fromDate ? parseDateInput(filters.fromDate) : null;
    const toDate = filters.toDate ? parseDateInput(filters.toDate) : null;

    return trainingEntries.filter((entry) => {
      const entryDate = parseTrainingDate(entry.date);
      const matchesSearch = !searchTerm || [entry.user, entry.exercise, entry.dayLabel, entry.date]
        .some((value) => normalizeSearchText(value).includes(searchTerm));
      const matchesUser = filters.user === ALL_OPTIONS || entry.user === filters.user;
      const matchesExercise = filters.exercise === ALL_OPTIONS || entry.exercise === filters.exercise;
      const matchesFromDate = !fromDate || entryDate >= fromDate;
      const matchesToDate = !toDate || entryDate <= toDate;

      return matchesSearch && matchesUser && matchesExercise && matchesFromDate && matchesToDate;
    });
  }, [filters, trainingEntries]);

  const groupedEntries = useMemo(() => groupEntriesByWorkout(filteredEntries), [filteredEntries]);
  const filteredEntryIds = useMemo(() => new Set(filteredEntries.map((entry) => entry.id)), [filteredEntries]);
  const selectedEntryIdSet = useMemo(() => new Set(selectedEntryIds), [selectedEntryIds]);
  const selectedEntries = useMemo(
    () => (canEdit ? filteredEntries.filter((entry) => selectedEntryIdSet.has(entry.id)) : []),
    [canEdit, filteredEntries, selectedEntryIdSet],
  );
  const hasActiveFilters = Object.values(filters).some((value) => value && value !== ALL_OPTIONS);
  const allVisibleSelected = filteredEntries.length > 0 && selectedEntries.length === filteredEntries.length;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      user: ALL_OPTIONS,
      exercise: ALL_OPTIONS,
      fromDate: '',
      toDate: '',
    });
  };

  const toggleEntrySelection = (entryId) => {
    if (!canEdit) return;

    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );
  };

  const toggleAllVisible = () => {
    if (!canEdit) return;

    setSelectedEntryIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !filteredEntryIds.has(id));

      const nextSelection = new Set(current);
      filteredEntries.forEach((entry) => nextSelection.add(entry.id));
      return [...nextSelection];
    });
  };

  const clearSelection = () => {
    setSelectedEntryIds([]);
  };

  const openBulkEdit = () => {
    if (!canEdit || selectedEntries.length === 0) return;
    onOpenBulkTrainingEdit(selectedEntries);
    clearSelection();
  };

  const deleteSelected = () => {
    if (!canEdit || selectedEntries.length === 0) return;
    onDeleteSelectedTrainingEntries(selectedEntries);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">{canEdit ? 'Registros editables' : 'Registros'}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {canEdit ? 'Corrige usuario, fecha, ejercicio, series, reps o peso.' : 'Consulta y filtra entrenamientos guardados.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && selectedEntries.length > 0 && (
                <>
                  <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                    {selectedEntries.length} seleccionados
                  </span>
                  <button
                    onClick={openBulkEdit}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2"
                  >
                    <SquarePen size={14} /> Editar selección
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Eliminar selección
                  </button>
                  <button
                    onClick={clearSelection}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg"
                    title="Limpiar selección"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
              <span className="text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 rounded-full px-3 py-1">
                {filteredEntries.length} de {trainingEntries.length} sets
              </span>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
                {groupedEntries.length} entrenos
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_auto] gap-3">
            <label className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Buscar ejercicio, usuario, día..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </label>

            <select
              value={filters.user}
              onChange={(event) => updateFilter('user', event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              {users.map((user) => <option key={user} value={user}>{user === ALL_OPTIONS ? 'Todos los usuarios' : user}</option>)}
            </select>

            <select
              value={filters.exercise}
              onChange={(event) => updateFilter('exercise', event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              {exercises.map((exercise) => <option key={exercise} value={exercise}>{exercise === ALL_OPTIONS ? 'Todos los ejercicios' : exercise}</option>)}
            </select>

            <label className="relative">
              <span className="absolute left-10 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Desde</span>
              <CalendarDays size={16} className="absolute left-3 top-1/2 translate-y-0 text-slate-500" />
              <input
                type="date"
                value={filters.fromDate}
                onChange={(event) => updateFilter('fromDate', event.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 pt-6 pb-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                aria-label="Fecha desde"
              />
            </label>

            <label className="relative">
              <span className="absolute left-10 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Hasta</span>
              <CalendarDays size={16} className="absolute left-3 top-1/2 translate-y-0 text-slate-500" />
              <input
                type="date"
                value={filters.toDate}
                onChange={(event) => updateFilter('toDate', event.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 pt-6 pb-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                aria-label="Fecha hasta"
              />
            </label>

            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-700 disabled:cursor-not-allowed text-slate-300 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              title="Limpiar filtros"
            >
              <FilterX size={16} /> Limpiar
            </button>
          </div>
        </div>

        <div className="max-h-[70dvh] overflow-auto">
          <table className="w-full text-left min-w-[860px]">
            <thead className="sticky top-0 z-10 bg-slate-950 text-slate-500 uppercase text-xs tracking-wider font-bold shadow-lg shadow-slate-950/30">
              <tr>
                {canEdit && (
                  <th className="p-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Seleccionar registros visibles"
                      className="h-4 w-4 accent-emerald-500"
                    />
                  </th>
                )}
                <th className="p-4">Fecha</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Ejercicio</th>
                <th className="p-4 text-right">Series</th>
                <th className="p-4 text-right">Reps</th>
                <th className="p-4 text-right">Kg</th>
                <th className="p-4 text-right">1RM</th>
                {canEdit && <th className="p-4 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="text-sm">
              {groupedEntries.map((group, groupIndex) => (
                <WorkoutGroup
                  key={group.key}
                  canEdit={canEdit}
                  group={group}
                  groupIndex={groupIndex}
                  isFocused={focusedWorkout?.workoutKey === group.key}
                  onOpenTrainingEdit={onOpenTrainingEdit}
                  onDeleteTrainingEntry={onDeleteTrainingEntry}
                  onDeleteWorkoutExercise={onDeleteWorkoutExercise}
                  selectedEntryIdSet={selectedEntryIdSet}
                  onToggleEntrySelection={toggleEntrySelection}
                />
              ))}
              {groupedEntries.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 9 : 7} className="p-10 text-center text-slate-500">
                    Sin registros con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function WorkoutGroup({
  canEdit,
  group,
  groupIndex,
  isFocused,
  onOpenTrainingEdit,
  onDeleteTrainingEntry,
  onDeleteWorkoutExercise,
  selectedEntryIdSet,
  onToggleEntrySelection,
}) {
  const stripeClass = groupIndex % 2 === 0 ? 'border-l-4 border-l-emerald-500/80' : 'border-l-4 border-l-cyan-500/80';
  const rowBgClass = groupIndex % 2 === 0 ? 'bg-emerald-500/[0.03]' : 'bg-cyan-500/[0.03]';
  const headerBgClass = isFocused
    ? 'bg-amber-400/15 text-amber-200 ring-2 ring-inset ring-amber-400/60'
    : groupIndex % 2 === 0 ? 'bg-emerald-500/10 text-emerald-200' : 'bg-cyan-500/10 text-cyan-200';
  const totalVolume = Math.round(group.entries.reduce((sum, entry) => sum + entry.sets * entry.reps * entry.weight, 0));
  const entriesByExercise = group.entries.reduce((entriesMap, entry) => {
    if (!entriesMap.has(entry.exercise)) entriesMap.set(entry.exercise, []);
    entriesMap.get(entry.exercise).push(entry);
    return entriesMap;
  }, new Map());

  return (
    <>
      <tr className={`${headerBgClass} ${stripeClass}`}>
        <td colSpan={canEdit ? 9 : 7} className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 font-bold">
              <span>{group.date}</span>
              <span className="text-slate-500">·</span>
              <span>{group.user}</span>
              <span className="text-slate-500">·</span>
              <span>{group.dayLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
              <span className="bg-slate-950/70 border border-slate-800 rounded-full px-2 py-1">{group.entries.length} sets</span>
              <span className="bg-slate-950/70 border border-slate-800 rounded-full px-2 py-1">{totalVolume} kg vol</span>
            </div>
          </div>
        </td>
      </tr>
      {group.entries.map((entry, entryIndex) => {
        const isSelected = canEdit && selectedEntryIdSet.has(entry.id);
        const workoutExerciseEntries = entriesByExercise.get(entry.exercise) || [entry];

        return (
          <tr
            key={entry.id}
            className={`${isSelected ? 'bg-emerald-500/10' : rowBgClass} ${stripeClass} hover:bg-slate-800/40 transition-colors border-t border-slate-800/50 ${entryIndex === group.entries.length - 1 ? 'border-b-8 border-b-slate-950' : ''}`}
          >
            {canEdit && (
              <td className="p-4 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleEntrySelection(entry.id)}
                  aria-label={`Seleccionar ${entry.exercise}`}
                  className="h-4 w-4 accent-emerald-500"
                />
              </td>
            )}
            <td className="p-4 text-slate-400 font-mono whitespace-nowrap">{entry.date}</td>
            <td className="p-4 text-slate-300 font-bold whitespace-nowrap">{entry.user}</td>
            <td className="p-4 text-white font-bold max-w-[260px] truncate" title={entry.exercise}>{entry.exercise}</td>
            <td className="p-4 text-right text-slate-300">{entry.sets}</td>
            <td className="p-4 text-right text-slate-300">{entry.reps}</td>
            <td className="p-4 text-right text-emerald-400 font-black">{entry.weight}</td>
            <td className="p-4 text-right text-slate-300">{entry.oneRepMax} kg</td>
            {canEdit && (
              <td className="p-4">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onOpenTrainingEdit(entry)}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors"
                    title="Editar registro"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteTrainingEntry(entry)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-300 transition-colors"
                    title="Eliminar registro"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteWorkoutExercise(workoutExerciseEntries)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-300 transition-colors"
                    title="Eliminar este ejercicio del día"
                  >
                    <ListX size={16} />
                  </button>
                </div>
              </td>
            )}
          </tr>
        );
      })}
    </>
  );
}

function groupEntriesByWorkout(entries) {
  const groups = [];
  const groupsByKey = new Map();

  entries.forEach((entry) => {
    const key = `${entry.date}__${entry.user}__${entry.dayLabel}`;

    if (!groupsByKey.has(key)) {
      const group = {
        key,
        date: entry.date,
        user: entry.user,
        dayLabel: entry.dayLabel,
        entries: [],
      };
      groupsByKey.set(key, group);
      groups.push(group);
    }

    groupsByKey.get(key).entries.push(entry);
  });

  return groups;
}

function parseTrainingDate(date) {
  const [day, month, year] = date.split(/[/.-]/).map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1, day);
}

function parseDateInput(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateInput(date) {
  const [day, month, year] = date.split(/[/.-]/).map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getInitialFilters(focusedWorkout) {
  if (!focusedWorkout) {
    return {
      search: '',
      user: ALL_OPTIONS,
      exercise: ALL_OPTIONS,
      fromDate: '',
      toDate: '',
    };
  }

  const inputDate = formatDateInput(focusedWorkout.date);

  return {
    search: '',
    user: focusedWorkout.user || ALL_OPTIONS,
    exercise: ALL_OPTIONS,
    fromDate: inputDate,
    toDate: inputDate,
  };
}
