import { useMemo, useState } from 'react';
import { Bot, CalendarDays, Check, ClipboardCopy, FileText, Users } from 'lucide-react';

const DEFAULT_ASPECTS = {
  users: true,
  latestDay: true,
  latestWeek: true,
  latestMonth: false,
  exactDate: false,
  dateRange: false,
};

export default function AiResumeTab({ processedData, availableUsers, userColors }) {
  const [selectedUserFilter, setSelectedUserFilter] = useState(null);
  const [aspects, setAspects] = useState(DEFAULT_ASPECTS);
  const [exactDate, setExactDate] = useState('');
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const selectedUsers = useMemo(
    () => (selectedUserFilter === null ? availableUsers : selectedUserFilter.filter((user) => availableUsers.includes(user))),
    [availableUsers, selectedUserFilter],
  );

  const latestDateInput = useMemo(() => {
    const latestDate = getLatestEntryDate(flattenEntries(processedData, availableUsers));
    return latestDate ? formatDateInput(latestDate) : '';
  }, [availableUsers, processedData]);

  const effectiveExactDate = exactDate || latestDateInput;
  const effectiveRangeStartDate = rangeStartDate || latestDateInput;
  const effectiveRangeEndDate = rangeEndDate || latestDateInput;

  const scopedEntries = useMemo(
    () => flattenEntries(processedData, selectedUsers),
    [processedData, selectedUsers],
  );

  const aiResumeText = useMemo(
    () => buildAiResumeText(scopedEntries, selectedUsers, aspects, effectiveExactDate, effectiveRangeStartDate, effectiveRangeEndDate),
    [aspects, effectiveExactDate, effectiveRangeEndDate, effectiveRangeStartDate, scopedEntries, selectedUsers],
  );

  const selectedAspectCount = Object.values(aspects).filter(Boolean).length;
  const selectedAllUsers = selectedUsers.length === availableUsers.length && availableUsers.length > 0;

  const toggleAspect = (aspect) => {
    setAspects((current) => ({ ...current, [aspect]: !current[aspect] }));
  };

  const toggleUser = (user) => {
    setSelectedUserFilter((currentFilter) => {
      const current = currentFilter === null ? availableUsers : currentFilter.filter((item) => availableUsers.includes(item));
      return current.includes(user)
        ? current.filter((item) => item !== user)
        : [...current, user];
    });
  };

  const toggleAllUsers = () => {
    setSelectedUserFilter(selectedAllUsers ? [] : null);
  };

  const copyResume = async () => {
    try {
      await navigator.clipboard.writeText(aiResumeText);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1600);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2200);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3">
          <Bot className="text-amber-300" size={32} /> AI Resume
        </h2>
        <p className="text-slate-400 text-sm">Genera contexto compacto para pegar en ChatGPT, Gemini u otra IA.</p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={19} className="text-amber-300" /> Contexto generado
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {selectedUsers.length} usuarios · {selectedAspectCount} secciones · {aiResumeText.length.toLocaleString()} caracteres
            </p>
          </div>
          <button
            type="button"
            onClick={copyResume}
            disabled={aiResumeText.length === 0}
            className="bg-amber-300 hover:bg-amber-200 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 px-4 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2"
          >
            {copyState === 'copied' ? <Check size={16} /> : <ClipboardCopy size={16} />}
            {copyState === 'copied' ? 'Copiado' : copyState === 'error' ? 'No copiado' : 'Copiar contexto'}
          </button>
        </div>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-6">
            <ControlGroup title="Aspectos" icon={FileText}>
              <CheckOption
                checked={aspects.users}
                label="Usuarios"
                description="Resumen global, actividad, ejercicios frecuentes y mejores marcas."
                onChange={() => toggleAspect('users')}
              />
              <CheckOption
                checked={aspects.latestDay}
                label="Último día de ejercicio"
                description="Último entreno disponible por usuario seleccionado."
                onChange={() => toggleAspect('latestDay')}
              />
              <CheckOption
                checked={aspects.latestWeek}
                label="Última semana de ejercicios"
                description="Últimos 7 días desde la fecha más reciente de los datos."
                onChange={() => toggleAspect('latestWeek')}
              />
              <CheckOption
                checked={aspects.latestMonth}
                label="Último mes"
                description="Últimos 30 días desde la fecha más reciente de los datos."
                onChange={() => toggleAspect('latestMonth')}
              />
              <CheckOption
                checked={aspects.exactDate}
                label="Fecha exacta"
                description="Entrenos del día elegido."
                onChange={() => toggleAspect('exactDate')}
              />
              <label className="relative block">
                <span className="absolute left-10 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha</span>
                <CalendarDays size={16} className="absolute left-3 top-1/2 translate-y-0 text-slate-500" />
                <input
                  type="date"
                  value={effectiveExactDate}
                  onChange={(event) => setExactDate(event.target.value)}
                  disabled={!aspects.exactDate}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 pt-6 pb-2 text-sm text-white disabled:text-slate-600 disabled:cursor-not-allowed focus:outline-none focus:border-amber-300/50"
                  aria-label="Fecha exacta para AI Resume"
                />
              </label>
              <CheckOption
                checked={aspects.dateRange}
                label="Rango de fechas"
                description="Entrenos entre inicio y fin incluidos."
                onChange={() => toggleAspect('dateRange')}
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="relative block">
                  <span className="absolute left-10 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Inicio</span>
                  <CalendarDays size={16} className="absolute left-3 top-1/2 translate-y-0 text-slate-500" />
                  <input
                    type="date"
                    value={effectiveRangeStartDate}
                    onChange={(event) => setRangeStartDate(event.target.value)}
                    disabled={!aspects.dateRange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 pt-6 pb-2 text-sm text-white disabled:text-slate-600 disabled:cursor-not-allowed focus:outline-none focus:border-amber-300/50"
                    aria-label="Fecha de inicio para AI Resume"
                  />
                </label>
                <label className="relative block">
                  <span className="absolute left-10 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Fin</span>
                  <CalendarDays size={16} className="absolute left-3 top-1/2 translate-y-0 text-slate-500" />
                  <input
                    type="date"
                    value={effectiveRangeEndDate}
                    onChange={(event) => setRangeEndDate(event.target.value)}
                    disabled={!aspects.dateRange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 pt-6 pb-2 text-sm text-white disabled:text-slate-600 disabled:cursor-not-allowed focus:outline-none focus:border-amber-300/50"
                    aria-label="Fecha de fin para AI Resume"
                  />
                </label>
              </div>
            </ControlGroup>

            <ControlGroup title="Usuarios incluidos" icon={Users}>
              <button
                type="button"
                onClick={toggleAllUsers}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedAllUsers
                    ? 'border-amber-300/50 bg-amber-300/10 text-amber-100'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-sm font-black">Todos los usuarios</span>
                <span className="block text-xs text-slate-500 mt-1">Filtro global para todas las secciones.</span>
              </button>

              <div className="grid sm:grid-cols-2 gap-2">
                {availableUsers.map((user, index) => (
                  <label
                    key={user}
                    className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-sm text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user)}
                      onChange={() => toggleUser(user)}
                      className="h-4 w-4 accent-amber-300"
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: userColors[index % userColors.length] }}
                    />
                    <span className="font-bold truncate">{user}</span>
                  </label>
                ))}
              </div>
            </ControlGroup>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <ResumeMetric label="Sets fuente" value={scopedEntries.length} />
              <ResumeMetric label="Entrenos" value={groupWorkouts(scopedEntries).length} />
              <ResumeMetric label="Usuarios" value={selectedUsers.length} />
            </div>

            <details className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-black text-white hover:bg-slate-900">
                Mostrar texto generado
              </summary>
              <textarea
                readOnly
                value={aiResumeText}
                className="w-full min-h-[520px] bg-slate-950 border-t border-slate-800 p-4 text-xs leading-relaxed text-slate-300 font-mono resize-y focus:outline-none"
                aria-label="Texto AI Resume generado"
              />
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}

function ControlGroup({ title, icon, children }) {
  const Icon = icon;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <Icon size={14} /> {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CheckOption({ checked, label, description, onChange }) {
  return (
    <label className="flex items-start gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-sm text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-amber-300"
      />
      <span>
        <span className="block font-black text-white">{label}</span>
        <span className="block text-xs text-slate-500 mt-1">{description}</span>
      </span>
    </label>
  );
}

function ResumeMetric({ label, value }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-black text-white mt-1">{Number(value).toLocaleString()}</p>
    </div>
  );
}

function buildAiResumeText(entries, selectedUsers, aspects, exactDateInput, rangeStartDateInput, rangeEndDateInput) {
  const sortedEntries = sortEntries(entries);
  const latestDate = getLatestEntryDate(sortedEntries);
  const datasetRange = getDateRange(sortedEntries);
  const sections = {};

  if (aspects.users) sections.users = buildUserProfiles(sortedEntries, selectedUsers);

  if (aspects.latestDay) {
    sections.latest_day_by_user = selectedUsers.map((user) => ({
      user,
      workouts: groupWorkouts(getLatestUserDayEntries(sortedEntries, user)),
    }));
  }

  if (aspects.latestWeek && latestDate) {
    const fromDate = addDays(latestDate, -6);
    sections.latest_7d = buildRangeSection(sortedEntries, fromDate, latestDate);
  }

  if (aspects.latestMonth && latestDate) {
    const fromDate = addDays(latestDate, -29);
    sections.latest_30d = buildRangeSection(sortedEntries, fromDate, latestDate);
  }

  if (aspects.exactDate && exactDateInput) {
    const exactDate = parseDateInput(exactDateInput);
    sections.exact_date = buildRangeSection(sortedEntries, exactDate, exactDate);
  }

  if (aspects.dateRange && rangeStartDateInput && rangeEndDateInput) {
    const rangeStartDate = parseDateInput(rangeStartDateInput);
    const rangeEndDate = parseDateInput(rangeEndDateInput);
    const [fromDate, toDate] = rangeStartDate <= rangeEndDate
      ? [rangeStartDate, rangeEndDate]
      : [rangeEndDate, rangeStartDate];
    sections.date_range = buildRangeSection(sortedEntries, fromDate, toDate);
  }

  const payload = {
    schema: 'gym_tracker_ai_resume_v1',
    instruction: 'Use this compact gym log context as source truth. Dates are dd/mm/yyyy. Weight field kg means total load recorded, not per side. For dumbbell/mancuerna exercises, kg=28 means 28 kg total load, typically 14+14 if two dumbbells. one_rm is estimated.',
    source_note: 'Data already includes app edits, deleted-entry filtering, and exercise aliases.',
    scope: {
      users: selectedUsers,
      selected_sections: Object.keys(aspects).filter((key) => aspects[key]),
      dataset_range: datasetRange,
      anchor_latest_date: latestDate ? formatDisplayDate(latestDate) : null,
      exact_date: exactDateInput ? formatDisplayDate(parseDateInput(exactDateInput)) : null,
      date_range: rangeStartDateInput && rangeEndDateInput
        ? `${formatDisplayDate(parseDateInput(rangeStartDateInput))}..${formatDisplayDate(parseDateInput(rangeEndDateInput))}`
        : null,
    },
    sections,
  };

  return `AI_GYM_CONTEXT\n${JSON.stringify(payload)}`;
}

function buildUserProfiles(entries, selectedUsers) {
  return selectedUsers.map((user) => {
    const userEntries = entries.filter((entry) => entry.user === user);
    const workouts = groupWorkouts(userEntries);
    const exerciseStats = buildExerciseStats(userEntries);
    const totalReps = userEntries.reduce((sum, entry) => sum + entry.sets * entry.reps, 0);
    const totalVolume = userEntries.reduce((sum, entry) => sum + entry.volumen, 0);

    return {
      user,
      entries: userEntries.length,
      workouts: workouts.length,
      range: getDateRange(userEntries),
      exercises_count: exerciseStats.length,
      total_sets: userEntries.reduce((sum, entry) => sum + entry.sets, 0),
      total_reps: totalReps,
      total_volume: Math.round(totalVolume),
      top_exercises_by_volume: exerciseStats.slice(0, 8).map((item) => ({
        exercise: item.exercise,
        sets: item.sets,
        volume: Math.round(item.volume),
        best_kg: item.bestKg,
        best_one_rm: item.bestOneRepMax,
      })),
    };
  });
}

function buildExerciseStats(entries) {
  const statsByExercise = new Map();

  entries.forEach((entry) => {
    if (!statsByExercise.has(entry.exercise)) {
      statsByExercise.set(entry.exercise, {
        exercise: entry.exercise,
        sets: 0,
        volume: 0,
        bestKg: 0,
        bestOneRepMax: 0,
      });
    }

    const stats = statsByExercise.get(entry.exercise);
    stats.sets += entry.sets;
    stats.volume += entry.volumen;
    stats.bestKg = Math.max(stats.bestKg, entry.weight);
    stats.bestOneRepMax = Math.max(stats.bestOneRepMax, entry.oneRepMax || 0);
  });

  return [...statsByExercise.values()].sort((a, b) => b.volume - a.volume);
}

function buildRangeSection(entries, fromDate, toDate) {
  const rangeEntries = entries.filter((entry) => {
    const entryDate = parseTrainingDate(entry.date);
    return entryDate >= startOfDay(fromDate) && entryDate <= startOfDay(toDate);
  });

  return {
    range: `${formatDisplayDate(fromDate)}..${formatDisplayDate(toDate)}`,
    entries: rangeEntries.length,
    workouts: groupWorkouts(rangeEntries),
  };
}

function getLatestUserDayEntries(entries, user) {
  const userEntries = entries.filter((entry) => entry.user === user);
  const latestDate = getLatestEntryDate(userEntries);
  if (!latestDate) return [];

  const latestKey = toDateKey(latestDate);
  return userEntries.filter((entry) => toDateKey(parseTrainingDate(entry.date)) === latestKey);
}

function groupWorkouts(entries) {
  const groupsByKey = new Map();

  sortEntries(entries).forEach((entry) => {
    const key = `${entry.date}__${entry.user}__${entry.dayLabel}`;
    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        user: entry.user,
        date: formatDisplayDate(parseTrainingDate(entry.date)),
        day: entry.dayLabel,
        volume: 0,
        exercises: new Map(),
      });
    }

    const workout = groupsByKey.get(key);
    workout.volume += entry.volumen;

    if (!workout.exercises.has(entry.exercise)) {
      workout.exercises.set(entry.exercise, {
        name: entry.exercise,
        sets: [],
        volume: 0,
        best_kg: 0,
        best_one_rm: 0,
      });
    }

    const exercise = workout.exercises.get(entry.exercise);
    exercise.sets.push(buildSetPayload(entry));
    exercise.volume += entry.volumen;
    exercise.best_kg = Math.max(exercise.best_kg, entry.weight);
    exercise.best_one_rm = Math.max(exercise.best_one_rm, entry.oneRepMax || 0);
  });

  return [...groupsByKey.values()]
    .sort((a, b) => parseTrainingDate(b.date) - parseTrainingDate(a.date) || a.user.localeCompare(b.user))
    .map((workout) => ({
      user: workout.user,
      date: workout.date,
      day: workout.day,
      volume: Math.round(workout.volume),
      exercises: [...workout.exercises.values()].map((exercise) => ({
        ...exercise,
        volume: Math.round(exercise.volume),
      })),
    }));
}

function flattenEntries(processedData, users) {
  if (!processedData) return [];

  return users.flatMap((user) =>
    (processedData[user] || []).map((entry) => ({
      ...entry,
      user,
      oneRepMax: entry.oneRepMax ?? estimateOneRepMax(entry.weight, entry.reps),
    })),
  );
}

function buildSetPayload(entry) {
  return {
    sets: entry.sets,
    reps: entry.reps,
    kg: entry.weight,
  };
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => parseTrainingDate(a.date) - parseTrainingDate(b.date) || a.user.localeCompare(b.user));
}

function getDateRange(entries) {
  if (entries.length === 0) return null;

  const sortedDates = entries.map((entry) => parseTrainingDate(entry.date)).sort((a, b) => a - b);
  return `${formatDisplayDate(sortedDates[0])}..${formatDisplayDate(sortedDates[sortedDates.length - 1])}`;
}

function getLatestEntryDate(entries) {
  if (entries.length === 0) return null;

  return entries
    .map((entry) => parseTrainingDate(entry.date))
    .sort((a, b) => b - a)[0];
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function toDateKey(date) {
  return formatDateInput(date);
}

function startOfDay(date) {
  const cleanDate = new Date(date);
  cleanDate.setHours(0, 0, 0, 0);
  return cleanDate;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfDay(nextDate);
}

function estimateOneRepMax(weight, reps) {
  const numericWeight = Number(weight);
  const numericReps = Number(reps);
  if (!Number.isFinite(numericWeight) || !Number.isFinite(numericReps) || numericWeight <= 0 || numericReps <= 0) return 0;
  return Math.round(numericWeight * (1 + numericReps / 30) * 10) / 10;
}
