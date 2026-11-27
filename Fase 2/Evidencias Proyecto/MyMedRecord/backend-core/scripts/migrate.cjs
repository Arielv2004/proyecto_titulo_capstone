const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('../src/config/db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('mymedrecord_migrations'))");
    const directory = path.resolve(__dirname, '../../database/migrations');
    for (const name of (await fs.readdir(directory)).filter(n => n.endsWith('.sql')).sort()) {
      const source = await fs.readFile(path.join(directory, name), 'utf8');
      // Sin registro persistente: todos los SQL deben ser idempotentes.
      // El bloqueo serializa ejecuciones y cada archivo conserva su transacción.
      const sql = source.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gm, '');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`Ejecutada: ${name}`);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('mymedrecord_migrations'))");
    client.release();
  }
}
module.exports = migrate;
if (require.main === module) migrate().catch(error => {
  console.error('No se pudo migrar la base:', error.message); process.exitCode = 1;
}).finally(() => db.pool.end());
