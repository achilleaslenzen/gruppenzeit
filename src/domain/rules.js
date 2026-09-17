export const kinds = ['termin', 'anfrage', 'slot'];
export const answers = ['ja', 'vielleicht', 'nein'];

export function validateEvent(input) {
  const title = String(input.title ?? '').trim();
  const start = new Date(input.start);
  const end = new Date(input.end);
  const capacity = Number(input.capacity);
  if (!kinds.includes(input.kind) || !title || title.length > 120 || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
    throw new Error('Bitte Art, Titel, Zeitraum und Plätze prüfen.');
  }
  return { kind: input.kind, title, start: start.toISOString(), end: end.toISOString(), capacity };
}

export function validateAnswer(answer) {
  if (!answers.includes(answer)) throw new Error('Ungültige Antwort.');
  return answer;
}
