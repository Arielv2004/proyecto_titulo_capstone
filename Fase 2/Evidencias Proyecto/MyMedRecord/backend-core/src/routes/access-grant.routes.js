const express = require('express');
const router = express.Router();
const AccessGrantController = require('../controllers/access-grant.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Generar nuevo código QR con duración seleccionada (Requiere paciente autenticado)
router.post('/generate', authMiddleware, AccessGrantController.generate);

// Obtener QR activo y vigente del paciente (Requiere paciente autenticado)
router.get('/active', authMiddleware, AccessGrantController.getActive);

// Revocar QR activo (Requiere paciente autenticado)
router.patch('/:id/revoke', authMiddleware, AccessGrantController.revoke);

// Validar QR y desbloquear ficha clínica (PÚBLICO: el médico ingresa token + sus datos profesionales)
router.post('/validate', AccessGrantController.validate);

module.exports = router;
