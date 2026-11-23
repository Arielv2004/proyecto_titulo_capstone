const db = require('../config/db');

class HealthInstitutionRepository {
  static async findActive() {
    const result = await db.query(
      `SELECT
        id,
        name,
        institution_type,
        rut,
        address,
        commune,
        city,
        phone,
        email
       FROM health_institutions
       WHERE is_active = TRUE
       ORDER BY
         city ASC NULLS LAST,
         name ASC`
    );

    return result.rows;
  }
}

module.exports = HealthInstitutionRepository;