const db = require('../config/db');

class UserRepository {
  static async findByEmail(email) {
    const result = await db.query(
      'SELECT id, rut, first_name, last_name, email, password_hash, role, is_active, created_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findByRut(rut) {
    const result = await db.query(
      'SELECT id, rut, first_name, last_name, email, password_hash, role, is_active, created_at FROM users WHERE rut = $1',
      [rut]
    );
    return result.rows[0];
  }

  static async findByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();
    // 1. Buscar por email insensible a mayúsculas
    const emailResult = await db.query(
      'SELECT id, rut, first_name, last_name, email, password_hash, role, is_active, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      [clean]
    );
    if (emailResult.rows[0]) return emailResult.rows[0];

    // 2. Buscar por RUT exacto o normalizado
    const cleanRut = clean.replace(/[^0-9kK]/g, '').toUpperCase();
    const rutResult = await db.query(
      `SELECT id, rut, first_name, last_name, email, password_hash, role, is_active, created_at 
       FROM users 
       WHERE rut = $1 OR UPPER(REGEXP_REPLACE(rut, '[^0-9kK]', '', 'g')) = $2`,
      [clean, cleanRut]
    );
    return rutResult.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT id, rut, first_name, last_name, email, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create({ rut, firstName, lastName, email, passwordHash, role }) {
    const userRole = role || 'PACIENTE';
    const result = await db.query(
      `INSERT INTO users (rut, first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, rut, first_name, last_name, email, role, created_at`,
      [rut, firstName, lastName, email, passwordHash, userRole]
    );
    const user = result.rows[0];

    if (userRole === 'PACIENTE') {
      try {
        await db.query(
          `INSERT INTO patient_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
          [user.id]
        );
      } catch (err) {
        console.error('Error auto-creating patient_profiles row:', err);
      }
    }

    return user;
  }
}

module.exports = UserRepository;
