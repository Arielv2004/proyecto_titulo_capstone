const db = require('../config/db');

class AuditRepository {
  /**
   * Obtener bitácora inmutable de auditoría para un paciente
   */
  static async findByPatientId(patientId, limit = 50) {
    const query = `
      SELECT 
        al.id,
        al.user_id,
        al.patient_id,
        al.action,
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.first_name as actor_first_name,
        u.last_name as actor_last_name,
        u.role as actor_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.patient_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2;
    `;
    const result = await db.query(query, [patientId, limit]);
    return result.rows;
  }
}

module.exports = AuditRepository;
