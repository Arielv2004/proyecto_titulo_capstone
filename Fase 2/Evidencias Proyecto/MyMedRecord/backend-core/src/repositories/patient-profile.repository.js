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
        to_char(pp.birth_date, 'YYYY-MM-DD') AS birth_date,
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
      WITH changed_phone AS (
        UPDATE users SET phone = $12
        WHERE id = $1 AND role = 'PACIENTE' AND $11::boolean
        RETURNING phone
      )
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
        emergency_contact_name = CASE WHEN $13 THEN EXCLUDED.emergency_contact_name ELSE patient_profiles.emergency_contact_name END,
        emergency_contact_phone = CASE WHEN $14 THEN EXCLUDED.emergency_contact_phone ELSE patient_profiles.emergency_contact_phone END,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, to_char(birth_date, 'YYYY-MM-DD') AS birth_date,
                gender, blood_type, health_insurance, is_organ_donor, allergies,
                chronic_conditions, emergency_contact_name, emergency_contact_phone, updated_at,
                CASE WHEN $11 THEN (SELECT phone FROM changed_phone)
                     ELSE (SELECT phone FROM users WHERE id = $1) END AS phone;
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
      data.phone !== undefined,
      data.phone ?? null,
      data.emergencyContactName !== undefined,
      data.emergencyContactPhone !== undefined,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = PatientProfileRepository;
