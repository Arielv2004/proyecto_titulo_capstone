const db = require('../config/db');
const clinical = require('../services/clinical-store.service');

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
        pp.biological_sex,
        pp.gender_other,
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
    return clinical.transaction(async client => {
        await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
        const profile=(await client.query(`INSERT INTO patient_profiles(user_id) VALUES($1)
          ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id`,[userId])).rows[0];
        if (data.phone !== undefined) await client.query('UPDATE users SET phone=$2 WHERE id=$1',[userId,data.phone]);
        const mapping={birthDate:'birth_date',gender:'gender',biologicalSex:'biological_sex',genderOther:'gender_other',
          bloodType:'blood_type',healthInsurance:'health_insurance',isOrganDonor:'is_organ_donor',
          allergies:'allergies',chronicConditions:'chronic_conditions',emergencyContactName:'emergency_contact_name',emergencyContactPhone:'emergency_contact_phone'};
        const changes={updated_at:new Date()};
        for(const [input,column] of Object.entries(mapping)) if(data[input]!==undefined) changes[column]=data[input];
        const result=await clinical.update('patient_profiles',profile.id,changes,client);
        const phone=(await client.query('SELECT phone FROM users WHERE id=$1',[userId])).rows[0].phone;
        return {...result,phone};
    });
  }
}

clinical.reads(PatientProfileRepository, {findByUserId:'patient_profiles'});

module.exports = PatientProfileRepository;
