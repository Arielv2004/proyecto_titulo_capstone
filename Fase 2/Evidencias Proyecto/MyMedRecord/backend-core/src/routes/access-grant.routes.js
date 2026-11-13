const express = require('express');
const router = express.Router();

const AccessGrantController = require(
  '../controllers/access-grant.controller'
);

const authMiddleware = require(
  '../middlewares/auth.middleware'
);

const rbacMiddleware = require(
  '../middlewares/rbac.middleware'
);

const patientOnly = rbacMiddleware('PACIENTE');
const doctorOnly = rbacMiddleware('MEDICO');

router.use('/qr/visitor', require('./qr-visitor.routes'));

// =====================================================
// GESTIÓN DE ACCESOS DEL PACIENTE
// =====================================================

// Generar un QR temporal.
router.post(
  '/generate',
  authMiddleware,
  patientOnly,
  AccessGrantController.generate
);

// Obtener el QR activo.
router.get(
  '/active',
  authMiddleware,
  patientOnly,
  AccessGrantController.getActive
);

// Obtener la dirección de la aplicación para compartir.
router.get(
  '/share-url',
  authMiddleware,
  patientOnly,
  AccessGrantController.shareUrl
);

// Compartir directamente con un médico.
// El servicio valida verificación, disponibilidad y ubicación.
router.post(
  '/share',
  authMiddleware,
  patientOnly,
  AccessGrantController.shareWithDoctor
);

// Consultar los permisos generados por el paciente.
router.get(
  '/my-grants',
  authMiddleware,
  patientOnly,
  AccessGrantController.getMyGrants
);

// Revocar un permiso del paciente autenticado.
router.patch(
  '/:id/revoke',
  authMiddleware,
  patientOnly,
  AccessGrantController.revoke
);

// =====================================================
// ACCESOS DIRECTOS DEL MÉDICO
// =====================================================

// Consultar las fichas compartidas con el médico autenticado.
router.get(
  '/shared-with-me',
  authMiddleware,
  doctorOnly,
  AccessGrantController.getSharedWithMe
);

// Consultar la vigencia de un permiso directo.
router.get(
  '/direct/:token/check',
  authMiddleware,
  doctorOnly,
  AccessGrantController.directCheck
);

// Consultar un documento mediante un permiso directo.
router.get(
  '/direct/:token/documents/:documentId/file',
  authMiddleware,
  doctorOnly,
  AccessGrantController.directFile
);

// Abrir una ficha mediante un permiso directo.
// :token es texto, no un UUID.
router.get(
  '/direct/:token',
  authMiddleware,
  doctorOnly,
  AccessGrantController.accessDirect
);

// =====================================================
// ACCESOS QR DEL MÉDICO
// =====================================================

// Consultar un QR con una cuenta médica autenticada.
// La identidad se obtiene de la sesión, no del formulario.
router.post(
  '/validate',
  authMiddleware,
  doctorOnly,
  AccessGrantController.validate
);

// Consultar un documento mediante un permiso QR.
router.post(
  '/qr/document-file',
  authMiddleware,
  doctorOnly,
  AccessGrantController.qrFile
);

// Consultar la vigencia de un permiso QR.
router.post(
  '/qr/check',
  authMiddleware,
  doctorOnly,
  AccessGrantController.qrCheck
);

module.exports = router;
