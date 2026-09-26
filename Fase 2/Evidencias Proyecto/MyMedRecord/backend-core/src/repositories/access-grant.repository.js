const db = require('../config/db');

class AccessGrantRepository {
  /**
   * Crear un nuevo acceso temporal por código QR
   */
  static async createGrant({ patientId, token, expiresAt }) {
    const query = `
      INSERT INTO access_grants (patient_id, token, grant_type, expires_at, is_revoked)
      VALUES ($1, $2, 'QR_TEMPORAL', $3, FALSE)
      RETURNING *;
    `;
    const result = await db.query(query, [patientId, token, expiresAt]);
    return result.rows[0];
  }

  /**
   * Buscar un grant por su token
   */
  static async findByToken(token) {
    const query = `
      SELECT ag.*, u.first_name, u.last_name, u.rut as patient_rut
      FROM access_grants ag
      JOIN users u ON ag.patient_id = u.id
      WHERE ag.token = $1;
    `;
    const result = await db.query(query, [token]);
    return result.rows[0] || null;
  }

  /**
   * Actualizar datos del médico que consultó el QR e incrementar contador
   */
  static async recordDoctorAccess({ token, doctorRut, doctorName, doctorInstitution }) {
    const query = `
      UPDATE access_grants
      SET doctor_rut = $1,
          doctor_name = $2,
          doctor_institution = $3,
          access_count = access_count + 1
      WHERE token = $4
      RETURNING *;
    `;
    const result = await db.query(query, [doctorRut, doctorName, doctorInstitution, token]);
    return result.rows[0];
  }

  /**
   * Revocar un grant por parte del paciente
   */
  static async revokeGrant(grantId, patientId) {
    const query = `
      UPDATE access_grants
      SET is_revoked = TRUE
      WHERE id = $1 AND patient_id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [grantId, patientId]);
    return result.rows[0] || null;
  }

  /**
   * Revocar todos los grants activos previos de un paciente (para asegurar un único QR vigente principal)
   */
  static async revokeAllActiveByPatient(patientId) {
    const query = `
      UPDATE access_grants
      SET is_revoked = TRUE
      WHERE patient_id = $1 AND is_revoked = FALSE AND expires_at > NOW()
      RETURNING *;
    `;
    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  /**
   * Obtener el grant activo y vigente de un paciente
   */
  static async getActiveByPatient(patientId) {
    const query = `
      SELECT *
      FROM access_grants
      WHERE patient_id = $1 AND is_revoked = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const result = await db.query(query, [patientId]);
    return result.rows[0] || null;
  }

  /**
   * Obtener la ficha clínica completa y recetas del paciente para el Visor Médico
   */
  static async getPatientClinicalData(patientId) {
    // 1. Datos del usuario
    const userQuery = `
      SELECT id, rut, first_name, last_name, email, phone, created_at
      FROM users
      WHERE id = $1;
    `;
    const userRes = await db.query(userQuery, [patientId]);
    const user = userRes.rows[0];
    if (!user) return null;

    // 2. Perfil clínico
    const profileQuery = `
      SELECT *
      FROM patient_profiles
      WHERE user_id = $1;
    `;
    const profileRes = await db.query(profileQuery, [patientId]);
    const profile = profileRes.rows[0] || {};

    // 3. Recetas activas con sus items
    const prescriptionsQuery = `
      SELECT p.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pi.id,
                   'medication_name', pi.medication_name,
                   'dosage', pi.dosage,
                   'frequency', pi.frequency,
                   'duration', pi.duration,
                   'instructions', pi.instructions
                 )
               ) FILTER (WHERE pi.id IS NOT NULL), '[]'
             ) as items
      FROM prescriptions p
      LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
      WHERE p.patient_id = $1
      GROUP BY p.id
      ORDER BY p.issue_date DESC;
    `;
    const prescriptionsRes = await db.query(prescriptionsQuery, [patientId]);

    return {
      patient: {
        id: user.id,
        rut: user.rut,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
      },
      profile: {
        birthDate: profile.birth_date,
        gender: profile.gender,
        bloodType: profile.blood_type,
        healthInsurance: profile.health_insurance,
        isOrganDonor: profile.is_organ_donor,
        allergies: profile.allergies || [],
        chronicConditions: profile.chronic_conditions || [],
        emergencyContactName: profile.emergency_contact_name,
        emergencyContactPhone: profile.emergency_contact_phone,
      },
      vitalSigns: [
        { name: 'Presión Arterial', value: '120/80 mmHg', status: 'Normal' },
        { name: 'Frecuencia Cardíaca', value: '72 lpm', status: 'Normal' },
        { name: 'Glucosa en Ayunas', value: '95 mg/dL', status: 'Normal' },
        { name: 'Saturación O2', value: '98%', status: 'Normal' }
      ],
      prescriptions: prescriptionsRes.rows,
    };
  }
}

module.exports = AccessGrantRepository;
