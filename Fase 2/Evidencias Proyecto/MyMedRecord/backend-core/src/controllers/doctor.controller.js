const UserRepository = require('../repositories/user.repository');

class DoctorController {
  /**
   * GET /api/v1/doctors
   * Obtener médicos disponibles para recibir una ficha clínica.
   */
  static async getAvailable(req, res, next) {
    try {
      const doctors = await UserRepository.findAvailableDoctors();

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