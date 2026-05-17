const systemPhrases = [
  'mensajes y las llamadas están cifrados',
  'creó el grupo',
  'te añadió',
  'añadió a',
  'cambió la imagen',
  'eliminó este mensaje',
  'fijó un mensaje',
  'código de seguridad',
  'salió del grupo',
  'Los mensajes y las llamadas',
  'cambió el ícono',
  'Cambiaste el ícono',
];

const ignoredContentPhrases = [
  'omitido',
  'imagen de este grupo',
  'eliminó este mensaje',
  'cifrados de extremo',
  '<Multimedia omitido>',
];

export function normalizeChatText(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

export function parseWhatsAppChat(text) {
  const lines = text.split('\n');
  const users = {};
  let currentDate = null;
  let currentUser = null;
  let currentDayLabel = null;
  let lastExerciseName = null;

  const headerRegex = /^\[?(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?),?\s*(\d{1,2}:\d{2}(?::\d{2})?)?.*?[\]-]\s*(.*?):/;
  const dayRegex = /### (DÍA \d+) ###/;
  const setRegex = /(\d+)\s*s?\s*x\s*(\d+)\s*r?\s*x\s*([\d.,]+)/i;

  lines.forEach((rawLine) => {
    let line = rawLine.trim();
    if (!line) return;

    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      currentDate = normalizeChatDate(headerMatch[1]);
      const rawUser = headerMatch[3]
        ? headerMatch[3].trim().replace(/[\u200E\u200F]/g, '')
        : null;
      const content = line.substring(headerMatch[0].length).trim();
      const isSystemMessage = systemPhrases.some((phrase) => content.includes(phrase));

      if (rawUser && !isSystemMessage) {
        if (!users[rawUser]) users[rawUser] = [];
        currentUser = rawUser;
      } else {
        currentUser = null;
      }

      if (content) line = content;
      else return;
    }

    if (!currentUser || !currentDate) return;

    const dayMatch = line.match(dayRegex);
    if (dayMatch) {
      currentDayLabel = dayMatch[1];
      return;
    }

    const setMatch = line.match(setRegex);
    if (setMatch) {
      const sets = parseInt(setMatch[1], 10);
      const reps = parseInt(setMatch[2], 10);
      const weight = parseFloat(setMatch[3].replace(',', '.'));

      if (!Number.isNaN(weight) && lastExerciseName) {
        const entryIndex = users[currentUser].length;
        const exerciseName = lastExerciseName;
        users[currentUser].push({
          id: buildEntryId(currentUser, currentDate, exerciseName, entryIndex),
          date: currentDate,
          dayLabel: currentDayLabel || 'Entrenamiento',
          exercise: exerciseName,
          sets,
          reps,
          weight,
          volumen: sets * reps * weight,
        });
      }
      return;
    }

    const isSystemMessage = ignoredContentPhrases.some((phrase) => line.includes(phrase));
    const isUrl = line.includes('http');
    const isShortGarbage = line.length < 3;

    if (!isShortGarbage && !line.includes('###') && !isUrl && !line.match(/^\d/) && !isSystemMessage) {
      lastExerciseName = line.replace(/🟢|🔴|🔵|🟠|\u200E|\u200F/g, '').trim();
    }
  });

  return users;
}

function normalizeChatDate(date) {
  const parts = date.split(/[/.-]/);
  if (parts.length === 3) return date;
  return `${date}/${String(new Date().getFullYear()).slice(-2)}`;
}

function buildEntryId(user, date, exercise, entryIndex) {
  return `${user}__${date}__${exercise}__${entryIndex}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9/_\-.]+/g, '');
}

export function validateParsedData(parsedData) {
  const detectedUsers = Object.keys(parsedData);
  const hasData = detectedUsers.some((user) => parsedData[user].length > 0);

  return {
    isValid: detectedUsers.length > 0 && hasData,
    detectedUsers,
  };
}
