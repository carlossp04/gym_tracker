import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectTrainingImport, moreWeightReminderKey, routineFromEntries, updateMoreWeightReminders, workoutFromEntries } from '../src/lib/workoutFlow.js';

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
