/**
 * Validador y Formateador Oficial de RUT Chileno (Algoritmo Módulo 11)
 * Cumple con la normativa del Registro Civil e Identificación de Chile.
 */

export function cleanRut(rut) {
  return typeof rut === 'string' ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
}

export function validateRut(rut) {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 8 || cleaned.length > 9) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();

  // Validar que el cuerpo sean sólo dígitos
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i), 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedDv = '0';
  if (remainder === 11) expectedDv = '0';
  else if (remainder === 10) expectedDv = 'K';
  else expectedDv = remainder.toString();

  return dv === expectedDv;
}

export function formatRut(rut) {
  const cleaned = cleanRut(rut);
  if (!cleaned) return '';

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!body) return dv;

  let formattedBody = '';
  let count = 0;

  for (let i = body.length - 1; i >= 0; i--) {
    formattedBody = body.charAt(i) + formattedBody;
    count++;
    if (count === 3 && i > 0) {
      formattedBody = '.' + formattedBody;
      count = 0;
    }
  }

  return `${formattedBody}-${dv}`;
}
