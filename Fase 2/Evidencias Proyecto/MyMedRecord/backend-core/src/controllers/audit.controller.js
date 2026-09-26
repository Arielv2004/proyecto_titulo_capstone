const AuditRepository = require('../repositories/audit.repository');

class AuditController {
  /**
   * GET /api/v1/audit/my-logs
   * Retorna los registros de auditoría de accesos a la ficha del paciente
   */
  static async getMyLogs(req, res, next) {
    try {
      const patientId = req.user.id;
      const logs = await AuditRepository.findByPatientId(patientId, 50);

      // Enriquecer y traducir las acciones para visualización amigable
      const formattedLogs = logs.map(log => {
        let title = 'Acción registrada';
        let description = 'Operación en el sistema';
        let category = 'GENERAL';
        let iconType = 'info';

        const details = typeof log.details === 'object' && log.details !== null ? log.details : {};

        switch (log.action) {
          case 'QR_ACCESS_VALIDATED':
            title = 'Consulta médica mediante Código QR';
            description = `El profesional ${details.doctorName || 'Médico'} (RUT: ${details.doctorRut || 'N/A'}) de ${details.doctorInstitution || 'Centro de Salud'} accedió temporalmente a su ficha clínica.`;
            category = 'ACCESO_MEDICO';
            iconType = 'stethoscope';
            break;
          case 'SHARED_RECORD_VIEWED':
            title = 'Visualización de Ficha Clínica Compartida';
            description = details.doctorName 
              ? `El profesional ${details.doctorName} consultó su ficha clínica autorizada.` 
              : 'Un profesional médico consultó su ficha compartida.';
            category = 'ACCESO_MEDICO';
            iconType = 'stethoscope';
            break;
          case 'GENERATE_QR_ACCESS':
          case 'QR_CODE_GENERATED':
            title = 'Emisión de Código QR de Acceso';
            description = `Generó un código QR con vigencia de ${details.durationHours || 'temporal'} horas para atención médica.`;
            category = 'CONSENTIMIENTO';
            iconType = 'qr';
            break;
          case 'REVOKE_QR_ACCESS':
          case 'QR_CODE_REVOKED':
            title = 'Revocación de Pase QR';
            description = 'Revocó voluntariamente el acceso de un código QR. El token quedó invalidado de inmediato.';
            category = 'SEGURIDAD';
            iconType = 'shield_alert';
            break;
          case 'PATIENT_PROFILE_UPDATED':
            title = 'Actualización de Ficha Médica';
            description = details.message || 'Se actualizaron antecedentes personales (alergias, patologías crónicas o contacto).';
            category = 'FICHA_CLINICA';
            iconType = 'file';
            break;
          case 'UPLOAD_DOCUMENT':
          case 'DOCUMENT_UPLOADED':
            title = 'Digitalización de Documento';
            description = 'Se cargó y procesó un nuevo documento médico con inteligencia artificial.';
            category = 'DOCUMENTOS';
            iconType = 'file';
            break;
          case 'INITIALIZE_RECORD':
            title = 'Creación de Ficha Clínica Digital';
            description = 'Apertura de la ficha clínica interoperable bajo Ley N° 21.668.';
            category = 'SISTEMA';
            iconType = 'shield';
            break;
          default:
            title = log.action.replace(/_/g, ' ');
            description = details.message || 'Registro de actividad del sistema.';
            break;
        }

        return {
          id: log.id,
          action: log.action,
          title,
          description,
          category,
          iconType,
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          createdAt: log.created_at,
          details,
        };
      });

      return res.status(200).json({
        success: true,
        data: formattedLogs,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuditController;
