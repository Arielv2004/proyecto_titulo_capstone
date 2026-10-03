import api from './api';

/**
 * API de documentos clínicos (recetas, exámenes, informes).
 * Todos los endpoints requieren sesión activa (cookie HttpOnly).
 */
export const documentsApi = {
  /**
   * Sube un archivo y devuelve el análisis de la IA.
   * @param {File} file
   * @param {(percent: number) => void} [onProgress]
   */
  async upload(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000, // 90s: OCR + LLM puede tardar
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });

    return data; // { success, message, data: { document, analysis, structured } }
  },

  /**
   * Envía un archivo para análisis preliminar de IA sin persistir en historial.
   * Devuelve { tempId, document, analysis, isUnreadable }.
   * @param {File} file
   * @param {(percent: number) => void} [onProgress]
   */
  async analyze(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/documents/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });

    return data; // { success, data: { tempId, document, analysis, isUnreadable } }
  },

  /**
   * Confirma un documento temporal y crea las recetas o exámenes con los datos validados por el paciente.
   * @param {string} tempId
   * @param {object} editedData
   * @param {boolean} [wasReviewed=true]
   */
  async confirm(tempId, editedData, wasReviewed = true) {
    const { data } = await api.post('/documents/confirm', { tempId, editedData, wasReviewed });
    return data; // { success, data: { document, structured } }
  },

  /**
   * Descarta un documento temporal y elimina el archivo físico en el servidor.
   * @param {string} tempId
   */
  async discard(tempId) {
    const { data } = await api.post('/documents/discard', { tempId });
    return data; // { success, data: { id, discarded, fileDeleted } }
  },

  /**
   * Ejecuta la limpieza de documentos temporales antiguos (>24h).
   */
  async cleanupTemps() {
    const { data } = await api.post('/documents/cleanup-temps');
    return data;
  },

  /**
   * Lista los documentos del paciente autenticado.
   * @param {{ document_type?: string }} [filters]
   */
  async list(filters = {}) {
    const { data } = await api.get('/documents', { params: filters });
    return data; // { success, data: [...] }
  },

  /**
   * Obtiene el detalle completo de un documento.
   * @param {string} id
   */
  async getById(id) {
    const { data } = await api.get(`/documents/${id}`);
    return data;
  },

  /**
   * Elimina (soft delete) un documento con estado ERROR o PROCESANDO.
   * @param {string} id
   */
  async remove(id) {
    const { data } = await api.delete(`/documents/${id}`);
    return data;
  },
};

/**
 * Normaliza un documento del backend al formato que usa el dashboard.
 */
export const mapDocumentFromApi = (doc) => {
  const typeMap = {
    RECETA: 'RECETA',
    EXAMEN_LAB: 'EXAMEN',
    INFORME: 'CONSULTA',
    IMAGEN: 'IMAGEN',
    OTRO: 'CONSULTA',
  };

  const statusMap = {
    PROCESANDO: 'PROCESANDO',
    PENDIENTE_REVISION: 'PENDIENTE',
    CONFIRMADO: 'CONFIRMADA',
  };

  const dateObj = doc.created_at ? new Date(doc.created_at) : new Date();
  const dateStr = dateObj.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const structured = doc.structured || {};
  const meds = structured.items || [];
  const isOther = doc.document_type === 'OTRO';
  const summary = meds.length
    ? `${meds.length} medicamento${meds.length > 1 ? 's' : ''} prescrito${meds.length > 1 ? 's' : ''}`
    : isOther
      ? 'Sin información médica clínica detectada'
      : doc.ocr_raw_text
        ? doc.ocr_raw_text.slice(0, 90).replace(/\s+/g, ' ') + '...'
        : 'Sin resumen disponible';

  const validUntilStr = structured.valid_until
    ? new Date(String(structured.valid_until).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const issueDateStr = structured.issue_date
    ? new Date(String(structured.issue_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return {
    id: doc.id,
    category: typeMap[doc.document_type] || 'CONSULTA',
    title: doc.title || (isOther ? 'Documento no médico' : 'Documento sin título'),
    institution: doc.issuing_institution || (isOther ? '—' : 'Institución no especificada'),
    doctor: doc.issuing_doctor || '—',
    date: dateStr,
    status: statusMap[doc.status] || doc.status,
    summary,
    validUntilRaw: structured.valid_until || null,
    validUntil: validUntilStr,
    extractedData: {
      medicamentos: meds.map((m) => ({
        nombre: m.medication_name,
        name: m.medication_name,
        dosis: m.dosage || '—',
        dosage: m.dosage || '—',
        posologia: m.frequency || '—',
        frequency: m.frequency || '—',
        duracion: m.duration || '—',
        duration: m.duration || '—',
        horario: m.instructions || '—',
        instructions: m.instructions || '—',
      })),
      parametros: (structured.items || []).map((it) => ({
        nombre: it.test_name || it.medication_name,
        valor: it.result_value || it.dosage,
        rangoRef: it.reference_range || '—',
        estado: it.is_abnormal ? 'ANORMAL' : 'NORMAL',
      })),
      diagnostico: isOther ? 'Sin diagnóstico clínico' : (structured.diagnosis_text || 'Sin diagnóstico registrado'),
      indicaciones: structured.observations || '—',
      vigenciaHasta: validUntilStr,
      fechaEmision: issueDateStr,
      validUntilRaw: structured.valid_until || null,
      issueDateRaw: structured.issue_date || null,
    },
    encryption: 'AES-256-GCM',
    confidence: doc.ocr_confidence ? `${doc.ocr_confidence}%` : '—',
    filePath: doc.file_path || null,
    fileName: doc.file_name || null,
    mimeType: doc.mime_type || null,
  };
};