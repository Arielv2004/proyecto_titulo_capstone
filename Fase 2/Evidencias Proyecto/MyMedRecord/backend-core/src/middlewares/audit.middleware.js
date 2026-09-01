const db = require('../config/db');

/**
 * Middleware para auditoría continua según Ley 21.668 y 20.584.
 * Registra accesos y modificaciones a registros clínicos en audit_logs.
 * @param {string} actionName - Nombre descriptivo de la acción ('READ_CLINICAL_RECORD', 'UPLOAD_EXAM', etc.)
 */
const auditMiddleware = (actionName) => {
  return async (req, res, next) => {
    // Interceptar la finalización del request para auditar resultado
    res.on('finish', async () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          const userId = req.user?.id || null;
          const patientId = req.params?.patientId || req.body?.patientId || req.user?.id || null;
          const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
          const userAgent = req.headers['user-agent'] || 'UNKNOWN';

          await db.query(
            `INSERT INTO audit_logs (user_id, patient_id, action, ip_address, user_agent, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [userId, patientId, actionName, ipAddress, userAgent]
          );
        }
      } catch (err) {
        console.error('⚠️ Error al registrar log de auditoría:', err.message);
      }
    });

    next();
  };
};

module.exports = auditMiddleware;
