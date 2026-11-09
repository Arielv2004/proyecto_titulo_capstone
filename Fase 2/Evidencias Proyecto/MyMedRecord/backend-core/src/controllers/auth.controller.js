const AuthService = require('../services/auth.service');
const config = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 horas
};

class AuthController {
  // =====================================================
  // REGISTRAR PACIENTE O MÉDICO
  // =====================================================

  static async register(req, res, next) {
    try {
      const {
        rut,
        firstName,
        lastName,
        email,
        password,
        role,
        professionalRegistry,
        specialty,
        institutionId,
        institutionNameOther,
        regionCode,
        city,
        address,
      } = req.body;

      const { user, token } = await AuthService.register({
        rut,
        firstName,
        lastName,
        email,
        password,
        role,
        professionalRegistry,
        specialty,
        institutionId,
        institutionNameOther,
        regionCode,
        city,
        address,
      });

      res.cookie(
        config.JWT.COOKIE_NAME,
        token,
        COOKIE_OPTIONS
      );

      return res.status(201).json({
        success: true,
        message:
          user.role === 'MEDICO'
            ? 'Cuenta médica creada. El perfil profesional quedó pendiente de verificación.'
            : 'Usuario registrado exitosamente.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // INICIAR SESIÓN
  // =====================================================

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const { user, token } = await AuthService.login({
        email,
        password,
      });

      res.cookie(
        config.JWT.COOKIE_NAME,
        token,
        COOKIE_OPTIONS
      );

      return res.status(200).json({
        success: true,
        message: 'Sesión iniciada exitosamente.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // SOLICITAR RECUPERACIÓN DE CONTRASEÑA
  // =====================================================

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (
        typeof email !== 'string' ||
        !email.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Debes ingresar un correo electrónico válido.',
        });
      }

      await AuthService.forgotPassword({
        email: email.trim().toLowerCase(),
      });

      return res.status(200).json({
        success: true,
        message:
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // RESTABLECER CONTRASEÑA
  // =====================================================

  static async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      if (
        typeof token !== 'string' ||
        !token.trim() ||
        typeof password !== 'string' ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            'El enlace y la nueva contraseña son obligatorios.',
        });
      }

      await AuthService.resetPassword({
        token,
        password,
      });

      // Cerrar la sesión actual en este navegador.
      res.clearCookie(
        config.JWT.COOKIE_NAME,
        COOKIE_OPTIONS
      );

      return res.status(200).json({
        success: true,
        message:
          'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // CERRAR SESIÓN
  // =====================================================

  static async logout(req, res) {
    res.clearCookie(
      config.JWT.COOKIE_NAME,
      COOKIE_OPTIONS
    );

    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente.',
    });
  }

  // =====================================================
  // CONSULTAR USUARIO AUTENTICADO
  // =====================================================

  static async me(req, res) {
    return res.status(200).json({
      success: true,
      data: { user: req.user },
    });
  }
}

module.exports = AuthController;