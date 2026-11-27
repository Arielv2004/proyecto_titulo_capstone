export function formatPermissionDuration(value) {
  const minutes = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(minutes) || minutes < 0) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes} min`;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}
