import { useMemo, useState } from 'react';
import { CalendarDays, FilterX, Pencil, Search } from 'lucide-react';

const ALL_OPTIONS = 'Todos';

export default function TrainingRecordsTab({ trainingEntries, focusedWorkout, onOpenTrainingEdit }) {
  const [filters, setFilters] = useState(() => getInitialFilters(focusedWorkout));

  const users = useMemo(
    () => [ALL_OPTIONS, ...new Set(trainingEntries.map((entry) => entry.user).sort())],
    [trainingEntries],
  );

  const exercises = useMemo(
    () => [ALL_OPTIONS, ...new Set(trainingEntries.map((entry) => entry.exercise).sort())],
    [trainingEntries],
  );

  const filteredEntries = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const fromDate = filters.fromDate ? parseDateInput(filters.fromDate) : null;
    const toDate = filters.toDate ? parseDateInput(filters.toDate) : null;

    return trainingEntries.filter((entry) => {
      const entryDate = parseTrainingDate(entry.date);
      const matchesSearch = !searchTerm || [entry.user, entry.exercise, entry.dayLabel, entry.date]
        .some((value) => String(value || '').toLowerCase().includes(searchTerm));
      const matchesUser = filters.user === ALL_OPTIONS || entry.user === filters.user;
      const matchesExercise = filters.exercise === ALL_OPTIONS || entry.exercise === filters.exercise;
      const matchesFromDate = !fromDate || entryDate >= fromDate;
      const matchesToDate = !toDate || entryDate <= toDate;

      return matchesSearch && matchesUser && matchesExercise && matchesFromDate && matchesToDate;
    });
  }, [filters, trainingEntries]);

  const groupedEntries = useMemo(() => groupEntriesByWorkout(filteredEntries), [filteredEntries]);
  const hasActiveFilters = Object.values(filters).some((value) => value && value !== ALL_OPTIONS);

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

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Registros editables</h2>
              <p className="text-sm text-slate-400 mt-1">Corrige usuario, fecha, ejercicio, series, reps o peso.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead className="bg-slate-950 text-slate-500 uppercase text-xs tracking-wider font-bold">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Ejercicio</th>
                <th className="p-4 text-right">Series</th>
                <th className="p-4 text-right">Reps</th>
                <th className="p-4 text-right">Kg</th>
                <th className="p-4 text-right">1RM</th>
                <th className="p-4 text-center">Editar</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {groupedEntries.map((group, groupIndex) => (
                <WorkoutGroup
                  key={group.key}
                  group={group}
                  groupIndex={groupIndex}
                  isFocused={focusedWorkout?.workoutKey === group.key}
                  onOpenTrainingEdit={onOpenTrainingEdit}
                />
              ))}
              {groupedEntries.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500">
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

function WorkoutGroup({ group, groupIndex, isFocused, onOpenTrainingEdit }) {
  const stripeClass = groupIndex % 2 === 0 ? 'border-l-4 border-l-emerald-500/80' : 'border-l-4 border-l-cyan-500/80';
  const rowBgClass = groupIndex % 2 === 0 ? 'bg-emerald-500/[0.03]' : 'bg-cyan-500/[0.03]';
  const headerBgClass = isFocused
    ? 'bg-amber-400/15 text-amber-200 ring-2 ring-inset ring-amber-400/60'
    : groupIndex % 2 === 0 ? 'bg-emerald-500/10 text-emerald-200' : 'bg-cyan-500/10 text-cyan-200';
  const totalVolume = Math.round(group.entries.reduce((sum, entry) => sum + entry.sets * entry.reps * entry.weight, 0));

  return (
    <>
      <tr className={`${headerBgClass} ${stripeClass}`}>
        <td colSpan={8} className="px-4 py-3">
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
      {group.entries.map((entry, entryIndex) => (
        <tr
          key={entry.id}
          className={`${rowBgClass} ${stripeClass} hover:bg-slate-800/40 transition-colors border-t border-slate-800/50 ${entryIndex === group.entries.length - 1 ? 'border-b-8 border-b-slate-950' : ''}`}
        >
          <td className="p-4 text-slate-400 font-mono whitespace-nowrap">{entry.date}</td>
          <td className="p-4 text-slate-300 font-bold whitespace-nowrap">{entry.user}</td>
          <td className="p-4 text-white font-bold max-w-[260px] truncate" title={entry.exercise}>{entry.exercise}</td>
          <td className="p-4 text-right text-slate-300">{entry.sets}</td>
          <td className="p-4 text-right text-slate-300">{entry.reps}</td>
          <td className="p-4 text-right text-slate-300">{entry.weight}</td>
          <td className="p-4 text-right text-emerald-400 font-black">{entry.oneRepMax} kg</td>
          <td className="p-4 text-center">
            <button
              onClick={() => onOpenTrainingEdit(entry)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors"
              title="Editar registro"
            >
              <Pencil size={16} />
            </button>
          </td>
        </tr>
      ))}
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
