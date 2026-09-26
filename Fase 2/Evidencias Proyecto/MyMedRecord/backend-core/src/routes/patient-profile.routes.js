const express = require('express');
const router = express.Router();
const PatientProfileController = require('../controllers/patient-profile.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rutas protegidas para el paciente autenticado
router.get('/me', authMiddleware, PatientProfileController.getProfile);
router.put('/me', authMiddleware, PatientProfileController.updateProfile);

module.exports = router;
