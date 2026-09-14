const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/user.repository');
const config = require('../config/env');

class AuthService {
  static async register({ rut, firstName, lastName, email, password, role }) {
    // Validar si existe por email o RUT
    const existingEmail = await UserRepository.findByEmail(email);
    if (existingEmail) {
      const error = new Error('El correo electrónico ya se encuentra registrado.');
      error.statusCode = 400;
      throw error;
    }

    const existingRut = await UserRepository.findByRut(rut);
    if (existingRut) {
      const error = new Error('El RUT ya se encuentra registrado.');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const allowedRoles = ['PACIENTE', 'MEDICO'];
    const assignedRole = (role && allowedRoles.includes(role.toUpperCase())) ? role.toUpperCase() : 'PACIENTE';

    const user = await UserRepository.create({
      rut,
      firstName,
      lastName,
      email,
      passwordHash,
      role: assignedRole,
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  static async login({ email, password }) {
    const user = await UserRepository.findByIdentifier(email);
    if (!user) {
      const error = new Error('Credenciales inválidas. Verifica tu correo o RUT y tu contraseña.');
      error.statusCode = 401;
      throw error;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      const error = new Error('Credenciales inválidas.');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken(user);
    const { password_hash, ...userProfile } = user;

    return { user: userProfile, token };
  }

  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        rut: user.rut,
        email: user.email,
        role: user.role,
      },
      config.JWT.SECRET,
      { expiresIn: config.JWT.EXPIRES_IN }
    );
  }
}

module.exports = AuthService;
