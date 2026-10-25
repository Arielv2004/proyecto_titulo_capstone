const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

// Middlewares de seguridad y parsing
app.use(helmet());
app.use(
  cors({
    origin: process.env.PUBLIC_APP_URL || config.CORS_ORIGIN,
    credentials: true, // Crucial para permitir el intercambio de cookies HttpOnly
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', (req,res,next) => {
  res.set('Cache-Control','no-store');
  res.set('Referrer-Policy','no-referrer');
  if (config.NODE_ENV === 'production' && !req.secure) return res.status(400).json({success:false,message:'Se requiere HTTPS.'});
  next();
});
app.use('/api', require('./security/request-audit'));
app.use('/api', require('./security/http').csrfProtection);

// Prefijo API v1
app.use('/api/v1', apiRoutes);

// Manejador centralizado de errores
app.use(errorHandler);

module.exports = app;
