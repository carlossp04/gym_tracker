export function truncateText(text, maxLength = 25) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export function applyExerciseAliases(parsedData, aliases) {
  if (!parsedData) return null;

  return Object.fromEntries(
    Object.entries(parsedData).map(([user, entries]) => [
      user,
      entries.map((entry) => ({
        ...entry,
        exercise: aliases[entry.exercise] || entry.exercise,
        oneRepMax: estimateOneRepMax(entry.weight, entry.reps),
      })),
    ]),
  );
}

export function applyEntryEdits(parsedData, entryEdits, deletedEntryIds = {}) {
  if (!parsedData) return null;

  const editedData = {};

  Object.entries(parsedData).forEach(([sourceUser, entries]) => {
    entries.forEach((entry) => {
      if (deletedEntryIds?.[entry.id]) return;

      const edit = entryEdits?.[entry.id] || {};
      const user = cleanTextValue(edit.user) || sourceUser;
      const sets = normalizePositiveNumber(edit.sets, entry.sets);
      const reps = normalizePositiveNumber(edit.reps, entry.reps);
      const weight = normalizePositiveNumber(edit.weight, entry.weight);
      const nextEntry = {
        ...entry,
        date: cleanTextValue(edit.date) || entry.date,
        dayLabel: cleanTextValue(edit.dayLabel) || entry.dayLabel,
        exercise: cleanTextValue(edit.exercise) || entry.exercise,
        sets,
        reps,
        weight,
        volumen: sets * reps * weight,
        oneRepMax: estimateOneRepMax(weight, reps),
      };

      if (!editedData[user]) editedData[user] = [];
      editedData[user].push(nextEntry);
    });
  });

  return editedData;
}

export function getAvailableUsers(processedData) {
  return processedData ? Object.keys(processedData) : [];
}

export function getAllUniqueExercises(processedData) {
  if (!processedData) return [];

  const exercises = new Set();
  Object.values(processedData).forEach((userEntries) => {
    userEntries.forEach((entry) => exercises.add(entry.exercise));
  });

  return [...exercises].sort();
}

export function getUserExercises(processedData, selectedUser) {
  if (!processedData || !selectedUser || !processedData[selectedUser]) return [];
  return [...new Set(processedData[selectedUser].map((entry) => entry.exercise))];
}

export function getProgressChartData(processedData, selectedUser, selectedExercise) {
  if (!processedData || !selectedUser || !selectedExercise || !processedData[selectedUser]) return [];

  const rawData = processedData[selectedUser]
    .filter((entry) => entry.exercise === selectedExercise)
    .sort((a, b) => parseChatDate(a.date) - parseChatDate(b.date));

  const groupedByDate = rawData.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {});

  return Object.entries(groupedByDate).map(([date, entries]) => {
    const maxWeight = Math.max(...entries.map((entry) => entry.weight));
    const maxOneRepMax = Math.max(...entries.map((entry) => entry.oneRepMax ?? estimateOneRepMax(entry.weight, entry.reps)));
    const totalSets = entries.reduce((sum, entry) => sum + entry.sets, 0);
    const averageWeight = roundToOneDecimal(
      totalSets > 0
        ? entries.reduce((sum, entry) => sum + entry.sets * entry.weight, 0) / totalSets
        : 0,
    );
    const averageReps = roundToOneDecimal(
      totalSets > 0
        ? entries.reduce((sum, entry) => sum + entry.sets * entry.reps, 0) / totalSets
        : entries[0]?.reps || 0,
    );
    const representative = entries.find((entry) => entry.weight === maxWeight) || entries[0];
    const averageSet = {
      ...representative,
      id: `${selectedUser}-${date}-average`,
      sets: totalSets,
      reps: averageReps,
      weight: averageWeight,
    };

    return {
      ...representative,
      date,
      weight: averageWeight,
      reps: averageReps,
      oneRepMax: estimateOneRepMax(averageWeight, averageReps),
      maxWeight,
      maxOneRepMax,
      totalSets,
      averageSet,
      bestSets: [averageSet],
      workoutKey: buildWorkoutKey(selectedUser, representative.date, representative.dayLabel),
    };
  });
}

export function getComparisonChartData(processedData, comparisonExercise) {
  if (!processedData || !comparisonExercise) return [];

  const dataByDate = {};
  Object.keys(processedData).forEach((user) => {
    const userEntries = processedData[user].filter((entry) => entry.exercise === comparisonExercise);
    userEntries.forEach((entry) => {
      if (!dataByDate[entry.date]) dataByDate[entry.date] = { date: entry.date, rawDate: entry.date };
      const currentMax = dataByDate[entry.date][user];
      if (!currentMax || entry.weight > currentMax) {
        dataByDate[entry.date][user] = entry.weight;
        dataByDate[entry.date][`${user}__reps`] = entry.reps;
        dataByDate[entry.date][`${user}__bestSets`] = [entry];
        dataByDate[entry.date][`${user}__workoutKey`] = buildWorkoutKey(user, entry.date, entry.dayLabel);
      } else if (entry.weight === currentMax) {
        dataByDate[entry.date][`${user}__bestSets`].push(entry);
      }
    });
  });

  return Object.values(dataByDate).sort((a, b) => parseChatDate(a.date) - parseChatDate(b.date));
}

export function getGeneralComparisonChartData(processedData) {
  if (!processedData) return [];

  const users = Object.keys(processedData);
  const volumeByDate = {};

  users.forEach((user) => {
    processedData[user].forEach((entry) => {
      if (!volumeByDate[entry.date]) volumeByDate[entry.date] = { date: entry.date };
      volumeByDate[entry.date][user] = (volumeByDate[entry.date][user] || 0) + entry.volumen;
      volumeByDate[entry.date][`${user}__reps`] = (volumeByDate[entry.date][`${user}__reps`] || 0) + entry.sets * entry.reps;
    });
  });

  const cumulativeVolume = Object.fromEntries(users.map((user) => [user, 0]));
  const cumulativeReps = Object.fromEntries(users.map((user) => [user, 0]));

  return Object.values(volumeByDate)
    .sort((a, b) => parseChatDate(a.date) - parseChatDate(b.date))
    .map((item) => {
      const row = { date: item.date };
      users.forEach((user) => {
        cumulativeVolume[user] += item[user] || 0;
        cumulativeReps[user] += item[`${user}__reps`] || 0;
        row[user] = Math.round(cumulativeVolume[user]);
        row[`${user}__reps`] = cumulativeReps[user];
      });
      return row;
    });
}

export function getWeeklyVolumeChartData(processedData) {
  if (!processedData) return [];

  const weeklyVolume = {};

  Object.entries(processedData).forEach(([user, entries]) => {
    entries.forEach((entry) => {
      const weekKey = getWeekKey(entry.date);
      if (!weeklyVolume[weekKey]) weeklyVolume[weekKey] = { week: weekKey, sortDate: getWeekStart(parseChatDate(entry.date)) };
      weeklyVolume[weekKey][user] = (weeklyVolume[weekKey][user] || 0) + entry.volumen;
      weeklyVolume[weekKey][`${user}__reps`] = (weeklyVolume[weekKey][`${user}__reps`] || 0) + entry.sets * entry.reps;
    });
  });

  return Object.values(weeklyVolume)
    .sort((a, b) => a.sortDate - b.sortDate)
    .map((item) => {
      const row = { ...item };
      delete row.sortDate;
      Object.keys(row).forEach((key) => {
        if (key !== 'week' && !key.endsWith('__reps')) row[key] = Math.round(row[key]);
      });
      return row;
    });
}

export function getGeneralUserSummaries(processedData) {
  if (!processedData) return [];

  return Object.entries(processedData)
    .map(([user, entries]) => {
      const totalVolume = entries.reduce((sum, entry) => sum + entry.volumen, 0);
      const totalSets = entries.reduce((sum, entry) => sum + entry.sets, 0);
      const sessions = new Set(entries.map((entry) => entry.date)).size;
      const exercises = new Set(entries.map((entry) => entry.exercise));
      const exerciseProgress = getExerciseProgress(entries);
      const comparable = exerciseProgress.filter((item) => item.startWeight > 0);
      const improved = comparable.filter((item) => item.currentWeight > item.startWeight);
      const avgImprovement =
        comparable.length > 0
          ? comparable.reduce((sum, item) => sum + item.improvement, 0) / comparable.length
          : 0;

      return {
        user,
        totalVolume,
        totalSets,
        sessions,
        uniqueExercises: exercises.size,
        improvedExercises: improved.length,
        comparableExercises: comparable.length,
        avgImprovement,
        formattedAvgImprovement: formatPercent(avgImprovement),
      };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

export function getExerciseOneRepMaxSummaries(processedData) {
  if (!processedData) return {};

  const summaries = {};

  Object.entries(processedData).forEach(([user, entries]) => {
    entries.forEach((entry) => {
      const oneRepMax = entry.oneRepMax ?? estimateOneRepMax(entry.weight, entry.reps);
      const current = summaries[entry.exercise];
      if (!current || oneRepMax > current.oneRepMax) {
        summaries[entry.exercise] = {
          exercise: entry.exercise,
          user,
          date: entry.date,
          weight: entry.weight,
          reps: entry.reps,
          oneRepMax,
        };
      }
    });
  });

  return summaries;
}

export function getStats(chartData) {
  if (chartData.length === 0) return null;

  const maxWeight = Math.max(...chartData.map((entry) => entry.maxWeight ?? entry.weight));
  const maxOneRepMax = Math.max(...chartData.map((entry) => entry.maxOneRepMax ?? entry.oneRepMax ?? estimateOneRepMax(entry.weight, entry.reps)));
  const startWeight = chartData[0].weight;
  const currentWeight = chartData[chartData.length - 1].weight;
  const improvement = startWeight === 0 ? 0 : ((currentWeight - startWeight) / startWeight) * 100;

  return {
    maxWeight,
    maxOneRepMax,
    improvement: formatPercent(improvement),
    numericImprovement: improvement,
    totalSessions: chartData.length,
  };
}

export function estimateOneRepMax(weight, reps) {
  const numericWeight = Number(weight);
  const numericReps = Number(reps);
  if (!Number.isFinite(numericWeight) || !Number.isFinite(numericReps) || numericWeight <= 0 || numericReps <= 0) return 0;
  return Math.round(numericWeight * (1 + numericReps / 30) * 10) / 10;
}

function cleanTextValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePositiveNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function parseChatDate(date) {
  const [day, month, year] = date.split(/[/.-]/);
  const fullYear = year.length === 2 ? `20${year}` : year;
  return new Date(`${fullYear}-${month}-${day}`);
}

function buildWorkoutKey(user, date, dayLabel) {
  return `${date}__${user}__${dayLabel}`;
}

function getWeekKey(date) {
  const weekStart = getWeekStart(parseChatDate(date));
  const day = String(weekStart.getDate()).padStart(2, '0');
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function getWeekStart(date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getExerciseProgress(entries) {
  const entriesByExercise = {};

  entries.forEach((entry) => {
    if (!entriesByExercise[entry.exercise]) entriesByExercise[entry.exercise] = [];
    entriesByExercise[entry.exercise].push(entry);
  });

  return Object.entries(entriesByExercise).map(([exercise, exerciseEntries]) => {
    const maxByDate = Object.values(
      exerciseEntries.reduce((acc, entry) => {
        if (!acc[entry.date] || entry.weight > acc[entry.date].weight) acc[entry.date] = entry;
        return acc;
      }, {}),
    ).sort((a, b) => parseChatDate(a.date) - parseChatDate(b.date));
    const first = maxByDate[0];
    const latest = maxByDate[maxByDate.length - 1];
    const improvement = first.weight === 0 ? 0 : ((latest.weight - first.weight) / first.weight) * 100;

    return {
      exercise,
      startWeight: first.weight,
      currentWeight: latest.weight,
      improvement,
    };
  });
}

function formatPercent(value) {
  if (value === 0) return '0%';
  const absValue = Math.abs(value);
  const sign = value > 0 ? '+' : '';
  if (absValue >= 100) return `${sign}${Math.round(value)}%`;
  return `${sign}${value.toFixed(1)}%`;
}
