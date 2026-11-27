const express = require('express');
const HealthInstitutionController = require(
  '../controllers/health-institution.controller'
);

const router = express.Router();

// Ruta pública para obtener las instituciones de salud
// disponibles durante el registro de médicos.
router.get('/', HealthInstitutionController.list);

module.exports = router;