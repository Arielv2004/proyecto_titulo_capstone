const AuthService = require('../services/auth.service');
const config = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 horas
};

class AuthController {
  static async register(req, res, next) {
    try {
      const { rut, firstName, lastName, email, password, role } = req.body;
      const { user, token } = await AuthService.register({
        rut,
        firstName,
        lastName,
        email,
        password,
        role,
      });

      // Transmisión segura en Cookie HttpOnly
      res.cookie(config.JWT.COOKIE_NAME, token, COOKIE_OPTIONS);

      return res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await AuthService.login({ email, password });

      // Transmisión segura en Cookie HttpOnly
      res.cookie(config.JWT.COOKIE_NAME, token, COOKIE_OPTIONS);

      return res.status(200).json({
        success: true,
        message: 'Sesión iniciada exitosamente.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res) {
    res.clearCookie(config.JWT.COOKIE_NAME, COOKIE_OPTIONS);
    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente.',
    });
  }

  static async me(req, res) {
    return res.status(200).json({
      success: true,
      data: { user: req.user },
    });
  }
}

module.exports = AuthController;
