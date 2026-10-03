const crypto = require('crypto');

const AccessGrantRepository = require('../repositories/access-grant.repository');
const db = require('../config/db');

class AccessGrantService {
  /**
   * =====================================================
   * GENERAR CÓDIGO QR TEMPORAL
   * =====================================================
   */
  static async generateGrant({ patientId, durationHours = 2 }) {
    const hours = parseInt(durationHours, 10);
    const validHours = [1, 2, 6, 12, 24, 48];
    const finalHours = validHours.includes(hours) ? hours : 2;

    // Revocar solamente QR activos anteriores.
    // Los accesos DIRECTO no se modifican.
    await AccessGrantRepository.revokeAllActiveByPatient(patientId);

    const randomHex = crypto
      .randomBytes(12)
      .toString('hex')
      .toUpperCase();

    const token = `MMR-${finalHours}H-${randomHex}`;

    const expiresAt = new Date(
      Date.now() + finalHours * 60 * 60 * 1000
    );

    const grant = await AccessGrantRepository.createGrant({
      patientId,
      token,
      expiresAt,
    });

    await db.query(
      `INSERT INTO audit_logs (
        user_id,
        patient_id,
        action,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, 'GENERATE_QR_TOKEN', $3, $4, $5);`,
      [
        patientId,
        patientId,
        JSON.stringify({
          grantId: grant.id,
          token: grant.token,
          durationHours: finalHours,
          expiresAt: grant.expires_at,
        }),
        '127.0.0.1',
        'MyMedRecord Portal Paciente',
      ]
    );

    return {
      id: grant.id,
      token: grant.token,
      grantType: grant.grant_type,
      durationHours: finalHours,
      expiresAt: grant.expires_at,
      createdAt: grant.created_at,
    };
  }

  /**
   * =====================================================
   * COMPARTIR DIRECTAMENTE CON UN MÉDICO
   * =====================================================
   *
   * El paciente selecciona un médico registrado dentro
   * de MyMedRecord y le entrega acceso temporal.
   */
  static async createDirectGrant({
    patientId,
    doctorId,
    durationHours = 24,
  }) {
    if (!doctorId) {
      const error = new Error(
        'Debe seleccionar un médico para compartir la ficha.'
      );

      error.statusCode = 400;
      throw error;
    }

    if (String(patientId) === String(doctorId)) {
      const error = new Error(
        'No puede compartir su ficha consigo mismo.'
      );

      error.statusCode = 400;
      throw error;
    }

    // -----------------------------------------------------
    // 1. Validar duración
    // -----------------------------------------------------

    const hours = parseInt(durationHours, 10);
    const validHours = [1, 2, 6, 12, 24, 48];

    const finalHours = validHours.includes(hours)
      ? hours
      : 24;

    // -----------------------------------------------------
    // 2. Verificar médico
    // -----------------------------------------------------

    const doctorResult = await db.query(
      `SELECT
        u.id,
        u.rut,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.is_active,

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

      WHERE u.id = $1
        AND u.role = 'MEDICO'
        AND u.is_active = TRUE
        AND dp.is_available_for_sharing = TRUE

      LIMIT 1;`,
      [doctorId]
    );

    const doctor = doctorResult.rows[0];

    if (!doctor) {
      const error = new Error(
        'El médico seleccionado no existe, no está activo o no está disponible para recibir fichas.'
      );

      error.statusCode = 404;
      throw error;
    }

    // -----------------------------------------------------
    // 3. Evitar accesos DIRECTO duplicados activos
    // -----------------------------------------------------

    const existingResult = await db.query(
      `SELECT id
       FROM access_grants
       WHERE patient_id = $1
         AND doctor_id = $2
         AND grant_type = 'DIRECTO'
         AND is_revoked = FALSE
         AND expires_at > NOW()
       LIMIT 1;`,
      [patientId, doctorId]
    );

    if (existingResult.rows[0]) {
      const error = new Error(
        'Este médico ya tiene un acceso activo a su ficha.'
      );

      error.statusCode = 409;
      throw error;
    }

    // -----------------------------------------------------
    // 4. Crear token interno
    // -----------------------------------------------------
    //
    // Aunque DIRECTO no usa QR, la columna token
    // de access_grants es NOT NULL y UNIQUE.
    //
    // IMPORTANTE:
    // Este token NO es un UUID.
    // Nunca debe enviarse a una consulta SQL que espere UUID.
    // -----------------------------------------------------

    const randomHex = crypto
      .randomBytes(16)
      .toString('hex')
      .toUpperCase();

    const token = `MMR-DIRECT-${randomHex}`;

    const expiresAt = new Date(
      Date.now() + finalHours * 60 * 60 * 1000
    );

    // -----------------------------------------------------
    // 5. Crear autorización
    // -----------------------------------------------------

    const grant =
      await AccessGrantRepository.createDirectGrant({
        patientId,
        doctorId,
        token,
        expiresAt,
      });

    // -----------------------------------------------------
    // 6. Auditoría
    // -----------------------------------------------------

    await db.query(
      `INSERT INTO audit_logs (
        user_id,
        patient_id,
        action,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, 'SHARE_RECORD_WITH_DOCTOR', $3, $4, $5);`,
      [
        patientId,
        patientId,

        JSON.stringify({
          grantId: grant.id,
          doctorId: doctor.id,
          doctorRut: doctor.rut,
          doctorName:
            `${doctor.first_name} ${doctor.last_name}`.trim(),
          specialty: doctor.specialty,
          institution: doctor.institution_name,
          durationHours: finalHours,
          expiresAt: grant.expires_at,
        }),

        '127.0.0.1',
        'MyMedRecord Portal Paciente',
      ]
    );

    // -----------------------------------------------------
    // 7. Respuesta
    // -----------------------------------------------------

    return {
      id: grant.id,

      // IMPORTANTE:
      // Se devuelve también el token para mantener
      // consistente la estructura del acceso.
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
        professionalRegistry:
          doctor.professional_registry,
        verificationStatus:
          doctor.verification_status,
        institutionName:
          doctor.institution_name,
      },

      durationHours: finalHours,

      startsAt:
        grant.starts_at || grant.created_at,

      expiresAt: grant.expires_at,
      createdAt: grant.created_at,
    };
  }

  /**
   * =====================================================
   * VALIDAR QR Y ACCEDER A LA FICHA
   * =====================================================
   *
   * Este método corresponde EXCLUSIVAMENTE
   * al flujo mediante código QR.
   */
  static async validateAndAccess({
    token,
    doctorRut,
    doctorName,
    doctorInstitution,
    ipAddress,
    userAgent,
  }) {
    // -----------------------------------------------------
    // 1. Validar token
    // -----------------------------------------------------

    if (!token || !token.trim()) {
      const error = new Error(
        'Se requiere un token de Código QR válido.'
      );

      error.statusCode = 400;
      throw error;
    }

    // -----------------------------------------------------
    // 2. Validar identificación profesional
    // -----------------------------------------------------

    if (!doctorRut || !doctorName) {
      const error = new Error(
        'Para acceder a la ficha debe identificarse con su RUT y Nombre profesional.'
      );

      error.statusCode = 400;
      throw error;
    }

    const cleanToken = token.trim();

    // -----------------------------------------------------
    // 3. Buscar autorización por token
    // -----------------------------------------------------

    const grant =
      await AccessGrantRepository.findByToken(cleanToken);

    if (!grant) {
      const error = new Error(
        'Código QR no encontrado o inválido.'
      );

      error.statusCode = 404;
      throw error;
    }

    // -----------------------------------------------------
    // 4. Debe ser QR_TEMPORAL
    // -----------------------------------------------------

    if (grant.grant_type !== 'QR_TEMPORAL') {
      const error = new Error(
        'El código proporcionado no corresponde a un acceso QR.'
      );

      error.statusCode = 400;
      throw error;
    }

    // -----------------------------------------------------
    // 5. Comprobar revocación
    // -----------------------------------------------------

    if (grant.is_revoked) {
      const error = new Error(
        'Este acceso ha sido revocado directamente por el paciente.'
      );

      error.statusCode = 403;
      throw error;
    }

    // -----------------------------------------------------
    // 6. Comprobar expiración
    // -----------------------------------------------------

    const now = new Date();
    const expiry = new Date(grant.expires_at);

    if (now >= expiry) {
      const error = new Error(
        `El tiempo de validez de este Código QR expiró el ${expiry.toLocaleString(
          'es-CL'
        )}.`
      );

      error.statusCode = 410;
      throw error;
    }

    // -----------------------------------------------------
    // 7. Registrar profesional que consultó
    // -----------------------------------------------------

    await AccessGrantRepository.recordDoctorAccess({
      token: grant.token,
      doctorRut: doctorRut.trim(),
      doctorName: doctorName.trim(),
      doctorInstitution: (
        doctorInstitution || 'No especificada'
      ).trim(),
    });

    // -----------------------------------------------------
    // 8. Auditoría
    // -----------------------------------------------------

    await db.query(
      `INSERT INTO audit_logs (
        patient_id,
        action,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, 'CONSULTA_MEDICA_QR', $2, $3, $4);`,
      [
        grant.patient_id,

        JSON.stringify({
          token: grant.token,
          doctor_rut: doctorRut.trim(),
          doctor_name: doctorName.trim(),
          doctor_institution:
            doctorInstitution ||
            'Centro de Salud / Consulta Médica',
          expires_at: grant.expires_at,
        }),

        ipAddress || '127.0.0.1',
        userAgent || 'Visor Medico QR Web',
      ]
    );

    // -----------------------------------------------------
    // 9. Obtener ficha clínica
    // -----------------------------------------------------

    const clinicalData =
      await AccessGrantRepository.getPatientClinicalData(
        grant.patient_id
      );

    if (!clinicalData) {
      const error = new Error(
        'No se encontró la ficha clínica del paciente.'
      );

      error.statusCode = 404;
      throw error;
    }

    // -----------------------------------------------------
    // 10. Tiempo restante
    // -----------------------------------------------------

    const minutesRemaining = Math.max(
      0,
      Math.round((expiry - now) / (1000 * 60))
    );

    return {
      grant: {
        id: grant.id,
        token: grant.token,
        grantType: grant.grant_type,
        expiresAt: grant.expires_at,
        minutesRemaining,
        doctorRut: doctorRut.trim(),
        doctorName: doctorName.trim(),
        doctorInstitution:
          doctorInstitution || 'No especificada',
      },

      clinicalData,
    };
  }

  /**
   * =====================================================
   * REVOCAR ACCESO
   * =====================================================
   *
   * Funciona para:
   * - QR_TEMPORAL
   * - DIRECTO
   */
  static async revokeGrant({
    grantId,
    patientId,
  }) {
    const revoked =
      await AccessGrantRepository.revokeGrant(
        grantId,
        patientId
      );

    if (!revoked) {
      const error = new Error(
        'No se encontró el acceso para revocar o no le pertenece.'
      );

      error.statusCode = 404;
      throw error;
    }

    const action =
      revoked.grant_type === 'DIRECTO'
        ? 'REVOKE_DIRECT_ACCESS'
        : 'REVOKE_QR_ACCESS';

    await db.query(
      `INSERT INTO audit_logs (
        user_id,
        patient_id,
        action,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        patientId,
        patientId,
        action,

        JSON.stringify({
          grantId,
          grantType: revoked.grant_type,
          doctorId: revoked.doctor_id || null,
          token: revoked.token,
        }),

        '127.0.0.1',
        'MyMedRecord Portal Paciente',
      ]
    );

    return revoked;
  }

  /**
   * =====================================================
   * OBTENER QR ACTIVO DEL PACIENTE
   * =====================================================
   */
  static async getActiveGrant(patientId) {
    const grant =
      await AccessGrantRepository.getActiveByPatient(
        patientId
      );

    if (!grant) {
      return null;
    }

    const now = new Date();
    const expiry = new Date(grant.expires_at);

    const minutesRemaining = Math.max(
      0,
      Math.round((expiry - now) / (1000 * 60))
    );

    return {
      id: grant.id,
      token: grant.token,
      grantType: grant.grant_type,
      expiresAt: grant.expires_at,
      minutesRemaining,
      doctorRut: grant.doctor_rut,
      doctorName: grant.doctor_name,
      doctorInstitution:
        grant.doctor_institution,
      accessCount: grant.access_count,
      createdAt: grant.created_at,
    };
  }

  /**
   * =====================================================
   * OBTENER TODOS LOS ACCESOS DEL PACIENTE
   * =====================================================
   */
  static async getMyGrants(patientId) {
    const grants =
      await AccessGrantRepository.getAllByPatient(
        patientId
      );

    return grants.map((grant) => {
      const now = new Date();
      const expiry = new Date(grant.expires_at);

      const minutesRemaining = Math.max(
        0,
        Math.round((expiry - now) / (1000 * 60))
      );

      let status = 'ACTIVO';

      if (grant.is_revoked) {
        status = 'REVOCADO';
      } else if (expiry <= now) {
        status = 'EXPIRADO';
      }

      return {
        id: grant.id,
        token: grant.token,
        grantType: grant.grant_type,

        doctorId: grant.doctor_id,
        doctorRut: grant.doctor_rut,
        doctorName: grant.doctor_name,
        doctorInstitution:
          grant.doctor_institution,

        startsAt:
          grant.starts_at || grant.created_at,

        expiresAt: grant.expires_at,
        minutesRemaining,

        isRevoked: grant.is_revoked,
        accessCount: grant.access_count,

        status,

        createdAt: grant.created_at,
      };
    });
  }

  /**
   * =====================================================
   * FICHAS COMPARTIDAS CON EL MÉDICO
   * =====================================================
   *
   * Devuelve los accesos DIRECTO que los pacientes
   * entregaron al médico autenticado.
   */
  static async getSharedWithDoctor(doctorId) {
    if (!doctorId) {
      const error = new Error(
        'No se pudo identificar al médico autenticado.'
      );

      error.statusCode = 401;
      throw error;
    }

    const grants =
      await AccessGrantRepository.getSharedWithDoctor(
        doctorId
      );

    const now = new Date();

    return grants.map((grant) => {
      const expiry = new Date(grant.expires_at);

      const minutesRemaining = Math.max(
        0,
        Math.round((expiry - now) / (1000 * 60))
      );

      let status = 'ACTIVO';

      if (grant.is_revoked) {
        status = 'REVOCADO';
      } else if (expiry <= now) {
        status = 'EXPIRADO';
      }

      return {
        id: grant.id,

        // MUY IMPORTANTE:
        // Para abrir un acceso DIRECTO el frontend
        // debe enviar este TOKEN al backend.
        //
        // NO se debe usar patientId como token.
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

        startsAt:
          grant.starts_at || grant.created_at,

        expiresAt: grant.expires_at,
        minutesRemaining,

        isRevoked: grant.is_revoked,
        accessCount: grant.access_count,

        status,

        createdAt: grant.created_at,
      };
    });
  }

  /**
   * =====================================================
   * ABRIR FICHA MEDIANTE ACCESO DIRECTO
   * =====================================================
   *
   * Este método NO usa patientId para buscar la ficha.
   *
   * Recibe el token interno:
   *
   * MMR-DIRECT-XXXXXXXX...
   *
   * y verifica que ese token realmente pertenezca
   * al médico autenticado.
   */
  static async accessDirectGrant({
    token,
    doctorId,
    ipAddress,
    userAgent,
  }) {
    // -----------------------------------------------------
    // 1. Validar médico autenticado
    // -----------------------------------------------------

    if (!doctorId) {
      const error = new Error(
        'No se pudo identificar al médico autenticado.'
      );

      error.statusCode = 401;
      throw error;
    }

    // -----------------------------------------------------
    // 2. Validar token
    // -----------------------------------------------------

    if (!token || !String(token).trim()) {
      const error = new Error(
        'Se requiere un token de acceso válido.'
      );

      error.statusCode = 400;
      throw error;
    }

    const cleanToken = String(token).trim();

    // -----------------------------------------------------
    // 3. Buscar permiso por TOKEN
    // -----------------------------------------------------
    //
    // Esto evita el error:
    //
    // invalid input syntax for type uuid:
    // "MMR-DIRECT-..."
    //
    // El token se compara contra access_grants.token,
    // que es texto, NO contra una columna UUID.
    // -----------------------------------------------------

    const grant =
      await AccessGrantRepository.findByToken(cleanToken);

    if (!grant) {
      const error = new Error(
        'El acceso compartido no existe.'
      );

      error.statusCode = 404;
      throw error;
    }

    // -----------------------------------------------------
    // 4. Verificar tipo DIRECTO
    // -----------------------------------------------------

    if (grant.grant_type !== 'DIRECTO') {
      const error = new Error(
        'Este token no corresponde a un acceso directo.'
      );

      error.statusCode = 400;
      throw error;
    }

    // -----------------------------------------------------
    // 5. Verificar que pertenece al médico autenticado
    // -----------------------------------------------------

    if (String(grant.doctor_id) !== String(doctorId)) {
      const error = new Error(
        'No tiene autorización para consultar esta ficha.'
      );

      error.statusCode = 403;
      throw error;
    }

    // -----------------------------------------------------
    // 6. Verificar revocación
    // -----------------------------------------------------

    if (grant.is_revoked) {
      const error = new Error(
        'El paciente revocó este acceso.'
      );

      error.statusCode = 403;
      throw error;
    }

    // -----------------------------------------------------
    // 7. Verificar expiración
    // -----------------------------------------------------

    const now = new Date();
    const expiry = new Date(grant.expires_at);

    if (now >= expiry) {
      const error = new Error(
        'Este acceso compartido ha expirado.'
      );

      error.statusCode = 410;
      throw error;
    }

    // -----------------------------------------------------
    // 8. Obtener ficha clínica del paciente
    // -----------------------------------------------------

    const clinicalData =
      await AccessGrantRepository.getPatientClinicalData(
        grant.patient_id
      );

    if (!clinicalData) {
      const error = new Error(
        'No se encontró la ficha clínica del paciente.'
      );

      error.statusCode = 404;
      throw error;
    }

    // -----------------------------------------------------
    // 9. Registrar auditoría
    // -----------------------------------------------------

    await db.query(
      `INSERT INTO audit_logs (
        user_id,
        patient_id,
        action,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, 'CONSULTA_MEDICA_DIRECTA', $3, $4, $5);`,
      [
        doctorId,
        grant.patient_id,

        JSON.stringify({
          grantId: grant.id,
          token: grant.token,
          grantType: grant.grant_type,
          doctorId,
          patientId: grant.patient_id,
          expiresAt: grant.expires_at,
        }),

        ipAddress || '127.0.0.1',
        userAgent || 'MyMedRecord Portal Médico',
      ]
    );

    // -----------------------------------------------------
    // 10. Incrementar contador de accesos
    // -----------------------------------------------------

    await db.query(
      `UPDATE access_grants
       SET access_count = COALESCE(access_count, 0) + 1
       WHERE id = $1;`,
      [grant.id]
    );

    // -----------------------------------------------------
    // 11. Calcular minutos restantes
    // -----------------------------------------------------

    const minutesRemaining = Math.max(
      0,
      Math.round((expiry - now) / (1000 * 60))
    );

    // -----------------------------------------------------
    // 12. Respuesta final
    // -----------------------------------------------------

    return {
      grant: {
        id: grant.id,
        token: grant.token,
        grantType: grant.grant_type,

        patientId: grant.patient_id,
        doctorId: grant.doctor_id,

        startsAt:
          grant.starts_at || grant.created_at,

        expiresAt: grant.expires_at,
        minutesRemaining,

        accessCount:
          Number(grant.access_count || 0) + 1,
      },

      clinicalData,
    };
  }
}

module.exports = AccessGrantService;