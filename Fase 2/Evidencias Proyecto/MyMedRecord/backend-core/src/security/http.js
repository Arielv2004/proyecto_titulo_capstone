const crypto = require('node:crypto');
const db = require('../config/db');
const { randomToken, digest } = require('./crypto');
const sign = (value) => crypto.createHmac('sha256', process.env.CSRF_SECRET).update(value).digest('base64url');
function csrfToken(req, res) {
  const existing=req.cookies?.mymedrecord_csrf || '';
  const [prior,mac]=existing.split('.');
  if(prior && mac && sign(prior)===mac) return res.json({success:true,token:existing});
  const value = randomToken();
  const token = `${value}.${sign(value)}`;
  res.cookie('mymedrecord_csrf', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.json({ success: true, token });
}
function csrfProtection(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const allowed = new Set([process.env.PUBLIC_APP_URL, process.env.CORS_ORIGIN || 'http://localhost:5173']);
  if (process.env.NODE_ENV !== 'production') {
    allowed.add(`http://${req.get('host')}`);
    for(const entries of Object.values(require('node:os').networkInterfaces())) for(const entry of entries||[]) if(entry.family==='IPv4') allowed.add(`http://${entry.address}:5173`);
  }
  if (origin && !allowed.has(origin)) return res.status(403).json({ success: false, message: 'Origen no autorizado.' });
  const header = req.get('x-csrf-token') || '';
  const cookie = req.cookies?.mymedrecord_csrf || '';
  const [value, mac] = header.split('.');
  const expected = value ? sign(value) : '';
  if (!value || !mac || header !== cookie || Buffer.byteLength(mac) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
    return res.status(403).json({ success: false, code: 'CSRF_INVALID', message: 'Actualiza la página para continuar.' });
  }
  next();
}
function rateLimit(scope, limit, seconds) {
  return async (req, res, next) => {
    try {
      const key = digest(`${scope}:${req.ip}`);
      const { rows } = await db.query(`INSERT INTO security_rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second')
        ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN security_rate_limits.expires_at<=now() THEN 1 ELSE security_rate_limits.hits+1 END,
        expires_at=CASE WHEN security_rate_limits.expires_at<=now() THEN EXCLUDED.expires_at ELSE security_rate_limits.expires_at END RETURNING hits`, [key, seconds]);
      if (rows[0].hits > limit) { res.set('Retry-After', String(seconds)); return res.status(429).json({ success: false, message: 'Demasiados intentos. Intenta más tarde.' }); }
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { csrfToken, csrfProtection, rateLimit };
