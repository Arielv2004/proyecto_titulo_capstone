const db = require('../config/db');

class UserRepository {
  // =====================================================
  // BUSCAR POR EMAIL
  // =====================================================

  static async findByEmail(email) {
    const result = await db.query(
      `SELECT id, rut, first_name, last_name, email,
              password_hash, role, is_active, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    return result.rows[0];
  }


  // =====================================================
  // BUSCAR POR RUT
  // =====================================================

  static async findByRut(rut) {
    const result = await db.query(
      `SELECT id, rut, first_name, last_name, email,
              password_hash, role, is_active, created_at
       FROM users
       WHERE rut = $1`,
      [rut]
    );

    return result.rows[0];
  }

  // =====================================================
  // BUSCAR POR EMAIL O RUT
  // =====================================================

  static async findByIdentifier(identifier) {
    if (!identifier) return null;

    const clean = identifier.trim();

    // Buscar primero por email sin distinguir
    // mayúsculas/minúsculas.
    const emailResult = await db.query(
      `SELECT id, rut, first_name, last_name, email,
              password_hash, role, is_active, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [clean]
    );

    if (emailResult.rows[0]) {
      return emailResult.rows[0];
    }

    // Buscar por RUT exacto o normalizado.
    const cleanRut = clean
      .replace(/[^0-9kK]/g, '')
      .toUpperCase();

    const rutResult = await db.query(
      `SELECT id, rut, first_name, last_name, email,
              password_hash, role, is_active, created_at
       FROM users
       WHERE rut = $1
          OR UPPER(
               REGEXP_REPLACE(rut, '[^0-9kK]', '', 'g')
             ) = $2`,
      [clean, cleanRut]
    );

    return rutResult.rows[0];
  }

  // =====================================================
  // BUSCAR POR ID
  // =====================================================

  static async findById(id) {
    const result = await db.query(
      `SELECT id, rut, first_name, last_name, email,
              role, is_active, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  // =====================================================
  // CREAR USUARIO
  // =====================================================

  static async create({
    rut,
    firstName,
    lastName,
    email,
    passwordHash,
    role,
    professionalRegistry = null,
    specialty = null,
    institutionId = null,
    institutionNameOther = null,
  }) {
    const userRole = role || 'PACIENTE';

    // Usuario y perfil se crean dentro de una misma
    // transacción para evitar registros incompletos.
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // =================================================
      // CREAR USUARIO BASE
      // =================================================

      const result = await client.query(
        `INSERT INTO users (
          rut,
          first_name,
          last_name,
          email,
          password_hash,
          role
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          rut,
          first_name,
          last_name,
          email,
          role,
          created_at`,
        [
          rut,
          firstName,
          lastName,
          email,
          passwordHash,
          userRole,
        ]
      );

      const user = result.rows[0];

      // =================================================
      // PERFIL PACIENTE
      // =================================================

      if (userRole === 'PACIENTE') {
        await client.query(
          `INSERT INTO patient_profiles (user_id)
           VALUES ($1)
           ON CONFLICT (user_id) DO NOTHING`,
          [user.id]
        );
      }

      // =================================================
      // PERFIL MÉDICO
      // =================================================

      if (userRole === 'MEDICO') {
        let finalInstitutionId = null;
        let finalInstitutionNameOther = null;

        // -----------------------------------------------
        // CASO 1:
        // Institución seleccionada desde el catálogo.
        // -----------------------------------------------

        if (institutionId) {
          const institutionResult = await client.query(
            `SELECT id
             FROM health_institutions
             WHERE id = $1
               AND is_active = TRUE`,
            [institutionId]
          );

          if (!institutionResult.rows[0]) {
            const error = new Error(
              'La institución de salud seleccionada no existe o no está activa.'
            );
            error.statusCode = 400;
            throw error;
          }

          finalInstitutionId = institutionResult.rows[0].id;
        }

        // -----------------------------------------------
        // CASO 2:
        // Institución ingresada manualmente.
        // -----------------------------------------------

        if (institutionNameOther) {
          finalInstitutionNameOther =
            institutionNameOther.trim();
        }

        // Seguridad adicional en el repositorio.
        if (
          !finalInstitutionId &&
          !finalInstitutionNameOther
        ) {
          const error = new Error(
            'El médico debe indicar una institución de salud.'
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          finalInstitutionId &&
          finalInstitutionNameOther
        ) {
          const error = new Error(
            'No se puede registrar simultáneamente una institución del catálogo y otra institución.'
          );
          error.statusCode = 400;
          throw error;
        }

        // -----------------------------------------------
        // CREAR PERFIL MÉDICO
        // -----------------------------------------------

        await client.query(
          `INSERT INTO doctor_profiles (
            user_id,
            institution_id,
            institution_name_other,
            professional_registry,
            specialty,
            verification_status
          )
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            user.id,
            finalInstitutionId,
            finalInstitutionNameOther,
            professionalRegistry,
            specialty,
            'PENDIENTE',
          ]
        );
      }

      // =================================================
      // CONFIRMAR TRANSACCIÓN
      // =================================================

      await client.query('COMMIT');

      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }


  // =====================================================
  // GUARDAR TOKEN DE RECUPERACIÓN
  // =====================================================

  static async savePasswordResetToken(userId, tokenHash, expiresAt) {
    await db.query(
      `INSERT INTO password_reset_tokens (
         user_id, token_hash, expires_at
       )
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET
         token_hash = EXCLUDED.token_hash,
         expires_at = EXCLUDED.expires_at,
         created_at = CURRENT_TIMESTAMP`,
      [userId, tokenHash, expiresAt]
    );
  }

  // =====================================================
  // CONSULTAR TOKEN DE RECUPERACIÓN
  // =====================================================

  static async findPasswordResetToken(tokenHash) {
    const result = await db.query(
      `SELECT prt.id, prt.user_id, prt.expires_at
       FROM password_reset_tokens prt
       INNER JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.expires_at > CURRENT_TIMESTAMP
         AND u.is_active = TRUE`,
      [tokenHash]
    );

    return result.rows[0];
  }

  // =====================================================
  // ACTUALIZAR CONTRASEÑA Y CONSUMIR TOKEN
  // =====================================================

  static async resetPasswordWithToken(tokenHash, passwordHash) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT prt.id, prt.user_id
         FROM password_reset_tokens prt
         INNER JOIN users u ON u.id = prt.user_id
         WHERE prt.token_hash = $1
           AND prt.expires_at > CURRENT_TIMESTAMP
           AND u.is_active = TRUE
         FOR UPDATE OF prt`,
        [tokenHash]
      );

      const reset = result.rows[0];

      if (!reset) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query(
        `UPDATE users
         SET password_hash = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [passwordHash, reset.user_id]
      );

      await client.query(
        `DELETE FROM password_reset_tokens
         WHERE user_id = $1`,
        [reset.user_id]
      );

      await client.query('COMMIT');

      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }


  // =====================================================
// LISTAR MÉDICOS DISPONIBLES PARA COMPARTIR FICHA
// =====================================================

static async findAvailableDoctors() {
  const result = await db.query(
    `SELECT
        u.id,
        u.rut,
        u.first_name,
        u.last_name,
        u.email,
        dp.professional_registry,
        dp.specialty,
        dp.professional_title,
        dp.verification_status,
        dp.is_available_for_sharing,
        COALESCE(
          hi.name,
          dp.institution_name_other,
          'Institución no especificada'
        ) AS institution_name
     FROM users u
     INNER JOIN doctor_profiles dp
       ON dp.user_id = u.id
     LEFT JOIN health_institutions hi
       ON hi.id = dp.institution_id
     WHERE u.role = 'MEDICO'
       AND u.is_active = TRUE
       AND dp.is_available_for_sharing = TRUE
     ORDER BY u.first_name, u.last_name`
  );

  return result.rows;
}
}


module.exports = UserRepository;