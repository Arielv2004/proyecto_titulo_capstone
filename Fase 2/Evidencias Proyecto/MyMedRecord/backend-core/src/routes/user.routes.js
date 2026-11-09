const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// Rutas protegidas exclusivamente para PACIENTE (Ley 21.719 - ARCOP)
router.get(
  '/me/export',
  authMiddleware,
  rbacMiddleware('PACIENTE'),
  UserController.exportMyData
);

router.delete(
  '/me',
  authMiddleware,
  rbacMiddleware('PACIENTE'),
  UserController.deleteMyAccount
);

module.exports = router;

