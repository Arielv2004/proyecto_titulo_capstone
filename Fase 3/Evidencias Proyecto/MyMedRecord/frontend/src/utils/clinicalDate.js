export function formatClinicalDate(value) {
  if (!value) return 'Fecha no informada';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? 'Fecha no informada'
    : date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Birth dates are calendar dates. Count completed months from the original
// day, using the last day of shorter months for the monthly anniversary.
export function formatBirthDateWithAge(value, today = new Date()) {
  if (!value) return 'Fecha no informada';
  const match = typeof value === 'string' && /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return 'Fecha no válida';
  const birth = new Date(match[1] + 'T00:00:00Z');
  if (birth.getUTCFullYear() < 1 || birth.toISOString().slice(0, 10) !== match[1]) return 'Fecha no válida';

  // Compare calendar days independently of DST or the UTC offset at birth.
  const end = new Date(birth);
  end.setUTCFullYear(today.getFullYear(), today.getMonth(), today.getDate());
  if (birth > end) return 'Fecha no válida';
  const anniversary = new Date(end);
  function setAnniversary(month) {
    anniversary.setUTCFullYear(end.getUTCFullYear(), month + 1, 0);
    anniversary.setUTCDate(Math.min(birth.getUTCDate(), anniversary.getUTCDate()));
  }
  setAnniversary(end.getUTCMonth());
  if (anniversary > end) setAnniversary(end.getUTCMonth() - 1);

  const totalMonths = (anniversary.getUTCFullYear() - birth.getUTCFullYear()) * 12
    + anniversary.getUTCMonth() - birth.getUTCMonth();
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const days = (end - anniversary) / 86400000;
  const age = `${years} ${years === 1 ? 'año' : 'años'}, ${months} ${months === 1 ? 'mes' : 'meses'} y ${days} ${days === 1 ? 'día' : 'días'}`;
  return `${formatClinicalDate(match[1])} (${age})`;
}
