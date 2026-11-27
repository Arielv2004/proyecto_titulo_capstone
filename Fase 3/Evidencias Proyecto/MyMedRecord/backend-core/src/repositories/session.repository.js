const { createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config/env');
const digest = token => createHash('sha256').update(token).digest('hex');

class SessionRepository {
  static async create(user, token) {
    const claims = jwt.verify(token, config.JWT.SECRET);
    if (!Number.isFinite(claims.exp)) throw new Error('La sesión debe tener vencimiento.');
    const result = await db.query(`INSERT INTO auth_sessions(token_hash,user_id,expires_at)
      SELECT $1,id,$3 FROM users WHERE id=$2 AND is_active AND role=$4
      RETURNING user_id`, [digest(token), user.id, new Date(claims.exp * 1000), user.role]);
    if (!result.rowCount) throw Object.assign(new Error('Cuenta no disponible para iniciar sesión.'), { statusCode: 401 });
    return token;
  }
  static async isActive(userId, token) {
    const result = await db.query(`SELECT 1 FROM auth_sessions WHERE token_hash=$1 AND user_id=$2
      AND revoked_at IS NULL AND expires_at > NOW()`, [digest(token), userId]);
    return result.rowCount > 0;
  }
  static async revoke(token) {
    if (typeof token !== 'string' || !token) return;
    await db.query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE token_hash=$1', [digest(token)]);
  }
}
module.exports = SessionRepository;
