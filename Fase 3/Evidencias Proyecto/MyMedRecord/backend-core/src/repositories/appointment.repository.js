const db = require('../config/db');

class AppointmentRepository {

  // Obtener las citas del día de un médico
  static async findTodayByDoctor(doctorId) {
    const query = `
      SELECT
        a.id,
        a.doctor_id,
        a.patient_id,
        a.scheduled_at,
        a.access_expires_at,
        a.status,
        a.reason,

        u.rut AS patient_rut,
        u.first_name AS patient_first_name,
        u.last_name AS patient_last_name,
        u.email AS patient_email,

        CASE
          WHEN CURRENT_TIMESTAMP < a.scheduled_at THEN 'PENDIENTE'
          WHEN CURRENT_TIMESTAMP >= a.scheduled_at
               AND CURRENT_TIMESTAMP < a.access_expires_at
               AND a.status <> 'CANCELADA'
            THEN 'ACTIVO'
          ELSE 'EXPIRADO'
        END AS access_status

      FROM appointments a

      INNER JOIN users u
        ON u.id = a.patient_id

      WHERE a.doctor_id = $1
        AND a.scheduled_at >= CURRENT_DATE
        AND a.scheduled_at < CURRENT_DATE + INTERVAL '1 day'

      ORDER BY a.scheduled_at ASC;
    `;

    const result = await db.query(query, [doctorId]);

    return result.rows;
  }

  // Buscar una cita específica
  static async findById(appointmentId) {
    const query = `
      SELECT
        a.*,
        u.rut AS patient_rut,
        u.first_name AS patient_first_name,
        u.last_name AS patient_last_name,
        u.email AS patient_email
      FROM appointments a
      INNER JOIN users u
        ON u.id = a.patient_id
      WHERE a.id = $1;
    `;

    const result = await db.query(query, [appointmentId]);

    return result.rows[0] || null;
  }

  // Comprobar si el médico tiene acceso vigente a un paciente
  static async hasActiveAccess(doctorId, patientId) {
    const query = `
      SELECT
        id,
        scheduled_at,
        access_expires_at
      FROM appointments
      WHERE doctor_id = $1
        AND patient_id = $2
        AND status <> 'CANCELADA'
        AND CURRENT_TIMESTAMP >= scheduled_at
        AND CURRENT_TIMESTAMP < access_expires_at
      ORDER BY scheduled_at DESC
      LIMIT 1;
    `;

    const result = await db.query(query, [
      doctorId,
      patientId
    ]);

    return result.rows[0] || null;
  }
}

module.exports = AppointmentRepository;