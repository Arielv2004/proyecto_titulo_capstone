const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');

const db = require('../config/db');

// Verificación de salud de API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'backend-core',
    timestamp: new Date().toISOString(),
  });
});

// Inspección del estado y tablas de la Base de Datos
router.get('/db/overview', async (req, res) => {
  try {
    const data = await db.getSchemaOverview();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Enrutadores principales
router.use('/auth', authRoutes);

module.exports = router;
