const express = require('express');
const router = express.Router();

const AppointmentController = require('../controllers/appointment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// Todas las rutas requieren una sesión válida
router.use(authMiddleware);

// Todas las rutas de agenda médica requieren rol MEDICO
router.use(rbacMiddleware('MEDICO'));

// Agenda del día del médico autenticado
router.get(
  '/today',
  AppointmentController.getToday
);

// Comprobar si el médico tiene acceso vigente a un paciente
router.get(
  '/patient/:patientId/access',
  AppointmentController.checkPatientAccess
);

// Obtener una cita específica
router.get(
  '/:id',
  AppointmentController.getById
);

module.exports = router;