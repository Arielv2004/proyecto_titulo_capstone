
const nodemailer = require('nodemailer');

class EmailService {
  static createTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // =====================================================
  // ENVIAR CORREO DE RECUPERACIÓN
  // =====================================================

  static async sendPasswordResetEmail(email, token) {
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error('FRONTEND_URL no está configurada.');
    }

    const resetUrl =
    frontendUrl.replace(/\/$/, '') +
    '/reset-password?token=' +
    encodeURIComponent(token);

    const transporter = this.createTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'MyMedRecord - Recuperación de contraseña',
      text: [
        'Hola:',
        '',
        'Recibimos una solicitud para restablecer tu contraseña de MyMedRecord.',
        '',
        'Abre el siguiente enlace: ' + resetUrl,
        '',
        'Este enlace vencerá en 30 minutos y solo puede utilizarse una vez.',
        '',
        'Si no solicitaste este cambio, puedes ignorar este correo.',
        '',
        'Equipo MyMedRecord',
      ].join('\n'),
    });
  }
}

module.exports = EmailService;
