import { normalizeChatText, parseWhatsAppChat } from './whatsappParser.js';

export function inspectTrainingImport(text, existingData = {}) {
  const normalized = normalizeChatText(text).trim();
  const parsed = parseWhatsAppChat(normalized);
  const entries = Object.entries(parsed).flatMap(([user, rows]) => rows.map((row) => ({ ...row, user })));
  const signature = (entry) => {
    const [day, month, year] = entry.date.split(/[/.-]/).map(Number);
    return JSON.stringify([entry.user, `${year < 100 ? 2000 + year : year}-${month}-${day}`, entry.exercise.trim().toLocaleLowerCase('es'), entry.sets, entry.reps, entry.weight]);
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

export function todayInputValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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
  return { id: crypto.randomUUID(), routineName: 'Entrenamiento repetido', sessionName: entries[0]?.dayLabel || 'Entrenamiento', user, date, startedAt: new Date().toISOString(), exercises: [...exercises.values()] };
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
