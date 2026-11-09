const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

const UserRepository = require(
  '../repositories/user.repository'
);

const EmailService = require('./email.service');
const config = require('../config/env');

// Códigos de las 16 regiones de Chile.
const VALID_REGION_CODES = new Set([
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
]);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

class AuthService {
  // =====================================================
  // REGISTRAR PACIENTE O MÉDICO
  // =====================================================

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
    regionCode,
    city,
    address,
  }) {
    // =====================================================
    // DEFINIR Y VALIDAR ROL
    // =====================================================

    if (
      role != null &&
      typeof role !== 'string'
    ) {
      throw validationError(
        'El tipo de cuenta no es válido.'
      );
    }

    const assignedRole =
      typeof role === 'string' && role.trim()
        ? role.trim().toUpperCase()
        : 'PACIENTE';

    if (
      !['PACIENTE', 'MEDICO'].includes(assignedRole)
    ) {
      throw validationError(
        'El registro público solo admite pacientes y médicos.'
      );
    }

    // =====================================================
    // VALIDAR CONTRASEÑA
    // =====================================================

    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw validationError(
        'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.'
      );
    }

    // =====================================================
    // VALIDAR EMAIL DUPLICADO
    // =====================================================

    const existingEmail =
      await UserRepository.findByEmail(email);

    if (existingEmail) {
      throw validationError(
        'El correo electrónico ya se encuentra registrado.'
      );
    }

    // =====================================================
    // VALIDAR RUT DUPLICADO
    // =====================================================

    const existingRut =
      await UserRepository.findByRut(rut);

    if (existingRut) {
      throw validationError(
        'El RUT ya se encuentra registrado.'
      );
    }

    // Los pacientes no necesitan información profesional
    // ni una ubicación laboral.
    let doctorRegistry = null;
    let doctorSpecialty = null;
    let doctorInstitutionId = null;
    let doctorInstitutionOther = null;
    let doctorRegionCode = null;
    let doctorCity = null;
    let doctorAddress = null;

    // =====================================================
    // VALIDACIONES EXCLUSIVAS PARA MÉDICOS
    // =====================================================

    if (assignedRole === 'MEDICO') {
      // -----------------------------------------------------
      // REGISTRO PROFESIONAL
      // -----------------------------------------------------

      if (
        typeof professionalRegistry !== 'string' ||
        !professionalRegistry.trim()
      ) {
        throw validationError(
          'El registro profesional es obligatorio para una cuenta médica.'
        );
      }

      doctorRegistry = professionalRegistry.trim();

      if (doctorRegistry.length > 100) {
        throw validationError(
          'El registro profesional no puede superar los 100 caracteres.'
        );
      }

      // -----------------------------------------------------
      // ESPECIALIDAD
      // -----------------------------------------------------

      if (
        typeof specialty !== 'string' ||
        !specialty.trim()
      ) {
        throw validationError(
          'La especialidad es obligatoria para una cuenta médica.'
        );
      }

      doctorSpecialty = specialty.trim();

      if (doctorSpecialty.length > 150) {
        throw validationError(
          'La especialidad no puede superar los 150 caracteres.'
        );
      }

      // -----------------------------------------------------
      // INSTITUCIÓN DE SALUD
      // -----------------------------------------------------

      if (
        institutionId != null &&
        typeof institutionId !== 'string'
      ) {
        throw validationError(
          'La institución seleccionada no es válida.'
        );
      }

      if (
        institutionNameOther != null &&
        typeof institutionNameOther !== 'string'
      ) {
        throw validationError(
          'El nombre de la institución no es válido.'
        );
      }

      doctorInstitutionId =
        institutionId?.trim() || null;

      doctorInstitutionOther =
        institutionNameOther?.trim() || null;

      if (
        !doctorInstitutionId &&
        !doctorInstitutionOther
      ) {
        throw validationError(
          'Debes seleccionar una institución de salud o indicar otra institución.'
        );
      }

      if (
        doctorInstitutionId &&
        doctorInstitutionOther
      ) {
        throw validationError(
          'Selecciona una institución registrada o indica otra institución, pero no ambas.'
        );
      }

      if (
        doctorInstitutionOther &&
        doctorInstitutionOther.length > 200
      ) {
        throw validationError(
          'El nombre de la institución no puede superar los 200 caracteres.'
        );
      }

      // -----------------------------------------------------
      // REGIÓN
      // -----------------------------------------------------

      doctorRegionCode =
        typeof regionCode === 'string'
          ? regionCode.trim()
          : '';

      if (
        !VALID_REGION_CODES.has(doctorRegionCode)
      ) {
        throw validationError(
          'Selecciona una región válida de Chile.'
        );
      }

      // -----------------------------------------------------
      // CIUDAD O COMUNA
      // -----------------------------------------------------

      if (typeof city !== 'string') {
        throw validationError(
          'Debes indicar la ciudad o comuna donde trabajas.'
        );
      }

      // Quitar espacios al inicio/final y espacios repetidos.
      doctorCity = city
        .trim()
        .replace(/\s+/g, ' ');

      if (
        doctorCity.length < 2 ||
        doctorCity.length > 100
      ) {
        throw validationError(
          'La ciudad o comuna debe tener entre 2 y 100 caracteres.'
        );
      }

      // -----------------------------------------------------
      // DIRECCIÓN LABORAL OPCIONAL
      // -----------------------------------------------------

      if (
        address != null &&
        typeof address !== 'string'
      ) {
        throw validationError(
          'La dirección laboral no es válida.'
        );
      }

      doctorAddress =
        typeof address === 'string'
          ? address.trim() || null
          : null;

      if (
        doctorAddress &&
        doctorAddress.length > 255
      ) {
        throw validationError(
          'La dirección laboral no puede superar los 255 caracteres.'
        );
      }
    }

    // =====================================================
    // HASH DE CONTRASEÑA
    // =====================================================

    const salt = await bcrypt.genSalt(10);

    const passwordHash = await bcrypt.hash(
      password,
      salt
    );

    // =====================================================
    // CREAR USUARIO Y PERFIL
    // =====================================================

    const user = await UserRepository.create({
      rut,
      firstName,
      lastName,
      email,
      passwordHash,
      role: assignedRole,

      professionalRegistry: doctorRegistry,
      specialty: doctorSpecialty,
      institutionId: doctorInstitutionId,
      institutionNameOther: doctorInstitutionOther,

      regionCode: doctorRegionCode,
      city: doctorCity,
      address: doctorAddress,
    });

    // La verificación profesional no se determina
    // desde los datos enviados por el formulario.
    const token = this.generateToken(user);

    return {
      user,
      token,
    };
  }

  // =====================================================
  // INICIAR SESIÓN
  // =====================================================

  static async login({ email, password }) {
    const user =
      await UserRepository.findByIdentifier(email);

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
      const error = new Error(
        'Credenciales inválidas.'
      );

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
    const user =
      await UserRepository.findByEmail(email);

    // No revelar si el correo existe o no.
    if (!user || !user.is_active) {
      return;
    }

    const token = crypto
      .randomBytes(32)
      .toString('hex');

    // Guardar solamente el hash del token.
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    await UserRepository.savePasswordResetToken(
      user.id,
      tokenHash,
      expiresAt
    );

    await EmailService.sendPasswordResetEmail(
      user.email,
      token
    );
  }

  // =====================================================
  // RESTABLECER CONTRASEÑA
  // =====================================================

  static async resetPassword({ token, password }) {
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw validationError(
        'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.'
      );
    }

    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      throw validationError(
        'El enlace de recuperación no es válido.'
      );
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const updated =
      await UserRepository.resetPasswordWithToken(
        tokenHash,
        passwordHash
      );

    if (!updated) {
      throw validationError(
        'El enlace de recuperación es inválido o ha expirado.'
      );
    }

    return true;
  }

  // =====================================================
  // GENERAR JWT
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