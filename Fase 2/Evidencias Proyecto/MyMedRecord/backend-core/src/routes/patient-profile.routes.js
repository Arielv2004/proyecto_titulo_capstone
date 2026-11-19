const express = require('express');
const router = express.Router();
const PatientProfileController = require('../controllers/patient-profile.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const db = require('../config/db');

router.use(authMiddleware, async (req, res, next) => {
  try {
    const result = await db.query("SELECT id FROM users WHERE id=$1 AND role='PACIENTE' AND is_active", [req.user.id]);
    if (!result.rowCount) return res.status(403).json({ success: false, message: 'Se requiere una cuenta de paciente activa.' });
    next();
  } catch (error) { next(error); }
});
// Rutas protegidas para el paciente autenticado
router.get('/me', PatientProfileController.getProfile);
router.put('/me', PatientProfileController.updateProfile);

module.exports = router;
