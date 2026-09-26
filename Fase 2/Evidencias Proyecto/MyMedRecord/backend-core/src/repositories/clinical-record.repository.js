const db = require('../config/db');

class ClinicalRecordRepository {
  // ============================================================
  // PERFIL CLÍNICO DEL PACIENTE
  // ============================================================

  static async findPatientProfile(patientId) {
    const query = `
      SELECT
        pp.id,
        pp.user_id,
        pp.birth_date,
        pp.gender,
        pp.blood_type,
        pp.health_insurance,
        pp.is_organ_donor,
        pp.allergies,
        pp.chronic_conditions,
        pp.emergency_contact_name,
        pp.emergency_contact_phone,
        pp.updated_at
      FROM patient_profiles pp
      WHERE pp.user_id = $1;
    `;

    const result = await db.query(query, [patientId]);

    return result.rows[0] || null;
  }

  // ============================================================
  // DOCUMENTOS DEL PACIENTE
  // ============================================================

  static async findDocuments(patientId) {
    const query = `
      SELECT
        d.id,
        d.document_type,
        d.title,
        d.file_name,
        d.mime_type,
        d.file_size_bytes,
        d.document_date,
        d.issuing_doctor,
        d.issuing_institution,
        d.ocr_confidence,
        d.status,
        d.created_at
      FROM documents d
      WHERE d.patient_id = $1
      ORDER BY
        d.document_date DESC NULLS LAST,
        d.created_at DESC;
    `;

    const result = await db.query(query, [patientId]);

    return result.rows;
  }

  // ============================================================
  // RECETAS + MEDICAMENTOS
  // ============================================================

  static async findPrescriptions(patientId) {
    const prescriptionsQuery = `
      SELECT
        p.id,
        p.document_id,
        p.doctor_name,
        p.diagnosis_code,
        p.diagnosis_text,
        p.issue_date,
        p.valid_until,
        p.is_chronic,
        p.status,
        p.created_at
      FROM prescriptions p
      WHERE p.patient_id = $1
      ORDER BY
        p.issue_date DESC NULLS LAST,
        p.created_at DESC;
    `;

    const prescriptionsResult = await db.query(
      prescriptionsQuery,
      [patientId]
    );

    const prescriptions = prescriptionsResult.rows;

    for (const prescription of prescriptions) {
      const itemsQuery = `
        SELECT
          pi.id,
          pi.medication_name,
          pi.dosage,
          pi.frequency,
          pi.duration,
          pi.instructions,
          pi.created_at
        FROM prescription_items pi
        WHERE pi.prescription_id = $1
        ORDER BY pi.created_at ASC;
      `;

      const itemsResult = await db.query(itemsQuery, [
        prescription.id,
      ]);

      prescription.items = itemsResult.rows;
    }

    return prescriptions;
  }

  // ============================================================
  // EXÁMENES DE LABORATORIO + RESULTADOS
  // ============================================================

  static async findLabReports(patientId) {
    const reportsQuery = `
      SELECT
        lr.id,
        lr.document_id,
        lr.laboratory_name,
        lr.sample_date,
        lr.observations,
        lr.created_at
      FROM lab_reports lr
      WHERE lr.patient_id = $1
      ORDER BY
        lr.sample_date DESC NULLS LAST,
        lr.created_at DESC;
    `;

    const reportsResult = await db.query(reportsQuery, [
      patientId,
    ]);

    const reports = reportsResult.rows;

    for (const report of reports) {
      const itemsQuery = `
        SELECT
          lti.id,
          lti.test_name,
          lti.result_value,
          lti.unit,
          lti.reference_range,
          lti.is_abnormal,
          lti.created_at
        FROM lab_test_items lti
        WHERE lti.lab_report_id = $1
        ORDER BY lti.created_at ASC;
      `;

      const itemsResult = await db.query(itemsQuery, [
        report.id,
      ]);

      report.items = itemsResult.rows;
    }

    return reports;
  }

  // ============================================================
  // DATOS BÁSICOS DEL PACIENTE
  // ============================================================

  static async findPatient(patientId) {
    const query = `
      SELECT
        u.id,
        u.rut,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM users u
      WHERE u.id = $1
        AND u.role = 'PACIENTE';
    `;

    const result = await db.query(query, [patientId]);

    return result.rows[0] || null;
  }
}

module.exports = ClinicalRecordRepository;