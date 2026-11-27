const db = require('../config/db');
const clinical = require('../services/clinical-store.service');

class DocumentRepository {
  // ─── DOCUMENTO PRINCIPAL ────────────────────────────────────────────────
  static async createDocument(data, client) {
    return clinical.create('documents', {status:'PROCESANDO',...data}, client);
  }

  static async updateDocumentStatus(documentId, status, ocrConfidence = null) {
    const query = `
      UPDATE documents
      SET status = $1,
          ocr_confidence = COALESCE($2, ocr_confidence),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const result = await db.query(query, [status, ocrConfidence, documentId]);
    return result.rows[0];
  }

  static async findById(documentId) {
    const query = `
      SELECT
        d.*,
        p.rut AS patient_rut,
        p.first_name AS patient_first_name,
        p.last_name AS patient_last_name
      FROM documents d
      INNER JOIN users p ON p.id = d.patient_id
      WHERE d.id = $1;
    `;
    const result = await db.query(query, [documentId]);
    return result.rows[0] || null;
  }

  static async findTempById(documentId) {
    const query = `
      SELECT
        d.*,
        p.rut AS patient_rut,
        p.first_name AS patient_first_name,
        p.last_name AS patient_last_name
      FROM documents d
      INNER JOIN users p ON p.id = d.patient_id
      WHERE d.id = $1 AND d.status = 'TEMP';
    `;
    const result = await db.query(query, [documentId]);
    return result.rows[0] || null;
  }

  static async findByPatient(patientId, { document_type = null } = {}) {
    let query = `
      SELECT
        d.id, d.patient_id, d.uploaded_by, d.document_type, d.title,
        d.file_name, d.file_path, d.mime_type, d.file_size_bytes,
        d.document_date, d.issuing_doctor, d.issuing_institution,
        d.status, d.created_at, d.updated_at,
        CASE
          WHEN d.document_type = 'RECETA' THEN (
            SELECT json_build_object(
              'id', rx.id,
              'document_id', rx.document_id,
              'doctor_name', rx.doctor_name,
              'diagnosis_text', rx.diagnosis_text,
              'issue_date', rx.issue_date,
              'valid_until', rx.valid_until,
              'is_chronic', rx.is_chronic,
              'status', rx.status,
              'items', COALESCE((
                SELECT json_agg(json_build_object(
                  'id', ri.id,
                  'prescription_id', ri.prescription_id,
                  'medication_name', ri.medication_name,
                  'dosage', ri.dosage,
                  'frequency', ri.frequency,
                  'duration', ri.duration,
                  'instructions', ri.instructions
                ))
                FROM prescription_items ri
                WHERE ri.prescription_id = rx.id
              ), '[]'::json)
            )
            FROM prescriptions rx
            WHERE rx.document_id = d.id
            LIMIT 1
          )
          WHEN d.document_type = 'EXAMEN_LAB' THEN (
            SELECT json_build_object(
              'id', lr.id,
              'document_id', lr.document_id,
              'laboratory_name', lr.laboratory_name,
              'sample_date', lr.sample_date,
              'observations', lr.observations,
              'items', COALESCE((
                SELECT json_agg(json_build_object(
                  'id', li.id,
                  'lab_report_id', li.lab_report_id,
                  'test_name', li.test_name,
                  'result_value', li.result_value,
                  'unit', li.unit,
                  'reference_range', li.reference_range,
                  'is_abnormal', li.is_abnormal
                ))
                FROM lab_test_items li
                WHERE li.lab_report_id = lr.id
              ), '[]'::json)
            )
            FROM lab_reports lr
            WHERE lr.document_id = d.id
            LIMIT 1
          )
          ELSE NULL
        END AS structured
      FROM documents d
      WHERE d.patient_id = $1
        AND d.status <> 'ELIMINADO'
        AND d.status <> 'TEMP'
    `;
    const values = [patientId];

    if (document_type) {
      values.push(document_type);
      query += ` AND d.document_type = $${values.length}`;
    }

    query += ` ORDER BY d.created_at DESC;`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // ─── RECETAS ────────────────────────────────────────────────────────────
  static async createPrescription(data, client) {
    return clinical.create('prescriptions', {status:'ACTIVA',is_chronic:false,...data}, client);
  }

  static async createPrescriptionItem(data, client) {
    return clinical.create('prescription_items', {...data}, client);
  }

  static async findPrescriptionByDocumentId(documentId) {
    const query = `
      SELECT * FROM prescriptions WHERE document_id = $1;
    `;
    const result = await db.query(query, [documentId]);
    if (!result.rows[0]) return null;

    const prescription = result.rows[0];

    const itemsQuery = `
      SELECT * FROM prescription_items
      WHERE prescription_id = $1
      ORDER BY created_at ASC;
    `;
    const items = await db.query(itemsQuery, [prescription.id]);

    return { ...prescription, items: items.rows };
  }

  // ─── EXÁMENES DE LABORATORIO ────────────────────────────────────────────
  static async createLabReport(data, client) {
    return clinical.create('lab_reports', {...data}, client);
  }

  static async createLabTestItem(data, client) {
    return clinical.create('lab_test_items', {is_abnormal:false,...data}, client);
  }

  static async findLabReportByDocumentId(documentId) {
    const query = `SELECT * FROM lab_reports WHERE document_id = $1;`;
    const result = await db.query(query, [documentId]);
    if (!result.rows[0]) return null;

    const report = result.rows[0];

    const itemsQuery = `
      SELECT * FROM lab_test_items
      WHERE lab_report_id = $1
      ORDER BY created_at ASC;
    `;
    const items = await db.query(itemsQuery, [report.id]);

    return { ...report, items: items.rows };
  }

  // ─── AUDITORÍA ──────────────────────────────────────────────────────────
  static async logAudit({
    userId = null,
    patientId = null,
    action,
    details = null,
    ipAddress = '0.0.0.0',
    userAgent = null,
  }, runner = db) {
    const query = `
      INSERT INTO audit_logs (
        user_id, patient_id, action, details, ip_address, user_agent
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *;
    `;
    const values = [
      userId,
      patientId,
      action,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
    ];
    const result = await runner.query(query, values);
    return result.rows[0];
  }


  static async softDelete(documentId) {
    const query = `
      UPDATE documents
      SET status = 'ELIMINADO',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const result = await db.query(query, [documentId]);
    return result.rows[0] || null;
  }

  static async updateDocumentOnConfirm(id, changes = {}, client) {
    return clinical.update('documents', id, {
      status:'PENDIENTE_REVISION',
      ...Object.fromEntries(Object.entries(changes).filter(([,value])=>value!=null)),
      updated_at:new Date(),
    }, client);
  }

  static async findExpiredTemps(hours = 24) {
    const query = `
      SELECT id, file_path, patient_id, status, created_at
      FROM documents
      WHERE status = 'TEMP'
        AND created_at < NOW() - ($1 || ' hours')::INTERVAL;
    `;
    const result = await db.query(query, [hours]);
    return result.rows;
  }

  static async markManyAsEliminado(documentIds) {
    if (!documentIds || !documentIds.length) return [];
    const query = `
      UPDATE documents
      SET status = 'ELIMINADO',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1::uuid[])
      RETURNING *;
    `;
    const result = await db.query(query, [documentIds]);
    return result.rows;
  }

  static async findPrescriptionById(id) {
    const query = `
      SELECT
        p.id,
        p.document_id,
        p.patient_id,
        p.doctor_name,
        p.diagnosis_code,
        p.diagnosis_text,
        p.issue_date,
        p.valid_until,
        p.is_chronic,
        p.status,
        p.created_at,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', pi.id,
            'prescription_id', pi.prescription_id,
            'medication_name', pi.medication_name,
            'dosage', pi.dosage,
            'frequency', pi.frequency,
            'duration', pi.duration,
            'instructions', pi.instructions
          ))
          FROM prescription_items pi
          WHERE pi.prescription_id = p.id
        ), '[]'::json) AS items
      FROM prescriptions p
      WHERE p.id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updatePrescriptionStatus(id, status) {
    const query = `
      UPDATE prescriptions
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0] || null;
  }
}
clinical.reads(DocumentRepository, {
  findById:'documents', findTempById:'documents', findByPatient:'documents',
  updateDocumentStatus:'documents', softDelete:'documents', markManyAsEliminado:'documents',
  findPrescriptionByDocumentId:'prescriptions', findLabReportByDocumentId:'lab_reports',
  findPrescriptionById:'prescriptions', updatePrescriptionStatus:'prescriptions',
});
module.exports = DocumentRepository;
