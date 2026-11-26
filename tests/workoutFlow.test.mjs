import test from 'node:test';
import assert from 'node:assert/strict';
import { canCompleteSet, getLastRoutineSessionEntry, inspectTrainingImport, moreWeightReminderKey, routineFromEntries, updateMoreWeightReminders, workoutFromEntries } from '../src/lib/workoutFlow.js';
import { parseWhatsAppChat, workoutSessionPrefix } from '../src/lib/whatsappParser.js';

test('a valid existing history does not make an invalid new import valid', () => {
  const existing = { Carlos: [{ date: '04/10/26', exercise: 'Press banca', sets: 3, reps: 10, weight: 60 }] };
  assert.equal(inspectTrainingImport('Esto no es un entrenamiento', existing).entries.length, 0);
});

test('preview detects duplicates across date formats and reports orphan set lines', () => {
  const existing = { Carlos: [{ date: '04/10/26', exercise: 'Press banca', sets: 3, reps: 10, weight: 60 }] };
  const preview = inspectTrainingImport('[04/10/2026, 18:00] Carlos: 2 x 10 x 70\n[04/10/2026, 18:00] Carlos: Press banca\n[04/10/2026, 18:00] Carlos: 3 x 10 x 60', existing);
  assert.equal(preview.entries.length, 1);
  assert.equal(preview.duplicates, 1);
  assert.equal(preview.unrecognized, 1);
});

test('repeating a workout preserves different set weights and repetitions without marking them completed', () => {
  const workout = workoutFromEntries([
    { exercise: 'Press banca', dayLabel: 'Torso', sets: 2, reps: 10, weight: 60 },
    { exercise: 'Press banca', dayLabel: 'Torso', sets: 1, reps: 8, weight: 65 },
  ], 'Carlos', '2026-10-04');
  assert.equal(workout.exercises.length, 1);
  assert.deepEqual(workout.exercises[0].sets.map(({ number, actualReps, weight, completed }) => ({ number, actualReps, weight, completed })), [
    { number: 1, actualReps: 10, weight: '60', completed: false },
    { number: 2, actualReps: 10, weight: '60', completed: false },
    { number: 3, actualReps: 8, weight: '65', completed: false },
  ]);
  assert.equal(new Set(workout.exercises[0].sets.map((set) => set.id)).size, 3);
});

test('saving history as a routine keeps set counts and calls out variable repetitions', () => {
  const routine = routineFromEntries([
    { exercise: 'Press banca', dayLabel: 'Torso', sets: 2, reps: 10, weight: 60 },
    { exercise: 'Press banca', dayLabel: 'Torso', sets: 1, reps: 8, weight: 65 },
  ], 'Rutina desde historial');
  const exercise = routine.sessions[0].exercises[0];
  assert.equal(exercise.targetSets, 3);
  assert.equal(exercise.targetReps, 10);
  assert.match(exercise.notes, /repeticiones variables/);
});

test('the more-weight reminder persists until a heavier completed set or dismissal', () => {
  const exercise = { exercise: 'Press banca', moreWeightNextTime: true };
  const workout = { user: 'Carlos', exercises: [exercise] };
  const key = moreWeightReminderKey('Carlos', ' PRESS  BANCA ');
  const completed = (...weights) => weights.map((weight) => ({ exercise: exercise.exercise, weight }));

  assert.deepEqual(updateMoreWeightReminders({}, workout, []), {});
  const reminders = updateMoreWeightReminders({}, workout, completed(40, 60));
  assert.deepEqual(reminders, { [key]: 60 });

  exercise.moreWeightNextTime = false;
  assert.deepEqual(updateMoreWeightReminders(reminders, workout, completed(60)), reminders);
  assert.deepEqual(updateMoreWeightReminders(reminders, { ...workout, user: 'Ana' }, completed(65)), reminders);
  assert.deepEqual(updateMoreWeightReminders(reminders, workout, completed(65)), {});

  exercise.dismissMoreWeightReminder = true;
  assert.deepEqual(updateMoreWeightReminders(reminders, workout, []), {});
  exercise.moreWeightNextTime = true;
  assert.deepEqual(updateMoreWeightReminders(reminders, workout, completed(65)), { [key]: 65 });
});

test('routine session links survive parsing and match by ID across identical names', () => {
  const prefix = '[26/11/2026, 12:00] Carlos:';
  const entries = parseWhatsAppChat([
    `${prefix} ### Día 1 ###`,
    `${prefix} ${workoutSessionPrefix} {"routineId":"r1","sessionId":"s1"}`,
    `${prefix} GYM_TRACKER_EXERCISE: Press banca`,
    `${prefix} 1 x 10 x 60`,
    `${prefix} ### Día 1 ###`,
    `${prefix} GYM_TRACKER_EXERCISE: Sentadilla`,
    `${prefix} 1 x 10 x 80`,
  ].join('\n')).Carlos;
  const first = { id: 's1', name: 'Día 1' };
  const second = { id: 's2', name: 'Día 1' };
  const routines = [{ id: 'r1', sessions: [first] }, { id: 'r2', sessions: [second] }];
  assert.equal(entries.length, 2);
  assert.equal(entries[1].routineId, undefined);
  assert.equal(getLastRoutineSessionEntry(entries, routines, 'r1', { ...first, name: 'Torso' }), entries[0]);
  assert.equal(getLastRoutineSessionEntry(entries, routines, 'r2', second), undefined);
  assert.equal(getLastRoutineSessionEntry(entries, [routines[1]], 'r2', second), entries[1]);
  assert.equal(workoutFromEntries([entries[0]], 'Carlos').sessionId, 's1');
});

test('marking a set complete requires whole reps and a finite positive weight', () => {
  assert.equal(canCompleteSet({ actualReps: '2.5', weight: '60' }), false);
  assert.equal(canCompleteSet({ actualReps: '0', weight: '60' }), false);
  assert.equal(canCompleteSet({ actualReps: '10', weight: 'Infinity' }), false);
  assert.equal(canCompleteSet({ actualReps: '10', weight: '62.5' }), true);
});

test('dismissing a reminder keeps its original target when the exercise is renamed', () => {
  const original = moreWeightReminderKey('Carlos', 'Press banca');
  const renamed = moreWeightReminderKey('Carlos', 'Press inclinado');
  const reminders = { [original]: 60, [renamed]: 50 };
  const workout = { user: 'Carlos', exercises: [
    { exercise: 'Press inclinado', dismissMoreWeightReminder: [original] },
  ] };
  assert.deepEqual(updateMoreWeightReminders(reminders, workout, []), { [renamed]: 50 });
});
