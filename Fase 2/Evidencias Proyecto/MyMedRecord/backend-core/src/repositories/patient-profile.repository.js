const db=require('../config/db');
const clinical=require('../security/clinical-store');
class PatientProfileRepository {
  static async findByUserId(id) {
    const user=(await db.query("SELECT id AS user_id,rut,first_name,last_name,email,phone FROM users WHERE id=$1 AND role='PACIENTE'",[id])).rows[0];
    if(!user) return null;
    const row=(await db.query('SELECT * FROM patient_profiles WHERE user_id=$1',[id])).rows[0];
    const profile=row?await clinical.decode('patient_profiles',row):{};
    const {id:profile_id,...fields}=profile;
    return {...user,...fields,profile_id};
  }
  static async upsertProfile(id,data) {
    return db.transaction(async()=>{
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[id]);
      const row=(await db.query('SELECT * FROM patient_profiles WHERE user_id=$1',[id])).rows[0];
      const fields={blood_type:data.bloodType??null,health_insurance:data.healthInsurance??null,is_organ_donor:data.isOrganDonor??false,
        allergies:Array.isArray(data.allergies)?data.allergies:[],chronic_conditions:Array.isArray(data.chronicConditions)?data.chronicConditions:[],
        emergency_contact_name:data.emergencyContactName??null,emergency_contact_phone:data.emergencyContactPhone??null,
        ...(data.birthDate?{birth_date:data.birthDate}:{}),...(data.gender?{gender:data.gender}:{}),updated_at:new Date()};
      const result=row?await clinical.update('patient_profiles',row.id,fields):await clinical.create('patient_profiles',{user_id:id,...fields});
      await db.query("INSERT INTO audit_logs(user_id,patient_id,action,details,ip_address) VALUES($1,$1,'UPDATE_PROFILE','{}','0.0.0.0')",[id]);
      return result;
    });
  }
}
module.exports=PatientProfileRepository;
