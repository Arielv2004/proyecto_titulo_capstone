const express = require('express');
const router = express.Router();

const AccessGrantController = require(
  '../controllers/access-grant.controller'
);

const authMiddleware = require(
  '../middlewares/auth.middleware'
);

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
  AccessGrantController.generate
);

// Obtener QR activo y vigente del paciente
router.get(
  '/active',
  authMiddleware,
  AccessGrantController.getActive
);

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
  AccessGrantController.shareWithDoctor
);

// Médico autenticado obtiene las fichas que los pacientes
// han compartido directamente con él
router.get(
  '/shared-with-me',
  authMiddleware,
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
  AccessGrantController.accessDirect
);

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
  AccessGrantController.getMyGrants
);

// Revocar un acceso específico:
// QR_TEMPORAL o DIRECTO
router.patch(
  '/:id/revoke',
  authMiddleware,
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
  AccessGrantController.validate
);

module.exports = router;