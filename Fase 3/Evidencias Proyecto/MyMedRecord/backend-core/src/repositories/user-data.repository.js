const db = require('../config/db');

class UserDataRepository {
  /**
   * Obtiene la cuenta completa del usuario por id (incluye password_hash para re-autenticación)
   */
  static async findUserWithAuth(userId) {
    const result = await db.query(
      `SELECT id, rut, first_name, last_name, email, password_hash,
              role, phone, is_active, terms_accepted_at, terms_version,
              created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Documentos del paciente para exportación (incluye ocr_raw_text y paths)
   */
  static async findExportDocuments(patientId) {
    const query = `
      SELECT
        d.id,
        d.document_type,
        d.title,
        d.file_name,
        d.file_path,
        d.mime_type,
        d.file_size_bytes,
        d.document_date,
        d.issuing_doctor,
        d.issuing_institution,
        d.ocr_raw_text,
        d.ocr_confidence,
        d.status,
        d.created_at,
        d.updated_at
      FROM documents d
      WHERE d.patient_id = $1
      ORDER BY d.document_date DESC NULLS LAST, d.created_at DESC;
    `;
    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  /**
   * Obtiene todos los file_path físicos asociados a un paciente (incluyendo TEMP y ELIMINADO)
   */
  static async findAllDocumentPathsByPatient(patientId) {
    const result = await db.query(
      `SELECT id, file_path, file_name
       FROM documents
       WHERE patient_id = $1`,
      [patientId]
    );
    return result.rows;
  }

  /**
   * Permisos de acceso otorgados por el paciente (excluye el token secreto)
   */
  static async findExportAccessGrants(patientId) {
    const query = `
      SELECT
        ag.id,
        ag.doctor_id,
        ag.grant_type,
        ag.starts_at,
        ag.expires_at,
        ag.is_revoked,
        ag.access_count,
        ag.created_at,
        u.first_name AS doctor_first_name,
        u.last_name AS doctor_last_name
      FROM access_grants ag
      LEFT JOIN users u ON ag.doctor_id = u.id
      WHERE ag.patient_id = $1
      ORDER BY ag.created_at DESC;
    `;
    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  /**
   * Citas del paciente
   */
  static async findExportAppointments(patientId) {
    const query = `
      SELECT
        ap.id,
        ap.doctor_id,
        ap.scheduled_at,
        ap.access_expires_at,
        ap.status,
        ap.reason,
        ap.created_at,
        u.first_name AS doctor_first_name,
        u.last_name AS doctor_last_name
      FROM appointments ap
      LEFT JOIN users u ON ap.doctor_id = u.id
      WHERE ap.patient_id = $1
      ORDER BY ap.scheduled_at DESC;
    `;
    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  /**
   * Registros de auditoría relacionados al usuario (como actor o paciente)
   */
  static async findExportAuditLogs(userId) {
    const query = `
      SELECT
        id,
        action,
        details,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      WHERE user_id = $1 OR patient_id = $1
      ORDER BY created_at DESC
      LIMIT 200;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Verifica si el usuario figura como uploaded_by en documentos de OTROS pacientes
   */
  static async countExternalUploadedDocuments(userId) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM documents
       WHERE uploaded_by = $1 AND patient_id <> $1`,
      [userId]
    );
    return result.rows[0]?.total || 0;
  }

  /**
   * Registra una acción de auditoría usando un cliente existente o el pool
   */
  static async logAudit({ userId = null, patientId = null, action, details = {}, ipAddress = 'unknown', userAgent = null, client = null }) {
    const runner = client || db;
    const query = `
      INSERT INTO audit_logs (
        user_id,
        patient_id,
        action,
        details,
        ip_address,
        user_agent,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, created_at;
    `;
    const result = await runner.query(query, [
      userId,
      patientId,
      action,
      JSON.stringify(details),
      String(ipAddress || 'unknown').slice(0, 45),
      userAgent,
    ]);
    return result.rows[0];
  }

  /**
   * Actualiza los detalles de un log de auditoría (usado para registrar fallos diferidos de storage)
   */
  static async updateAuditDetails(auditLogId, newDetails) {
    await db.query(
      `UPDATE audit_logs
       SET details = $1
       WHERE id = $2`,
      [JSON.stringify(newDetails), auditLogId]
    );
  }

  /**
   * Elimina al usuario de la base de datos dentro de una transacción.
   * Cascade eliminará patient_profiles, documents, prescriptions, prescription_items,
   * lab_reports, lab_test_items, access_grants y appointments.
   */
  static async executeAccountDeletion({ userId, auditDetails, ipAddress, userAgent }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Eliminar el usuario (activa ON DELETE CASCADE en cascada)
      const deleteResult = await client.query(
        `DELETE FROM users WHERE id = $1 RETURNING id`,
        [userId]
      );

      if (deleteResult.rowCount === 0) {
        const notFound = new Error('Usuario no encontrado.');
        notFound.statusCode = 404;
        throw notFound;
      }

      // 2. Insertar log de auditoría inmutable con user_id=NULL (pseudonimizado con subject_hash)
      // Se ejecuta dentro de la misma transacción para garantizar atipicidad cero.
      const auditLog = await this.logAudit({
        userId: null,
        patientId: null,
        action: 'ACCOUNT_DELETED',
        details: auditDetails,
        ipAddress,
        userAgent,
        client,
      });

      await client.query('COMMIT');
      return { success: true, auditLogId: auditLog?.id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = UserDataRepository;
