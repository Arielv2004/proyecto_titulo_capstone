const jwt = require('jsonwebtoken');
const config = require('../config/env');

const authMiddleware = (req, res, next) => {
  try {
    // 1. Obtener token exclusivamente de Cookies HttpOnly (o header fallback en desarrollo si es necesario)
    const token = req.cookies?.[config.JWT.COOKIE_NAME] || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Token de sesión no proporcionado o expirado.',
      });
    }

    // 2. Verificar integridad del JWT
    const decoded = jwt.verify(token, config.JWT.SECRET);
    req.user = decoded; // { id, rut, email, role, ... }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token de sesión inválido o expirado.',
      error: error.message,
    });
  }
};

module.exports = authMiddleware;
