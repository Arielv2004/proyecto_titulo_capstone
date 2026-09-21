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
  const summary = meds.length
    ? `${meds.length} medicamento${meds.length > 1 ? 's' : ''} prescrito${meds.length > 1 ? 's' : ''}`
    : doc.ocr_raw_text
      ? doc.ocr_raw_text.slice(0, 90).replace(/\s+/g, ' ') + '...'
      : 'Sin resumen disponible';

  return {
    id: doc.id,
    category: typeMap[doc.document_type] || 'CONSULTA',
    title: doc.title || 'Documento sin título',
    institution: doc.issuing_institution || 'Institución no especificada',
    doctor: doc.issuing_doctor || '—',
    date: dateStr,
    status: statusMap[doc.status] || doc.status,
    summary,
    extractedData: {
      medicamentos: meds.map((m) => ({
        nombre: m.medication_name,
        dosis: m.dosage || '—',
        posologia: m.frequency || '—',
        duracion: m.duration || '—',
        horario: m.instructions || '—',
      })),
      parametros: (structured.items || []).map((it) => ({
        nombre: it.test_name || it.medication_name,
        valor: it.result_value || it.dosage,
        rangoRef: it.reference_range || '—',
        estado: it.is_abnormal ? 'ANORMAL' : 'NORMAL',
      })),
      diagnostico: structured.diagnosis_text || 'Sin diagnóstico registrado',
      indicaciones: structured.observations || '—',
    },
    encryption: 'AES-256-GCM',
    confidence: doc.ocr_confidence ? `${doc.ocr_confidence}%` : '—',
  };
};