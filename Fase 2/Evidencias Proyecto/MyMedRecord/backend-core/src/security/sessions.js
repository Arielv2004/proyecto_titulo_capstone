const db = require('../config/db');
const { randomToken, digest } = require('./crypto');
const COOKIE = 'mymedrecord_session';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 86400000 });
async function issue(user) {
  const token = randomToken();
  await db.query('INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'24 hours\')', [digest(token), user.id]);
  return token;
}
async function authenticate(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  const result = await db.query(`SELECT u.id,u.rut,u.email,u.first_name,u.last_name,u.role
    FROM auth_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.is_active=TRUE`, [digest(token)]);
  return result.rows[0] || null;
}
async function revoke(req) {
  if (req.cookies?.[COOKIE]) await db.query('UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1', [digest(req.cookies[COOKIE])]);
}
module.exports = { issue, authenticate, revoke, COOKIE, cookieOptions };
