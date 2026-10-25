const crypto = require('node:crypto');

function keys() {
  const values = JSON.parse(process.env.CLINICAL_ENCRYPTION_KEYS || '{}');
  const active = process.env.CLINICAL_ACTIVE_KEY;
  if (!active || !values[active]) throw new Error('Falta la clave activa de cifrado clínico.');
  for (const value of Object.values(values)) {
    if (Buffer.from(value, 'base64').length !== 32 || new Set(Buffer.from(value,'base64')).size < 8) throw new Error('Clave clínica no válida.');
  }
  return { active, values };
}
function seal(value, context) {
  const { active, values } = keys();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(values[active], 'base64'), iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { v: 1, kid: active, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') };
}
function open(payload, context) {
  const { values } = keys();
  if (!payload || payload.v !== 1 || !values[payload.kid]) throw new Error('Carga cifrada no válida o clave no disponible.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(values[payload.kid], 'base64'), Buffer.from(payload.iv, 'base64'));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8'));
}
const digest = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');
module.exports = { seal, open, digest, randomToken, validateKeys: keys };
