const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/doctor-activity', authMiddleware, require('../middlewares/rbac.middleware')('MEDICO'), async (req, res, next) => {
  try {
    const result = await require('../config/db').query(
      `SELECT a.id, a.action, a.created_at, u.first_name AS patient_first_name, u.last_name AS patient_last_name
       FROM audit_logs a LEFT JOIN users u ON u.id=a.patient_id
       WHERE a.user_id = $1 OR (
         a.action IN ('SHARE_RECORD_WITH_DOCTOR', 'REVOKE_DIRECT_ACCESS')
         AND EXISTS (SELECT 1 FROM access_grants g
                     WHERE g.id::text = a.details->>'grantId'
                       AND g.doctor_id = $1 AND g.patient_id = a.patient_id
                       AND g.grant_type = 'DIRECTO')
       ) ORDER BY a.created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.set('Cache-Control', 'no-store').json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});

router.get('/my-logs', authMiddleware, AuditController.getMyLogs);

module.exports = router;
