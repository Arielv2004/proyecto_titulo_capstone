const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/env');
const UserDataRepository = require('../repositories/user-data.repository');
const ClinicalRecordRepository = require('../repositories/clinical-record.repository');
const DocumentService = require('./document.service');
const SupabaseService = require('./supabase.service');

class UserService {
  /**
   * Genera un hash SHA-256 HMAC del userId para auditar la eliminación sin retener PII.
   */
  static generateSubjectHash(userId) {
    return crypto
      .createHmac('sha256', config.JWT.SECRET)
      .update(String(userId))
      .digest('hex');
  }

  /**
   * Exporta toda la información clínica y administrativa del paciente (Ley 21.719 - Portabilidad)
   */
  static async exportUserData(userId, { ipAddress, userAgent }) {
    const user = await UserDataRepository.findUserWithAuth(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Consultas en paralelo para estructurar el paquete de portabilidad
    const [
      profile,
      documentsRaw,
      prescriptions,
      labReports,
      accessGrants,
      appointments,
      auditLogs,
    ] = await Promise.all([
      ClinicalRecordRepository.findPatientProfile(userId),
      UserDataRepository.findExportDocuments(userId),
      ClinicalRecordRepository.findPrescriptions(userId),
      ClinicalRecordRepository.findLabReports(userId),
      UserDataRepository.findExportAccessGrants(userId),
      UserDataRepository.findExportAppointments(userId),
      UserDataRepository.findExportAuditLogs(userId),
    ]);

    // Sanitizar documentos: nunca exponer la ruta física local del servidor;
    // entregar la Signed URL temporal de Supabase (si es remota) y el endpoint seguro de descarga de la API.
    const documents = await Promise.all(
      documentsRaw.map(async (doc) => {
        const isRemote = SupabaseService.isSupabaseUrl(doc.file_path);
        let fileUrl = null;
        if (isRemote && doc.file_path) {
          fileUrl = await SupabaseService.getSignedUrl(doc.file_path, 3600);
        }
        return {
          id: doc.id,
          document_type: doc.document_type,
          title: doc.title,
          file_name: doc.file_name,
          mime_type: doc.mime_type,
          file_size_bytes: doc.file_size_bytes,
          document_date: doc.document_date,
          issuing_doctor: doc.issuing_doctor,
          issuing_institution: doc.issuing_institution,
          ocr_raw_text: doc.ocr_raw_text,
          ocr_confidence: doc.ocr_confidence,
          status: doc.status,
          storage: isRemote ? 'SUPABASE' : 'LOCAL',
          file_url: fileUrl,
          download_endpoint: `/api/v1/documents/${doc.id}/file`,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
        };
      })
    );

    const exportPayload = {
      export_metadata: {
        platform: 'MyMedRecord',
        format_version: '1.0',
        legal_basis: 'Ley N° 21.719 - Derecho de Portabilidad y Ley N° 20.584',
        generated_at: new Date().toISOString(),
        subject_id: user.id,
        terms_version_accepted: user.terms_version,
        terms_accepted_at: user.terms_accepted_at,
      },
      account: {
        id: user.id,
        rut: user.rut,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      health_profile: profile ? {
        id: profile.id,
        birth_date: profile.birth_date,
        gender: profile.gender,
        blood_type: profile.blood_type,
        health_insurance: profile.health_insurance,
        is_organ_donor: profile.is_organ_donor,
        allergies: profile.allergies || [],
        chronic_conditions: profile.chronic_conditions || [],
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_phone: profile.emergency_contact_phone,
        updated_at: profile.updated_at,
      } : null,
      documents,
      prescriptions,
      lab_reports: labReports,
      access_grants: accessGrants,
      appointments,
      audit_logs: auditLogs,
    };

    // Registrar auditoría de exportación (sin volcar datos clínicos al log)
    await UserDataRepository.logAudit({
      userId: user.id,
      patientId: user.id,
      action: 'DATA_EXPORTED',
      details: {
        law: 'Ley 21.719',
        article: 'Derecho de Portabilidad',
        counts: {
          documents: documents.length,
          prescriptions: prescriptions.length,
          lab_reports: labReports.length,
          access_grants: accessGrants.length,
          appointments: appointments.length,
          audit_logs: auditLogs.length,
        },
      },
      ipAddress,
      userAgent,
    });

    return exportPayload;
  }

  /**
   * Elimina definitivamente la cuenta del paciente y sus datos clínicos asociados (Ley 21.719 - Derecho al Olvido)
   */
  static async deleteAccount(userId, { confirmation, password, ipAddress, userAgent }) {
    // 1. Validar texto de confirmación estricto
    if (!confirmation || String(confirmation).trim() !== 'ELIMINAR') {
      const error = new Error('Para confirmar la eliminación debes escribir exactamente la palabra "ELIMINAR".');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validar contraseña obligatoria para re-autenticación
    if (!password || !String(password).trim()) {
      const error = new Error('Debes ingresar tu contraseña para confirmar la eliminación de la cuenta.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Buscar usuario con su password_hash
    const user = await UserDataRepository.findUserWithAuth(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // 4. Verificar contraseña contra bcrypt
    const passwordValid = await bcrypt.compare(String(password), user.password_hash);
    if (!passwordValid) {
      const error = new Error('Contraseña incorrecta. No se pudo confirmar la eliminación.');
      error.statusCode = 401;
      throw error;
    }

    // 5. Verificar que el usuario no tenga documentos subidos para terceros (bloqueo por FK)
    const externalDocsCount = await UserDataRepository.countExternalUploadedDocuments(userId);
    if (externalDocsCount > 0) {
      const error = new Error(
        'Tu cuenta tiene registros vinculados a la atención de otros usuarios. Para tramitar la supresión de estos datos, contáctanos en privacidad@mymedrecord.cl.'
      );
      error.statusCode = 409;
      throw error;
    }

    // 6. Recopilar rutas de archivos antes de borrar la BD
    const docPaths = await UserDataRepository.findAllDocumentPathsByPatient(userId);
    const filesToDelete = docPaths.map((d) => d.file_path).filter(Boolean);

    // 7. Preparar detalles anonimizados para la auditoría (subject_hash)
    const subjectHash = this.generateSubjectHash(userId);
    const auditDetails = {
      law: 'Ley 21.719',
      article: 'Derecho de Cancelación / Supresión (Derecho al Olvido)',
      subject_hash: subjectHash,
      role: user.role,
      documents_count: filesToDelete.length,
      requested_at: new Date().toISOString(),
    };

    // 8. Borrar BD primero dentro de una transacción (CASCADE borra perfiles, documentos, recetas, etc.)
    const { auditLogId } = await UserDataRepository.executeAccountDeletion({
      userId,
      auditDetails,
      ipAddress,
      userAgent,
    });

    // 9. Borrar archivos físicos de Supabase Storage / disco local de forma no bloqueante de la transacción
    const failedFiles = [];
    await Promise.allSettled(
      filesToDelete.map(async (filePath) => {
        try {
          const ok = await DocumentService.removeStoredFile(filePath);
          if (!ok) {
            failedFiles.push(filePath);
          }
        } catch (err) {
          failedFiles.push(filePath);
        }
      })
    );

    // 10. Si algún archivo falló al borrarse en Supabase/disco, actualizar audit log para trazabilidad
    if (failedFiles.length > 0 && auditLogId) {
      try {
        await UserDataRepository.updateAuditDetails(auditLogId, {
          ...auditDetails,
          storage_cleanup: 'PARTIAL',
          failed_files: failedFiles.map((p) => p.split('/').slice(-1)[0]),
        });
      } catch (logErr) {
        // Silencioso: no debe impedir el cierre exitoso de la cuenta
      }
    }

    return {
      success: true,
      deletedFilesCount: filesToDelete.length - failedFiles.length,
      failedFilesCount: failedFiles.length,
    };
  }
}

module.exports = UserService;

