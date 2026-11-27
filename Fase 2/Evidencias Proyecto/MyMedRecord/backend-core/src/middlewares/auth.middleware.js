const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../config/db');
const Sessions = require('../repositories/session.repository');

const authMiddleware = async (req, res, next) => {
  let decoded;
  let token;
  try {
    // 1. Obtener token exclusivamente de Cookies HttpOnly (o header fallback en desarrollo si es necesario)
    token = req.cookies?.[config.JWT.COOKIE_NAME] || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Token de sesión no proporcionado o expirado.',
      });
    }

    // 2. Verificar integridad del JWT
    decoded = jwt.verify(token, config.JWT.SECRET);
    if (!decoded || typeof decoded !== 'object' ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(decoded.id || '')) {
      return res.status(401).json({ success: false, message: 'Sesión no válida.' });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token de sesión inválido o expirado.',
    });
  }

  try {
    // Un JWT firmado no basta si la cuenta fue eliminada, desactivada o cambió de rol.
    const { rows } = await db.query('SELECT id, role, is_active FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'La sesión ya no está vigente. Inicia sesión nuevamente.' });
    }
    if (!user.is_active || user.role !== decoded.role) {
      return res.status(403).json({ success: false, message: 'Esta cuenta no está autorizada para continuar con la sesión.' });
    }
    if (!await Sessions.isActive(user.id, token)) {
      return res.status(401).json({ success: false, message: 'La sesión finalizó. Inicia sesión nuevamente.' });
    }
    req.user = { ...decoded, id: user.id, role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authMiddleware;
