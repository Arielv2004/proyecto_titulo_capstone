const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  host: config.DB.HOST,
  port: config.DB.PORT,
  user: config.DB.USER,
  password: config.DB.PASSWORD,
  database: config.DB.NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('[PostgreSQL] Conectado exitosamente a PostgreSQL (Docker).');
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Error] Error en el pool de PostgreSQL:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  async getSchemaOverview() {
    try {
      const usersRes = await pool.query('SELECT id, rut, first_name, last_name, email, role, is_active, created_at FROM users ORDER BY created_at ASC');
      const docsRes = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
      const prescriptionsRes = await pool.query('SELECT * FROM prescriptions ORDER BY created_at DESC');
      const labReportsRes = await pool.query('SELECT * FROM lab_reports ORDER BY created_at DESC');
      const grantsRes = await pool.query('SELECT * FROM access_grants ORDER BY created_at DESC');
      const logsRes = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');

      return {
        engine: 'PostgreSQL 15 (Docker)',
        status: 'CONNECTED',
        tables: {
          users: { count: usersRes.rowCount, rows: usersRes.rows },
          documents: { count: docsRes.rowCount, rows: docsRes.rows },
          prescriptions: { count: prescriptionsRes.rowCount, rows: prescriptionsRes.rows },
          lab_reports: { count: labReportsRes.rowCount, rows: labReportsRes.rows },
          access_grants: { count: grantsRes.rowCount, rows: grantsRes.rows },
          audit_logs: { count: logsRes.rowCount, rows: logsRes.rows },
        },
      };
    } catch (error) {
      return {
        engine: 'PostgreSQL 15 (Docker)',
        status: 'ERROR',
        message: error.message,
      };
    }
  },
};
