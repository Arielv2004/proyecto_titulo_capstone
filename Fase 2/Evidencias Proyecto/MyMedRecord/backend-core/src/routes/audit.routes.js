const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/doctor-activity', authMiddleware, require('../middlewares/rbac.middleware')('MEDICO'), async (req, res, next) => {
  try {
    const result = await require('../config/db').query(
      'SELECT id, action, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.set('Cache-Control', 'no-store').json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});

router.get('/my-logs', authMiddleware, AuditController.getMyLogs);

module.exports = router;
