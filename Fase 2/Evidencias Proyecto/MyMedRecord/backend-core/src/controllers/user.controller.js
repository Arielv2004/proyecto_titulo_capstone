const UserService = require('../services/user.service');
const config = require('../config/env');
const { COOKIE_OPTIONS } = require('../config/cookie');

class UserController {
  /**
   * GET /api/v1/users/me/export
   * Descarga de todo el expediente en formato JSON (Portabilidad Ley 21.719)
   */
  static async exportMyData(req, res, next) {
    try {
      const userId = req.user.id;
      const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || null;

      const exportData = await UserService.exportUserData(userId, {
        ipAddress,
        userAgent,
      });

      const today = new Date().toISOString().slice(0, 10);
      const filename = `mymedrecord-export-${today}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

      return res.status(200).send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/users/me
   * Supresión definitiva de la cuenta y datos clínicos (Derecho al Olvido Ley 21.719)
   */
  static async deleteMyAccount(req, res, next) {
    try {
      const userId = req.user.id;
      const { confirmation, password } = req.body || {};
      const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || null;

      const result = await UserService.deleteAccount(userId, {
        confirmation,
        password,
        ipAddress,
        userAgent,
      });

      // Limpiar cookie HttpOnly de sesión
      res.clearCookie(config.JWT.COOKIE_NAME, COOKIE_OPTIONS);

      return res.status(200).json({
        success: true,
        message: 'Tu cuenta y todos tus datos personales y clínicos asociados han sido eliminados de forma definitiva.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/users/me/clinical-report
   * Genera y descarga el Informe Clínico en formato PDF enriquecido con IA (Gemini)
   */
  static async getClinicalReportPDF(req, res, next) {
    try {
      const userId = req.user.id;
      const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || null;

      const { pdfBuffer, filename } = await UserService.generateClinicalReportPDF(userId, {
        ipAddress,
        userAgent,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

      return res.status(200).end(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;

