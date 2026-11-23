const config = require('./env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 horas
};

module.exports = {
  COOKIE_OPTIONS,
};

