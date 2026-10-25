const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const DocumentRepository = require('../repositories/document.repository');
const SupabaseService = require('./supabase.service');
const config = require('../config/env');
const db = require('../config/db');

const AI_SERVICE_URL = config.AI_SERVICE_URL;
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const documentTypes = new Set(['RECETA', 'EXAMEN_LAB', 'INFORME', 'IMAGEN', 'OTRO']);
const editableStatuses = new Set(['CONFIRMADO', 'PENDIENTE_REVISION']);
const isDocumentId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');

function inputError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function limitedText(value, limit, label, required = false) {
    const text = String(value ?? '').trim();
    if (required && !text) throw inputError(`${label} es obligatorio.`);
    if (text.length > limit) throw inputError(`${label} supera el máximo de ${limit} caracteres.`);
    return text || null;
}

function optionalDate(value, label) {
    if (!value) return null;
    const date = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        throw inputError(`${label} debe tener una fecha válida.`);
    }
    return date;
}

// Asegurar que la carpeta uploads exista (para fallback local)
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class DocumentService {
    /**
     * Sube un documento, lo envía al ai-service y guarda los datos extraídos.
     */
    static async uploadDocument({ file, user, patientId = null }) {
        if (!file) {
            const error = new Error('No se recibió ningún archivo.');
            error.statusCode = 400;
            throw error;
        }

        // Paciente sube su propio documento; médico puede subir a un paciente si lo indica
        const patient_id = patientId || user.id;

        // 1. Guardar archivo en Supabase Storage (con fallback local)
        const { filePath, fileName } = await this._storeFile(file);
        const mimeType = file.mimetype;
        const fileSize = file.size;

        // 2. Crear documento en estado PROCESANDO
        const title = this._buildTitle(file.originalname);

        const doc = await DocumentRepository.createDocument({
            patient_id,
            uploaded_by: user.id,
            document_type: 'OTRO', // Se actualizará tras el análisis
            title,
            file_name: fileName,
            file_path: filePath,
            mime_type: mimeType,
            file_size_bytes: fileSize,
            ocr_raw_text: null,
            status: 'PROCESANDO',
        });


        // 3. Enviar al ai-service (buffer en memoria o filePath de fallback)
        let aiResult;
        const aiInput = file.buffer || filePath;
        try {
            aiResult = await this._sendToAiService(aiInput, fileName, mimeType);
        } catch (err) {
            // Si la IA falla, dejamos el documento pendiente para revisión manual
            await DocumentRepository.updateDocumentStatus(
                doc.id,
                'ERROR'
            );

            await DocumentRepository.logAudit({
                userId: user.id,
                patientId: patient_id,
                action: 'UPLOAD_AI_ERROR',
                details: { documentId: doc.id, error: err.message },
                ipAddress: '0.0.0.0',
            });

            const error = new Error(
                'El documento se guardó, pero el análisis con IA falló. ' +
                'Puedes revisarlo manualmente.'
            );
            error.statusCode = 502;
            error.documentId = doc.id;
            throw error;
        }

        // 4. Normalizar tipo de documento
        const isMedicalDoc = aiResult?.is_medical_document !== false;
        const documentType = isMedicalDoc ? this._normalizeDocumentType(aiResult.document_type) : 'OTRO';

        // 5. Actualizar documento con el tipo real y el texto OCR
        await this._updateDocumentAfterAi(doc.id, {
            document_type: documentType,
            ocr_raw_text: aiResult.raw_text,
        });

        // 6. Guardar datos estructurados según tipo (solo si es documento médico)
        let structured = null;
        if (isMedicalDoc) {
            if (documentType === 'RECETA') {
                structured = await this._savePrescription({
                    documentId: doc.id,
                    patientId: patient_id,
                    aiResult,
                });
            } else if (documentType === 'EXAMEN_LAB') {
                structured = await this._saveLabReport({
                    documentId: doc.id,
                    patientId: patient_id,
                    aiResult,
                });
            }
        }

        // 7. Actualizar estado a PENDIENTE_REVISION
        await DocumentRepository.updateDocumentStatus(
            doc.id,
            'PENDIENTE_REVISION'
        );

        // 8. Auditoría
        await DocumentRepository.logAudit({
            userId: user.id,
            patientId: patient_id,
            action: 'UPLOAD_DOCUMENT',
            details: { documentId: doc.id, document_type: documentType },
            ipAddress: '0.0.0.0',
        });

        // 9. Devolver todo junto
        return {
            document: {
                ...doc,
                document_type: documentType,
                ocr_raw_text: aiResult.raw_text,
                status: 'PENDIENTE_REVISION',
            },
            analysis: aiResult,
            structured,
        };
    }

    /**
     * Analiza un documento con IA antes de confirmarlo en el historial.
     * Guarda la imagen en documents con status='TEMP', llama al ai-service y
     * devuelve los datos extraídos SIN crear prescriptions ni lab_reports.
     */
    static async analyzeDocument({ file, user, patientId = null }) {
        if (!file) {
            const error = new Error('No se recibió ningún archivo.');
            error.statusCode = 400;
            throw error;
        }

        const patient_id = patientId || user.id;
        const mimeType = file.mimetype;
        const fileSize = file.size;
        const title = this._buildTitle(file.originalname);

        // 1. Guardar archivo en Supabase Storage (con fallback local)
        const { filePath, fileName } = await this._storeFile(file);

        // 2. Crear documento en estado TEMP
        const doc = await DocumentRepository.createDocument({
            patient_id,
            uploaded_by: user.id,
            document_type: 'OTRO',
            title,
            file_name: fileName,
            file_path: filePath,
            mime_type: mimeType,
            file_size_bytes: fileSize,
            ocr_raw_text: null,
            status: 'TEMP',
        });

        // 3. Enviar a ai-service con manejo de errores no fatales (ej. imagen borrosa)
        let aiResult = null;
        let isUnreadable = false;
        const aiInput = file.buffer || filePath;

        try {
            aiResult = await this._sendToAiService(aiInput, fileName, mimeType);
        } catch (err) {
            console.warn('[analyzeDocument] IA no pudo extraer datos del archivo:', err.message);
            isUnreadable = true;
            aiResult = {
                document_type: 'OTRO',
                diagnoses: [],
                medications: [],
                lab_metrics: [],
                summary: null,
                raw_text: '',
                is_medical_document: false,
            };
        }

        const isMedicalDoc = aiResult?.is_medical_document !== false;

        // Evaluar si contiene información útil
        const hasUsefulInfo =
            isMedicalDoc &&
            ((aiResult?.medications?.length > 0) ||
            (aiResult?.diagnoses?.length > 0) ||
            (aiResult?.lab_metrics?.length > 0) ||
            (aiResult?.raw_text && aiResult.raw_text.trim().length > 10));

        if (!hasUsefulInfo && isMedicalDoc) {
            isUnreadable = true;
        }

        const documentType = isMedicalDoc
            ? this._normalizeDocumentType(aiResult?.document_type)
            : 'OTRO';

        // 3. Actualizar metadatos detectados manteniendo status = 'TEMP'
        await this._updateDocumentAfterAi(doc.id, {
            document_type: documentType,
            ocr_raw_text: aiResult?.raw_text || null,
            document_date: aiResult?.document_date || null,
        });

        return {
            tempId: doc.id,
            document: {
                id: doc.id,
                title: doc.title,
                file_name: doc.file_name,
                mime_type: doc.mime_type,
                document_type: documentType,
                status: 'TEMP',
            },
            analysis: {
                ...aiResult,
                is_medical_document: isMedicalDoc,
            },
            isUnreadable,
        };
    }

    /**
     * Confirma un documento temporal (TEMP) y lo pasa al historial.
     * Si wasReviewed=true e is_medical_document=true -> status='CONFIRMADO'
     * Si wasReviewed=false o is_medical_document=false -> status='PENDIENTE_REVISION'
     * Si wasReviewed=false o is_medical_document=false, NO crea prescriptions ni lab_reports.
     */
    static async confirmDocument({ tempId, editedData = {}, wasReviewed = true, user }) {
        if (!tempId) {
            const error = new Error('ID de documento temporal requerido.');
            error.statusCode = 400;
            throw error;
        }

        const doc = await DocumentRepository.findTempById(tempId);
        if (!doc) {
            const error = new Error('Documento temporal no encontrado o ya confirmado/descartado.');
            error.statusCode = 404;
            throw error;
        }

        if (user.role !== 'PACIENTE' || doc.patient_id !== user.id) {
            const error = new Error('No tienes permiso para confirmar este documento.');
            error.statusCode = 403;
            throw error;
        }

        const isMedicalDoc = editedData.is_medical_document !== false;
        const documentType = isMedicalDoc
            ? this._normalizeDocumentType(editedData.document_type || doc.document_type)
            : 'OTRO';
        const title = editedData.title || doc.title || (isMedicalDoc ? 'Documento Clínico' : 'Documento no médico');
        const issuingDoctor = isMedicalDoc ? (editedData.issuing_doctor || doc.issuing_doctor || null) : null;
        const issuingInstitution = isMedicalDoc ? (editedData.issuing_institution || doc.issuing_institution || null) : null;

        // No inventar una fecha clínica cuando el documento no la informa.
        let issueDateStr = editedData.document_date || doc.document_date || null;
        if (issueDateStr && !isNaN(new Date(issueDateStr).getTime())) {
            issueDateStr = new Date(issueDateStr).toISOString().split('T')[0];
        } else {
            issueDateStr = null;
        }

        const documentDate = issueDateStr;
        const targetStatus = (wasReviewed && isMedicalDoc) ? 'CONFIRMADO' : 'PENDIENTE_REVISION';

        // 1. Cambiar estado a targetStatus ('CONFIRMADO' o 'PENDIENTE_REVISION')
        const updatedDoc = await DocumentRepository.updateDocumentOnConfirm(doc.id, {
            status: targetStatus,
            title,
            document_type: documentType,
            issuing_doctor: issuingDoctor,
            issuing_institution: issuingInstitution,
            document_date: documentDate,
        });

        let structured = null;

        // 2. Crear cabeceras e ítems según corresponda (solo si fue revisado y es médico)
        if (wasReviewed && isMedicalDoc) {
            const medications = Array.isArray(editedData.medications) ? editedData.medications : [];
            const diagnosisText = editedData.diagnostico ||
                (Array.isArray(editedData.diagnoses) ? editedData.diagnoses.join(', ') : (editedData.diagnosis_text || null));

            if (documentType === 'RECETA') {
                // Calcular duración máxima y vigencia (valid_until)
                const maxDurationDays = this._extractMaxDurationDays(medications);
                let validUntilStr = null;

                if (editedData.valid_until && !isNaN(new Date(editedData.valid_until).getTime())) {
                    validUntilStr = new Date(editedData.valid_until).toISOString().split('T')[0];
                } else if (maxDurationDays && maxDurationDays > 0 && issueDateStr) {
                    const baseDate = new Date(issueDateStr + 'T00:00:00');
                    const expDate = new Date(baseDate.getTime() + maxDurationDays * 24 * 60 * 60 * 1000);
                    validUntilStr = expDate.toISOString().split('T')[0];
                }

                const prescription = await DocumentRepository.createPrescription({
                    document_id: doc.id,
                    patient_id: doc.patient_id,
                    doctor_name: issuingDoctor,
                    diagnosis_text: diagnosisText,
                    issue_date: issueDateStr,
                    valid_until: validUntilStr,
                    is_chronic: !!editedData.is_chronic,
                });

                const items = [];
                for (const med of medications) {
                    const medName = med.name || med.medication_name;
                    if (!medName) continue;
                    const item = await DocumentRepository.createPrescriptionItem({
                        prescription_id: prescription.id,
                        medication_name: medName,
                        dosage: med.dosage || null,
                        frequency: med.frequency || null,
                        duration: med.duration || (med.duration_days ? `${med.duration_days} días` : null),
                        instructions: med.instructions || null,
                    });
                    items.push(item);
                }
                structured = { ...prescription, items };
            } else if (documentType === 'EXAMEN_LAB') {
                const report = await DocumentRepository.createLabReport({
                    document_id: doc.id,
                    patient_id: doc.patient_id,
                    laboratory_name: issuingInstitution,
                    sample_date: issueDateStr,
                    observations: editedData.summary || editedData.observations || null,
                });

                const items = [];
                for (const metric of (Array.isArray(editedData.lab_metrics) ? editedData.lab_metrics : [])) {
                    if (!metric.test_name) continue;
                    const item = await DocumentRepository.createLabTestItem({
                        lab_report_id: report.id,
                        test_name: metric.test_name,
                        result_value: String(metric.result_value ?? metric.value ?? ''),
                        unit: metric.unit || null,
                        reference_range: metric.reference_range || null,
                        is_abnormal: !!metric.is_abnormal,
                    });
                    items.push(item);
                }
                structured = { ...report, items };
            }
        }

        // 3. Auditoría de confirmación
        await DocumentRepository.logAudit({
            userId: user.id,
            patientId: doc.patient_id,
            action: 'CONFIRM_DOCUMENT',
            details: {
                documentId: doc.id,
                document_type: documentType,
                status: targetStatus,
                wasReviewed: Boolean(wasReviewed),
                is_medical_document: isMedicalDoc,
                medicationsCount: (wasReviewed && isMedicalDoc && Array.isArray(editedData.medications)) ? editedData.medications.length : 0,
                edited: true,
            },
            ipAddress: '0.0.0.0',
        });

        const { file_path, ocr_raw_text, encrypted_notes, ...safeDocument } = updatedDoc;
        return {
            document: safeDocument,
            structured,
        };
    }

    /**
     * Descarta un documento temporal.
     * Marca status='ELIMINADO' y ELIMINA SIEMPRE el archivo físico del disco.
     */
    static async discardDocument({ tempId, user }) {
        if (!tempId) {
            const error = new Error('ID de documento temporal requerido.');
            error.statusCode = 400;
            throw error;
        }

        const doc = await DocumentRepository.findTempById(tempId);
        if (!doc) {
            const error = new Error('Documento temporal no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (user.role !== 'PACIENTE' || doc.patient_id !== user.id) {
            const error = new Error('No tienes permiso para descartar este documento.');
            error.statusCode = 403;
            throw error;
        }

        // 1. Soft delete en base de datos
        await DocumentRepository.softDelete(tempId);

        // 2. ELIMINAR el archivo físico (Supabase Storage o local)
        const fileDeleted = await this._removeStoredFile(doc.file_path);

        // 3. Auditoría
        await DocumentRepository.logAudit({
            userId: user.id,
            patientId: doc.patient_id,
            action: 'DISCARD_TEMP_DOCUMENT',
            details: {
                documentId: tempId,
                file_deleted: fileDeleted,
                file_name: doc.file_name,
            },
            ipAddress: '0.0.0.0',
        });

        return { id: tempId, discarded: true, fileDeleted };
    }

    /**
     * Limpieza periódica de documentos temporales abandonados (>24 horas).
     * Marca como ELIMINADO, borra los archivos físicos y audita.
     */
    static async cleanupTempDocuments() {
        const expiredDocs = await DocumentRepository.findExpiredTemps(24);
        const deletedIds = [];
        let filesRemovedCount = 0;

        for (const doc of expiredDocs) {
            deletedIds.push(doc.id);
            if (doc.file_path) {
                const removed = await this._removeStoredFile(doc.file_path);
                if (removed) filesRemovedCount++;
            }
        }

        if (deletedIds.length > 0) {
            await DocumentRepository.markManyAsEliminado(deletedIds);
        }

        await DocumentRepository.logAudit({
            userId: null,
            patientId: null,
            action: 'CLEANUP_TEMP_DOCUMENTS',
            details: {
                cleaned_count: deletedIds.length,
                files_removed: filesRemovedCount,
                cleaned_ids: deletedIds,
                interval: '24 hours',
            },
            ipAddress: '127.0.0.1',
        });

        return {
            cleaned_count: deletedIds.length,
            files_removed: filesRemovedCount,
            cleaned_ids: deletedIds,
        };
    }

    static async listDocuments(user, { document_type = null } = {}) {
        // Paciente solo ve los suyos (findByPatient ya incluye structured vía JSON agg en 1 query)
        const patientId = user.id;
        return DocumentRepository.findByPatient(patientId, { document_type });
    }

    static async getDocumentById(documentId, user) {
        if (!isDocumentId(documentId)) throw inputError('Identificador de documento no válido.');
        const doc = await DocumentRepository.findById(documentId);
        if (!doc || doc.status === 'ELIMINADO' || doc.status === 'TEMP') {
            const error = new Error('Documento no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        // Paciente solo puede ver los suyos
        if (user.role !== 'PACIENTE' || doc.patient_id !== user.id) {
            const error = new Error('No tienes permiso para ver este documento.');
            error.statusCode = 403;
            throw error;
        }

        // Cargar datos estructurados según tipo
        let structured = null;
        if (doc.document_type === 'RECETA') {
            structured = await DocumentRepository.findPrescriptionByDocumentId(documentId);
        } else if (doc.document_type === 'EXAMEN_LAB') {
            structured = await DocumentRepository.findLabReportByDocumentId(documentId);
        }

        const { file_path, ocr_raw_text, encrypted_notes, ...safeDocument } = doc;
        return { ...safeDocument, structured };
    }

    static async updateDocument(documentId, user, data = {}) {
        if (user.role !== 'PACIENTE') throw inputError('Solo el paciente puede actualizar su documento.');
        if (!isDocumentId(documentId)) throw inputError('Identificador de documento no válido.');
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const current = (await client.query('SELECT * FROM documents WHERE id = $1 FOR UPDATE', [documentId])).rows[0];
            if (!current || current.patient_id !== user.id || !editableStatuses.has(current.status)) {
                const error = new Error('Documento no disponible para actualizar.');
                error.statusCode = 404;
                throw error;
            }

            const type = data.documentType ?? current.document_type;
            if (!documentTypes.has(type)) throw inputError('Tipo de documento no válido.');
            const title = limitedText(data.title ?? current.title, 200, 'El título', true);
            const documentDate = optionalDate(data.documentDate ?? current.document_date, 'La fecha de emisión');
            const doctor = limitedText(data.issuingDoctor ?? current.issuing_doctor, 150, 'El profesional');
            const institution = limitedText(data.issuingInstitution ?? current.issuing_institution, 150, 'La institución');
            const changedType = type !== current.document_type;
            const structuredProvided = changedType || ['medications', 'diagnosisText', 'validUntil', 'labMetrics', 'observations'].some((key) => Object.hasOwn(data, key));
            if (structuredProvided && type === 'RECETA' && !Array.isArray(data.medications)) throw inputError('Envía la lista completa de medicamentos.');
            if (structuredProvided && type === 'EXAMEN_LAB' && !Array.isArray(data.labMetrics)) throw inputError('Envía la lista completa de resultados.');

            const updated = (await client.query(
                `UPDATE documents SET title=$1, document_type=$2, document_date=$3,
                 issuing_doctor=$4, issuing_institution=$5, status='CONFIRMADO',
                 updated_at=NOW() WHERE id=$6 RETURNING *`,
                [title, type, documentDate, doctor, institution, documentId],
            )).rows[0];

            if (structuredProvided) {
                await client.query('DELETE FROM prescriptions WHERE document_id=$1', [documentId]);
                await client.query('DELETE FROM lab_reports WHERE document_id=$1', [documentId]);

                if (type === 'RECETA') {
                    const medications = data.medications ?? [];
                    if (!Array.isArray(medications) || medications.length > 50) throw inputError('La lista de medicamentos no es válida.');
                    const diagnosis = limitedText(data.diagnosisText, 255, 'El diagnóstico');
                    const validUntil = optionalDate(data.validUntil, 'La vigencia');
                    const rx = (await client.query(
                        `INSERT INTO prescriptions (document_id, patient_id, doctor_name, diagnosis_text, issue_date, valid_until)
                         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
                        [documentId, user.id, doctor, diagnosis, documentDate, validUntil],
                    )).rows[0];
                    for (const medication of medications) {
                        const name = limitedText(medication.name, 150, 'El medicamento', true);
                        await client.query(
                            `INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
                             VALUES ($1,$2,$3,$4,$5,$6)`,
                            [rx.id, name, limitedText(medication.dosage, 50, 'La dosis'), limitedText(medication.frequency, 100, 'La frecuencia'), limitedText(medication.duration, 100, 'La duración'), limitedText(medication.instructions, 2000, 'Las indicaciones')],
                        );
                    }
                } else if (type === 'EXAMEN_LAB') {
                    const metrics = data.labMetrics ?? [];
                    if (!Array.isArray(metrics) || metrics.length > 100) throw inputError('La lista de resultados no es válida.');
                    const observations = limitedText(data.observations, 3000, 'Las observaciones');
                    const report = (await client.query(
                        `INSERT INTO lab_reports (document_id, patient_id, laboratory_name, sample_date, observations)
                         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                        [documentId, user.id, institution, documentDate, observations],
                    )).rows[0];
                    for (const metric of metrics) {
                        await client.query(
                            `INSERT INTO lab_test_items (lab_report_id, test_name, result_value, unit, reference_range, is_abnormal)
                             VALUES ($1,$2,$3,$4,$5,$6)`,
                            [report.id, limitedText(metric.name, 150, 'El parámetro', true), limitedText(metric.value, 50, 'El resultado', true), limitedText(metric.unit, 30, 'La unidad'), limitedText(metric.referenceRange, 100, 'El rango'), Boolean(metric.isAbnormal)],
                        );
                    }
                }
            } else {
                await client.query('UPDATE prescriptions SET doctor_name=$1, issue_date=$2 WHERE document_id=$3', [doctor, documentDate, documentId]);
                await client.query('UPDATE lab_reports SET laboratory_name=$1, sample_date=$2 WHERE document_id=$3', [institution, documentDate, documentId]);
            }

            await client.query(
                `INSERT INTO audit_logs (user_id, patient_id, action, details, ip_address)
                 VALUES ($1,$2,'UPDATE_DOCUMENT',$3,'0.0.0.0')`,
                [user.id, user.id, JSON.stringify({ documentId, documentType: type, structuredUpdated: structuredProvided })],
            );
            await client.query('COMMIT');
            const { file_path, ocr_raw_text, encrypted_notes, ...safeDocument } = updated;
            return safeDocument;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async getDocumentFile(documentId, patientId) {
        if (!isDocumentId(documentId)) throw inputError('Identificador de documento no válido.');
        const doc = await DocumentRepository.findById(documentId);
        if (!doc || doc.patient_id !== patientId || ['TEMP', 'ELIMINADO'].includes(doc.status)) {
            const error = new Error('Archivo no disponible.');
            error.statusCode = 404;
            throw error;
        }
        return this.readStoredFile(doc);
    }

    static async readStoredFile(doc) {
        let buffer;
        if (SupabaseService.isSupabaseUrl(doc.file_path)) {
            buffer = await SupabaseService.downloadFile(doc.file_path);
        } else {
            const resolved = path.resolve(doc.file_path || '');
            if (!resolved.startsWith(`${UPLOAD_DIR}${path.sep}`) || !fs.existsSync(resolved)) {
                const error = new Error('El archivo original no está disponible.');
                error.statusCode = 404;
                throw error;
            }
            buffer = await fs.promises.readFile(resolved);
        }
        return { buffer, mimeType: doc.mime_type || 'application/octet-stream', fileName: doc.file_name || 'documento' };
    }

    static async deleteDocument(documentId, user) {
        if (!isDocumentId(documentId)) throw inputError('Identificador de documento no válido.');
        const doc = await DocumentRepository.findById(documentId);
        if (!doc) {
            const error = new Error('Documento no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (user.role !== 'PACIENTE' || doc.patient_id !== user.id) {
            const error = new Error('No tienes permiso para eliminar este documento.');
            error.statusCode = 403;
            throw error;
        }

        if (doc.status === 'ELIMINADO' || doc.status === 'TEMP') {
            const error = new Error(
                'Este documento ya no está disponible para eliminar.'
            );
            error.statusCode = 400;
            throw error;
        }

        await DocumentRepository.softDelete(documentId);
        const fileDeleted = await this._removeStoredFile(doc.file_path);

        await DocumentRepository.logAudit({
            userId: user.id,
            patientId: doc.patient_id,
            action: 'DELETE_DOCUMENT',
            details: {
                documentId,
                previous_status: doc.status,
                document_type: doc.document_type,
                file_deleted: fileDeleted,
            },
            ipAddress: '0.0.0.0',
        });

        return { id: documentId, deleted: true, fileDeleted };
    }

    // ─── PRIVADOS ───────────────────────────────────────────────────────────

    static async _sendToAiService(fileInput, fileName, mimeType) {
        const form = new FormData();
        const fileContent = Buffer.isBuffer(fileInput) ? fileInput : fs.createReadStream(fileInput);
        form.append('file', fileContent, {
            filename: fileName,
            contentType: mimeType,
        });

        const response = await axios.post(
            `${AI_SERVICE_URL}/api/v1/ai/process-document`,
            form,
            {
                headers: form.getHeaders(),
                timeout: 60000, // 60s (OCR + LLM puede tardar)
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        return response.data;
    }

    /**
     * Guarda el archivo en Supabase Storage o en disco local como fallback.
     */
    static async _storeFile(file) {
        const fileBuffer = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);
        const originalName = file.originalname || 'documento';
        const mimeType = file.mimetype || 'application/octet-stream';
        const ext = path.extname(originalName).toLowerCase() || '.png';
        const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

        // 1. Intentar almacenar en Supabase Storage
        if (SupabaseService.isConfigured() && fileBuffer) {
            try {
                const uploadRes = await SupabaseService.uploadFile(fileBuffer, originalName, mimeType);
                return {
                    filePath: uploadRes.publicUrl,
                    fileName: uploadRes.fileName,
                    isRemote: true,
                };
            } catch (err) {
                console.warn('[DocumentService] Fallo al subir a Supabase Storage, activando fallback local:', err.message);
            }
        }

        // 2. Fallback local en carpeta uploads/
        const localPath = path.join(UPLOAD_DIR, uniqueName);
        if (fileBuffer) {
            fs.writeFileSync(localPath, fileBuffer);
        }
        return {
            filePath: localPath,
            fileName: uniqueName,
            isRemote: false,
        };
    }

    /**
     * Elimina el archivo físico de Supabase Storage o del disco local según corresponda.
     */
    static async _removeStoredFile(filePath) {
        if (!filePath) return false;

        if (SupabaseService.isSupabaseUrl(filePath)) {
            return SupabaseService.deleteFile(filePath);
        }

        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                return true;
            } catch (err) {
                console.error('[DocumentService] Error eliminando archivo físico local:', err.message);
            }
        }

        return false;
    }

    /**
     * Extrae el número máximo de días de duración entre los medicamentos.
     * Soporta duration_days numérico y fallback por regex sobre duration.
     */
    static _extractMaxDurationDays(medications = []) {
        if (!Array.isArray(medications) || medications.length === 0) return null;

        let maxDays = null;

        for (const med of medications) {
            let days = null;

            // 1. Si viene duration_days como número
            if (med.duration_days !== undefined && med.duration_days !== null && !isNaN(Number(med.duration_days))) {
                const parsed = parseInt(med.duration_days, 10);
                if (parsed > 0) days = parsed;
            }

            // 2. Fallback: parsear duration como string
            if (days === null && med.duration && typeof med.duration === 'string') {
                const text = med.duration.toLowerCase().trim();
                const match = text.match(/(\d+)\s*(d[ií]as?|semanas?|mes(?:es)?)/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    const unit = match[2].toLowerCase();
                    if (unit.startsWith('d')) {
                        days = num;
                    } else if (unit.startsWith('sem')) {
                        days = num * 7;
                    } else if (unit.startsWith('m')) {
                        days = num * 30;
                    }
                }
            }

            if (days !== null) {
                if (maxDays === null || days > maxDays) {
                    maxDays = days;
                }
            }
        }

        return maxDays;
    }

    static async _updateDocumentAfterAi(documentId, { document_type, ocr_raw_text, document_date }) {
        const db = require('../config/db');
        const query = `
      UPDATE documents
      SET document_type = $1,
          ocr_raw_text = $2,
          document_date = COALESCE($3, document_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
        const result = await db.query(query, [document_type, ocr_raw_text, document_date || null, documentId]);
        return result.rows[0];
    }

    static async _savePrescription({ documentId, patientId, aiResult }) {
        const diagnosisText = (aiResult.diagnoses || []).join(', ') || null;
        let issueDateStr = aiResult.document_date || null;
        if (!issueDateStr || isNaN(new Date(issueDateStr).getTime())) {
            issueDateStr = new Date().toISOString().split('T')[0];
        }

        const maxDurationDays = this._extractMaxDurationDays(aiResult.medications || []);
        let validUntilStr = null;
        if (maxDurationDays && maxDurationDays > 0) {
            const baseDate = new Date(issueDateStr + 'T00:00:00');
            const expDate = new Date(baseDate.getTime() + maxDurationDays * 24 * 60 * 60 * 1000);
            validUntilStr = expDate.toISOString().split('T')[0];
        }

        const prescription = await DocumentRepository.createPrescription({
            document_id: documentId,
            patient_id: patientId,
            doctor_name: null, // La IA no extrae esto actualmente
            diagnosis_text: diagnosisText,
            issue_date: issueDateStr,
            valid_until: validUntilStr,
            is_chronic: false,
        });

        const items = [];
        for (const med of aiResult.medications || []) {
            const item = await DocumentRepository.createPrescriptionItem({
                prescription_id: prescription.id,
                medication_name: med.name,
                dosage: med.dosage || null,
                frequency: med.frequency || null,
                duration: med.duration || null,
                instructions: aiResult.summary || null,
            });
            items.push(item);
        }

        return { ...prescription, items };
    }

    static async _saveLabReport({ documentId, patientId, aiResult }) {
        const report = await DocumentRepository.createLabReport({
            document_id: documentId,
            patient_id: patientId,
            laboratory_name: null,
            sample_date: null,
            observations: aiResult.summary || null,
        });

        const items = [];
        for (const metric of aiResult.lab_metrics || []) {
            const item = await DocumentRepository.createLabTestItem({
                lab_report_id: report.id,
                test_name: metric.test_name,
                result_value: String(metric.value),
                unit: metric.unit || null,
                reference_range: metric.reference_range || null,
                is_abnormal: metric.is_abnormal || false,
            });
            items.push(item);
        }

        return { ...report, items };
    }

    static _buildTitle(originalName) {
        const base = path.parse(originalName).name;
        const date = new Date().toISOString().slice(0, 10);
        return `${base} - ${date}`.slice(0, 200);
    }

    static _normalizeDocumentType(type) {
        const valid = ['RECETA', 'EXAMEN_LAB', 'INFORME', 'IMAGEN', 'OTRO'];
        const upper = (type || 'OTRO').toUpperCase().replace(/\s+/g, '_');
        // El ai-service devuelve "INFORME_MEDICO"; lo mapeamos a "INFORME"
        if (upper === 'INFORME_MEDICO') return 'INFORME';
        return valid.includes(upper) ? upper : 'OTRO';
    }
}

module.exports = DocumentService;
