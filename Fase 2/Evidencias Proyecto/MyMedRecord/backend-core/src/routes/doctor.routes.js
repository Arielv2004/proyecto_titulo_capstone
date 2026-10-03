const express = require('express');
const router = express.Router();

const DoctorController = require('../controllers/doctor.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Paciente autenticado obtiene médicos disponibles
router.get('/', authMiddleware, DoctorController.getAvailable);

module.exports = router;