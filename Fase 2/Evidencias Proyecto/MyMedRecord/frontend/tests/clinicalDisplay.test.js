import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBirthDateWithAge } from '../src/utils/clinicalDate.js';
import { formatPermissionDuration } from '../src/utils/permissionDuration.js';

test('vigencia de permisos en horas y minutos', () => {
  for (const [value, expected] of [
    [0, '0 min'], [59, '59 min'], [60, '1 h'], [61, '1 h 1 min'],
    [120, '2 h'], [167, '2 h 47 min'], ['167', '2 h 47 min'],
    [null, '—'], ['', '—'], [-1, '—'], [NaN, '—'], [Infinity, '—'], [1.5, '—'],
  ]) assert.equal(formatPermissionDuration(value), expected);
});

test('edad por aniversarios de calendario, incluso en meses cortos', () => {
  for (const [birth, today, age] of [
    ['2026-11-13', '2026-11-13', '0 años, 0 meses y 0 días'],
    ['2025-11-13', '2026-11-13', '1 año, 0 meses y 0 días'],
    ['2025-10-12', '2026-11-13', '1 año, 1 mes y 1 día'],
    ['2000-11-14', '2026-11-13', '25 años, 11 meses y 30 días'],
    ['2025-01-31', '2025-02-28', '0 años, 1 mes y 0 días'],
    ['2025-01-31', '2025-03-01', '0 años, 1 mes y 1 día'],
    ['2024-02-29', '2025-02-28', '1 año, 0 meses y 0 días'],
    ['2024-02-29', '2028-02-29', '4 años, 0 meses y 0 días'],
    ['2020-12-31', '2021-01-01', '0 años, 0 meses y 1 día'],
    ['2025-09-06', '2025-09-08', '0 años, 0 meses y 2 días'],
  ]) {
    const reference = new Date(today + 'T12:00:00');
    const label = formatBirthDateWithAge(birth, reference);
    assert.ok(label.endsWith(`(${age})`), label);
    assert.equal(formatBirthDateWithAge(birth + 'T00:00:00.000Z', reference), label);
  }
});

test('fechas ausentes, imposibles y futuras', () => {
  const today = new Date(2026, 10, 13);
  assert.equal(formatBirthDateWithAge(null, today), 'Fecha no informada');
  for (const value of ['2026-11-14', '2023-02-29', '2026-04-31', '2025-13-01', 'desconocida']) {
    assert.equal(formatBirthDateWithAge(value, today), 'Fecha no válida');
  }
});
