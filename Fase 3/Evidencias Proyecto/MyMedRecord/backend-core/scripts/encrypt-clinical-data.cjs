// Conversión idempotente. Requiere respaldo y la misma AES_SECRET_KEY usada por la API.
const db = require('../src/config/db');
const store = require('../src/services/clinical-store.service');
async function encryptExisting() {
  const counts = {};
  await store.transaction(async client => {
    for (const table of Object.keys(store.fields)) {
      const { rows } = await client.query(`SELECT id FROM ${table} WHERE encrypted_payload IS NULL FOR UPDATE`);
      for (const row of rows) await store.update(table, row.id, {}, client);
      counts[table] = rows.length;
    }
  });
  console.log(JSON.stringify({ registros_cifrados: counts }));
}
if (require.main === module) encryptExisting().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.pool.end());
module.exports = encryptExisting;
