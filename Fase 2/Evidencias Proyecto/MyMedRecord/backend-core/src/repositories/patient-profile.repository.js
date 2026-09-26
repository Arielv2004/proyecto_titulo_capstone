const db = require('../config/db');

class PatientProfileRepository {
  /**
   * Obtener el perfil clínico completo de un paciente por su user_id
   */
  static async findByUserId(userId) {
    const query = `
      SELECT 
        u.id as user_id,
        u.rut,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        pp.id as profile_id,
        pp.birth_date,
        pp.gender,
        pp.blood_type,
        pp.health_insurance,
        pp.is_organ_donor,
        pp.allergies,
        pp.chronic_conditions,
        pp.emergency_contact_name,
        pp.emergency_contact_phone,
        pp.updated_at
      FROM users u
      LEFT JOIN patient_profiles pp ON u.id = pp.user_id
      WHERE u.id = $1 AND u.role = 'PACIENTE';
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Actualizar o insertar (upsert) el perfil clínico del paciente
   */
  static async upsertProfile(userId, data) {
    const {
      bloodType = null,
      healthInsurance = null,
      isOrganDonor = true,
      allergies = [],
      chronicConditions = [],
      emergencyContactName = null,
      emergencyContactPhone = null,
      birthDate = null,
      gender = null,
    } = data;

    const query = `
      INSERT INTO patient_profiles (
        user_id,
        birth_date,
        gender,
        blood_type,
        health_insurance,
        is_organ_donor,
        allergies,
        chronic_conditions,
        emergency_contact_name,
        emergency_contact_phone,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        birth_date = COALESCE(EXCLUDED.birth_date, patient_profiles.birth_date),
        gender = COALESCE(EXCLUDED.gender, patient_profiles.gender),
        blood_type = EXCLUDED.blood_type,
        health_insurance = EXCLUDED.health_insurance,
        is_organ_donor = EXCLUDED.is_organ_donor,
        allergies = EXCLUDED.allergies,
        chronic_conditions = EXCLUDED.chronic_conditions,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      userId,
      birthDate,
      gender,
      bloodType,
      healthInsurance,
      isOrganDonor,
      Array.isArray(allergies) ? allergies : [],
      Array.isArray(chronicConditions) ? chronicConditions : [],
      emergencyContactName,
      emergencyContactPhone,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = PatientProfileRepository;
