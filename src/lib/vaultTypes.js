/**
 * @typedef {object} TrainingEntry
 * @property {string} id
 * @property {string} date Original chat date, also used in persisted entry IDs.
 * @property {string} dayLabel
 * @property {string} exercise
 * @property {number} sets
 * @property {number} reps
 * @property {number} weight
 * @property {number} volumen
 * @property {string} [user]
 * @property {string} [routineId]
 * @property {string} [sessionId]
 */

/**
 * @typedef {{id: string, exercise: string, targetSets: number, targetReps: number, notes?: string}} RoutineExercise
 * @typedef {{id: string, name: string, exercises: RoutineExercise[]}} RoutineSession
 * @typedef {{id: string, name: string, sessions: RoutineSession[]}} Routine
 */

/**
 * @typedef {object} WorkoutSet
 * @property {string} id
 * @property {number} number
 * @property {number} targetReps
 * @property {string|number} actualReps Input text while editing, numeric when initialized.
 * @property {string} weight May be empty while editing.
 * @property {boolean} completed
 */

/**
 * @typedef {object} ActiveWorkout
 * @property {string} id
 * @property {string} user
 * @property {string} date HTML date input value.
 * @property {string} startedAt
 * @property {string} routineName
 * @property {string} sessionName
 * @property {string} [routineId]
 * @property {string} [sessionId]
 * @property {Array<{id: string, exercise: string, sets: WorkoutSet[], templateExerciseId?: string, previousWeight?: number|null, notes?: string, moreWeightNextTime?: boolean, dismissMoreWeightReminder?: boolean|string[]}>} exercises
 */

/**
 * @typedef {object} VaultPayload
 * @property {string} trainingText
 * @property {Record<string, string>} [aliases]
 * @property {Record<string, Partial<TrainingEntry>>} [entryEdits]
 * @property {Record<string, boolean>} [deletedEntryIds]
 * @property {Routine[]} [routines]
 * @property {ActiveWorkout|null} [activeWorkout]
 * @property {Record<string, unknown>} [uiDrafts]
 * @property {Record<string, number>} [moreWeightReminders]
 */

/** @typedef {{revision: number, updatedAt: string}} SaveResult */
export {};
