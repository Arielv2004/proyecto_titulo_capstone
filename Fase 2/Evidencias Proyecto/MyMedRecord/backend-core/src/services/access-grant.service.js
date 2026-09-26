const crypto = require('crypto');
const AccessGrantRepository = require('../repositories/access-grant.repository');
const db = require('../config/db');

class AccessGrantService {
  /**
   * Generar un nuevo código QR con duración seleccionada por el paciente (2, 12 o 24 horas)
   */
  static async generateGrant({ patientId, durationHours = 2 }) {
    // Validar horas permitidas
    const hours = parseInt(durationHours, 10);
    const validHours = [1, 2, 6, 12, 24, 48];
    const finalHours = validHours.includes(hours) ? hours : 2;

    // Revocar accesos activos previos para mantener un único QR principal vigente
    await AccessGrantRepository.revokeAllActiveByPatient(patientId);

    // Generar un token único, seguro y fácil de portar en QR/URL
    const randomHex = crypto.randomBytes(12).toString('hex').toUpperCase();
    const token = `MMR-${finalHours}H-${randomHex}`;

    // Calcular fecha y hora de expiración
    const expiresAt = new Date(Date.now() + finalHours * 60 * 60 * 1000);

    const grant = await AccessGrantRepository.createGrant({
      patientId,
      token,
      expiresAt,
    });

    // Registrar en auditoría la creación del QR por el paciente
    await db.query(
      `INSERT INTO audit_logs (user_id, patient_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, 'GENERATE_QR_TOKEN', $3, $4, $5);`,
      [
        patientId,
        patientId,
        JSON.stringify({
          grantId: grant.id,
          token: grant.token,
          durationHours: finalHours,
          expiresAt: grant.expires_at,
        }),
        '127.0.0.1',
        'MyMedRecord Portal Paciente',
      ]
    );

    return {
      id: grant.id,
      token: grant.token,
      durationHours: finalHours,
      expiresAt: grant.expires_at,
      createdAt: grant.created_at,
    };
  }

  /**
   * Validar token escaneado por el médico y desbloquear la ficha clínica con trazabilidad legal
   */
  static async validateAndAccess({ token, doctorRut, doctorName, doctorInstitution, ipAddress, userAgent }) {
    if (!token || !token.trim()) {
      const error = new Error('Se requiere un token de Código QR válido.');
      error.statusCode = 400;
      throw error;
    }

    if (!doctorRut || !doctorName) {
      const error = new Error('Para acceder a la ficha debe identificarse con su RUT y Nombre profesional (Ley N° 21.668).');
      error.statusCode = 400;
      throw error;
    }

    const grant = await AccessGrantRepository.findByToken(token.trim());
    if (!grant) {
      const error = new Error('Código QR no encontrado o inválido.');
      error.statusCode = 404;
      throw error;
    }

    if (grant.is_revoked) {
      const error = new Error('Este acceso ha sido revocado directamente por el paciente.');
      error.statusCode = 403;
      throw error;
    }

    const now = new Date();
    const expiry = new Date(grant.expires_at);
    if (now > expiry) {
      const error = new Error(`El tiempo de validez de este Código QR expiró el ${expiry.toLocaleString('es-CL')}.`);
      error.statusCode = 410; // Gone
      throw error;
    }

    // Registrar el acceso del médico en el grant
    await AccessGrantRepository.recordDoctorAccess({
      token: grant.token,
      doctorRut: doctorRut.trim(),
      doctorName: doctorName.trim(),
      doctorInstitution: (doctorInstitution || 'No especificada').trim(),
    });

    // Registrar en audit_logs para dar cumplimiento estricto a la Ley N° 21.668
    await db.query(
      `INSERT INTO audit_logs (patient_id, action, details, ip_address, user_agent)
       VALUES ($1, 'CONSULTA_MEDICA_QR', $2, $3, $4);`,
      [
        grant.patient_id,
        JSON.stringify({
          token: grant.token,
          doctor_rut: doctorRut.trim(),
          doctor_name: doctorName.trim(),
          doctor_institution: doctorInstitution || 'Centro de Salud / Consulta Médica',
          expires_at: grant.expires_at,
        }),
        ipAddress || '127.0.0.1',
        userAgent || 'Visor Medico QR Web',
      ]
    );

    // Obtener la información clínica del paciente
    const clinicalData = await AccessGrantRepository.getPatientClinicalData(grant.patient_id);

    // Calcular minutos restantes
    const minutesRemaining = Math.max(0, Math.round((expiry - now) / (1000 * 60)));

    return {
      grant: {
        id: grant.id,
        token: grant.token,
        expiresAt: grant.expires_at,
        minutesRemaining,
        doctorRut: doctorRut.trim(),
        doctorName: doctorName.trim(),
        doctorInstitution: doctorInstitution || 'No especificada',
      },
      clinicalData,
    };
  }

  /**
   * Revocar acceso activo por el paciente
   */
  static async revokeGrant({ grantId, patientId }) {
    const revoked = await AccessGrantRepository.revokeGrant(grantId, patientId);
    if (!revoked) {
      const error = new Error('No se encontró el acceso para revocar o no le pertenece.');
      error.statusCode = 404;
      throw error;
    }

    // Registrar revocación en auditoría
    await db.query(
      `INSERT INTO audit_logs (user_id, patient_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, 'REVOKE_QR_ACCESS', $3, $4, $5);`,
      [patientId, patientId, JSON.stringify({ grantId, token: revoked.token }), '127.0.0.1', 'MyMedRecord Portal Paciente']
    );

    return revoked;
  }

  /**
   * Obtener el grant activo de un paciente
   */
  static async getActiveGrant(patientId) {
    const grant = await AccessGrantRepository.getActiveByPatient(patientId);
    if (!grant) return null;

    const now = new Date();
    const expiry = new Date(grant.expires_at);
    const minutesRemaining = Math.max(0, Math.round((expiry - now) / (1000 * 60)));

    return {
      id: grant.id,
      token: grant.token,
      expiresAt: grant.expires_at,
      minutesRemaining,
      doctorRut: grant.doctor_rut,
      doctorName: grant.doctor_name,
      doctorInstitution: grant.doctor_institution,
      accessCount: grant.access_count,
      createdAt: grant.created_at,
    };
  }
}

module.exports = AccessGrantService;
