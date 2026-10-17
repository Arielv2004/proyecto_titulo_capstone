export function formatClinicalDate(value) {
  if (!value) return 'Fecha no informada';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? 'Fecha no informada'
    : date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}
