export const ROUTINE_IMPORT_SCHEMA = 'gym_tracker_routine_v1';

export function buildRoutineImportPrompt(routineName, sourceText) {
  const cleanName = routineName.trim() || 'Rutina importada';
  const cleanSource = sourceText.trim();

  return `Eres un conversor determinista de rutinas de gimnasio a JSON.

Devuelve EXCLUSIVAMENTE un único objeto JSON válido. No uses Markdown, bloques de código, comentarios ni texto explicativo.

El objeto debe cumplir exactamente este formato:
{
  "schema": "${ROUTINE_IMPORT_SCHEMA}",
  "routine": {
    "name": ${JSON.stringify(cleanName)},
    "sessions": [
      {
        "name": "Nombre de la sesión",
        "exercises": [
          {
            "exercise": "Nombre exacto del ejercicio",
            "targetSets": 3,
            "targetReps": 10,
            "notes": ""
          }
        ]
      }
    ]
  }
}

REGLAS OBLIGATORIAS:
1. Usa exactamente el schema "${ROUTINE_IMPORT_SCHEMA}".
2. Usa exactamente el nombre de rutina ${JSON.stringify(cleanName)}.
3. Conserva el orden original de sesiones y ejercicios.
4. Elimina de los nombres de sesión únicamente decoraciones como emojis, ### y colores; conserva su texto, numeración y letras A/B/C.
5. Conserva el nombre y capitalización de cada ejercicio, quitando solo espacios sobrantes y emojis decorativos.
6. targetSets y targetReps deben ser números enteros positivos, nunca texto.
7. Convierte expresiones como "4s x 10r" en targetSets: 4 y targetReps: 10.
8. Guarda calificadores como "por pierna", "por lado", "alternas" o indicaciones similares en notes. Si no existen, usa notes: "".
9. No inventes ejercicios, sesiones, pesos, descansos, series ni repeticiones.
10. No incluyas IDs, fechas, pesos ni propiedades adicionales.
11. Si una línea no puede interpretarse con seguridad, no inventes: conserva la información problemática en notes del ejercicio al que pertenezca.
12. Comprueba antes de responder que el JSON puede procesarse con JSON.parse y que no tiene comas finales.

TEXTO ORIGINAL DE LA RUTINA:
--- INICIO ---
${cleanSource}
--- FIN ---`;
}

export function parseRoutineImportJson(input) {
  const cleanInput = stripMarkdownFence(String(input || '').trim());
  if (!cleanInput) throw new Error('Pega el JSON generado por la IA.');

  let parsed;
  try {
    parsed = JSON.parse(cleanInput);
  } catch {
    throw new Error('La respuesta no es un JSON válido. Pide a la IA que responda sin Markdown ni explicaciones.');
  }

  if (!isPlainObject(parsed) || parsed.schema !== ROUTINE_IMPORT_SCHEMA || !isPlainObject(parsed.routine)) {
    throw new Error(`El JSON debe usar el schema "${ROUTINE_IMPORT_SCHEMA}".`);
  }
  validateExactKeys(parsed, ['schema', 'routine'], 'objeto principal');
  validateExactKeys(parsed.routine, ['name', 'sessions'], 'rutina');

  const routineName = validateText(parsed.routine.name, 'nombre de la rutina', 100);
  const sessionsInput = parsed.routine.sessions;
  if (!Array.isArray(sessionsInput) || sessionsInput.length === 0 || sessionsInput.length > 30) {
    throw new Error('La rutina debe contener entre 1 y 30 sesiones.');
  }

  let exerciseCount = 0;
  const sessions = sessionsInput.map((session, sessionIndex) => {
    if (!isPlainObject(session)) throw new Error(`La sesión ${sessionIndex + 1} no es válida.`);
    validateExactKeys(session, ['name', 'exercises'], `sesión ${sessionIndex + 1}`);
    const name = validateText(session.name, `nombre de la sesión ${sessionIndex + 1}`, 100);
    if (!Array.isArray(session.exercises) || session.exercises.length === 0 || session.exercises.length > 100) {
      throw new Error(`La sesión "${name}" debe tener entre 1 y 100 ejercicios.`);
    }

    const exercises = session.exercises.map((item, exerciseIndex) => {
      if (!isPlainObject(item)) throw new Error(`El ejercicio ${exerciseIndex + 1} de "${name}" no es válido.`);
      validateExactKeys(item, ['exercise', 'targetSets', 'targetReps', 'notes'], `ejercicio ${exerciseIndex + 1} de "${name}"`);
      const exercise = validateText(item.exercise, `ejercicio ${exerciseIndex + 1} de "${name}"`, 150);
      const targetSets = validatePositiveInteger(item.targetSets, `series de "${exercise}"`);
      const targetReps = validatePositiveInteger(item.targetReps, `repeticiones de "${exercise}"`);
      const notes = item.notes == null ? '' : validateOptionalText(item.notes, `notas de "${exercise}"`, 250);
      exerciseCount += 1;
      return { exercise, targetSets, targetReps, notes };
    });

    return { name, exercises };
  });

  if (exerciseCount > 500) throw new Error('La rutina supera el máximo de 500 ejercicios.');
  return { name: routineName, sessions };
}

export function materializeImportedRoutine(validatedRoutine) {
  return {
    id: crypto.randomUUID(),
    name: validatedRoutine.name,
    sessions: validatedRoutine.sessions.map((session) => ({
      id: crypto.randomUUID(),
      name: session.name,
      exercises: session.exercises.map((exercise) => ({
        id: crypto.randomUUID(),
        ...exercise,
      })),
    })),
  };
}

function stripMarkdownFence(value) {
  return value
    .replace(/^```(?:json|jsonl)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function validateText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Falta ${label}.`);
  const clean = value.trim();
  if (clean.length > maxLength) throw new Error(`${label} supera ${maxLength} caracteres.`);
  return clean;
}

function validateOptionalText(value, label, maxLength) {
  if (typeof value !== 'string') throw new Error(`${label} debe ser texto.`);
  const clean = value.trim();
  if (clean.length > maxLength) throw new Error(`${label} supera ${maxLength} caracteres.`);
  return clean;
}

function validatePositiveInteger(value, label) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue <= 0 || numericValue > 1000) {
    throw new Error(`${label} debe ser un entero entre 1 y 1000.`);
  }
  return numericValue;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateExactKeys(value, allowedKeys, label) {
  const unexpectedKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new Error(`${label} contiene propiedades no permitidas: ${unexpectedKeys.join(', ')}.`);
  }
}
