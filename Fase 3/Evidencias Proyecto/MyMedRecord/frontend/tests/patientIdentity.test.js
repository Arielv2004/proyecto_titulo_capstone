import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPatientProfile, formatGender, formatBiologicalSex } from '../src/utils/patientIdentity.js';
import { claimProfilePrompt, resetProfilePrompt } from '../src/utils/profileOnboarding.js';

test('un género antiguo nunca completa ni infiere sexo biológico', () => {
  const profile = mapPatientProfile({ gender: 'MASCULINO', blood_type: 'O+', health_insurance: 'FONASA' });
  assert.equal(profile.biologicalSex, '');
  assert.equal(profile.isCompleted, false);
  assert.equal(formatGender(profile.gender), 'Masculino');
  assert.equal(formatBiologicalSex(profile.biologicalSex), 'Sin registrar');
  assert.equal(mapPatientProfile({ biological_sex: 'FEMENINO', blood_type: 'O+', health_insurance: 'FONASA' }).isCompleted, true);
});
test('género opcional, preferencia explícita y otra identidad se distinguen', () => {
  assert.equal(formatGender(null), 'Sin registrar');
  assert.equal(formatGender('PREFIERO_NO_INFORMAR'), 'Prefiero no informar');
  assert.equal(formatGender('OTRA_IDENTIDAD', 'Texto'), 'Otra identidad: Texto');
});
test('la apertura inicial no se repite hasta iniciar otra sesión', () => {
  resetProfilePrompt();
  assert.equal(claimProfilePrompt('paciente-prueba'), true);
  assert.equal(claimProfilePrompt('paciente-prueba'), false);
  resetProfilePrompt();
  assert.equal(claimProfilePrompt('paciente-prueba'), true);
  resetProfilePrompt();
});
