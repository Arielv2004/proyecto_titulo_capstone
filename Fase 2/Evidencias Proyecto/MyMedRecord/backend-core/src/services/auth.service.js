const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/user.repository');
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