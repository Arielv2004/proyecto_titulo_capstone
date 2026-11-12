const crypto = require('crypto');

const AccessGrantRepository = require('../repositories/access-grant.repository');
const db = require('../config/db');

const VALID_HOURS = [1, 2, 6, 12, 24, 48];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateId(value, message, statusCode = 400) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw serviceError(message, statusCode);
  }

  return value.toLowerCase();
}

function validateDuration(value) {
  if (
    !['string', 'number'].includes(typeof value) ||
    (typeof value === 'string' && !value.trim())
  ) {
    throw serviceError('La duración del acceso no es válida.');
  }

  const hours = Number(value);

  if (!Number.isInteger(hours) || !VALID_HOURS.includes(hours)) {
    throw serviceError(
      'La duración debe ser de 1, 2, 6, 12, 24 o 48 horas.'
    );
  }

  return hours;
}

function validateLocation(regionCode, city) {
  if (
    typeof regionCode !== 'string' ||
    !/^(0[1-9]|1[0-6])$/.test(regionCode.trim())
  ) {
    throw serviceError('Selecciona una región válida.');
  }

  if (typeof city !== 'string') {
    throw serviceError('Selecciona una ciudad o comuna válida.');
  }

  const normalizedCity = city.trim().replace(/\s+/g, ' ');

  if (normalizedCity.length < 2 || normalizedCity.length > 100) {
    throw serviceError(
      'La ciudad o comuna debe tener entre 2 y 100 caracteres.'
    );
  }

  return {
    regionCode: regionCode.trim(),
    city: normalizedCity,
  };
}

function normalizeCity(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-CL');
}

function validateToken(token) {
  if (
    typeof token !== 'string' ||
    !token.trim() ||
    token.trim().length > 100
  ) {
    throw serviceError('Se requiere un token de acceso válido.');
  }

  return token.trim();
}

function validateGrantDates(grant) {
  if (grant.is_revoked) {
    throw serviceError('El paciente revocó este acceso.', 403);
  }

  const now = new Date();
  const expiry = new Date(grant.expires_at);
  const startsAt = new Date(grant.starts_at || grant.created_at);

  if (
    !Number.isFinite(expiry.getTime()) ||
    !Number.isFinite(startsAt.getTime())
  ) {
    throw serviceError('El permiso tiene fechas no válidas.', 403);
  }

  if (startsAt > now) {
    throw serviceError('Este acceso todavía no está vigente.', 403);
  }

  if (now >= expiry) {
    throw serviceError('Este acceso compartido ha expirado.', 410);
  }

  return { now, expiry };
}

function minutesRemaining(expiresAt) {
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 60000)
  );
}

function grantStatus(grant) {
  if (grant.is_revoked) return 'REVOCADO';

  if (new Date(grant.expires_at).getTime() <= Date.now()) {
    return 'EXPIRADO';
  }

  if (
    new Date(grant.starts_at || grant.created_at).getTime() > Date.now()
  ) {
    return 'PROGRAMADO';
  }

  return 'ACTIVO';
}

class AccessGrantService {
  // El identificador debe proceder de la sesión autenticada.
  static async requirePatient(patientId) {
    const id = validateId(
      patientId,
      'No se pudo identificar al paciente autenticado.',
      401
    );

    const result = await db.query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND role = 'PACIENTE'
         AND is_active = TRUE`,
      [id]
    );

    if (!result.rows[0]) {
      throw serviceError(
        'Se requiere una cuenta de paciente activa.',
        403
      );
    }

    return result.rows[0];
  }

  // Consulta siempre el estado actual en la base de datos.
  static async requireEligibleDoctor(doctorId) {
    const id = validateId(
      doctorId,
      'No se pudo identificar al médico.',
      403
    );

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
         COALESCE(
           hi.name,
           dp.institution_name_other,
           'Institución no especificada'
         ) AS institution_name
       FROM users u
       INNER JOIN doctor_profiles dp ON dp.user_id = u.id
       LEFT JOIN health_institutions hi ON hi.id = dp.institution_id
       WHERE u.id = $1
         AND u.role = 'MEDICO'
         AND u.is_active = TRUE
         AND dp.verification_status = 'VERIFICADO'
         AND dp.verified_at IS NOT NULL
         AND dp.is_available_for_sharing = TRUE`,
      [id]
    );

    if (!result.rows[0]) {
      throw serviceError(
        'El médico debe tener una cuenta activa, identidad profesional verificada y disponibilidad habilitada.',
        403
      );
    }

    return result.rows[0];
  }

  static async writeAudit({
    userId,
    patientId,
    action,
    details,
    ipAddress,
    userAgent,
  }, client = db) {
    await client.query(
      `INSERT INTO audit_logs (
         user_id,
         patient_id,
         action,
         details,
         ip_address,
         user_agent
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        patientId,
        action,
        JSON.stringify(details),
        String(ipAddress || '127.0.0.1').slice(0, 45),
        String(userAgent || 'MyMedRecord'),
      ]
    );
  }

  // =====================================================
  // GENERAR CÓDIGO QR TEMPORAL
  // =====================================================

  static async generateGrant({
    patientId,
    durationHours = 2,
    ipAddress,
    userAgent,
  }) {
    await this.requirePatient(patientId);

    const finalHours = validateDuration(durationHours);
    const randomHex = crypto.randomBytes(12).toString('hex').toUpperCase();
    const token = `MMR-${finalHours}H-${randomHex}`;
    const expiresAt = new Date(Date.now() + finalHours * 3600000);

    const grant = await AccessGrantRepository.createGrant({
      patientId,
      token,
      expiresAt,
    });

    await this.writeAudit({
      userId: patientId,
      patientId,
      action: 'GENERATE_QR_TOKEN',
      details: {
        grantId: grant.id,
        durationHours: finalHours,
        expiresAt: grant.expires_at,
      },
      ipAddress,
      userAgent,
    });

    return {
      id: grant.id,
      token: grant.token,
      grantType: grant.grant_type,
      durationHours: finalHours,
      expiresAt: grant.expires_at,
      createdAt: grant.created_at,
    };
  }

  // =====================================================
  // COMPARTIR DIRECTAMENTE CON UN MÉDICO
  // =====================================================

  static async createDirectGrant({
    patientId,
    doctorId,
    durationHours = 24,
    regionCode,
    city,
    ipAddress,
    userAgent,
  }) {
    const patient = await this.requirePatient(patientId);

    const selectedDoctorId = validateId(
      doctorId,
      'Debes seleccionar un médico válido.'
    );

    if (patient.id.toLowerCase() === selectedDoctorId) {
      throw serviceError('No puedes compartir tu ficha contigo mismo.');
    }

    const finalHours = validateDuration(durationHours);
    const location = validateLocation(regionCode, city);
    const doctor = await this.requireEligibleDoctor(selectedDoctorId);

    if (
      doctor.region_code !== location.regionCode ||
      normalizeCity(doctor.city) !== normalizeCity(location.city)
    ) {
      throw serviceError(
        'El médico no corresponde a la región y ciudad seleccionadas.',
        403
      );
    }

    const existingResult = await db.query(
      `SELECT id
       FROM access_grants
       WHERE patient_id = $1
         AND doctor_id = $2
         AND grant_type = 'DIRECTO'
         AND is_revoked = FALSE
         AND expires_at > NOW()
       LIMIT 1`,
      [patientId, selectedDoctorId]
    );

    if (existingResult.rows[0]) {
      throw serviceError(
        'Este médico ya tiene un acceso vigente o programado a tu ficha.',
        409
      );
    }

    const token =
      `MMR-DIRECT-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

    const expiresAt = new Date(Date.now() + finalHours * 3600000);

    const grant = await AccessGrantRepository.createDirectGrant({
      patientId,
      doctorId: selectedDoctorId,
      token,
      expiresAt,
    });

    await this.writeAudit({
      userId: patientId,
      patientId,
      action: 'SHARE_RECORD_WITH_DOCTOR',
      details: {
        grantId: grant.id,
        doctorId: doctor.id,
        doctorRut: doctor.rut,
        doctorName: `${doctor.first_name} ${doctor.last_name}`.trim(),
        specialty: doctor.specialty,
        institution: doctor.institution_name,
        regionCode: doctor.region_code,
        city: doctor.city,
        durationHours: finalHours,
        expiresAt: grant.expires_at,
      },
      ipAddress,
      userAgent,
    });

    return {
      id: grant.id,
      token: grant.token,
      grantType: grant.grant_type,
      doctorId: doctor.id,
      doctor: {
        id: doctor.id,
        rut: doctor.rut,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        email: doctor.email,
        specialty: doctor.specialty,
        professionalTitle: doctor.professional_title,
        professionalRegistry: doctor.professional_registry,
        verificationStatus: doctor.verification_status,
        institutionName: doctor.institution_name,
        regionCode: doctor.region_code,
        city: doctor.city,
      },
      durationHours: finalHours,
      startsAt: grant.starts_at || grant.created_at,
      expiresAt: grant.expires_at,
      createdAt: grant.created_at,
    };
  }

  // =====================================================
  // VALIDAR QR Y ACCEDER A LA FICHA
  // =====================================================

  static async validateAndAccess({
    token,
    doctorId,
    ipAddress,
    userAgent,
  }) {
    // doctorId debe obtenerse de req.user.id en el controlador.
    // No se utiliza el RUT, nombre o institución enviados por el cliente.
    if (!doctorId) {
      throw serviceError(
        'Debes iniciar sesión con una cuenta médica para consultar el QR.',
        401
      );
    }

    const doctor = await this.requireEligibleDoctor(doctorId);
    const cleanToken = validateToken(token);

    const grant = await AccessGrantRepository.findByToken(cleanToken);

    if (!grant) {
      throw serviceError('Código QR no encontrado o inválido.', 404);
    }

    if (grant.grant_type !== 'QR_TEMPORAL') {
      throw serviceError(
        'El código proporcionado no corresponde a un acceso QR.'
      );
    }

    validateGrantDates(grant);
    if (grant.access_count > 0) throw serviceError('Este pase QR ya se utilizó.', 410);

    if (String(grant.patient_id).toLowerCase() === doctor.id.toLowerCase()) {
      throw serviceError(
        'Este permiso no corresponde a la ficha de otro paciente.',
        403
      );
    }

    // Si el permiso está vinculado a un médico, se respeta esa vinculación.
    if (
      grant.doctor_id &&
      String(grant.doctor_id).toLowerCase() !== doctor.id.toLowerCase()
    ) {
      throw serviceError(
        'Este permiso QR pertenece a otro médico.',
        403
      );
    }

    const doctorName =
      `${doctor.first_name} ${doctor.last_name}`.trim();

    const clinicalData =
      await AccessGrantRepository.getPatientClinicalData(grant.patient_id);

    if (!clinicalData) {
      throw serviceError(
        'No se encontró la ficha clínica del paciente.',
        404
      );
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const claimed = await AccessGrantRepository.claimQr(client, {
        doctorId: doctor.id,
        token: grant.token,
        doctorRut: doctor.rut,
        doctorName,
        doctorInstitution: doctor.institution_name,
      });

      if (!claimed) throw serviceError('El pase ya se utilizó o dejó de estar vigente. Solicita otro al paciente.', 410);

      await this.writeAudit({
        userId: doctor.id,
        patientId: grant.patient_id,
        action: 'CONSULTA_MEDICA_QR',
        details: {
          grantId: grant.id,
          doctorId: doctor.id,
          doctor_rut: doctor.rut,
          doctor_name: doctorName,
          doctor_institution: doctor.institution_name,
          expires_at: grant.expires_at,
        },
        ipAddress,
        userAgent,
      }, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      grant: {
        id: grant.id,
        token: grant.token,
        grantType: grant.grant_type,
        expiresAt: grant.expires_at,
        minutesRemaining: minutesRemaining(grant.expires_at),
        doctorRut: doctor.rut,
        doctorName,
        doctorInstitution: doctor.institution_name,
      },
      clinicalData,
    };
  }

  // =====================================================
  // REVOCAR ACCESO
  // =====================================================

  static async revokeGrant({
    grantId,
    patientId,
    ipAddress,
    userAgent,
  }) {
    await this.requirePatient(patientId);
    validateId(grantId, 'El identificador del permiso no es válido.');

    const revoked =
      await AccessGrantRepository.revokeGrant(grantId, patientId);

    if (!revoked) {
      throw serviceError(
        'No se encontró el acceso para revocar o no te pertenece.',
        404
      );
    }

    await this.writeAudit({
      userId: patientId,
      patientId,
      action:
        revoked.grant_type === 'DIRECTO'
          ? 'REVOKE_DIRECT_ACCESS'
          : 'REVOKE_QR_ACCESS',
      details: {
        grantId,
        grantType: revoked.grant_type,
        doctorId: revoked.doctor_id || null,
      },
      ipAddress,
      userAgent,
    });

    return revoked;
  }

  // =====================================================
  // OBTENER QR ACTIVO DEL PACIENTE
  // =====================================================

  static async getActiveGrant(patientId) {
    await this.requirePatient(patientId);

    const grant =
      await AccessGrantRepository.getActiveByPatient(patientId);

    if (!grant) return null;

    const expiry = new Date(grant.expires_at);

    return {
      id: grant.id,
      token: grant.token,
      grantType: grant.grant_type,
      expiresAt: grant.expires_at,
      durationHours: Math.round(
        (expiry - new Date(grant.created_at)) / 3600000
      ),
      minutesRemaining: minutesRemaining(grant.expires_at),
      doctorRut: grant.doctor_rut,
      doctorName: grant.doctor_name,
      doctorInstitution: grant.doctor_institution,
      accessCount: grant.access_count,
      createdAt: grant.created_at,
    };
  }

  // =====================================================
  // OBTENER TODOS LOS ACCESOS DEL PACIENTE
  // =====================================================

  static async getMyGrants(patientId) {
    await this.requirePatient(patientId);

    const grants =
      await AccessGrantRepository.getAllByPatient(patientId);

    return grants.map((grant) => ({
      id: grant.id,
      token: grant.token,
      grantType: grant.grant_type,
      doctorId: grant.doctor_id,
      doctorRut: grant.doctor_rut,
      doctorName: grant.doctor_name,
      doctorInstitution: grant.doctor_institution,
      startsAt: grant.starts_at || grant.created_at,
      expiresAt: grant.expires_at,
      minutesRemaining: minutesRemaining(grant.expires_at),
      isRevoked: grant.is_revoked,
      accessCount: grant.access_count,
      status: grantStatus(grant),
      createdAt: grant.created_at,
    }));
  }

  // =====================================================
  // FICHAS COMPARTIDAS CON EL MÉDICO
  // =====================================================

  static async getSharedWithDoctor(doctorId) {
    if (!doctorId) {
      throw serviceError(
        'No se pudo identificar al médico autenticado.',
        401
      );
    }

    await this.requireEligibleDoctor(doctorId);

    const grants =
      await AccessGrantRepository.getSharedWithDoctor(doctorId);

    return grants.map((grant) => ({
      id: grant.id,
      token: grant.token,
      grantType: grant.grant_type,
      patientId: grant.patient_id,
      patient: {
        id: grant.patient_id,
        rut: grant.patient_rut,
        firstName: grant.patient_first_name,
        lastName: grant.patient_last_name,
        email: grant.patient_email,
      },
      startsAt: grant.starts_at || grant.created_at,
      expiresAt: grant.expires_at,
      minutesRemaining: minutesRemaining(grant.expires_at),
      isRevoked: grant.is_revoked,
      accessCount: grant.access_count,
      status: grantStatus(grant),
      createdAt: grant.created_at,
    }));
  }

  // =====================================================
  // ABRIR FICHA MEDIANTE ACCESO DIRECTO
  // =====================================================

  static async accessDirectGrant({
    token,
    doctorId,
    ipAddress,
    userAgent,
  }) {
    if (!doctorId) {
      throw serviceError(
        'No se pudo identificar al médico autenticado.',
        401
      );
    }

    const doctor = await this.requireEligibleDoctor(doctorId);
    const cleanToken = validateToken(token);

    const grant = await AccessGrantRepository.findByToken(cleanToken);

    if (!grant) {
      throw serviceError('El acceso compartido no existe.', 404);
    }

    if (grant.grant_type !== 'DIRECTO') {
      throw serviceError(
        'Este token no corresponde a un acceso directo.'
      );
    }

    if (
      String(grant.doctor_id).toLowerCase() !== doctor.id.toLowerCase()
    ) {
      throw serviceError(
        'No tienes autorización para consultar esta ficha.',
        403
      );
    }

    validateGrantDates(grant);

    const clinicalData =
      await AccessGrantRepository.getPatientClinicalData(grant.patient_id);

    if (!clinicalData) {
      throw serviceError(
        'No se encontró la ficha clínica del paciente.',
        404
      );
    }

    await this.writeAudit({
      userId: doctor.id,
      patientId: grant.patient_id,
      action: 'CONSULTA_MEDICA_DIRECTA',
      details: {
        grantId: grant.id,
        grantType: grant.grant_type,
        doctorId: doctor.id,
        patientId: grant.patient_id,
        expiresAt: grant.expires_at,
      },
      ipAddress,
      userAgent,
    });

    await db.query(
      `UPDATE access_grants
       SET access_count = COALESCE(access_count, 0) + 1
       WHERE id = $1`,
      [grant.id]
    );

    return {
      grant: {
        id: grant.id,
        token: grant.token,
        grantType: grant.grant_type,
        patientId: grant.patient_id,
        doctorId: grant.doctor_id,
        startsAt: grant.starts_at || grant.created_at,
        expiresAt: grant.expires_at,
        minutesRemaining: minutesRemaining(grant.expires_at),
        accessCount: Number(grant.access_count || 0) + 1,
      },
      clinicalData,
    };
  }
}

module.exports = AccessGrantService;