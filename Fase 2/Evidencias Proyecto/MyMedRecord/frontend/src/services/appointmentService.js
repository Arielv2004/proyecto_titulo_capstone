import api from './api';

// Obtener todos los pacientes agendados para hoy
export const getTodayAppointments = async () => {
  const response = await api.get('/appointments/today');

  return response.data.data.appointments;
};

// Consultar una cita específica
export const getAppointmentById = async (appointmentId) => {
  const response = await api.get(`/appointments/${appointmentId}`);

  return response.data.data.appointment;
};

// Comprobar si el médico todavía tiene acceso a la ficha del paciente
export const checkPatientAccess = async (patientId) => {
  const response = await api.get(
    `/appointments/patient/${patientId}/access`
  );

  return response.data.data;
};