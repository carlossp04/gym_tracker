import { todayInputValue, formatDateInput, parseTrainingDate } from './trainingDates.js';
import { normalizeChatText, parseWhatsAppChat } from './whatsappParser.js';

export { todayInputValue };

export function inspectTrainingImport(text, existingData = {}) {
  const normalized = normalizeChatText(text).trim();
  const parsed = parseWhatsAppChat(normalized);
  const entries = Object.entries(parsed).flatMap(([user, rows]) => rows.map((row) => ({ ...row, user })));
  const signature = (entry) => {
    const date = formatDateInput(parseTrainingDate(entry.date));
    return JSON.stringify([entry.user, date, entry.exercise.trim().toLocaleLowerCase('es'), entry.sets, entry.reps, entry.weight]);
  };
  const existing = new Set(Object.entries(existingData || {}).flatMap(([user, rows]) => rows.map((row) => signature({ ...row, user }))));
  const seen = new Set();
  const duplicates = entries.filter((entry) => {
    const key = signature(entry);
    const duplicate = existing.has(key) || seen.has(key);
    seen.add(key);
    return duplicate;
  }).length;
  const candidateLines = normalized.split('\n').filter((line) => /\d+\s*s?\s*x\s*\d+\s*r?\s*x/i.test(line));
  return { entries, duplicates, unrecognized: Math.max(0, candidateLines.length - entries.length) };
}

/** @returns {import('./vaultTypes.js').ActiveWorkout} */
export function workoutFromEntries(entries, user, date = todayInputValue()) {
  const exercises = new Map();
  entries.forEach((entry) => {
    if (!exercises.has(entry.exercise)) exercises.set(entry.exercise, { id: crypto.randomUUID(), exercise: entry.exercise, sets: [] });
    const exercise = exercises.get(entry.exercise);
    for (let index = 0; index < entry.sets; index += 1) exercise.sets.push({
      id: crypto.randomUUID(), number: exercise.sets.length + 1,
      targetReps: entry.reps, actualReps: entry.reps, weight: String(entry.weight), completed: false,
    });
  });
  const source = entries[0];
  const sessionLink = source?.routineId && source.sessionId && entries.every(
    (entry) => entry.routineId === source.routineId && entry.sessionId === source.sessionId,
  ) ? { routineId: source.routineId, sessionId: source.sessionId } : {};
  return { ...sessionLink, id: crypto.randomUUID(), routineName: 'Entrenamiento repetido', sessionName: entries[0]?.dayLabel || 'Entrenamiento', user, date, startedAt: new Date().toISOString(), exercises: [...exercises.values()] };
}

export function routineFromEntries(entries, name) {
  const workout = workoutFromEntries(entries, entries[0]?.user || '');
  return { id: crypto.randomUUID(), name, sessions: [{
    id: crypto.randomUUID(), name: entries[0]?.dayLabel || 'Sesión',
    exercises: workout.exercises.map((exercise) => ({
      id: crypto.randomUUID(), exercise: exercise.exercise,
      targetSets: exercise.sets.length, targetReps: exercise.sets[0].targetReps,
      notes: new Set(exercise.sets.map((set) => set.targetReps)).size > 1 ? 'La sesión original tenía repeticiones variables. Revisa el objetivo antes de entrenar.' : '',
    })),
  }] };
}

export function getLastRoutineSessionEntry(entries, routines, routineId, session) {
  const nameMatches = routines.flatMap((routine) => routine.sessions).filter((item) => item.name === session.name);
  return entries.find((entry) => {
    if (entry.routineId || entry.sessionId) {
      return entry.routineId === routineId && entry.sessionId === session.id;
    }
    return nameMatches.length === 1 && entry.dayLabel === session.name;
  });
}

export function isValidSetReps(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

export function isValidSetWeight(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

export function canCompleteSet(set) {
  return isValidSetReps(set.actualReps) && isValidSetWeight(set.weight);
}

export function moreWeightReminderKey(user, exercise) {
  return JSON.stringify([user.trim(), exercise.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')]);
}

export function updateMoreWeightReminders(reminders, workout, completedEntries) {
  const next = { ...reminders };
  const maxWeights = new Map();
  for (const entry of completedEntries) {
    const key = moreWeightReminderKey(workout.user, entry.exercise);
    maxWeights.set(key, Math.max(maxWeights.get(key) ?? 0, entry.weight));
  }

  for (const [key, weight] of maxWeights) {
    if (weight > next[key]) delete next[key];
  }

  for (const exercise of workout.exercises) {
    const dismissedKey = exercise.dismissMoreWeightReminder;
    if (dismissedKey === true) delete next[moreWeightReminderKey(workout.user, exercise.exercise)];
    else for (const key of dismissedKey || []) delete next[key];
  }

  for (const exercise of workout.exercises) {
    if (!exercise.moreWeightNextTime) continue;
    const key = moreWeightReminderKey(workout.user, exercise.exercise);
    if (maxWeights.has(key)) next[key] = maxWeights.get(key);
  }
  return next;
}
