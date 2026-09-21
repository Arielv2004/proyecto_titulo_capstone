const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const DocumentRepository = require('../repositories/document.repository');
const config = require('../config/env');

const AI_SERVICE_URL = config.AI_SERVICE_URL;
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Asegurar que la carpeta uploads exista
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

        // 1. Datos del archivo (multer ya lo guardó en disco)
        const fileName = file.filename;
        const filePath = file.path;
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

        // 3. Enviar al ai-service
        let aiResult;
        try {
            aiResult = await this._sendToAiService(filePath, fileName, mimeType);
        } catch (err) {
            // Si la IA falla, dejamos el documento pendiente para revisión manual
            await DocumentRepository.updateDocumentStatus(
                doc.id,
                'PENDIENTE_REVISION'
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
        const documentType = this._normalizeDocumentType(aiResult.document_type);

        // 5. Actualizar documento con el tipo real y el texto OCR
        await this._updateDocumentAfterAi(doc.id, {
            document_type: documentType,
            ocr_raw_text: aiResult.raw_text,
        });

        // 6. Guardar datos estructurados según tipo
        let structured = null;
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

    static async listDocuments(user, { document_type = null } = {}) {
        // Paciente solo ve los suyos
        const patientId = user.id;
        return DocumentRepository.findByPatient(patientId, { document_type });
    }

    static async getDocumentById(documentId, user) {
        const doc = await DocumentRepository.findById(documentId);
        if (!doc) {
            const error = new Error('Documento no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        // Paciente solo puede ver los suyos
        if (user.role === 'PACIENTE' && doc.patient_id !== user.id) {
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

        return { ...doc, structured };
    }

    // ─── PRIVADOS ───────────────────────────────────────────────────────────

    static async _sendToAiService(filePath, fileName, mimeType) {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), {
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

    static async _updateDocumentAfterAi(documentId, { document_type, ocr_raw_text }) {
        const db = require('../config/db');
        const query = `
      UPDATE documents
      SET document_type = $1,
          ocr_raw_text = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
        const result = await db.query(query, [document_type, ocr_raw_text, documentId]);
        return result.rows[0];
    }

    static async _savePrescription({ documentId, patientId, aiResult }) {
        const diagnosisText = (aiResult.diagnoses || []).join(', ') || null;

        const prescription = await DocumentRepository.createPrescription({
            document_id: documentId,
            patient_id: patientId,
            doctor_name: null, // La IA no extrae esto actualmente
            diagnosis_text: diagnosisText,
            issue_date: null,
            valid_until: null,
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