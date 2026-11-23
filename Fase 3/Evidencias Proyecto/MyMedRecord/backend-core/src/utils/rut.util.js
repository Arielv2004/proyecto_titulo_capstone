function isValidRut(value) {
  const cleaned = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
  const body = cleaned.slice(0, -1);
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return cleaned.at(-1) === expected;
}

module.exports = { isValidRut };
