const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto.util');
const storage = require('./supabase.service');
const uploadRoot = path.resolve(__dirname, '../../uploads');

async function removeStored(filePath) {
  if (storage.isSupabaseUrl(filePath)) return storage.deleteFile(filePath);
  const absolute = path.resolve(filePath);
  if (!absolute.startsWith(uploadRoot + path.sep)) return false;
  try { await fs.unlink(absolute); return true; }
  catch (error) { return error.code === 'ENOENT'; }
}

class DocumentDeletionService {
  static async enqueue(doc, client = db) {
    if (!doc.file_path) return null;
    const { rows } = await client.query(`INSERT INTO document_deletions(document_id,patient_id,storage_path_cipher)
      VALUES($1,$2,$3) ON CONFLICT(document_id) DO UPDATE SET document_id=EXCLUDED.document_id
      RETURNING id`, [doc.id, doc.patient_id, encrypt(doc.file_path)]);
    return rows[0].id;
  }

  static async schedule(doc) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE documents SET status='ELIMINADO',updated_at=NOW() WHERE id=$1", [doc.id]);
      const id = await this.enqueue(doc, client);
      await client.query('COMMIT');
      return id ? this.processJob(id) : true;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  static async processJob(id, remove = removeStored) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`SELECT * FROM document_deletions
        WHERE id=$1 FOR UPDATE SKIP LOCKED`, [id]);
      if (!rows.length) { await client.query('COMMIT'); return false; }
      const job = rows[0];
      if (job.completed_at) { await client.query('COMMIT'); return true; }
      let ok = false;
      try { ok = await remove(decrypt(job.storage_path_cipher)); } catch { /* El trabajo se conserva. */ }
      await client.query(`UPDATE document_deletions SET attempts=attempts+1,
        completed_at=CASE WHEN $2 THEN NOW() ELSE NULL END,
        storage_path_cipher=CASE WHEN $2 THEN NULL ELSE storage_path_cipher END,
        last_error_code=CASE WHEN $2 THEN NULL ELSE 'STORAGE_DELETE_FAILED' END,
        next_attempt_at=NOW()+(LEAST(3600,60*power(2,LEAST(attempts,6))) * INTERVAL '1 second')
        WHERE id=$1`, [id, ok]);
      await client.query('COMMIT');
      return ok;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  static async processDue() {
    const { rows } = await db.query(`SELECT id FROM document_deletions
      WHERE completed_at IS NULL AND next_attempt_at<=NOW() ORDER BY next_attempt_at LIMIT 10`);
    for (const job of rows) await this.processJob(job.id);
  }
}
module.exports = DocumentDeletionService;
