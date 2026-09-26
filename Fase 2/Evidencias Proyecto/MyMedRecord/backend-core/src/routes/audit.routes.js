const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/my-logs', authMiddleware, AuditController.getMyLogs);

module.exports = router;
