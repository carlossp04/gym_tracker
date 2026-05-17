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
      })),
    ]),
  );
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
    if (!acc[curr.date] || curr.weight > acc[curr.date].weight) acc[curr.date] = curr;
    return acc;
  }, {});

  return Object.values(groupedByDate);
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

export function getStats(chartData) {
  if (chartData.length === 0) return null;

  const maxWeight = Math.max(...chartData.map((entry) => entry.weight));
  const startWeight = chartData[0].weight;
  const currentWeight = chartData[chartData.length - 1].weight;
  const improvement = startWeight === 0 ? 0 : ((currentWeight - startWeight) / startWeight) * 100;

  return {
    maxWeight,
    improvement: formatPercent(improvement),
    numericImprovement: improvement,
    totalSessions: chartData.length,
  };
}

function parseChatDate(date) {
  const [day, month, year] = date.split(/[/.-]/);
  const fullYear = year.length === 2 ? `20${year}` : year;
  return new Date(`${fullYear}-${month}-${day}`);
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
