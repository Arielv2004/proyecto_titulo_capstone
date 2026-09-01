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

  static async findById(id) {
    const result = await db.query(
      'SELECT id, rut, first_name, last_name, email, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create({ rut, firstName, lastName, email, passwordHash, role }) {
    const result = await db.query(
      `INSERT INTO users (rut, first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, rut, first_name, last_name, email, role, created_at`,
      [rut, firstName, lastName, email, passwordHash, role || 'PACIENTE']
    );
    return result.rows[0];
  }
}

module.exports = UserRepository;
