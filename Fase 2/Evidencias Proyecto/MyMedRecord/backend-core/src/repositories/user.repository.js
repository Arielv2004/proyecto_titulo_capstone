
const db = require('../config/db');

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizeLocation(regionCode, city, address) {
  const region =
    typeof regionCode === 'string' ? regionCode.trim() : '';

  const normalizedCity =
    typeof city === 'string'
      ? city.trim().replace(/\s+/g, ' ')
      : '';

  if (!/^(0[1-9]|1[0-6])$/.test(region)) {
    throw validationError('Selecciona una región válida.');
  }

  if (
    normalizedCity.length < 2 ||
    normalizedCity.length > 100
  ) {
    throw validationError(
      'La ciudad o comuna debe tener entre 2 y 100 caracteres.'
    );
  }

  if (address != null && typeof address !== 'string') {
    throw validationError('La dirección laboral no es válida.');
  }

  const normalizedAddress =
    typeof address === 'string'
      ? address.trim() || null
      : null;

  if (normalizedAddress && normalizedAddress.length > 255) {
    throw validationError(
      'La dirección no puede superar los 255 caracteres.'
    );
  }

  return {
    regionCode: region,
    city: normalizedCity,
    address: normalizedAddress,
  };
}

function normalizeFilters({ regionCode = null, city = null } = {}) {
  if (regionCode != null && typeof regionCode !== 'string') {
    throw validationError('El filtro de región no es válido.');
  }

  if (city != null && typeof city !== 'string') {
    throw validationError('El filtro de ciudad no es válido.');
  }

  const region = regionCode?.trim() || null;
  const normalizedCity =
    city?.trim().replace(/\s+/g, ' ') || null;

  if (region && !/^(0[1-9]|1[0-6])$/.test(region)) {
    throw validationError('Selecciona una región válida.');
  }

  if (normalizedCity && normalizedCity.length > 100) {
    throw validationError(
      'El filtro de ciudad no puede superar los 100 caracteres.'
    );
  }

  return [region, normalizedCity];
}

class UserRepository {
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

  static async findByIdentifier(identifier) {
    if (
      typeof identifier !== 'string' ||
      !identifier.trim()
    ) {
      return null;
    }

    const clean = identifier.trim();

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
  // CREAR USUARIO Y PERFIL
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
    regionCode = null,
    city = null,
    address = null,
    termsVersion = null,
    ipAddress = 'unknown',
    userAgent = null,
  }) {
    const userRole = role || 'PACIENTE';

    if (!['PACIENTE', 'MEDICO'].includes(userRole)) {
      throw validationError(
        'El registro solo admite pacientes y médicos.'
      );
    }

    const location =
      userRole === 'MEDICO'
        ? normalizeLocation(regionCode, city, address)
        : null;

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // =================================================
      // CREAR USUARIO BASE Y REGISTRAR ACEPTACIÓN
      // =================================================

      // NOW() utiliza la hora del servidor de base de datos.
      const result = await client.query(
        `INSERT INTO users (
          rut,
          first_name,
          last_name,
          email,
          password_hash,
          role,
          terms_accepted_at,
          terms_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        RETURNING
          id,
          rut,
          first_name,
          last_name,
          email,
          role,
          terms_accepted_at,
          terms_version,
          created_at`,
        [
          rut,
          firstName,
          lastName,
          email,
          passwordHash,
          userRole,
          termsVersion,
        ]
      );

      const user = result.rows[0];

      // =================================================
      // AUDITORÍA DEL CONSENTIMIENTO
      // =================================================

      await client.query(
        `INSERT INTO audit_logs (
          user_id,
          patient_id,
          action,
          details,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, 'CONSENT_GRANTED', $3, $4, $5)`,
        [
          user.id,
          userRole === 'PACIENTE' ? user.id : null,
          JSON.stringify({
            consent_type: 'DATOS_SENSIBLES_SALUD',
            law: 'Ley 21.719',
            terms_version: termsVersion,
            accepted_at: user.terms_accepted_at,
          }),
          String(ipAddress || 'unknown').slice(0, 45),
          userAgent,
        ]
      );

      // =================================================
      // CREAR PERFIL DE PACIENTE
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
      // CREAR PERFIL DE MÉDICO
      // =================================================

      if (userRole === 'MEDICO') {
        const otherInstitution =
          typeof institutionNameOther === 'string'
            ? institutionNameOther.trim() || null
            : null;

        if (!institutionId && !otherInstitution) {
          throw validationError(
            'El médico debe indicar una institución de salud.'
          );
        }

        if (institutionId && otherInstitution) {
          throw validationError(
            'Selecciona una institución del catálogo o escribe otra, pero no ambas.'
          );
        }

        let finalInstitutionId = null;

        if (institutionId) {
          const institutionResult = await client.query(
            `SELECT id
             FROM health_institutions
             WHERE id = $1
               AND is_active = TRUE`,
            [institutionId]
          );

          if (!institutionResult.rows[0]) {
            throw validationError(
              'La institución seleccionada no existe o no está activa.'
            );
          }

          finalInstitutionId = institutionResult.rows[0].id;
        }

        await client.query(
          `INSERT INTO doctor_profiles (
            user_id,
            institution_id,
            institution_name_other,
            professional_registry,
            specialty,
            verification_status,
            is_available_for_sharing,
            region_code,
            city,
            address
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            user.id,
            finalInstitutionId,
            otherInstitution,
            professionalRegistry,
            specialty,
            'PENDIENTE',
            false,
            location.regionCode,
            location.city,
            location.address,
          ]
        );
      }

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

  static async savePasswordResetToken(
    userId,
    tokenHash,
    expiresAt
  ) {
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
  // BUSCAR TOKEN DE RECUPERACIÓN
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
  // RESTABLECER CONTRASEÑA
  // =====================================================

  static async resetPasswordWithToken(
    tokenHash,
    passwordHash
  ) {
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
  // DIRECTORIO DE MÉDICOS
  // =====================================================

  // Solo muestra médicos activos, verificados y disponibles.
  // Esta consulta no autoriza compartir una ficha médica.
  static async findDoctorsDirectory(filters = {}) {
    const params = normalizeFilters(filters);

    const result = await db.query(
      `SELECT
        u.id,
        u.first_name,
        u.last_name,
        dp.specialty,
        dp.professional_title,
        dp.verification_status,
        dp.is_available_for_sharing,
        dp.region_code,
        COALESCE(
          NULLIF(TRIM(dp.city), ''),
          NULLIF(TRIM(hi.commune), ''),
          NULLIF(TRIM(hi.city), '')
        ) AS city,
        dp.address,
        TRUE AS can_receive_records,
        COALESCE(
          hi.name,
          dp.institution_name_other,
          'Institución no especificada'
        ) AS institution_name
       FROM users u
       INNER JOIN doctor_profiles dp ON dp.user_id = u.id
       LEFT JOIN health_institutions hi ON hi.id = dp.institution_id
       WHERE u.role = 'MEDICO'
         AND u.is_active = TRUE
         AND dp.verification_status = 'VERIFICADO'
         AND dp.is_available_for_sharing = TRUE
         AND ($1::varchar IS NULL OR dp.region_code = $1)
         AND (
           $2::text IS NULL
           OR LOWER(TRIM(COALESCE(
             NULLIF(TRIM(dp.city), ''),
             NULLIF(TRIM(hi.commune), ''),
             NULLIF(TRIM(hi.city), ''),
             ''
           ))) = LOWER($2::text)
         )
       ORDER BY u.first_name, u.last_name, u.id`,
      params
    );

    return result.rows;
  }

  // =====================================================
  // MÉDICOS HABILITADOS PARA RECIBIR FICHAS
  // =====================================================

  static async findAvailableDoctors(filters = {}) {
    const params = normalizeFilters(filters);

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
        dp.region_code,
        COALESCE(
          NULLIF(TRIM(dp.city), ''),
          NULLIF(TRIM(hi.commune), ''),
          NULLIF(TRIM(hi.city), '')
        ) AS city,
        dp.address,
        TRUE AS can_receive_records,
        COALESCE(
          hi.name,
          dp.institution_name_other,
          'Institución no especificada'
        ) AS institution_name
       FROM users u
       INNER JOIN doctor_profiles dp ON dp.user_id = u.id
       LEFT JOIN health_institutions hi ON hi.id = dp.institution_id
       WHERE u.role = 'MEDICO'
         AND u.is_active = TRUE
         AND dp.verification_status = 'VERIFICADO'
         AND dp.is_available_for_sharing = TRUE
         AND ($1::varchar IS NULL OR dp.region_code = $1)
         AND (
           $2::text IS NULL
           OR LOWER(TRIM(COALESCE(
             NULLIF(TRIM(dp.city), ''),
             NULLIF(TRIM(hi.commune), ''),
             NULLIF(TRIM(hi.city), ''),
             ''
           ))) = LOWER($2::text)
         )
       ORDER BY u.first_name, u.last_name, u.id`,
      params
    );

    return result.rows;
  }
}

module.exports = UserRepository;
