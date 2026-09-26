const AccessGrantService = require('../services/access-grant.service');

class AccessGrantController {
  /**
   * POST /api/v1/access-grants/generate
   * Paciente autenticado genera un QR
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
   * POST /api/v1/access-grants/validate
   * Médico ingresa token de QR y sus datos profesionales para ver la ficha
   */
  static async validate(req, res, next) {
    try {
      const { token, doctorRut, doctorName, doctorInstitution } = req.body;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AccessGrantService.validateAndAccess({
        token,
        doctorRut,
        doctorName,
        doctorInstitution,
        ipAddress,
        userAgent,
      });

      return res.status(200).json({
        success: true,
        message: 'Acceso autorizado. Ficha clínica recuperada exitosamente.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/access-grants/:id/revoke
   * Paciente revoca inmediatamente un QR
   */
  static async revoke(req, res, next) {
    try {
      const patientId = req.user.id;
      const grantId = req.params.id;

      await AccessGrantService.revokeGrant({ grantId, patientId });

      return res.status(200).json({
        success: true,
        message: 'Acceso revocado exitosamente. Ningún profesional podrá consultar la ficha con este código.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/access-grants/active
   * Paciente consulta si tiene un QR activo y quién lo ha visto
   */
  static async getActive(req, res, next) {
    try {
      const patientId = req.user.id;
      const grant = await AccessGrantService.getActiveGrant(patientId);

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
   * Paciente consulta todos sus pases y accesos generados
   */
  static async getMyGrants(req, res, next) {
    try {
      const patientId = req.user.id;
      const grants = await AccessGrantService.getMyGrants(patientId);

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
