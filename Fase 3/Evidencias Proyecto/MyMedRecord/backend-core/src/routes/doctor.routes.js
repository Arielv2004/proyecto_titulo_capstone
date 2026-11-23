const express = require('express');
const router = express.Router();

const DoctorController = require('../controllers/doctor.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/me', authMiddleware, require('../middlewares/rbac.middleware')('MEDICO'), async (req, res, next) => {
  try {
    const result = await require('../config/db').query(
      `SELECT u.first_name, u.last_name, u.rut, u.email, dp.specialty, dp.professional_registry, dp.region_code, dp.city, dp.address,
              dp.verification_status, dp.is_available_for_sharing,
              COALESCE(hi.name, dp.institution_name_other) AS institution_name
       FROM users u LEFT JOIN doctor_profiles dp ON dp.user_id=u.id
       LEFT JOIN health_institutions hi ON hi.id=dp.institution_id WHERE u.id=$1`, [req.user.id]
    );
    res.set('Cache-Control', 'no-store').json({ success: true, data: result.rows[0] || null });
  } catch (error) { next(error); }
});

// Paciente autenticado obtiene médicos disponibles
router.get('/', authMiddleware, DoctorController.getAvailable);

module.exports = router;