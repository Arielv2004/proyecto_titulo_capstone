
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Orígenes permitidos para navegador y Android
const allowedOrigins = config.CORS_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middlewares de seguridad y parsing
app.use(helmet());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Prefijo API v1
app.use('/api/v1', apiRoutes);

// Manejador centralizado de errores
app.use(errorHandler);

module.exports = app;
