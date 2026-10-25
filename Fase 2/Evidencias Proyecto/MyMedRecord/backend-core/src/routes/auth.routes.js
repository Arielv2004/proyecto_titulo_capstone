const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const { csrfToken, rateLimit } = require('../security/http');
router.get('/csrf', csrfToken);
// Rutas públicas
router.post('/register', rateLimit('register', 5, 900), AuthController.register);
router.post('/login', rateLimit('login', 10, 900), AuthController.login);
router.post('/logout', AuthController.logout);

// Rutas autenticadas
router.get('/me', authMiddleware, AuthController.me);

module.exports = router;
