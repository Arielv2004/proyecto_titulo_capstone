const db = require('../config/db');

class DocumentRepository {
  // ─── DOCUMENTO PRINCIPAL ────────────────────────────────────────────────
  static async createDocument({
    patient_id,
    uploaded_by,
    document_type,
    title,
    file_name,
    file_path,
    mime_type,
    file_size_bytes,
    ocr_raw_text,
    status = 'PROCESANDO',
  }) {
    const query = `
      INSERT INTO documents (
        patient_id, uploaded_by, document_type, title,
        file_name, file_path, mime_type, file_size_bytes,
        ocr_raw_text, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *;
    `;
    const values = [
      patient_id, uploaded_by, document_type, title,
      file_name, file_path, mime_type, file_size_bytes,
      ocr_raw_text, status,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
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

  static async findByPatient(patientId, { document_type = null } = {}) {
    let query = `
      SELECT
        d.id, d.patient_id, d.uploaded_by, d.document_type, d.title,
        d.file_name, d.file_path, d.mime_type, d.file_size_bytes,
        d.document_date, d.issuing_doctor, d.issuing_institution,
        d.status, d.created_at, d.updated_at
      FROM documents d
      WHERE d.patient_id = $1
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
  static async createPrescription({
    document_id,
    patient_id,
    doctor_name = null,
    diagnosis_code = null,
    diagnosis_text = null,
    issue_date = null,
    valid_until = null,
    is_chronic = false,
  }) {
    const query = `
      INSERT INTO prescriptions (
        document_id, patient_id, doctor_name, diagnosis_code,
        diagnosis_text, issue_date, valid_until, is_chronic, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVA')
      RETURNING *;
    `;
    const values = [
      document_id, patient_id, doctor_name, diagnosis_code,
      diagnosis_text, issue_date, valid_until, is_chronic,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async createPrescriptionItem({
    prescription_id,
    medication_name,
    dosage = null,
    frequency = null,
    duration = null,
    instructions = null,
  }) {
    const query = `
      INSERT INTO prescription_items (
        prescription_id, medication_name, dosage,
        frequency, duration, instructions
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *;
    `;
    const values = [
      prescription_id, medication_name, dosage,
      frequency, duration, instructions,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
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
  static async createLabReport({
    document_id,
    patient_id,
    laboratory_name = null,
    sample_date = null,
    observations = null,
  }) {
    const query = `
      INSERT INTO lab_reports (
        document_id, patient_id, laboratory_name,
        sample_date, observations
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *;
    `;
    const values = [document_id, patient_id, laboratory_name, sample_date, observations];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async createLabTestItem({
    lab_report_id,
    test_name,
    result_value,
    unit = null,
    reference_range = null,
    is_abnormal = false,
  }) {
    const query = `
      INSERT INTO lab_test_items (
        lab_report_id, test_name, result_value,
        unit, reference_range, is_abnormal
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *;
    `;
    const values = [
      lab_report_id, test_name, result_value,
      unit, reference_range, is_abnormal,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
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
  }) {
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
    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = DocumentRepository;