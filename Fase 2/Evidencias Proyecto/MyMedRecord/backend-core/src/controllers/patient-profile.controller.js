const PatientProfileRepository = require('../repositories/patient-profile.repository');
const db = require('../config/db');

class PatientProfileController {
  /**
   * GET /api/v1/patient-profile/me
   * Retorna el perfil clínico persistido del paciente autenticado
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const profile = await PatientProfileRepository.findByUserId(userId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Perfil de paciente no encontrado.',
        });
      }

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/patient-profile/me
   * Actualiza los antecedentes médicos de la ficha clínica del paciente en PostgreSQL
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        bloodType,
        healthInsurance,
        isOrganDonor,
        allergies,
        chronicConditions,
        emergencyContactName,
        emergencyContactPhone,
        birthDate,
        gender,
      } = req.body;

      const updated = await PatientProfileRepository.upsertProfile(userId, {
        bloodType,
        healthInsurance,
        isOrganDonor,
        allergies,
        chronicConditions,
        emergencyContactName,
        emergencyContactPhone,
        birthDate,
        gender,
      });

      // Registrar acción en la bitácora legal inmutable (Ley N° 21.668)
      try {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Desconocido';
        await db.query(
          `INSERT INTO audit_logs (user_id, patient_id, action, details, ip_address, user_agent)
           VALUES ($1, $2, 'PATIENT_PROFILE_UPDATED', $3, $4, $5)`,
          [
            userId,
            userId,
            JSON.stringify({
              message: 'Actualización de antecedentes clínicos en Mi Ficha',
              bloodType,
              healthInsurance,
              allergiesCount: Array.isArray(allergies) ? allergies.length : 0,
              chronicConditionsCount: Array.isArray(chronicConditions) ? chronicConditions.length : 0,
            }),
            ipAddress,
            userAgent,
          ]
        );
      } catch (auditErr) {
        console.error('Error registrando auditoría de actualización de perfil:', auditErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Ficha clínica actualizada y sincronizada en base de datos.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PatientProfileController;
