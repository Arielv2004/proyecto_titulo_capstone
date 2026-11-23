const SEXES = new Set(['FEMENINO', 'MASCULINO']);
const GENDERS = new Set(['MUJER', 'HOMBRE', 'NO_BINARIO', 'OTRA_IDENTIDAD', 'PREFIERO_NO_INFORMAR']);
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });

function validatePatientIdentity(body, current) {
  const patch = {};
  if (body.biologicalSex !== undefined) {
    if (!SEXES.has(body.biologicalSex)) throw invalid('Selecciona Femenino o Masculino en sexo biológico.');
    patch.biologicalSex = body.biologicalSex;
  }
  if (body.gender !== undefined) {
    if (body.gender !== null && body.gender !== '' && !GENDERS.has(body.gender)) {
      throw invalid('Selecciona una opción válida de género.');
    }
    patch.gender = body.gender || null;
  }
  if (body.genderOther !== undefined && body.genderOther !== null && typeof body.genderOther !== 'string') {
    throw invalid('La identidad de género debe ser un texto.');
  }
  if (body.gender !== undefined || body.genderOther !== undefined) {
    const gender = body.gender !== undefined ? patch.gender : current.gender;
    if (gender === 'OTRA_IDENTIDAD') {
      const text = (body.genderOther === undefined ? current.gender_other : body.genderOther)?.trim() || '';
      if (!text || text.length > 80) throw invalid('Especifica tu identidad de género con entre 1 y 80 caracteres.');
      patch.genderOther = text;
    } else {
      if (typeof body.genderOther === 'string' && body.genderOther.trim()) {
        throw invalid('El texto de identidad solo corresponde a la opción Otra identidad.');
      }
      patch.genderOther = null;
    }
  }
  return patch;
}

module.exports = { validatePatientIdentity };
