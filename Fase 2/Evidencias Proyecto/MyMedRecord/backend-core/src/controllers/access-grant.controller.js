const AccessGrantService = require('../services/access-grant.service');
const AccessGrantRepository = require('../repositories/access-grant.repository');
const DocumentRepository = require('../repositories/document.repository');
const DocumentService = require('../services/document.service');
const db = require('../config/db');
const os = require('os');

function controllerError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function authenticatedUserId(req, expectedRole) {
  if (!req.user?.id) {
    throw controllerError('Debes iniciar sesión para continuar.', 401);
  }

  if (req.user.role !== expectedRole) {
    throw controllerError(
      'Tu cuenta no tiene permiso para realizar esta operación.',
      403
    );
  }

  return req.user.id;
}

function requestContext(req) {
  return {
    ipAddress:
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1',
    userAgent:
      req.get('user-agent') ||
      'MyMedRecord',
  };
}

function localAppAddress() {
  const addresses = Object.entries(os.networkInterfaces()).flatMap(
    ([name, entries]) =>
      (entries || [])
        .filter((entry) => {
          if (
            entry.internal ||
            !['IPv4', 4].includes(entry.family)
          ) {
            return false;
          }

          if (
            /vpn|virtual|vEthernet|docker|wsl|tailscale|zerotier|loopback/i.test(
              name
            )
          ) {
            return false;
          }

          const address = entry.address;

          return (
            /^10\./.test(address) ||
            /^192\.168\./.test(address) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(address)
          );
        })
        .map((entry) => ({
          name,
          address: entry.address,
        }))
  );

  addresses.sort((a, b) => {
    const score = (item) =>
      (/wi-?fi|wireless|ethernet|wlan/i.test(item.name) ? 10 : 0) +
      (item.address.startsWith('192.168.') ? 2 : 0);

    return score(b) - score(a);
  });

  return addresses[0]?.address || null;
}

function cleanToken(value) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > 100
  ) {
    throw controllerError('El token de acceso no es válido.');
  }

  return value.trim();
}

function assertCurrentGrant(grant) {
  if (!grant) {
    throw controllerError('El permiso no existe o no está disponible.', 403);
  }

  const now = Date.now();
  const expiresAt = new Date(grant.expires_at).getTime();
  const startsAt = new Date(
    grant.starts_at || grant.created_at
  ).getTime();

  if (
    grant.is_revoked ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(startsAt) ||
    startsAt > now ||
    expiresAt <= now
  ) {
    throw controllerError('El permiso no está vigente.', 403);
  }
}

function remainingMinutes(grant) {
  return Math.max(
    0,
    Math.floor(
      (new Date(grant.expires_at).getTime() - Date.now()) / 60000
    )
  );
}

// Comprueba la sesión, el estado profesional y la titularidad
// antes de consultar vigencia o entregar un archivo.
async function authorizedDoctorGrant(req, token, grantType) {
  const doctorId = authenticatedUserId(req, 'MEDICO');

  const doctor =
    await AccessGrantService.requireEligibleDoctor(doctorId);

  const grant =
    await AccessGrantRepository.findByToken(cleanToken(token));

  if (!grant || grant.grant_type !== grantType) {
    throw controllerError(
      'El permiso no corresponde al tipo de acceso solicitado.',
      403
    );
  }

  assertCurrentGrant(grant);

  const sameDoctor =
    String(grant.doctor_id || '').toLowerCase() ===
    String(doctor.id).toLowerCase();

  if (grantType === 'DIRECTO' && !sameDoctor) {
    throw controllerError(
      'No tienes autorización para consultar esta ficha.',
      403
    );
  }

  if (
    grantType === 'QR_TEMPORAL' &&
    grant.doctor_id &&
    !sameDoctor
  ) {
    throw controllerError(
      'Este permiso QR pertenece a otro médico.',
      403
    );
  }

  if (
    String(grant.patient_id).toLowerCase() ===
    String(doctor.id).toLowerCase()
  ) {
    throw controllerError(
      'Este permiso no corresponde a la ficha de otro paciente.',
      403
    );
  }

  return { grant, doctor };
}

async function sendAuthorizedFile(
  req,
  res,
  grant,
  documentId,
  doctor
) {
  assertCurrentGrant(grant);

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    typeof documentId !== 'string' ||
    !uuidPattern.test(documentId)
  ) {
    throw controllerError('Documento no válido.');
  }

  const document = await DocumentRepository.findById(documentId);

  if (
    !document ||
    String(document.patient_id).toLowerCase() !==
      String(grant.patient_id).toLowerCase() ||
    !['CONFIRMADO', 'PENDIENTE_REVISION'].includes(document.status)
  ) {
    throw controllerError(
      'Documento no disponible en esta ficha.',
      404
    );
  }

  const file = await DocumentService.readStoredFile(document);

  // Revalidar después de leer el archivo y antes de enviarlo.
  await AccessGrantService.requireEligibleDoctor(doctor.id);

  const currentGrant =
    await AccessGrantRepository.findByToken(grant.token);

  assertCurrentGrant(currentGrant);

  if (
    currentGrant.grant_type !== grant.grant_type ||
    String(currentGrant.patient_id).toLowerCase() !==
      String(grant.patient_id).toLowerCase() ||
    (
      currentGrant.grant_type === 'DIRECTO' &&
      String(currentGrant.doctor_id).toLowerCase() !==
        String(doctor.id).toLowerCase()
    ) ||
    (
      currentGrant.grant_type === 'QR_TEMPORAL' &&
      currentGrant.doctor_id &&
      String(currentGrant.doctor_id).toLowerCase() !==
        String(doctor.id).toLowerCase()
    )
  ) {
    throw controllerError(
      'El permiso cambió y ya no autoriza esta consulta.',
      403
    );
  }

  const context = requestContext(req);

  await db.query(
    `INSERT INTO audit_logs (
       user_id,
       patient_id,
       action,
       details,
       ip_address,
       user_agent
     )
     VALUES ($1, $2, 'VIEW_SHARED_DOCUMENT', $3, $4, $5)`,
    [
      doctor.id,
      currentGrant.patient_id,
      JSON.stringify({
        grantId: currentGrant.id,
        documentId,
        accessType: currentGrant.grant_type,
        doctorId: doctor.id,
        doctorRut: doctor.rut,
      }),
      String(context.ipAddress).slice(0, 45),
      context.userAgent,
    ]
  );

  const fileName = String(file.fileName || 'documento')
    .replace(/[^\x20-\x7E]|["\\/]/g, '_');

  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.type(file.mimeType);
  res.set(
    'Content-Disposition',
    `inline; filename="${fileName}"`
  );

  return res.send(file.buffer);
}

class AccessGrantController {
  static async shareUrl(req, res, next) {
    try {
      const patientId = authenticatedUserId(req, 'PACIENTE');
      await AccessGrantService.requirePatient(patientId);

      const port = Number(req.query.port);
      const frontendPort =
        Number.isInteger(port) && port > 0 && port <= 65535
          ? port
          : 5173;

      let baseUrl = null;

      if (process.env.PUBLIC_APP_URL) {
        try {
          const configured = new URL(process.env.PUBLIC_APP_URL);

          if (['http:', 'https:'].includes(configured.protocol)) {
            baseUrl = configured.origin;
          }
        } catch {
          // Se intentará obtener una dirección local.
        }
      }

      if (!baseUrl) {
        const address = localAppAddress();

        if (address) {
          baseUrl = `http://${address}:${frontendPort}`;
        }
      }

      res.set('Cache-Control', 'no-store');

      if (!baseUrl) {
        return res.status(503).json({
          success: false,
          message:
            'No se detectó una dirección de acceso para otros dispositivos.',
        });
      }

      return res.json({
        success: true,
        data: { baseUrl },
      });
    } catch (error) {
      next(error);
    }
  }

  static async directCheck(req, res, next) {
    try {
      const { grant } = await authorizedDoctorGrant(
        req,
        req.params.token,
        'DIRECTO'
      );

      res.set('Cache-Control', 'no-store');

      return res.json({
        success: true,
        minutesRemaining: remainingMinutes(grant),
      });
    } catch (error) {
      next(error);
    }
  }

  static async qrCheck(req, res, next) {
    try {
      const { grant } = await authorizedDoctorGrant(
        req,
        req.body?.token,
        'QR_TEMPORAL'
      );

      res.set('Cache-Control', 'no-store');

      return res.json({
        success: true,
        minutesRemaining: remainingMinutes(grant),
      });
    } catch (error) {
      next(error);
    }
  }

  static async directFile(req, res, next) {
    try {
      const { grant, doctor } = await authorizedDoctorGrant(
        req,
        req.params.token,
        'DIRECTO'
      );

      return await sendAuthorizedFile(
        req,
        res,
        grant,
        req.params.documentId,
        doctor
      );
    } catch (error) {
      next(error);
    }
  }

  static async qrFile(req, res, next) {
    try {
      const { token, documentId } = req.body || {};

      const { grant, doctor } = await authorizedDoctorGrant(
        req,
        token,
        'QR_TEMPORAL'
      );

      return await sendAuthorizedFile(
        req,
        res,
        grant,
        documentId,
        doctor
      );
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/access-grants/generate
  static async generate(req, res, next) {
    try {
      const patientId = authenticatedUserId(req, 'PACIENTE');
      const { durationHours } = req.body || {};

      const grant = await AccessGrantService.generateGrant({
        patientId,
        durationHours,
        ...requestContext(req),
      });

      res.set('Cache-Control', 'no-store');

      return res.status(201).json({
        success: true,
        message:
          `Código QR generado exitosamente por ${grant.durationHours} horas.`,
        data: grant,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/access-grants/share
  static async shareWithDoctor(req, res, next) {
    try {
      const patientId = authenticatedUserId(req, 'PACIENTE');

      const {
        doctorId,
        durationHours,
        regionCode,
        city,
      } = req.body || {};

      const grant = await AccessGrantService.createDirectGrant({
        patientId,
        doctorId,
        durationHours,
        regionCode,
        city,
        ...requestContext(req),
      });

      res.set('Cache-Control', 'no-store');

      return res.status(201).json({
        success: true,
        message:
          'Ficha clínica compartida exitosamente con el médico.',
        data: grant,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/access-grants/shared-with-me
  static async getSharedWithMe(req, res, next) {
    try {
      const doctorId = authenticatedUserId(req, 'MEDICO');

      const grants =
        await AccessGrantService.getSharedWithDoctor(doctorId);

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data: grants,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/access-grants/direct/:token
  static async accessDirect(req, res, next) {
    try {
      const doctorId = authenticatedUserId(req, 'MEDICO');

      const result = await AccessGrantService.accessDirectGrant({
        token: req.params.token,
        doctorId,
        ...requestContext(req),
      });

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        message:
          'Acceso autorizado. Ficha clínica recuperada exitosamente.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/access-grants/validate
  static async validate(req, res, next) {
    try {
      const doctorId = authenticatedUserId(req, 'MEDICO');

      const result = await AccessGrantService.validateAndAccess({
        token: req.body?.token,
        doctorId,
        ...requestContext(req),
      });

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        message:
          'Acceso autorizado. Ficha clínica recuperada exitosamente.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/access-grants/:id/revoke
  static async revoke(req, res, next) {
    try {
      const patientId = authenticatedUserId(req, 'PACIENTE');

      const revoked = await AccessGrantService.revokeGrant({
        grantId: req.params.id,
        patientId,
        ...requestContext(req),
      });

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        message: 'Acceso revocado exitosamente.',
        data: {
          id: revoked.id,
          grantType: revoked.grant_type,
          doctorId: revoked.doctor_id || null,
          isRevoked: revoked.is_revoked,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/access-grants/active
  static async getActive(req, res, next) {
    try {
      const patientId = authenticatedUserId(req, 'PACIENTE');

      const grant =
        await AccessGrantService.getActiveGrant(patientId);

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data: grant,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/access-grants/my-grants
  static async getMyGrants(req, res, next) {
    try {
      const patientId = authenticatedUserId(req, 'PACIENTE');

      const grants =
        await AccessGrantService.getMyGrants(patientId);

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data: grants,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AccessGrantController;