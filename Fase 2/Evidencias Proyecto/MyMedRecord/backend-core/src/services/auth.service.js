const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const UserRepository = require('../repositories/user.repository');
const EmailService = require('./email.service');
const config = require('../config/env');

class AuthService {
  static async register({
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
  }) {
    // =====================================================
    // VALIDAR EMAIL
    // =====================================================

    const existingEmail = await UserRepository.findByEmail(email);

    if (existingEmail) {
      const error = new Error(
        'El correo electrónico ya se encuentra registrado.'
      );
      error.statusCode = 400;
      throw error;
    }

    // =====================================================
    // VALIDAR RUT
    // =====================================================

    const existingRut = await UserRepository.findByRut(rut);

    if (existingRut) {
      const error = new Error('El RUT ya se encuentra registrado.');
      error.statusCode = 400;
      throw error;
    }

    // =====================================================
    // DEFINIR ROL
    // =====================================================

    const allowedRoles = ['PACIENTE', 'MEDICO'];

    const assignedRole =
      role && allowedRoles.includes(role.toUpperCase())
        ? role.toUpperCase()
        : 'PACIENTE';

    // =====================================================
    // VALIDACIONES PARA MÉDICOS
    // =====================================================

    if (assignedRole === 'MEDICO') {
      if (!professionalRegistry || !professionalRegistry.trim()) {
        const error = new Error(
          'El registro profesional es obligatorio para una cuenta médica.'
        );
        error.statusCode = 400;
        throw error;
      }

      if (!specialty || !specialty.trim()) {
        const error = new Error(
          'La especialidad es obligatoria para una cuenta médica.'
        );
        error.statusCode = 400;
        throw error;
      }

      const hasInstitutionId =
        institutionId &&
        String(institutionId).trim();

      const hasOtherInstitution =
        institutionNameOther &&
        institutionNameOther.trim();

      // El médico debe seleccionar una institución existente
      // O escribir manualmente una institución.
      if (!hasInstitutionId && !hasOtherInstitution) {
        const error = new Error(
          'Debes seleccionar una institución de salud o indicar otra institución.'
        );
        error.statusCode = 400;
        throw error;
      }

      // No permitimos enviar ambas alternativas simultáneamente.
      if (hasInstitutionId && hasOtherInstitution) {
        const error = new Error(
          'Selecciona una institución registrada o indica otra institución, pero no ambas.'
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // =====================================================
    // HASH DE CONTRASEÑA
    // =====================================================

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // =====================================================
    // CREAR USUARIO
    // =====================================================

    const user = await UserRepository.create({
      rut,
      firstName,
      lastName,
      email,
      passwordHash,
      role: assignedRole,

      professionalRegistry:
        assignedRole === 'MEDICO'
          ? professionalRegistry.trim()
          : null,

      specialty:
        assignedRole === 'MEDICO'
          ? specialty.trim()
          : null,

      institutionId:
        assignedRole === 'MEDICO' && institutionId
          ? String(institutionId).trim()
          : null,

      institutionNameOther:
        assignedRole === 'MEDICO' && institutionNameOther
          ? institutionNameOther.trim()
          : null,
    });

    const token = this.generateToken(user);

    return {
      user,
      token,
    };
  }

  // =====================================================
  // LOGIN
  // =====================================================

  static async login({ email, password }) {
    const user = await UserRepository.findByIdentifier(email);

    if (!user) {
      const error = new Error(
        'Credenciales inválidas. Verifica tu correo o RUT y tu contraseña.'
      );
      error.statusCode = 401;
      throw error;
    }

    const isValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isValid) {
      const error = new Error('Credenciales inválidas.');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken(user);

    const {
      password_hash,
      ...userProfile
    } = user;

    return {
      user: userProfile,
      token,
    };
  }
  
  // =====================================================
  // SOLICITAR RECUPERACIÓN DE CONTRASEÑA
  // =====================================================

  static async forgotPassword({ email }) {
    const user = await UserRepository.findByEmail(email);

    // No revelar si el correo existe o no.
    if (!user || !user.is_active) {
      return;
    }

    // Token aleatorio de 32 bytes.
    const token = crypto.randomBytes(32).toString('hex');

    // Guardar solamente el hash del token.
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Duración de 30 minutos.
    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    await UserRepository.savePasswordResetToken(
      user.id,
      tokenHash,
      expiresAt
    );

    // =====================================================
    // ENVIAR ENLACE DE RECUPERACIÓN AL CORREO
    // =====================================================

    await EmailService.sendPasswordResetEmail(
      user.email,
      token
    );
  }

  // =====================================================
  // RESTABLECER CONTRASEÑA
  // =====================================================

  static async resetPassword({ token, password }) {
    // Validación básica de contraseña.
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      const error = new Error(
        'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Validar formato del token.
    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      const error = new Error(
        'El enlace de recuperación no es válido.'
      );
      error.statusCode = 400;
      throw error;
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Generar hash de la nueva contraseña.
    const passwordHash = await bcrypt.hash(password, 10);

    // Actualizar contraseña y consumir el token
    // mediante una transacción.
    const updated =
      await UserRepository.resetPasswordWithToken(
        tokenHash,
        passwordHash
      );

    if (!updated) {
      const error = new Error(
        'El enlace de recuperación es inválido o ha expirado.'
      );
      error.statusCode = 400;
      throw error;
    }

    return true;
  }

  // =====================================================
  // JWT
  // =====================================================

  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        rut: user.rut,
        email: user.email,
        role: user.role,
      },
      config.JWT.SECRET,
      {
        expiresIn: config.JWT.EXPIRES_IN,
      }
    );
  }
}

module.exports = AuthService;