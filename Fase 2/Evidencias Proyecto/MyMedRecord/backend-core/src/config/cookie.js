
const config = require('./env');

const crossSite = process.env.COOKIE_CROSS_SITE === 'true';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: crossSite || config.NODE_ENV === 'production',
  sameSite: crossSite ? 'none' : 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 horas
};

module.exports = {
  COOKIE_OPTIONS,
};
