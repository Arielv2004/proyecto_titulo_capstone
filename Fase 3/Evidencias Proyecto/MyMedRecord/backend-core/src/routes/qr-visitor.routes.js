const express = require('express');
const { createHash, randomBytes } = require('node:crypto');
const db = require('../config/db');
const grants = require('../repositories/access-grant.repository');
const documents = require('../repositories/document.repository');
const DocumentService = require('../services/document.service');
const AccessGrantService = require('../services/access-grant.service');
const auth = require('../middlewares/auth.middleware');
const patientOnly = require('../middlewares/rbac.middleware')('PACIENTE');
const { isValidRut } = require('../utils/rut.util');

const router = express.Router();
const cookie = 'mmr_qr_visitor';
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const handle = fn => (req, res, next) => { fn(req, res).catch(next); };
const cookieOptions = id => ({
  path: '/api/v1/access-grants/qr/visitor/' + id,
  httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
});

async function transaction(work) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

function audit(req, grant, action, client = db, documentId = null) {
  return AccessGrantService.writeAudit({
    userId: req.user?.id || null, patientId: grant.patient_id, action,
    details: { grantId: grant.id, identityType: req.user ? 'AUTHENTICATED' : 'DECLARED', documentId },
    ipAddress: req.ip, userAgent: req.get('user-agent'),
  }, client);
}

router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

function visitorIdentity(body) {
  const { name, rut, institution } = body || {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 150 ||
      typeof rut !== 'string' || !/^[0-9.kK-]{8,12}$/.test(rut.trim()) || !isValidRut(rut)) {
    throw fail('Ingresa tu nombre y un RUT válido.', 400);
  }
  if (typeof institution !== 'string' || !institution.trim() || institution.trim().length > 200) {
    throw fail('Ingresa el nombre de tu centro de salud (máximo 200 caracteres).', 400);
  }
  return { name: name.trim(), rut: rut.trim().toUpperCase(), institution: institution.trim() };
}

router.post('/', handle(async (req, res) => {
  const { token } = req.body || {};
  if (typeof token !== 'string' || !token.trim() || token.length > 100) {
    throw fail('Ingresa un pase QR válido.', 400);
  }
  const { name, rut, institution } = visitorIdentity(req.body);
  const credential = randomBytes(32).toString('hex');
  const grant = await transaction(async client => {
    const claimed = await grants.claimQr(client, {
      token: token.trim(), doctorId: null, doctorRut: rut,
      doctorName: name, doctorInstitution: institution,
    });
    if (!claimed) throw fail('El pase ya se utilizó o no está disponible. Pide otro al paciente.', 410);
    await client.query(`INSERT INTO qr_visitor_requests (grant_id, credential_hash, request_expires_at)
      VALUES ($1, $2, LEAST(NOW() + INTERVAL '5 minutes', $3::timestamptz))`,
      [claimed.id, hash(credential), claimed.expires_at]);
    await audit(req, claimed, 'QR_VISITOR_REDEEM', client);
    await audit(req, claimed, 'QR_VISITOR_REQUEST', client);
    return claimed;
  });
  res.cookie(cookie, credential, { ...cookieOptions(grant.id), expires: new Date(grant.expires_at) });
  res.status(202).json({ data: { id: grant.id, status: 'PENDING' } });
}));

const liveGrant = `g.grant_type = 'QR_TEMPORAL' AND g.doctor_id IS NULL AND g.access_count = 1
  AND NOT g.is_revoked AND g.starts_at <= NOW() AND g.expires_at > NOW()
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = g.patient_id AND u.is_active)`;

router.get('/requests', auth, patientOnly, handle(async (req, res) => {
  const result = await db.query(`SELECT g.id, g.doctor_name AS name, g.doctor_rut AS rut, g.doctor_institution AS institution
    FROM qr_visitor_requests v JOIN access_grants g ON g.id=v.grant_id
    WHERE g.patient_id=$1 AND ${liveGrant} AND v.status='PENDING'
    AND g.doctor_name IS NOT NULL AND v.request_expires_at > NOW() ORDER BY v.request_expires_at`, [req.user.id]);
  res.json({ data: result.rows });
}));

router.post('/:id/decision', auth, patientOnly, handle(async (req, res) => {
  const { decision } = req.body || {};
  if (!uuid.test(req.params.id) || !['APPROVED', 'REJECTED'].includes(decision)) throw fail('Decisión inválida.', 400);
  await transaction(async client => {
    const result = await client.query(`UPDATE qr_visitor_requests v SET status=$3
      FROM access_grants g WHERE g.id=v.grant_id AND g.id=$1 AND g.patient_id=$2
      AND ${liveGrant} AND g.doctor_name IS NOT NULL AND v.status='PENDING' AND v.request_expires_at > NOW()
      RETURNING g.id, g.patient_id`, [req.params.id, req.user.id, decision]);
    if (!result.rowCount) throw fail('Esta solicitud ya no está pendiente.', 409);
    await audit(req, result.rows[0], 'QR_VISITOR_' + decision, client);
  });
  res.sendStatus(204);
}));

async function visitorSession(req, approved = true) {
  const credential = req.cookies?.[cookie];
  if (!uuid.test(req.params.id) || typeof credential !== 'string' || !/^[a-f0-9]{64}$/.test(credential)) {
    throw fail('Esta consulta pertenece al navegador que canjeó el pase.', 403);
  }
  const { rows } = await db.query(`SELECT g.id, g.patient_id, g.expires_at,
    CASE WHEN v.status='PENDING' AND g.doctor_name IS NULL THEN 'IDENTIFYING' ELSE v.status END AS status
    FROM qr_visitor_requests v JOIN access_grants g ON g.id=v.grant_id
    WHERE v.grant_id=$1 AND v.credential_hash=$2 AND ${liveGrant}
    AND (v.status <> 'PENDING' OR v.request_expires_at > NOW())`, [req.params.id, hash(credential)]);
  if (!rows.length || rows[0].status === 'ENDED') throw fail('La consulta caducó, se cerró o el permiso fue revocado.', 410);
  if (approved && rows[0].status !== 'APPROVED') throw fail('Esta consulta requiere la aprobación del paciente.', 403);
  return rows[0];
}

router.post('/:id/identify', handle(async (req, res) => {
  const { name, rut, institution } = visitorIdentity(req.body);
  const session = await visitorSession(req, false);
  await transaction(async client => {
    const result = await client.query(`UPDATE access_grants g SET doctor_name=$2, doctor_rut=$3, doctor_institution=$4
      FROM qr_visitor_requests v WHERE g.id=$1 AND v.grant_id=g.id AND g.doctor_name IS NULL
      AND ${liveGrant} AND v.status='PENDING' AND v.request_expires_at>NOW()
      RETURNING g.id, g.patient_id`, [session.id, name, rut, institution]);
    if (!result.rowCount) throw fail('La solicitud ya fue enviada o expiró.', 409);
    await client.query(`UPDATE qr_visitor_requests SET request_expires_at=LEAST($2::timestamptz, NOW()+INTERVAL '5 minutes')
      WHERE grant_id=$1`, [session.id, session.expires_at]);
    await audit(req, session, 'QR_VISITOR_REQUEST', client);
  });
  res.status(202).json({ data: { status: 'PENDING' } });
}));

router.get('/:id/status', handle(async (req, res) => {
  const session = await visitorSession(req, false);
  res.json({ data: { status: session.status, expiresAt: session.expires_at } });
}));

router.get('/:id/record', handle(async (req, res) => {
  const session = await visitorSession(req);
  const clinicalData = await grants.getPatientClinicalData(session.patient_id);
  if (!clinicalData) throw fail('Ficha no disponible.', 404);
  await visitorSession(req);
  await audit(req, session, 'CONSULTA_VISITANTE_QR');
  res.json({ data: { clinicalData, expiresAt: session.expires_at } });
}));

router.get('/:id/documents/:documentId', handle(async (req, res) => {
  const session = await visitorSession(req);
  const { documentId } = req.params;
  if (!uuid.test(documentId)) throw fail('Documento no válido.', 400);
  const doc = await documents.findById(documentId);
  if (!doc || doc.patient_id !== session.patient_id || !['CONFIRMADO', 'PENDIENTE_REVISION'].includes(doc.status)) {
    throw fail('Documento no disponible.', 404);
  }
  const file = await DocumentService.readStoredFile(doc);
  await visitorSession(req);
  await audit(req, session, 'VIEW_SHARED_DOCUMENT', db, documentId);
  res.set('X-Content-Type-Options', 'nosniff').set('Content-Disposition', 'inline; filename="documento"').type(file.mimeType).send(file.buffer);
}));

router.post('/:id/end', handle(async (req, res) => {
  const credential = req.cookies?.[cookie];
  if (uuid.test(req.params.id) && typeof credential === 'string') {
    await db.query("UPDATE qr_visitor_requests SET status='ENDED' WHERE grant_id=$1 AND credential_hash=$2", [req.params.id, hash(credential)]);
  }
  res.clearCookie(cookie, cookieOptions(req.params.id)).sendStatus(204);
}));

module.exports = router;
