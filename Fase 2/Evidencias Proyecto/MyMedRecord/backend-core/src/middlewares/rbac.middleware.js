/**
 * Middleware para Control de Acceso Basado en Roles (RBAC)
 * @param  {...string} allowedRoles - Roles permitidos ('PACIENTE', 'MEDICO', 'ADMIN')
 */
const rbacMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No se encontró información de rol en la sesión.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acceso restringido. Su rol (${req.user.role}) no tiene permisos para este recurso.`,
      });
    }

    next();
  };
};

module.exports = rbacMiddleware;
