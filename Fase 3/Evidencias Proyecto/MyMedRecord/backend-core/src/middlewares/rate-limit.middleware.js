const { createHash } = require('node:crypto');
const db = require('../config/db');

module.exports = function rateLimit({ scope, max = 30, windowSeconds = 900 }) {
  return async (req, res, next) => {
    try {
      // El contador es compartido entre procesos y no almacena IP/correo en texto plano.
      const key = createHash('sha256').update(`${scope}:${req.ip || req.socket?.remoteAddress || 'unknown'}`).digest('hex');
      const { rows } = await db.query(`INSERT INTO security_rate_limits AS limits(key,hits,expires_at)
        VALUES($1,1,NOW()+($2::integer * INTERVAL '1 second'))
        ON CONFLICT(key) DO UPDATE SET
          hits=CASE WHEN limits.expires_at<=NOW() THEN 1 ELSE limits.hits+1 END,
          expires_at=CASE WHEN limits.expires_at<=NOW() THEN EXCLUDED.expires_at ELSE limits.expires_at END
        RETURNING hits, GREATEST(1,CEIL(EXTRACT(EPOCH FROM expires_at-NOW())))::integer AS retry_after`, [key, windowSeconds]);
      if (rows[0].hits > max) {
        res.set('Retry-After', String(rows[0].retry_after));
        return res.status(429).json({ success: false, message: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' });
      }
      return next();
    } catch (error) { return next(error); }
  };
};
