require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
    USER: process.env.DB_USER || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || 'password',
    NAME: process.env.DB_NAME || 'mymedrecord',
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || 'mymedrecord_super_secret_jwt_key_chile_2026',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    COOKIE_NAME: 'mymedrecord_session',
  },
  SECURITY: {
    AES_KEY: process.env.AES_SECRET_KEY || '0123456789abcdef0123456789abcdef', // 32 bytes for AES-256
  },
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
