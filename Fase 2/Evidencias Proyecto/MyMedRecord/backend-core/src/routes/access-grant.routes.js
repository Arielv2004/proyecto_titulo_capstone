const express = require('express');
const router = express.Router();

const AccessGrantController = require(
  '../controllers/access-grant.controller'
);

const authMiddleware = require(
  '../middlewares/auth.middleware'
);
const rbacMiddleware = require('../middlewares/rbac.middleware');
const patientOnly = rbacMiddleware('PACIENTE');
const doctorOnly = [rbacMiddleware('MEDICO'), require('../security/access-policy').doctorMiddleware];

/**
 * =====================================================
 * ACCESOS POR QR
 * =====================================================
 */

// Generar nuevo código QR temporal
// Requiere paciente autenticado
router.post(
  '/generate',
  authMiddleware,
  patientOnly,
  AccessGrantController.generate
);

// Obtener QR activo y vigente del paciente
router.get(
  '/active',
  authMiddleware,
  patientOnly,
  AccessGrantController.getActive
);
router.get('/share-url', authMiddleware, patientOnly, AccessGrantController.shareUrl);

/**
 * =====================================================
 * ACCESO DIRECTO A MÉDICO REGISTRADO
 * =====================================================
 */

// Paciente comparte su ficha directamente con un médico
// registrado dentro de MyMedRecord
router.post(
  '/share',
  authMiddleware,
  patientOnly,
  AccessGrantController.shareWithDoctor
);

// Médico autenticado obtiene las fichas que los pacientes
// han compartido directamente con él
router.get(
  '/shared-with-me',
  authMiddleware,
  doctorOnly,
  AccessGrantController.getSharedWithMe
);

// Médico autenticado abre una ficha que un paciente
// compartió directamente con él.
//
// IMPORTANTE:
// :token tiene formato MMR-DIRECT-XXXXXXXX...
// y NO corresponde al UUID de una cita.
router.get(
  '/direct/:token',
  authMiddleware,
  doctorOnly,
  AccessGrantController.accessDirect
);
router.get('/direct/:token/documents/:documentId/file', authMiddleware, doctorOnly, AccessGrantController.directFile);
router.get('/direct/:token/check', authMiddleware, doctorOnly, AccessGrantController.directCheck);

/**
 * =====================================================
 * GESTIÓN DE ACCESOS DEL PACIENTE
 * =====================================================
 */

// Obtener todos los accesos del paciente:
// QR_TEMPORAL y DIRECTO
router.get(
  '/my-grants',
  authMiddleware,
  patientOnly,
  AccessGrantController.getMyGrants
);

// Revocar un acceso específico:
// QR_TEMPORAL o DIRECTO
router.patch(
  '/:id/revoke',
  authMiddleware,
  patientOnly,
  AccessGrantController.revoke
);

/**
 * =====================================================
 * VALIDACIÓN PÚBLICA DEL QR
 * =====================================================
 */

// Médico valida un QR mediante token.
// Esta ruta continúa siendo pública porque también
// permite acceso a profesionales sin cuenta MyMedRecord.
router.post(
  '/validate',
  require('../security/http').rateLimit('qr',10,300),
  require('../security/consultations').request
);
router.post('/qr/document-file', require('../security/consultations').file);
router.post('/qr/check', require('../security/consultations').check);

const consultations=require('../security/consultations');
router.get('/qr/status',consultations.status);
router.get('/qr/record',consultations.record);
router.post('/qr/end',consultations.end);
router.get('/qr/requests',authMiddleware,patientOnly,consultations.pending);
router.post('/qr/requests/:id/decision',authMiddleware,patientOnly,consultations.decide);
module.exports = router;
