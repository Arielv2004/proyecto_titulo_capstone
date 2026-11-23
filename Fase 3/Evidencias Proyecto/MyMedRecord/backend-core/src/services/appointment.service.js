const AppointmentRepository = require('../repositories/appointment.repository');

class AppointmentService {

  // Obtener la agenda del día del médico autenticado
  static async getTodayAppointments(doctorId) {
    if (!doctorId) {
      const error = new Error('No se pudo identificar al médico.');
      error.statusCode = 400;
      throw error;
    }

    const appointments =
      await AppointmentRepository.findTodayByDoctor(doctorId);

    return appointments;
  }

  // Obtener una cita específica y validar el acceso temporal a la ficha
  static async getAppointmentById(appointmentId, doctorId) {
    if (!appointmentId || !doctorId) {
      const error = new Error(
        'No se pudo validar la autorización de acceso.'
      );
      error.statusCode = 400;
      throw error;
    }

    const appointment =
      await AppointmentRepository.findById(appointmentId);

    // La cita/autorización debe existir
    if (!appointment) {
      const error = new Error(
        'La autorización solicitada no existe.'
      );
      error.statusCode = 404;
      throw error;
    }

    // La autorización debe pertenecer al médico autenticado
    if (appointment.doctor_id !== doctorId) {
      const error = new Error(
        'No tienes autorización para acceder a esta ficha.'
      );
      error.statusCode = 403;
      throw error;
    }

    // Una cita cancelada nunca permite acceso clínico
    if (appointment.status === 'CANCELADA') {
      const error = new Error(
        'La autorización para acceder a esta ficha fue cancelada.'
      );
      error.statusCode = 403;
      throw error;
    }

    const now = new Date();
    const scheduledAt = new Date(appointment.scheduled_at);
    const expiresAt = new Date(appointment.access_expires_at);

    // Todavía no comienza la ventana de acceso
    if (now < scheduledAt) {
      const error = new Error(
        'El acceso a esta ficha todavía no se encuentra habilitado.'
      );
      error.statusCode = 403;
      throw error;
    }

    // La ventana temporal ya terminó
    if (now >= expiresAt) {
      const error = new Error(
        'El acceso temporal a esta ficha ha expirado.'
      );
      error.statusCode = 403;
      throw error;
    }

    // Si pasa todas las validaciones, entregamos la información
    // necesaria para construir la ficha compartida.
    return {
      ...appointment,

      access_status: 'ACTIVO',

      access: {
        authorized: true,
        source: 'APPOINTMENT',
        scheduled_at: appointment.scheduled_at,
        expires_at: appointment.access_expires_at,
      },
    };
  }

  // Comprobar acceso temporal a la ficha de un paciente
  static async checkPatientAccess(doctorId, patientId) {
    const access =
      await AppointmentRepository.hasActiveAccess(
        doctorId,
        patientId
      );

    if (!access) {
      const error = new Error(
        'No tienes acceso vigente a la ficha de este paciente.'
      );
      error.statusCode = 403;
      throw error;
    }

    return {
      authorized: true,
      appointmentId: access.id,
      scheduledAt: access.scheduled_at,
      expiresAt: access.access_expires_at,
    };
  }
}

module.exports = AppointmentService;