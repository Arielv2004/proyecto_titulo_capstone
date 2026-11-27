export const BIOLOGICAL_SEX_OPTIONS = [['FEMENINO', 'Femenino'], ['MASCULINO', 'Masculino']];
export const GENDER_OPTIONS = [
  ['MUJER', 'Mujer'], ['HOMBRE', 'Hombre'], ['NO_BINARIO', 'No binario'],
  ['OTRA_IDENTIDAD', 'Otra identidad'], ['PREFIERO_NO_INFORMAR', 'Prefiero no informar'],
];
export const isKnownGender = value => GENDER_OPTIONS.some(([code]) => code === value);
export const formatBiologicalSex = value => BIOLOGICAL_SEX_OPTIONS.find(([code]) => code === value)?.[1] || 'Sin registrar';
export function formatGender(value, other) {
  if (!value) return 'Sin registrar';
  if (value === 'OTRA_IDENTIDAD') return other ? `Otra identidad: ${other}` : 'Otra identidad';
  return GENDER_OPTIONS.find(([code]) => code === value)?.[1] || ({ MASCULINO: 'Masculino', FEMENINO: 'Femenino' })[value] || value;
}
export const isPatientProfileComplete = profile => Boolean(
  BIOLOGICAL_SEX_OPTIONS.some(([code]) => code === profile.biologicalSex) && profile.bloodType && profile.healthInsurance,
);
export function mapPatientProfile(data) {
  const profile = {
    birthDate: data.birth_date, biologicalSex: data.biological_sex || '',
    gender: data.gender || '', genderOther: data.gender_other || '',
    bloodType: data.blood_type || '', healthInsurance: data.health_insurance || '',
    isOrganDonor: data.is_organ_donor ?? null,
    allergies: Array.isArray(data.allergies) ? data.allergies : [],
    chronicConditions: Array.isArray(data.chronic_conditions) ? data.chronic_conditions : [],
    phone: data.phone || '',
  };
  return { ...profile, isCompleted: isPatientProfileComplete(profile) };
}
