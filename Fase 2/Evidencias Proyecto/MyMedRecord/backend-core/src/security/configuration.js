const { validateKeys } = require('./crypto');
function validateSecurityConfiguration() {
  validateKeys();
  for (const name of ['CSRF_SECRET', 'AI_SERVICE_TOKEN']) {
    if (!process.env[name] || process.env[name].length < 32) throw new Error(`Configura ${name} con un secreto aleatorio.`);
  }
  if (process.env.CSRF_SECRET===process.env.AI_SERVICE_TOKEN) throw new Error('Usa secretos independientes.');
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.PUBLIC_APP_URL?.startsWith('https://')) throw new Error('Producción requiere PUBLIC_APP_URL HTTPS.');
    if (!process.env.DB_USER || process.env.DB_USER === 'postgres') throw new Error('Producción requiere un usuario de base de datos limitado.');
    if (process.env.STORAGE_MODE !== 'supabase') throw new Error('Producción requiere almacenamiento privado remoto.');
    for (const name of ['DB_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY']) {
      if (!process.env[name] || /^(password|admin|tu_|example)/i.test(process.env[name])) throw new Error(`Configura ${name} para producción.`);
    }
  }
}
module.exports = { validateSecurityConfiguration };
