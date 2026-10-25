const db = require('../config/db');
const {randomUUID}=require('node:crypto');
const {seal,open,digest}=require('../security/crypto');
const DocumentRepository=require('./document.repository');
const ProfileRepository=require('./patient-profile.repository');
function decodeGrant(row) {
  if(!row) return null;
  const {token_cipher,token_hash,...result}=row;
  result.token=token_cipher?open(token_cipher,'grant:'+row.id+':'+row.patient_id):row.token;
  return result;
}

class AccessGrantRepository {
  /**
   * Crear un nuevo acceso temporal por código QR
   */
  static async createGrant({patientId,token,expiresAt}) { return this.create({patientId,token,expiresAt,type:'QR_TEMPORAL'}); }
  static async createDirectGrant({patientId,doctorId,token,expiresAt}) { return this.create({patientId,doctorId,token,expiresAt,type:'DIRECTO'}); }
  static async create({patientId,doctorId=null,token,expiresAt,type}) {
    const id=randomUUID();
    const result=await db.query('INSERT INTO access_grants(id,patient_id,doctor_id,token,token_hash,token_cipher,grant_type,expires_at,is_revoked) VALUES($1,$2,$3,$4,$5,$6,$7,$8,FALSE) RETURNING *',
      [id,patientId,doctorId,'sealed:'+id,digest(token),seal(token,'grant:'+id+':'+patientId),type,expiresAt]);
    return decodeGrant(result.rows[0]);
  }
  /**
   * Buscar un grant por su token
   */
  static async findByToken(token) {
    const query = `
      SELECT
        ag.*,
        u.first_name,
        u.last_name,
        u.rut AS patient_rut
      FROM access_grants ag
      JOIN users u
        ON ag.patient_id = u.id
      WHERE (ag.token_hash = $1 OR (ag.grant_type='DIRECTO' AND ag.id::text=$2)) AND u.is_active=TRUE;
    `;

    const result = await db.query(query, [digest(token),String(token)]);

    return decodeGrant(result.rows[0]);
  }

  /**
   * Actualizar datos del médico que consultó el QR
   * e incrementar contador de accesos
   */
  static async recordDoctorAccess({
    token,
    doctorRut,
    doctorName,
    doctorInstitution,
  }) {
    const query = `
      UPDATE access_grants
      SET
        doctor_rut = $1,
        doctor_name = $2,
        doctor_institution = $3,
        access_count = access_count + 1
      WHERE token_hash = $4
      RETURNING *;
    `;

    const result = await db.query(query, [
      doctorRut,
      doctorName,
      doctorInstitution,
      digest(token),
    ]);

    return decodeGrant(result.rows[0]);
  }

  /**
   * Revocar un grant por parte del paciente
   */
  static async revokeGrant(grantId, patientId) {
    const query = `
      UPDATE access_grants
      SET is_revoked = TRUE
      WHERE id = $1
        AND patient_id = $2
      RETURNING *;
    `;

    const result = await db.query(query, [
      grantId,
      patientId,
    ]);

    return decodeGrant(result.rows[0]);
  }

  /**
   * Obtener solamente el QR activo y vigente del paciente.
   *
   * Los accesos DIRECTO no deben ser considerados
   * como el QR principal del paciente.
   */
  static async getActiveByPatient(patientId) {
    const query = `
      SELECT *
      FROM access_grants
      WHERE patient_id = $1
        AND grant_type = 'QR_TEMPORAL'
        AND is_revoked = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await db.query(query, [patientId]);

    return decodeGrant(result.rows[0]);
  }

  /**
   * Obtener todos los pases y accesos del paciente:
   * - QR activos
   * - QR expirados
   * - QR revocados
   * - Accesos DIRECTO a médicos
   */
  static async getAllByPatient(patientId) {
    const query = `
      SELECT
        ag.*,
        GREATEST(
          0,
          ROUND(
            EXTRACT(EPOCH FROM (ag.expires_at - NOW())) / 60
          )
        ) AS minutes_remaining,
        CASE
          WHEN ag.is_revoked THEN 'REVOCADO'
          WHEN ag.expires_at <= NOW() THEN 'EXPIRADO'
          ELSE 'ACTIVO'
        END AS status_label
      FROM access_grants ag
      WHERE ag.patient_id = $1
      ORDER BY ag.created_at DESC;
    `;

    const result = await db.query(query, [patientId]);

    return result.rows.map(decodeGrant);
  }

  /**
   * Obtener accesos DIRECTO compartidos con
   * el médico autenticado.
   *
   * Incluye los datos básicos del paciente.
   */
  static async getSharedWithDoctor(doctorId) {
    const query = `
      SELECT
        ag.*,

        p.rut AS patient_rut,
        p.first_name AS patient_first_name,
        p.last_name AS patient_last_name,
        p.email AS patient_email,

        GREATEST(
          0,
          ROUND(
            EXTRACT(EPOCH FROM (ag.expires_at - NOW())) / 60
          )
        ) AS minutes_remaining,

        CASE
          WHEN ag.is_revoked THEN 'REVOCADO'
          WHEN ag.expires_at <= NOW() THEN 'EXPIRADO'
          ELSE 'ACTIVO'
        END AS status_label

      FROM access_grants ag

      INNER JOIN users p
        ON p.id = ag.patient_id

      WHERE ag.doctor_id = $1
        AND ag.grant_type = 'DIRECTO'

      ORDER BY
        CASE
          WHEN ag.is_revoked = FALSE
            AND ag.expires_at > NOW()
          THEN 0
          ELSE 1
        END,
        ag.created_at DESC;
    `;

    const result = await db.query(query, [doctorId]);

    return result.rows.map(decodeGrant);
  }

  /**
   * Obtener la ficha clínica completa y recetas
   * del paciente para el Visor Médico
   */
  static async getPatientClinicalData(patientId) {
    const user=(await db.query('SELECT id,rut,first_name,last_name FROM users WHERE id=$1 AND is_active=TRUE',[patientId])).rows[0];
    if(!user) return null;
    const profile=await ProfileRepository.findByUserId(patientId)||{};
    const documents=(await DocumentRepository.findByPatient(patientId)).filter(doc=>['CONFIRMADO','PENDIENTE_REVISION'].includes(doc.status));
    const prescriptionsRes={rows:documents.filter(doc=>doc.document_type==='RECETA' && doc.structured).map(doc=>doc.structured)};
    const labReportsRes={rows:documents.filter(doc=>doc.document_type==='EXAMEN_LAB' && doc.structured).map(doc=>doc.structured)};
    const documentsRes={rows:documents.map(({structured,...doc})=>doc)};
    return {
      patient: {
        id: user.id,
        rut: user.rut,
        firstName: user.first_name,
        lastName: user.last_name,
      },

      profile: {
        birthDate: profile.birth_date,
        gender: profile.gender,
        bloodType: profile.blood_type,
        healthInsurance: profile.health_insurance,
        isOrganDonor: profile.is_organ_donor,
        allergies: profile.allergies || [],
        chronicConditions:
          profile.chronic_conditions || [],
        emergencyContactName:
          profile.emergency_contact_name,
        emergencyContactPhone:
          profile.emergency_contact_phone,
        updatedAt: profile.updated_at || null,
      },
      prescriptions: prescriptionsRes.rows,
      labReports: labReportsRes.rows,
      documents: documentsRes.rows,
    };
  }
}

module.exports = AccessGrantRepository;
