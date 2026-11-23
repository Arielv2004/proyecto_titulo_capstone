const UserRepository = require('../repositories/user.repository');

class DoctorController {
  /**
   * GET /api/v1/doctors
   *
   * Directorio de perfiles médicos.
   * Filtros opcionales: regionCode y city.
   *
   * Los perfiles pendientes pueden mostrarse, pero no están
   * habilitados para recibir fichas clínicas.
   * Este listado no concede acceso a información clínica.
   */
  static async getAvailable(req, res, next) {
    try {
      const { regionCode, city } = req.query;

      const doctors = await UserRepository.findDoctorsDirectory({
        regionCode,
        city,
      });

      return res.status(200).json({
        success: true,
        data: doctors,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DoctorController;