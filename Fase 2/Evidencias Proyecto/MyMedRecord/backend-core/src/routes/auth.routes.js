
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rate-limit.middleware');

// Rutas públicas
router.post('/register', rateLimit({ scope: 'register', max: 20 }), AuthController.register);
router.post('/login', rateLimit({ scope: 'login', max: 30 }), AuthController.login);
router.post('/logout', AuthController.logout);

// Recuperación de contraseña
router.post('/forgot-password', rateLimit({ scope: 'forgot-password', max: 10 }), AuthController.forgotPassword);
router.post('/reset-password', rateLimit({ scope: 'reset-password', max: 15 }), AuthController.resetPassword);

// Rutas autenticadas
router.get('/me', authMiddleware, AuthController.me);

module.exports = router;
