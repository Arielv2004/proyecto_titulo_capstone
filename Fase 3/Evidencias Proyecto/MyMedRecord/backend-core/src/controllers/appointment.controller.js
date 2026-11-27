const AppointmentService = require('../services/appointment.service');

class AppointmentController {

  // GET /appointments/today
  // Devuelve la agenda del día del médico autenticado
  static async getToday(req, res, next) {
    try {
      const doctorId = req.user.id;

      const appointments =
        await AppointmentService.getTodayAppointments(doctorId);

      return res.status(200).json({
        success: true,
        data: {
          appointments,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /appointments/:id
  // Obtiene una cita específica
  static async getById(req, res, next) {
    try {
      const doctorId = req.user.id;
      const { id } = req.params;

      const appointment =
        await AppointmentService.getAppointmentById(
          id,
          doctorId
        );

      return res.status(200).json({
        success: true,
        data: {
          appointment,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /appointments/patient/:patientId/access
  // Comprueba si el médico todavía tiene acceso a la ficha
  static async checkPatientAccess(req, res, next) {
    try {
      const doctorId = req.user.id;
      const { patientId } = req.params;

      const access =
        await AppointmentService.checkPatientAccess(
          doctorId,
          patientId
        );

      return res.status(200).json({
        success: true,
        data: access,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AppointmentController;