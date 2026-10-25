const AccessGrantService = require('../services/access-grant.service');
const AccessGrantRepository = require('../repositories/access-grant.repository');
const DocumentRepository = require('../repositories/document.repository');
const DocumentService = require('../services/document.service');
const db = require('../config/db');
const { isValidRut } = require('../utils/rut.util');
const os = require('os');

function localAppAddress() {
  const addresses = Object.entries(os.networkInterfaces()).flatMap(([name, entries]) =>
    (entries || []).filter((entry) => {
      if (entry.internal || !['IPv4', 4].includes(entry.family)) return false;
      if (/vpn|virtual|vEthernet|docker|wsl|tailscale|zerotier|loopback/i.test(name)) return false;
      const address = entry.address;
      return /^10\./.test(address) || /^192\.168\./.test(address) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(address);
    }).map((entry) => ({ name, address: entry.address })),
  );
  addresses.sort((a, b) => {
    const score = (item) => (/wi-?fi|wireless|ethernet|wlan/i.test(item.name) ? 10 : 0) +
      (item.address.startsWith('192.168.') ? 2 : 0);
    return score(b) - score(a);
  });
  return addresses[0]?.address || null;
}

async function sendAuthorizedFile(req, res, grant, documentId, actor) {
  if (!grant || grant.is_revoked || new Date(grant.expires_at) <= new Date()) {
    return res.status(403).json({ success: false, message: 'El permiso no está vigente.' });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId || '')) {
    return res.status(400).json({ success: false, message: 'Documento no válido.' });
  }
  const document = await DocumentRepository.findById(documentId);
  if (!document || document.patient_id !== grant.patient_id || !['CONFIRMADO', 'PENDIENTE_REVISION'].includes(document.status)) {
    return res.status(404).json({ success: false, message: 'Documento no disponible en esta ficha.' });
  }
  const file = await DocumentService.readStoredFile(document);
  await db.query(
    `INSERT INTO audit_logs (user_id, patient_id, action, details, ip_address, user_agent)
     VALUES ($1,$2,'VIEW_SHARED_DOCUMENT',$3,$4,$5)`,
    [actor.userId || null, grant.patient_id,
      JSON.stringify({ grantId: grant.id, documentId, accessType: grant.grant_type, declaredDoctorRut: actor.rut || null }),
      req.ip || '0.0.0.0', req.get('user-agent') || null],
  );
  res.set('Cache-Control', 'no-store');
  res.type(file.mimeType);
  res.set('Content-Disposition', `inline; filename="${file.fileName.replace(/["\\\r\n]/g, '_')}"`);
  return res.send(file.buffer);
}

class AccessGrantController {
  static async shareUrl(req, res) {
    const port = Number(req.query.port);
    const frontendPort = Number.isInteger(port) && port > 0 && port <= 65535 ? port : 5173;
    let baseUrl = null;
    if (process.env.PUBLIC_APP_URL) {
      try {
        const configured = new URL(process.env.PUBLIC_APP_URL);
        if (['http:', 'https:'].includes(configured.protocol)) baseUrl = configured.origin;
      } catch { /* Se usará la dirección local disponible. */ }
    }
    if (!baseUrl) {
      const address = localAppAddress();
      if (address) baseUrl = `http://${address}:${frontendPort}`;
    }
    res.set('Cache-Control', 'no-store');
    if (!baseUrl) return res.status(503).json({ success: false, message: 'No se detectó una dirección de acceso para otros dispositivos.' });
    return res.json({ success: true, data: { baseUrl } });
  }

  static async directCheck(req, res, next) {
    try {
      const grant = await AccessGrantRepository.findByToken(req.params.token);
      const valid = grant && grant.grant_type === 'DIRECTO' && String(grant.doctor_id) === String(req.user.id)
        && !grant.is_revoked && new Date(grant.expires_at) > new Date();
      if (!valid) return res.status(403).json({ success: false, message: 'El permiso ya no está vigente.' });
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, minutesRemaining: Math.max(0, Math.ceil((new Date(grant.expires_at) - new Date()) / 60000)) });
    } catch (error) { next(error); }
  }

  static async qrCheck(req, res, next) {
    try {
      const grant = await AccessGrantRepository.findByToken(String(req.body?.token || '').trim());
      const valid = grant && grant.grant_type === 'QR_TEMPORAL' && !grant.is_revoked && new Date(grant.expires_at) > new Date();
      if (!valid) return res.status(403).json({ success: false, message: 'El código QR ya no está vigente.' });
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, minutesRemaining: Math.max(0, Math.ceil((new Date(grant.expires_at) - new Date()) / 60000)) });
    } catch (error) { next(error); }
  }

  static async directFile(req, res, next) {
    try {
      const grant = await AccessGrantRepository.findByToken(req.params.token);
      if (!grant || grant.grant_type !== 'DIRECTO' || String(grant.doctor_id) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'No tienes autorización para este documento.' });
      }
      return await sendAuthorizedFile(req, res, grant, req.params.documentId, { userId: req.user.id });
    } catch (error) { next(error); }
  }

  static async qrFile(req, res, next) {
    try {
      const { token, documentId, doctorRut, doctorName } = req.body || {};
      if (!token || !isValidRut(doctorRut) || !doctorName?.trim()) {
        return res.status(400).json({ success: false, message: 'Código e identificación declarada requeridos.' });
      }
      const grant = await AccessGrantRepository.findByToken(String(token).trim());
      if (!grant || grant.grant_type !== 'QR_TEMPORAL') {
        return res.status(403).json({ success: false, message: 'Código QR no válido.' });
      }
      return await sendAuthorizedFile(req, res, grant, documentId, { rut: doctorRut.trim() });
    } catch (error) { next(error); }
  }
  /**
   * POST /api/v1/access-grants/generate
   * Paciente autenticado genera un QR temporal
   */
  static async generate(req, res, next) {
    try {
      const patientId = req.user.id;
      const { durationHours } = req.body;

      const grant = await AccessGrantService.generateGrant({
        patientId,
        durationHours,
      });

      return res.status(201).json({
        success: true,
        message: `Código QR generado exitosamente por ${grant.durationHours} horas.`,
        data: grant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/access-grants/share
   * Paciente comparte directamente su ficha con
   * un médico registrado en MyMedRecord
   */
  static async shareWithDoctor(req, res, next) {
    try {
      const patientId = req.user.id;
      const { doctorId, durationHours } = req.body;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Debe seleccionar un médico.',
        });
      }

      const grant = await AccessGrantService.createDirectGrant({
        patientId,
        doctorId,
        durationHours,
      });

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

  /**
   * GET /api/v1/access-grants/shared-with-me
   *
   * Médico autenticado consulta las fichas que
   * los pacientes han compartido directamente con él.
   */
  static async getSharedWithMe(req, res, next) {
    try {
      const doctorId = req.user.id;

      const grants =
        await AccessGrantService.getSharedWithDoctor(
          doctorId
        );

      return res.status(200).json({
        success: true,
        data: grants,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/access-grants/direct/:token
   *
   * Médico autenticado abre una ficha que
   * un paciente compartió directamente con él.
   *
   * El parámetro :token tiene formato:
   * MMR-DIRECT-XXXXXXXX...
   *
   * NO es un UUID.
   */
  static async accessDirect(req, res, next) {
    try {
      const doctorId = req.user.id;
      const { token } = req.params;

      const ipAddress =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      const userAgent =
        req.headers['user-agent'] ||
        'MyMedRecord Portal Médico';

      const result =
        await AccessGrantService.accessDirectGrant({
          token,
          doctorId,
          ipAddress,
          userAgent,
        });

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

  /**
   * POST /api/v1/access-grants/validate
   *
   * Médico ingresa token QR y sus datos profesionales
   * para consultar la ficha.
   *
   * Este flujo corresponde al QR temporal.
   */
  static async validate(req, res, next) {
    try {
      const {
        token,
        doctorRut,
        doctorName,
        doctorInstitution,
      } = req.body;

      const ipAddress =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      const userAgent =
        req.headers['user-agent'] ||
        'Visor Medico QR Web';

      const result =
        await AccessGrantService.validateAndAccess({
          token,
          doctorRut,
          doctorName,
          doctorInstitution,
          ipAddress,
          userAgent,
        });

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

  /**
   * PATCH /api/v1/access-grants/:id/revoke
   *
   * Paciente revoca un acceso.
   *
   * Puede ser:
   * - QR_TEMPORAL
   * - DIRECTO
   */
  static async revoke(req, res, next) {
    try {
      const patientId = req.user.id;
      const grantId = req.params.id;

      const revoked =
        await AccessGrantService.revokeGrant({
          grantId,
          patientId,
        });

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

  /**
   * GET /api/v1/access-grants/active
   *
   * Paciente consulta su QR temporal activo.
   */
  static async getActive(req, res, next) {
    try {
      const patientId = req.user.id;

      const grant =
        await AccessGrantService.getActiveGrant(
          patientId
        );

      return res.status(200).json({
        success: true,
        data: grant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/access-grants/my-grants
   *
   * Paciente consulta todos los accesos que ha generado:
   *
   * - QR temporales
   * - Accesos directos a médicos
   */
  static async getMyGrants(req, res, next) {
    try {
      const patientId = req.user.id;

      const grants =
        await AccessGrantService.getMyGrants(
          patientId
        );

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
