const AccessGrantService = require('../services/access-grant.service');

class AccessGrantController {
  /**
   * POST /api/v1/access-grants/generate
   * Paciente autenticado genera un QR temporal
   */
  static async generate(req, res, next) {
    try {
      const patientId = req.user.id;
      const { durationHours } = req.body;

      const grant = await AccessGrantService.generateGrant({
        patientId,
        durationHours,
      });

      return res.status(201).json({
        success: true,
        message: `Código QR generado exitosamente por ${grant.durationHours} horas.`,
        data: grant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/access-grants/share
   * Paciente comparte directamente su ficha con
   * un médico registrado en MyMedRecord
   */
  static async shareWithDoctor(req, res, next) {
    try {
      const patientId = req.user.id;
      const { doctorId, durationHours } = req.body;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Debe seleccionar un médico.',
        });
      }

      const grant = await AccessGrantService.createDirectGrant({
        patientId,
        doctorId,
        durationHours,
      });

      return res.status(201).json({
        success: true,
        message:
          'Ficha clínica compartida exitosamente con el médico.',
        data: grant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/access-grants/shared-with-me
   *
   * Médico autenticado consulta las fichas que
   * los pacientes han compartido directamente con él.
   */
  static async getSharedWithMe(req, res, next) {
    try {
      const doctorId = req.user.id;

      const grants =
        await AccessGrantService.getSharedWithDoctor(
          doctorId
        );

      return res.status(200).json({
        success: true,
        data: grants,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/access-grants/direct/:token
   *
   * Médico autenticado abre una ficha que
   * un paciente compartió directamente con él.
   *
   * El parámetro :token tiene formato:
   * MMR-DIRECT-XXXXXXXX...
   *
   * NO es un UUID.
   */
  static async accessDirect(req, res, next) {
    try {
      const doctorId = req.user.id;
      const { token } = req.params;

      const ipAddress =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      const userAgent =
        req.headers['user-agent'] ||
        'MyMedRecord Portal Médico';

      const result =
        await AccessGrantService.accessDirectGrant({
          token,
          doctorId,
          ipAddress,
          userAgent,
        });

      return res.status(200).json({
        success: true,
        message:
          'Acceso autorizado. Ficha clínica recuperada exitosamente.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/access-grants/validate
   *
   * Médico ingresa token QR y sus datos profesionales
   * para consultar la ficha.
   *
   * Este flujo corresponde al QR temporal.
   */
  static async validate(req, res, next) {
    try {
      const {
        token,
        doctorRut,
        doctorName,
        doctorInstitution,
      } = req.body;

      const ipAddress =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      const userAgent =
        req.headers['user-agent'] ||
        'Visor Medico QR Web';

      const result =
        await AccessGrantService.validateAndAccess({
          token,
          doctorRut,
          doctorName,
          doctorInstitution,
          ipAddress,
          userAgent,
        });

      return res.status(200).json({
        success: true,
        message:
          'Acceso autorizado. Ficha clínica recuperada exitosamente.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/access-grants/:id/revoke
   *
   * Paciente revoca un acceso.
   *
   * Puede ser:
   * - QR_TEMPORAL
   * - DIRECTO
   */
  static async revoke(req, res, next) {
    try {
      const patientId = req.user.id;
      const grantId = req.params.id;

      const revoked =
        await AccessGrantService.revokeGrant({
          grantId,
          patientId,
        });

      return res.status(200).json({
        success: true,
        message: 'Acceso revocado exitosamente.',
        data: {
          id: revoked.id,
          grantType: revoked.grant_type,
          doctorId: revoked.doctor_id || null,
          isRevoked: revoked.is_revoked,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/access-grants/active
   *
   * Paciente consulta su QR temporal activo.
   */
  static async getActive(req, res, next) {
    try {
      const patientId = req.user.id;

      const grant =
        await AccessGrantService.getActiveGrant(
          patientId
        );

      return res.status(200).json({
        success: true,
        data: grant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/access-grants/my-grants
   *
   * Paciente consulta todos los accesos que ha generado:
   *
   * - QR temporales
   * - Accesos directos a médicos
   */
  static async getMyGrants(req, res, next) {
    try {
      const patientId = req.user.id;

      const grants =
        await AccessGrantService.getMyGrants(
          patientId
        );

      return res.status(200).json({
        success: true,
        data: grants,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AccessGrantController;