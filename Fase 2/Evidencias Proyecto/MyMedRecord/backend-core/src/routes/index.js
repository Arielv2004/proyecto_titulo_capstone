const express = require('express');

const router = express.Router();
const documentRoutes = require('./document.routes');
const authRoutes = require('./auth.routes');
const appointmentRoutes = require('./appointment.routes');
const accessGrantRoutes = require('./access-grant.routes');
const healthInstitutionRoutes = require('./health-institution.routes');
const patientProfileRoutes = require('./patient-profile.routes');
const auditRoutes = require('./audit.routes');
const doctorRoutes = require('./doctor.routes');


// Verificación de salud de API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'backend-core',
    timestamp: new Date().toISOString(),
  });
});

// Enrutadores principales
router.use('/auth', authRoutes);
router.use('/privacy', require('../security/privacy'));
router.use('/appointments', appointmentRoutes);
router.use('/documents', documentRoutes);
router.use('/access-grants', accessGrantRoutes);
router.use('/health-institutions', healthInstitutionRoutes);
router.use('/patient-profile', patientProfileRoutes);
router.use('/audit', auditRoutes);
router.use('/doctors', doctorRoutes);

module.exports = router;
