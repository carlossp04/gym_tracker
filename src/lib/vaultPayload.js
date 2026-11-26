import { normalizeChatText, parseWhatsAppChat, validateParsedData } from './whatsappParser.js';

export function validateVaultPayload(payload) {
  if (typeof payload?.trainingText !== 'string') throw new Error('Datos del vault inválidos.');
  const cleanText = normalizeChatText(payload.trainingText);
  const parsed = parseWhatsAppChat(cleanText);
  if (cleanText.trim() && !validateParsedData(parsed).isValid) {
    throw new Error('Datos desencriptados sin entrenamientos válidos.');
  }
  return { cleanText, parsed };
}
