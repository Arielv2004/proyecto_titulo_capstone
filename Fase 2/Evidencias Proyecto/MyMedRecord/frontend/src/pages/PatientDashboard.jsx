import { PatientRecords } from '../components/patient/PatientRecords';
import { QrApprovalRequests } from '../components/patient/QrApprovalRequests';
import { GrantTokenButton } from '../components/patient/GrantTokenButton';
import { PatientHelp } from '../components/patient/PatientHelp';
import { DialogFrame } from '../components/ui/DialogFrame';
import { EditDocumentDialog } from '../components/patient/EditDocumentDialog';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMetaTags } from '../hooks/useMetaTags';
import { documentsApi, mapDocumentFromApi, openDocumentBlob, prepareDocumentWindow } from '../services/documentsApi';

import { useAuthStore } from '../store/useAuthStore';
import { Home, Pill, Stethoscope, ClipboardPenLine, Microscope, HeartPulse, ScanSearch, Camera, QrCode, FileText, Sparkles, ShieldCheck, Building2, User, Clock, CheckCircle2, AlertCircle, Download, Share2, X, HelpCircle, Activity, AlertTriangle, UserCheck, Droplet, Save, Plus, Trash2, Copy, Check, RefreshCw, ExternalLink, Timer, Images, ChevronRight } from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';

import { Navbar } from '../components/common/Navbar';
import { BottomNav } from '../components/common/BottomNav';
import { PatientProfile } from '../components/patient/PatientProfile';
import { PatientHome } from '../components/patient/PatientHome';
import { UploadCamera } from '../components/patient/UploadCamera';
import { SectionNav, Notice, PageHeader, Button, InfoPopover, LoadingState } from '../components/ui/ClinicalUI';

const emptyPatientProfile = () => ({
  bloodType: '',
  healthInsurance: '',
  isOrganDonor: null,
  allergies: [],
  chronicConditions: [],
  emergencyContactName: '',
  emergencyContactPhone: '',
  isCompleted: false,
});

const clearLegacyPatientProfileCache = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key === 'mymedrecord_saved_patient_profile' || key.startsWith('mymedrecord_saved_patient_profile_'))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("No se pudo limpiar la copia local anterior del perfil:");
  }
};


export const PatientDashboard = () => {
  const { user } = useAuthStore();

  useMetaTags('Portal Paciente', 'Ficha clínica digital unificada, recetas inteligentes y exámenes con IA en MyMedRecord.');

  // Pestaña activa ('home' | 'records' | 'help' | 'profile')
  const [currentTab, setCurrentTab] = useState('home');

  // El servidor es la única fuente del perfil clínico.
  const [patientProfile, setPatientProfile] = useState(emptyPatientProfile);

  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Opciones estándar para selección táctil en el perfil (sin escritura manual)
  const PREVISION_OPTIONS = [
    'FONASA Tramo A',
    'FONASA Tramo B',
    'FONASA Tramo C',
    'FONASA Tramo D',
    'ISAPRE Banmédica',
    'ISAPRE Colmena',
    'ISAPRE Consalud',
    'ISAPRE CruzBlanca',
    'ISAPRE Nueva Masvida',
    'ISAPRE Vida Tres',
    'Particular / FF.AA.',
    'Sin Previsión'
  ];

  const BLOOD_TYPE_OPTIONS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-', 'No lo sé'];

  const ALLERGY_OPTIONS = [
    'Penicilina',
    'Amoxicilina',
    'Ibuprofeno / AINEs',
    'Aspirina',
    'Sulfas',
    'Látex',
    'Medios de Contraste',
    'Anestesia Local',
    'Paracetamol',
    'Ninguna Alergia Conocida'
  ];

  const CONDITION_OPTIONS = [
    'Hipertensión Arterial',
    'Diabetes Tipo 2',
    'Diabetes Tipo 1',
    'Asma Bronquial',
    'Hipotiroidismo',
    'Dislipidemia (Colesterol)',
    'Resistencia a la Insulina',
    'Epilepsia',
    'Artrosis / Artritis',
    'Enfermedad Celíaca',
    'Ninguna Enfermedad Crónica'
  ];

  const MEDICATION_OPTIONS = [
    'Losartán / Enalapril',
    'Metformina',
    'Levotiroxina',
    'Atorvastatina',
    'Omeprazol',
    'Inhalador Salbutamol',
    'Aspirina Infantil (100mg)',
    'Paracetamol Habitual',
    'Ningún Fármaco Diario'
  ];

  const SURGERY_OPTIONS = [
    'Apendicectomía (Apéndice)',
    'Colecistectomía (Vesícula)',
    'Cesárea',
    'Cirugía Traumatológica / Prótesis',
    'Cirugía de Hernia',
    'Ninguna Cirugía Previa'
  ];

  const [editFormData, setEditFormData] = useState({
    bloodType: '',
    healthInsurance: '',
    isOrganDonor: true,
    allergies: [],
    chronicConditions: [],
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  // Filtros y búsqueda en pestaña de Documentos
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  const [savingDocument, setSavingDocument] = useState(false);
  const [editDocumentError, setEditDocumentError] = useState('');
  const [replacingDocumentId, setReplacingDocumentId] = useState(null);
  const [openingFileId, setOpeningFileId] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrGrantId, setSelectedQrGrantId] = useState(null);
  const [showNewQrForm, setShowNewQrForm] = useState(false);
  // Compartir ficha directamente con un médico registrado
  const [showDirectShareModal, setShowDirectShareModal] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [directShareDuration, setDirectShareDuration] = useState(12);
  const [isSharingDirect, setIsSharingDirect] = useState(false);
  const [directShareError, setDirectShareError] = useState(null);
  const [directShareSuccess, setDirectShareSuccess] = useState(null);

  // Estado para gestión dinámica de QR de Acceso Médico (Ley N° 21.668)
  const [qrDuration, setQrDuration] = useState(12); // 2, 12, 24 horas
  const [activeGrant, setActiveGrant] = useState(null);
  const [isLoadingGrant, setIsLoadingGrant] = useState(false);
  const [isGeneratingGrant, setIsGeneratingGrant] = useState(false);
  const [isRevokingGrant, setIsRevokingGrant] = useState(false);
  const [grantError, setGrantError] = useState(null);
  const [copiedQrToken, setCopiedQrToken] = useState(false);
  const [remainingTimeText, setRemainingTimeText] = useState('');
  const [shareBaseUrl, setShareBaseUrl] = useState(() =>
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) ? null : window.location.origin,
  );
  const [shareUrlError, setShareUrlError] = useState('');
  const [resolvingShareUrl, setResolvingShareUrl] = useState(() =>
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname),
  );
  const qrAccessUrl = shareBaseUrl && activeGrant?.token
    ? `${shareBaseUrl}/doctor/qr-access#token=${encodeURIComponent(activeGrant.token)}` : '';

  // Estado para Lista de Pases QR y Accesos (Punto 2)
  const [myGrants, setMyGrants] = useState([]);
  const [loadingGrants, setLoadingGrants] = useState(true);
  const [grantsError, setGrantsError] = useState('');

  // Estado para Bitácora de Auditoría (Punto 3 - Ley 21.668)
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [auditError, setAuditError] = useState('');

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  // 1. Cargar perfil clínico real desde la base de datos PostgreSQL (Punto 1)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/patient-profile/me');
        if (!res.data?.success || !res.data?.data) {
          throw new Error('El servidor no devolvió el perfil del paciente.');
        }
        if (mounted) {
          const d = res.data.data;
          const p = {
            bloodType: d.blood_type || '',
            healthInsurance: d.health_insurance || '',
            isOrganDonor: d.is_organ_donor ?? null,
            allergies: Array.isArray(d.allergies) ? d.allergies : [],
            chronicConditions: Array.isArray(d.chronic_conditions) ? d.chronic_conditions : [],
            emergencyContactName: d.emergency_contact_name || '',
            emergencyContactPhone: d.emergency_contact_phone || '',
            isCompleted: !!(d.blood_type && d.health_insurance)
          };
          setPatientProfile(p);
          clearLegacyPatientProfileCache();
        }
      } catch (err) {
        console.warn("Error cargando perfil del paciente desde backend:");
        if (mounted) setProfileError('Intenta actualizar la página para volver a consultar tus antecedentes.');
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 2. Cargar lista de pases y accesos del paciente (Punto 2)
  const fetchMyGrants = async () => {
    try {
      setLoadingGrants(true);
      setGrantsError('');
      const res = await api.get('/access-grants/my-grants');
      if (res.data?.success) {
        setMyGrants(res.data.data || []);
      }
    } catch (err) {
      console.warn("Error cargando pases de acceso:");
      setGrantsError('Intenta actualizar para volver a consultar los permisos.');
    } finally {
      setLoadingGrants(false);
    }
  };

  useEffect(() => {
    fetchMyGrants();
  }, []);

  // 3. Cargar bitácora de auditoría (Punto 3 - Ley N° 21.668)
  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      setAuditError('');
      const res = await api.get('/audit/my-logs');
      if (res.data?.success) {
        setAuditLogs(res.data.data || []);
      }
    } catch (err) {
      console.warn("Error cargando bitácora de auditoría:");
      setAuditError('Intenta actualizar para volver a consultar la actividad.');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Refrescar en tiempo real al ingresar a la pestana de auditoria y accesos
  useEffect(() => {
    if (currentTab === 'audit') {
      fetchAuditLogs();
      fetchMyGrants();
    }
  }, [currentTab]);

  // Documentos Médicos Digitalizados (Extraídos por IA)
  // Documentos Médicos Digitalizados (cargados desde el backend)
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsError, setDocsError] = useState(null);

  const refreshDocuments = async () => {
    const res = await documentsApi.list();
    const mapped = (res.data || []).map(mapDocumentFromApi);
    setDocuments(mapped);
    return mapped;
  };

  // Cargar documentos del backend al montar el componente
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingDocs(true);
        setDocsError(null);
        if (mounted) {
          await refreshDocuments();
        }
      } catch (err) {
        if (mounted) {
          setDocsError(
            err.response?.data?.message || 'Error al cargar tus documentos'
          );
        }
      } finally {
        if (mounted) setLoadingDocs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Estados para Modal de Subida y Pre-confirmación con IA
  // null (cerrado) | 'idle' | 'analyzing' | 'preview' | 'confirmed'
  const [uploadModalState, setUploadModalState] = useState(null);
  const [uploadSource, setUploadSource] = useState('choices');
  const galleryInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [tempDocument, setTempDocument] = useState(null);
  const [editedData, setEditedData] = useState({
    document_type: 'RECETA',
    diagnostico: '',
    medications: [],
    labMetrics: [],
    documentDate: '',
  });
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);
  const [isSubmittingDiscard, setIsSubmittingDiscard] = useState(false);
  const [confirmedStatus, setConfirmedStatus] = useState('CONFIRMADO');
  const [replacementWarning, setReplacementWarning] = useState('');

  const handleOpenUploadModal = () => {
    setReplacingDocumentId(null);
    setUploadSource('choices');
    setUploadError(null);
    setReplacementWarning('');
    setUploadProgress(0);
    setTempDocument(null);
    setEditedData({
      document_type: 'RECETA',
      diagnostico: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
      labMetrics: [],
      documentDate: '',
    });
    setUploadModalState('idle');
  };

  const handleCloseUploadModal = () => {
    if (uploadModalState === 'preview' && tempDocument?.tempId) {
      handleDiscardDocument(false);
    } else {
      if (tempDocument?.filePreviewUrl) {
        URL.revokeObjectURL(tempDocument.filePreviewUrl);
      }
      setTempDocument(null);
      setUploadModalState(null);
    }
  };

  const handleStartAnalyze = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setUploadError('Formato no compatible. Usa una imagen JPG, PNG o WEBP, o un archivo PDF.');
      setUploadSource('choices');
      return;
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo debe tener contenido y pesar como máximo 10 MB.');
      setUploadSource('choices');
      return;
    }
    setUploadSource('choices');
    setUploadError(null);
    setUploadProgress(0);
    setUploadModalState('analyzing');

    const previewUrl = file.type && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

    try {
      const res = await documentsApi.analyze(file, (pct) => setUploadProgress(pct));
      const { tempId, document: doc, analysis, isUnreadable } = res.data;

      const isMedicalDoc = analysis?.is_medical_document !== false;

      const initialMeds = isMedicalDoc
        ? (analysis?.medications || []).map((m) => ({
            name: m.name || '',
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            duration: m.duration || '',
          }))
        : [];

      const initialDiag = isMedicalDoc
        ? ((analysis?.diagnoses && analysis.diagnoses.length > 0 ? analysis.diagnoses.join(', ') : '') ||
          analysis?.summary ||
          '')
        : '';

      const unreadableFlag =
        isMedicalDoc && Boolean(isUnreadable);

      setTempDocument({
        tempId,
        file, // Guardado en el estado
        filePreviewUrl: previewUrl,
        document: doc,
        analysis,
        isUnreadable: unreadableFlag,
      });

      setEditedData({
        document_type: doc?.document_type || (isMedicalDoc ? 'RECETA' : 'OTRO'),
        diagnostico: initialDiag,
        medications: isMedicalDoc
          ? (initialMeds.length > 0 ? initialMeds : [{ name: '', dosage: '', frequency: '', duration: '' }])
          : [],
        labMetrics: (analysis?.lab_metrics || []).map((metric) => ({
          name: metric.test_name || '', value: String(metric.value ?? metric.result_value ?? ''),
          unit: metric.unit || '', referenceRange: metric.reference_range || '',
          isAbnormal: Boolean(metric.is_abnormal),
        })),
        documentDate: analysis?.document_date || '',
      });

      setUploadModalState('preview');
    } catch (err) {
      setUploadError(
        err.response?.data?.message || 'No pudimos analizar el documento. Intenta nuevamente.'
      );
      setUploadModalState('idle');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  };

  const handleConfirmDocument = async () => {
    if (!tempDocument?.tempId) return;
    setIsSubmittingConfirm(true);
    setUploadError(null);

    try {
      const payload = {
        document_type: editedData.document_type || 'RECETA',
        is_medical_document: true,
        document_date: editedData.documentDate || null,
        diagnostico: editedData.diagnostico || '',
        medications: editedData.medications
          .filter((m) => m.name && m.name.trim().length > 0)
          .map((m) => ({
            name: m.name.trim(),
            dosage: m.dosage ? m.dosage.trim() : null,
            frequency: m.frequency ? m.frequency.trim() : null,
            duration: m.duration ? m.duration.trim() : null,
          })),
        lab_metrics: editedData.labMetrics
          .filter((metric) => metric.name.trim())
          .map((metric) => ({
            test_name: metric.name.trim(), value: metric.value.trim(), unit: metric.unit.trim(),
            reference_range: metric.referenceRange.trim(), is_abnormal: Boolean(metric.isAbnormal),
          })),
      };

      const res = await documentsApi.confirm(tempDocument.tempId, payload, true);
      const returnedDoc = res.data?.document || { id: tempDocument.tempId, ...payload, status: 'CONFIRMADO' };
      const newDoc = mapDocumentFromApi({
        ...returnedDoc,
        structured: res.data?.structured,
      });

      let warning = '';
      if (replacingDocumentId) {
        try { await documentsApi.remove(replacingDocumentId); }
        catch { warning = 'El nuevo documento se guardó, pero el anterior sigue en Mi ficha. Puedes eliminarlo manualmente.'; }
        setReplacingDocumentId(null);
      }
      try {
        const refreshed = await refreshDocuments();
        setSelectedDocument(refreshed.find((item) => item.id === newDoc.id) || newDoc);
      } catch { warning = warning || 'El documento se guardó. Actualiza Mi ficha para ver los cambios.'; }
      setReplacementWarning(warning);
      setConfirmedStatus(returnedDoc.status || 'CONFIRMADO');
      setUploadModalState('confirmed');

      setTimeout(() => {
        if (tempDocument?.filePreviewUrl) {
          URL.revokeObjectURL(tempDocument.filePreviewUrl);
        }
        setTempDocument(null);
        setUploadModalState(null);
      }, warning ? 6500 : 1800);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Error al guardar el documento.');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const handleSaveAnyway = async ({ isNonMedical = false } = {}) => {
    if (!tempDocument?.tempId) return;
    setIsSubmittingConfirm(true);
    setUploadError(null);

    try {
      const isMedical = !isNonMedical && tempDocument?.analysis?.is_medical_document !== false;
      const payload = {
        document_type: isMedical ? (editedData.document_type || 'OTRO') : 'OTRO',
        is_medical_document: isMedical,
        diagnostico: '',
        medications: [],
      };

      const res = await documentsApi.confirm(tempDocument.tempId, payload, false);
      const returnedDoc = res.data?.document || { id: tempDocument.tempId, ...payload, status: 'PENDIENTE_REVISION' };
      const newDoc = mapDocumentFromApi({
        ...returnedDoc,
        structured: res.data?.structured,
      });

      let warning = '';
      if (replacingDocumentId) {
        try { await documentsApi.remove(replacingDocumentId); }
        catch { warning = 'El nuevo documento se guardó, pero el anterior sigue en Mi ficha. Puedes eliminarlo manualmente.'; }
        setReplacingDocumentId(null);
      }
      try {
        const refreshed = await refreshDocuments();
        setSelectedDocument(refreshed.find((item) => item.id === newDoc.id) || newDoc);
      } catch { warning = warning || 'El documento se guardó. Actualiza Mi ficha para ver los cambios.'; }
      setReplacementWarning(warning);
      setConfirmedStatus(returnedDoc.status || 'PENDIENTE_REVISION');
      setUploadModalState('confirmed');

      setTimeout(() => {
        if (tempDocument?.filePreviewUrl) {
          URL.revokeObjectURL(tempDocument.filePreviewUrl);
        }
        setTempDocument(null);
        setUploadModalState(null);
      }, warning ? 6500 : 1800);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Error al guardar el documento.');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const handleDiscardDocument = async (retry = false) => {
    if (tempDocument?.tempId) {
      setIsSubmittingDiscard(true);
      try {
        await documentsApi.discard(tempDocument.tempId);
      } catch (err) {
        console.warn("Error al descartar documento temporal:");
      } finally {
        setIsSubmittingDiscard(false);
      }
    }

    if (tempDocument?.filePreviewUrl) {
      URL.revokeObjectURL(tempDocument.filePreviewUrl);
    }
    setTempDocument(null);
    setUploadError(null);

    if (retry) {
      setUploadModalState('idle');
    } else {
      setUploadModalState(null);
    }
  };

  const handleAddMedicationRow = () => {
    setEditedData((prev) => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '' }],
    }));
  };

  const handleUpdateMedication = (index, field, value) => {
    setEditedData((prev) => {
      const updated = [...prev.medications];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, medications: updated };
    });
  };

  const handleRemoveMedicationRow = (index) => {
    setEditedData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const handleUploadInputChange = (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) handleStartAnalyze(file);
  };
  const handleUpdateDocument = async (changes) => {
    if (!editingDocument) return;
    setSavingDocument(true);
    setEditDocumentError('');
    try {
      await documentsApi.update(editingDocument.id, changes);
      const refreshed = await refreshDocuments();
      const updated = refreshed.find((item) => item.id === editingDocument.id);
      setSelectedDocument(updated || null);
      setEditingDocument(null);
    } catch (err) {
      setEditDocumentError(err.response?.data?.message || 'No se pudieron guardar los cambios.');
    } finally {
      setSavingDocument(false);
    }
  };

  const handleReplaceDocument = (doc) => {
    setSelectedDocument(null);
    setEditingDocument(null);
    handleOpenUploadModal();
    setReplacingDocumentId(doc.id);
  };

  const handleOpenOriginal = async (doc) => {
    const tab = prepareDocumentWindow();
    setOpeningFileId(doc.id);
    try {
      openDocumentBlob(await documentsApi.fileBlob(doc.id), tab);
    } catch (err) {
      tab?.close();
      alert(err.response?.data?.message || 'No fue posible abrir el archivo original.');
    } finally {
      setOpeningFileId(null);
    }
  };

  // Eliminar documentos guardados o con error.
  const handleDeleteDocument = async (doc) => {
    const confirm = window.confirm(
      `¿Eliminar "${doc.title}" del historial?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirm) return;

    try {
      await documentsApi.remove(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDocument?.id === doc.id) {
        setSelectedDocument(null);
      }
      if (editingDocument?.id === doc.id) setEditingDocument(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el documento');
    }
  };
  // Pilares clínicos (categorías del dashboard con conteos y badges dinámicos)
  const clinicalPillars = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recetaDocs = documents.filter((d) => d.category === 'RECETA');
    const activeRecetas = recetaDocs.filter((d) => {
      const isStatusValid =
        d.status === 'CONFIRMADA' ||
        d.status === 'CONFIRMADO' ||
        d.status === 'PENDIENTE' ||
        d.status === 'PENDIENTE_REVISION';
      const rawDate = d.extractedData?.validUntilRaw || d.validUntilRaw;
      if (!isStatusValid || !rawDate) return false;

      const validUntil = new Date(rawDate);
      validUntil.setHours(23, 59, 59, 999);
      return validUntil >= today;
    });

    const examenCount = documents.filter((d) => d.category === 'EXAMEN').length;
    const consultaCount = documents.filter((d) => d.category === 'CONSULTA').length;
    const imagenCount = documents.filter((d) => d.category === 'IMAGEN').length;

    const recetaBadge =
      recetaDocs.length === 0
        ? 'Sin registros'
        : activeRecetas.length === 0
          ? 'Sin vigentes'
          : activeRecetas.length === 1
            ? '1 vigente'
            : `${activeRecetas.length} vigentes`;

    const examenBadge =
      examenCount === 0 ? 'Sin registros' : `${examenCount} totales`;

    const consultaBadge =
      consultaCount === 0
        ? 'Sin registros'
        : `${consultaCount} ${consultaCount === 1 ? 'atención' : 'atenciones'}`;

    const imagenBadge =
      imagenCount === 0
        ? 'Sin registros'
        : `${imagenCount} ${imagenCount === 1 ? 'estudio' : 'estudios'}`;

    return [
      {
        id: 'RECETA',
        title: 'Recetas Médicas',
        subtitle: 'Tratamientos y medicamentos',
        icon: ClipboardPenLine,
        count: recetaDocs.length,
        badgeText: recetaBadge,
        border: 'border-emerald-200/80 dark:border-emerald-900',
        iconColor: 'text-emerald-700 dark:text-emerald-400',
        iconBg: 'bg-emerald-100/80 dark:bg-emerald-950/40',
      },
      {
        id: 'EXAMEN',
        title: 'Exámenes de Lab',
        subtitle: 'Sangre, orina y perfiles',
        icon: Microscope,
        count: examenCount,
        badgeText: examenBadge,
        border: 'border-teal-200/80 dark:border-teal-900',
        iconColor: 'text-teal-700 dark:text-teal-400',
        iconBg: 'bg-teal-100/80 dark:bg-teal-950/40',
      },
      {
        id: 'CONSULTA',
        title: 'Consultas Médicas',
        subtitle: 'Atenciones y diagnósticos',
        icon: HeartPulse,
        count: consultaCount,
        badgeText: consultaBadge,
        border: 'border-blue-200/80 dark:border-accent-ink',
        iconColor: 'text-accent-ink dark:text-blue-400',
        iconBg: 'bg-blue-100/80 dark:bg-blue-950/40',
      },
      {
        id: 'IMAGEN',
        title: 'Informes & Imágenes',
        subtitle: 'Radiografías y ecografías',
        icon: ScanSearch,
        count: imagenCount,
        badgeText: imagenBadge,
        border: 'border-indigo-200/80 dark:border-indigo-900',
        iconColor: 'text-indigo-800 dark:text-indigo-400',
        iconBg: 'bg-indigo-100/80 dark:bg-indigo-950/40',
      },
    ];
  }, [documents]);

  // Documentos filtrados
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory;

      return matchesCategory && (
        doc.title.toLowerCase().includes(query) ||
        doc.institution.toLowerCase().includes(query) ||
        doc.doctor.toLowerCase().includes(query) ||
        (doc.extractedData.diagnostico && doc.extractedData.diagnostico.toLowerCase().includes(query))
      );
    });
  }, [documents, selectedCategory, searchQuery]);

  const handlePillarClick = (categoryId) => {
    setSearchQuery('');
    setSelectedCategory(categoryId);
    setCurrentTab('records');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab]);

  const handleOpenEditProfile = () => {
    setProfileSaveError('');
    setEditFormData({
      bloodType: patientProfile.bloodType || '',
      healthInsurance: patientProfile.healthInsurance || '',
      isOrganDonor: patientProfile.isOrganDonor,
      allergies: [...(patientProfile.allergies || [])],
      chronicConditions: [...(patientProfile.chronicConditions || [])],
      emergencyContactName: patientProfile.emergencyContactName || '',
      emergencyContactPhone: patientProfile.emergencyContactPhone || ''
    });
    setShowProfileEditModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileSaveError('');
    const isCompleted = Boolean(editFormData.bloodType && editFormData.healthInsurance);
    const updated = {
      ...editFormData,
      isCompleted
    };
    try {
      await api.put('/patient-profile/me', updated);
      setPatientProfile(updated);
      clearLegacyPatientProfileCache();
      fetchAuditLogs();
    } catch (err) {
      console.warn("Error guardando perfil en backend:");
      setProfileSaveError('No pudimos guardar los cambios. Conservamos lo que ingresaste para que puedas intentarlo otra vez.');
      return;
    } finally {
      setSavingProfile(false);
    }
    setShowProfileEditModal(false);
    setShowSuccessAlert(true);
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 6000);
  };

  const handleToggleAllergy = (allergy) => {
    setEditFormData(prev => {
      let list = [...prev.allergies];
      if (allergy === 'Ninguna Alergia Conocida' || allergy === 'Ninguna conocida') {
        const isNoneActive = list.includes('Ninguna Alergia Conocida') || list.includes('Ninguna conocida');
        return {
          ...prev,
          allergies: isNoneActive ? [] : ['Ninguna Alergia Conocida']
        };
      }
      list = list.filter(a => a !== 'Ninguna Alergia Conocida' && a !== 'Ninguna conocida');
      if (list.includes(allergy)) {
        list = list.filter(a => a !== allergy);
      } else {
        list.push(allergy);
      }
      return { ...prev, allergies: list };
    });
  };

  const handleToggleCondition = (cond) => {
    setEditFormData(prev => {
      let list = [...prev.chronicConditions];
      if (cond === 'Ninguna Enfermedad Crónica' || cond === 'Ninguna') {
        const isNoneActive = list.includes('Ninguna Enfermedad Crónica') || list.includes('Ninguna');
        const prefixed = list.filter(c => c.startsWith('Medicamento: ') || c.startsWith('Cirugía: '));
        return {
          ...prev,
          chronicConditions: isNoneActive ? prefixed : [...prefixed, 'Ninguna Enfermedad Crónica']
        };
      }
      list = list.filter(c => c !== 'Ninguna Enfermedad Crónica' && c !== 'Ninguna');
      if (list.includes(cond)) {
        list = list.filter(c => c !== cond);
      } else {
        list.push(cond);
      }
      return { ...prev, chronicConditions: list };
    });
  };

  const handleToggleMedication = (med) => {
    const prefixed = `Medicamento: ${med}`;
    const nonePrefixed = 'Medicamento: Ningún Fármaco Diario';
    setEditFormData(prev => {
      let list = [...prev.chronicConditions];
      if (med === 'Ningún Fármaco Diario') {
        const isNoneActive = list.includes(nonePrefixed);
        const withoutMeds = list.filter(c => !c.startsWith('Medicamento: '));
        return {
          ...prev,
          chronicConditions: isNoneActive ? withoutMeds : [...withoutMeds, nonePrefixed]
        };
      }
      list = list.filter(c => c !== nonePrefixed);
      if (list.includes(prefixed)) {
        list = list.filter(c => c !== prefixed);
      } else {
        list.push(prefixed);
      }
      return { ...prev, chronicConditions: list };
    });
  };

  const handleToggleSurgery = (surg) => {
    const prefixed = `Cirugía: ${surg}`;
    const nonePrefixed = 'Cirugía: Ninguna Cirugía Previa';
    setEditFormData(prev => {
      let list = [...prev.chronicConditions];
      if (surg === 'Ninguna Cirugía Previa') {
        const isNoneActive = list.includes(nonePrefixed);
        const withoutSurgeries = list.filter(c => !c.startsWith('Cirugía: '));
        return {
          ...prev,
          chronicConditions: isNoneActive ? withoutSurgeries : [...withoutSurgeries, nonePrefixed]
        };
      }
      list = list.filter(c => c !== nonePrefixed);
      if (list.includes(prefixed)) {
        list = list.filter(c => c !== prefixed);
      } else {
        list.push(prefixed);
      }
      return { ...prev, chronicConditions: list };
    });
  };

  // Cargar médicos registrados para compartir la ficha directamente
  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      setDirectShareError(null);
      const res = await api.get('/doctors');
      const payload = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(payload) ? payload : (payload.doctors || []);
      setDoctors(list);
    } catch (err) {
      console.warn("Error cargando médicos:");
      setDoctors([]);
      setDirectShareError(err.response?.data?.message || 'No fue posible cargar la lista de médicos.');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleOpenDirectShare = () => {
    setSelectedDoctorId('');
    setDirectShareDuration(12);
    setDirectShareError(null);
    setDirectShareSuccess(null);
    setShowDirectShareModal(true);
    fetchDoctors();
  };

  const handleShareDirect = async () => {
    if (!selectedDoctorId) {
      setDirectShareError('Selecciona un médico antes de compartir tu ficha.');
      return;
    }

    try {
      setIsSharingDirect(true);
      setDirectShareError(null);
      setDirectShareSuccess(null);

      const res = await api.post('/access-grants/share', {
        doctorId: selectedDoctorId,
        durationHours: directShareDuration,
        notes: `Acceso directo autorizado por el paciente (${directShareDuration} horas)`
      });

      if (res.data?.success === false) {
        throw new Error(res.data?.message || 'No fue posible compartir la ficha.');
      }

      const doctor = doctors.find((d) => String(d.id) === String(selectedDoctorId));
      const doctorName = doctor
        ? `${doctor.first_name || doctor.firstName || doctor.name || ''} ${doctor.last_name || doctor.lastName || ''}`.trim()
        : 'el médico seleccionado';

      setDirectShareSuccess(`Ficha compartida correctamente con ${doctorName || 'el médico seleccionado'} por ${directShareDuration} horas.`);
      await fetchMyGrants();
      fetchAuditLogs();
    } catch (err) {
      console.warn("Error compartiendo ficha directamente:");
      setDirectShareError(
        err.response?.data?.message || err.message || 'No fue posible compartir la ficha con el médico.'
      );
    } finally {
      setIsSharingDirect(false);
    }
  };

  const openQrModal = (grant = null) => {
    setGrantError(null);
    setCopiedQrToken(false);
    setShowNewQrForm(false);
    setSelectedQrGrantId(grant?.id || null);
    setActiveGrant(grant ? {
      id: grant.id,
      token: grant.token,
      duration_hours: Math.round((new Date(grant.expiresAt) - new Date(grant.startsAt || grant.createdAt)) / 3600000),
      expires_at: grant.expiresAt,
      status: 'ACTIVE'
    } : null);
    setShowQrModal(true);
  };

  const closeQrModal = () => {
    setShowQrModal(false);
    setSelectedQrGrantId(null);
    setShowNewQrForm(false);
  };

  // Cargar el QR vigente más reciente cuando no se eligió uno de la lista
  const fetchActiveGrant = async () => {
    try {
      setIsLoadingGrant(true);
      setGrantError(null);
      const res = await api.get('/access-grants/active');
      if (res.data?.success && res.data?.data) {
        const g = res.data.data.grant || res.data.data;
        if (g && g.token) {
          setActiveGrant({
            id: g.id,
            token: g.token,
            duration_hours: g.duration_hours || g.durationHours || null,
            expires_at: g.expires_at || g.expiresAt,
            status: 'ACTIVE'
          });
        } else {
          setActiveGrant(null);
        }
      } else {
        setActiveGrant(null);
      }
    } catch (err) {
      console.warn("Error fetching active grant:");
      setActiveGrant(null);
    } finally {
      setIsLoadingGrant(false);
    }
  };

  useEffect(() => {
    if (showQrModal && !selectedQrGrantId) {
      fetchActiveGrant();
    }
  }, [showQrModal, selectedQrGrantId]);

  useEffect(() => {
    if (!showQrModal) return undefined;
    if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
      setShareBaseUrl(window.location.origin);
      setShareUrlError('');
      setResolvingShareUrl(false);
      return undefined;
    }
    let active = true;
    setResolvingShareUrl(true);
    api.get('/access-grants/share-url', { params: { port: window.location.port || 5173 } })
      .then((response) => {
        if (!active) return;
        setShareBaseUrl(response.data?.data?.baseUrl || null);
        setShareUrlError('');
        setResolvingShareUrl(false);
      })
      .catch(() => {
        if (!active) return;
        setShareBaseUrl(null);
        setShareUrlError('El QR se puede escanear desde el portal médico, pero no se pudo crear un enlace para otro dispositivo.');
        setResolvingShareUrl(false);
      });
    return () => { active = false; };
  }, [showQrModal]);

  // Actualizar contador regresivo en tiempo real
  useEffect(() => {
    if (!activeGrant?.expires_at) {
      setRemainingTimeText('');
      return;
    }

    const updateTimer = () => {
      const diff = new Date(activeGrant.expires_at) - new Date();
      if (diff <= 0) {
        setRemainingTimeText('Expirado');
        setActiveGrant(null);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setRemainingTimeText(`${hours}h ${mins}m ${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeGrant]);

  // Generar nuevo código QR con duración seleccionada
  const handleGenerateGrant = async (duration = qrDuration) => {
    try {
      setIsGeneratingGrant(true);
      setGrantError(null);
      const res = await api.post('/access-grants/generate', {
        durationHours: duration,
        notes: `Generado por paciente desde Portal Web (${duration} horas)`
      });
      if (res.data?.success && res.data?.data) {
        const g = res.data.data;
        setActiveGrant({
          id: g.id || g.grantId,
          token: g.token,
          duration_hours: g.durationHours || g.duration_hours,
          expires_at: g.expiresAt || g.expires_at,
          status: 'ACTIVE'
        });
        setSelectedQrGrantId(g.id || g.grantId);
        setShowNewQrForm(false);
        await fetchMyGrants();
        fetchAuditLogs();
      }
    } catch (err) {
      console.warn("Error generating grant:");
      setGrantError(err.response?.data?.message || 'Error al generar código QR de acceso');
    } finally {
      setIsGeneratingGrant(false);
    }
  };

  // Revocar acceso inmediato del grant activo del modal
  const handleRevokeGrant = async () => {
    if (!activeGrant?.id) return;
    const confirmed = window.confirm(
      '¿Revocar este acceso médico? Se bloquearán nuevas consultas y la vista abierta se cerrará cuando compruebe el permiso.'
    );
    if (!confirmed) return;

    try {
      setIsRevokingGrant(true);
      setGrantError(null);
      await api.patch(`/access-grants/${activeGrant.id}/revoke`, {
        reason: 'Revocado manualmente por el paciente desde su panel de control'
      });
      const needsRefresh = !selectedQrGrantId;
      setActiveGrant(null);
      setSelectedQrGrantId(null);
      await fetchMyGrants();
      if (needsRefresh) await fetchActiveGrant();
      fetchAuditLogs();
    } catch (err) {
      console.warn("Error revoking grant:");
      setGrantError(err.response?.data?.message || 'Error al revocar el acceso');
    } finally {
      setIsRevokingGrant(false);
    }
  };

  // Revocar un pase específico de la lista (Punto 2)
  const handleRevokeSpecificGrant = async (grantId) => {
    const confirmed = window.confirm(
      '¿Revocar este pase de acceso médico? No podrá usarse para nuevas consultas.'
    );
    if (!confirmed) return;

    try {
      await api.patch(`/access-grants/${grantId}/revoke`, {
        reason: 'Revocado manualmente por el paciente'
      });
      await fetchMyGrants();
      if (activeGrant?.id === grantId) {
        setActiveGrant(null);
      }
      fetchAuditLogs();
    } catch (err) {
      console.warn("Error revoking grant:");
      alert(err.response?.data?.message || 'Error al revocar el acceso');
    }
  };

  const writeClipboardText = async (value) => {
    let field;
    const previousFocus = document.activeElement;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        field = document.createElement('textarea');
        field.value = value;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.focus();
        field.select();
        const copied = document.execCommand('copy');
        if (!copied) throw new Error('El navegador no permitió copiar.');
      }
    } finally {
      field?.remove();
      if (field && previousFocus?.isConnected) previousFocus.focus();
    }
  };

  const handleCopyQrToken = async () => {
    if (!activeGrant?.token) return;
    try {
      await writeClipboardText(activeGrant.token);
      setCopiedQrToken(true);
      setTimeout(() => setCopiedQrToken(false), 2500);
    } catch (error) {
      console.warn("No se pudo copiar el código:");
      setGrantError('No se pudo copiar el código. Puedes mostrar el QR al profesional.');
    }
  };

  // Descargar imagen del código QR en formato PNG nítido (Tarjeta Oficial de Acceso)
  const handleDownloadQr = () => {
    const svgElement = document.getElementById('patient-qr-svg');
    if (!svgElement) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 700;
      canvas.height = 880;

      img.onload = () => {
        // Fondo blanco nítido
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Borde decorativo exterior
        ctx.strokeStyle = '#d3e4e4';
        ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

        // Cabecera institucional en el color de marca
        ctx.fillStyle = '#126b72';
        ctx.fillRect(12, 12, canvas.width - 24, 110);

        // Franja bicolor
        ctx.fillStyle = '#0033a0';
        ctx.fillRect(12, 122, (canvas.width - 24) / 2, 6);
        ctx.fillStyle = '#d52b1e';
        ctx.fillRect(12 + (canvas.width - 24) / 2, 122, (canvas.width - 24) / 2, 6);

        // Textos del encabezado
        ctx.fillStyle = '#ffffff';
        ctx.font = '650 32px "DM Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MyMedRecord', canvas.width / 2, 62);

        ctx.font = '650 15px "DM Sans", system-ui, sans-serif';
        ctx.fillStyle = '#d4f0f0';
        ctx.fillText('PASE DE ACCESO MÉDICO TEMPORAL • LEY N° 21.668', canvas.width / 2, 95);

        // Marco y renderizado del Código QR
        const qrSize = 460;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 160;

        ctx.fillStyle = '#f8fbfb';
        ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
        ctx.strokeStyle = '#d3e4e4';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // Indicador del código de acceso
        ctx.fillStyle = '#536b70';
        ctx.font = '650 13px "DM Sans", system-ui, sans-serif';
        ctx.fillText('CÓDIGO DE ACCESO / TOKEN:', canvas.width / 2, 675);

        ctx.fillStyle = '#17343b';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(activeGrant?.token || '---', canvas.width / 2, 715);

        // Indicador de vigencia
        ctx.fillStyle = '#126b72';
        ctx.font = '650 17px "DM Sans", system-ui, sans-serif';
        ctx.fillText(`Vigencia del pase: ${activeGrant?.duration_hours ? `${activeGrant.duration_hours} horas` : 'hasta su expiración'}`, canvas.width / 2, 765);

        // Información al médico y paciente
        ctx.fillStyle = '#536b70';
        ctx.font = '13px "DM Sans", system-ui, sans-serif';
        ctx.fillText('La consulta requiere identificación declarada y aprobación del paciente.', canvas.width / 2, 805);

        ctx.fillStyle = '#536b70';
        ctx.font = 'italic 12px "DM Sans", system-ui, sans-serif';
        ctx.fillText('Acceso temporal compartido por el paciente. Puedes revocarlo desde Accesos.', canvas.width / 2, 830);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `Pase_Medico_MyMedRecord_${activeGrant?.token || 'acceso'}.png`;
        downloadLink.href = pngUrl;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.warn("Error descargando QR:");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-body">
      <Navbar
        roleTitle="Portal Paciente"
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenHelp={() => setCurrentTab('help')}
      />

      <div className="hidden md:block mm-desktop-nav"><SectionNav value={currentTab} onChange={setCurrentTab} items={[
        {id:'home',label:'Inicio',icon:Home}, {id:'records',label:'Mi ficha',icon:FileText},
        {id:'audit',label:'Accesos',icon:ShieldCheck}, {id:'profile',label:'Mi perfil',icon:User}, {id:'help',label:'Ayuda',icon:HelpCircle}
      ]} /></div>

      <main id="main-content" tabIndex={-1} className={`mm-shell mm-patient-shell space-y-6${currentTab === 'home' ? ' mm-patient-shell--home' : ''}`}>
        <QrApprovalRequests />
        {/* ========================================================================= */}
        {/* PESTAÑA 1: INICIO (HOME PRINCIPAL) */}
        {/* ========================================================================= */}
        {currentTab === 'home' && <PatientHome
          loading={loadingDocs} error={docsError}
          grants={myGrants} loadingGrants={loadingGrants} grantsError={grantsError} categories={clinicalPillars}
          onUpload={handleOpenUploadModal} onShare={handleOpenDirectShare} onQr={() => openQrModal()}
          onRecords={() => { setSearchQuery(''); setSelectedCategory('ALL'); setCurrentTab('records'); }}
          onAccess={() => setCurrentTab('audit')} onCategory={handlePillarClick}
        />}

        {currentTab === 'records' && <PatientRecords documents={documents} filtered={filteredDocuments} categories={clinicalPillars} category={selectedCategory} onCategory={setSelectedCategory} query={searchQuery} onQuery={setSearchQuery} loading={loadingDocs} error={docsError} onUpload={handleOpenUploadModal} onDocument={setSelectedDocument} onEdit={(doc) => { setEditDocumentError(''); setEditingDocument(doc); }} onDelete={handleDeleteDocument} />}

        {currentTab === 'profile' && <PatientProfile user={user} profile={patientProfile} loading={profileLoading} error={profileError} saved={showSuccessAlert} onEdit={handleOpenEditProfile} />}

        {currentTab === 'help' && <PatientHelp />}

        {/* ========================================================================= */}
        {/* PESTAÑA 5: SEGURIDAD, AUDITORÍA Y TRAZABILIDAD (LEY N° 21.668 Y 20.584) */}
        {/* ========================================================================= */}
        {currentTab === 'audit' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            <PageHeader
              eyebrow="TÚ CONTROLAS EL ACCESO"
              title="Compartir y accesos"
              eyebrowBelow
              hideTitle
              info={
                <InfoPopover label="Cómo funcionan los accesos">
                  <p>Desde Inicio puedes elegir un médico para compartir tu ficha directamente o generar un pase con «Mostrar QR». Tú eliges cuánto dura el permiso.</p>
                  <p>Aquí revisas los permisos emitidos y su actividad. Puedes revocar un acceso vigente cuando ya no quieras compartir la información.</p>
                </InfoPopover>
              }
              actions={<Button variant="secondary" onClick={() => { fetchAuditLogs(); fetchMyGrants(); }} disabled={loadingAudit || loadingGrants}><RefreshCw size={17} />Actualizar</Button>}
            />
            {grantsError && <Notice title="No pudimos cargar los permisos" tone="danger">{grantsError}</Notice>}
            {auditError && <Notice title="No pudimos cargar la actividad" tone="danger">{auditError}</Notice>}

            {/* SECCIÓN 1: GESTIÓN DE PASES Y AUTORIZACIONES */}
            <section className="bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100 dark:border-line">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-bold shrink-0">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-extrabold text-ink dark:text-ink truncate">
                      Permisos emitidos
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => openQrModal()}
                  className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-action hover:bg-action-hover text-on-action font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-300" />
                  <span>Emitir QR</span>
                </button>
              </div>

              {loadingGrants ? <LoadingState label="Cargando permisos" /> : grantsError ? null : myGrants.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted dark:text-muted space-y-0.5">
                  <p className="font-bold text-body dark:text-body text-xs">Aún no has compartido tu ficha.</p>
                  <p className="text-xs">Cuando compartas tu ficha, el permiso aparecerá aquí con su vigencia.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Vista Móvil: Tarjetas responsivas ultracompactas (sm:hidden) */}
                  <div className="sm:hidden space-y-2">
                    {myGrants.map((grant) => (
                      <div
                        key={grant.id}
                        className={`p-2.5 rounded-xl border transition-all space-y-1.5 ${grant.status === 'ACTIVO'
                          ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                          : grant.status === 'REVOCADO'
                            ? 'bg-rose-50/30 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900'
                            : 'bg-canvas/70 border-line dark:bg-surface-muted/50 dark:border-line'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GrantTokenButton token={grant.token} />
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-xs font-extrabold uppercase tracking-wider ${grant.status === 'ACTIVO'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : grant.status === 'REVOCADO'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/60 dark:text-rose-300'
                                  : 'bg-surface-muted text-body dark:bg-surface-muted dark:text-body'
                                }`}
                            >
                              {grant.status}
                            </span>
                            <span className="text-xs text-muted font-mono">
                              ({grant.grantType === 'QR_TEMPORAL' ? 'QR' : 'Directo'})
                            </span>
                          </div>

                          {grant.status === 'ACTIVO' ? (
                            <span className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300 bg-surface dark:bg-surface px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                              <Timer className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              {grant.minutesRemaining} min
                            </span>
                          ) : (
                            <span className="text-xs text-muted font-mono">
                              {grant.createdAt ? new Date(grant.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'}
                            </span>
                          )}
                        </div>

                        {/* Detalle Médico Compacto */}
                        <div className="text-xs sm:text-xs text-muted dark:text-body flex items-center justify-between">
                          <span className="font-medium truncate">
                            {grant.doctorName ? (
                              <span className="text-ink dark:text-body font-bold">{grant.doctorName} {grant.doctorInstitution ? `· ${grant.doctorInstitution}` : ''}</span>
                            ) : (
                              <span className="text-muted italic text-xs">Pendiente de escaneo por médico</span>
                            )}
                          </span>
                        </div>

                        {grant.status === 'ACTIVO' && (
                          <div className="pt-0.5 flex items-center gap-1.5">
                            {grant.grantType === 'QR_TEMPORAL' && (
                              <button
                                onClick={() => openQrModal(grant)}
                                className="flex-1 py-1 bg-action hover:bg-action-hover text-on-action font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                <QrCode className="w-3 h-3 text-teal-300" />
                                <span>Ver QR</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleRevokeSpecificGrant(grant.id)}
                              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Revocar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Vista Escritorio: Tabla completa (hidden sm:block) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-line text-muted font-bold uppercase text-xs tracking-wider">
                          <th className="py-2.5 px-3">Código de acceso</th>
                          <th className="py-2.5 px-3">Modalidad</th>
                          <th className="py-2.5 px-3">Fecha Emisión</th>
                          <th className="py-2.5 px-3">Vigencia / Restante</th>
                          <th className="py-2.5 px-3">Médico / Centro</th>
                          <th className="py-2.5 px-3">Estado</th>
                          <th className="py-2.5 px-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {myGrants.map((grant) => (
                          <tr key={grant.id} className="hover:bg-canvas/80 transition-colors">
                            <td className="py-2.5 px-3">
                              <GrantTokenButton token={grant.token} />
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-surface-muted text-body font-bold text-xs">
                                {grant.grantType === 'QR_TEMPORAL' ? 'QR Temporal' : 'Directo'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-muted whitespace-nowrap">
                              {grant.createdAt ? new Date(grant.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-body whitespace-nowrap">
                              {grant.status === 'ACTIVO' ? (
                                <span className="font-bold text-emerald-700 flex items-center gap-1">
                                  <Timer className="w-3.5 h-3.5" />
                                  {grant.minutesRemaining} min
                                </span>
                              ) : (
                                <span className="text-muted">Vencido</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {grant.doctorName ? (
                                <div>
                                  <span className="font-bold text-ink block">{grant.doctorName}</span>
                                  <span className="text-xs text-muted">{grant.doctorInstitution || 'Centro de Salud'}</span>
                                </div>
                              ) : (
                                <span className="text-muted italic">Pendiente de escaneo</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider inline-block ${grant.status === 'ACTIVO'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : grant.status === 'REVOCADO'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-surface-muted text-body'
                                  }`}
                              >
                                {grant.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {grant.status === 'ACTIVO' ? (
                                <div className="flex justify-end gap-1.5">
                                  {grant.grantType === 'QR_TEMPORAL' && (
                                    <button
                                      onClick={() => openQrModal(grant)}
                                      className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-200 font-bold rounded-lg transition-colors cursor-pointer text-xs inline-flex items-center gap-1"
                                    >
                                      <QrCode className="w-3 h-3" />
                                      <span>Ver QR</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRevokeSpecificGrant(grant.id)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold rounded-lg transition-colors cursor-pointer text-xs inline-flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Revocar</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* SECCIÓN 2: LÍNEA DE TIEMPO DE AUDITORÍA (Bitácora Compacta y Optimizada) */}
            <section className="bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100 dark:border-line">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-accent-ink dark:text-teal-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-extrabold text-ink dark:text-ink truncate">
                      Actividad de la ficha
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono font-bold text-muted dark:text-muted bg-surface-muted dark:bg-surface-muted px-2 py-0.5 rounded-md">
                    {auditLogs.length} registros
                  </span>
                </div>
              </div>

              {loadingAudit ? (
                <div className="py-6 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 text-accent-ink animate-spin mx-auto" />
                  <p className="text-xs text-muted">Consultando bitácora legal...</p>
                </div>
              ) : auditError ? null : auditLogs.length === 0 ? (
                <div className="py-5 text-center text-xs text-muted dark:text-muted space-y-0.5">
                  <p className="font-bold text-body dark:text-body text-xs">Sin actividad registrada por ahora.</p>
                  <p className="text-xs">Los eventos registrados para tu ficha aparecerán aquí.</p>
                </div>
              ) : (
                <div className="max-h-[340px] sm:max-h-[460px] overflow-y-auto pr-1">
                  <div className="relative pl-3.5 sm:pl-4 space-y-2 before:content-[''] before:absolute before:left-1 sm:before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-muted dark:before:bg-slate-700">
                    {auditLogs.map((log) => {
                      const isMedicalAccess = log.category === 'ACCESO_MEDICO';
                      const isRevoke = log.category === 'SEGURIDAD';
                      const isConsent = log.category === 'CONSENTIMIENTO';

                      return (
                        <div key={log.id} className="relative group">
                          {/* Nodo discreto en la línea */}
                          <div
                            className={`absolute -left-3.5 sm:-left-4 top-2 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-2xs ${isMedicalAccess
                              ? 'bg-emerald-600'
                              : isRevoke
                                ? 'bg-rose-600'
                                : isConsent
                                  ? 'bg-amber-500'
                                : 'bg-accent-ink'
                              }`}
                          />

                          {/* Ficha compacta y limpia del evento */}
                          <div className="p-2 sm:p-2.5 bg-canvas/70 hover:bg-surface-muted/80 dark:bg-surface-muted/50 dark:hover:bg-slate-800 rounded-xl border border-line/70 dark:border-line/60 transition-all space-y-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="font-bold text-ink dark:text-ink text-xs sm:text-xs truncate">
                                  {log.title}
                                </h3>
                                <span
                                  className={`text-xs font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider shrink-0 ${isMedicalAccess
                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300'
                                    : isRevoke
                                      ? 'bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-300'
                                      : isConsent
                                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300'
                                        : 'bg-surface-muted text-body dark:bg-surface-muted dark:text-body'
                                    }`}
                                >
                                  {log.category.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <span className="text-xs sm:text-xs font-mono text-muted dark:text-muted shrink-0">
                                {log.createdAt ? new Date(log.createdAt).toLocaleDateString('es-CL', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '—'}
                              </span>
                            </div>

                            <p className="text-xs sm:text-xs text-muted dark:text-body leading-snug line-clamp-2">
                              {log.description}
                            </p>

                            <div className="flex items-center justify-between text-xs text-muted dark:text-muted font-mono pt-0.5">
                              <span>IP: {log.ipAddress || '127.0.0.1'}</span>
                              <span className="truncate max-w-[120px] sm:max-w-xs">{log.userAgent ? log.userAgent.split(' ')[0] : 'Web'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL DE DETALLE CLÍNICO Y EXTRACCIÓN CON IA */}
      {/* ========================================================================= */}
      {selectedDocument && uploadModalState === null && !editingDocument && (
        <DialogFrame label="Detalle del documento" onClose={() => setSelectedDocument(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-line">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Datos extraídos del documento
                </span>
                <h3 className="text-lg font-extrabold text-ink mt-1">{selectedDocument.title}</h3>
                <p className="text-xs text-muted">{selectedDocument.institution} · {selectedDocument.date}</p>
              </div>
              <button
                aria-label="Cerrar diálogo" onClick={() => setSelectedDocument(null)}
                className="p-1.5 text-muted hover:text-muted rounded-xl hover:bg-surface-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Notice title="Información extraída del documento">
              Estos datos se detectaron automáticamente. Compruébalos con el documento original;
              su interpretación corresponde al profesional de salud.
            </Notice>

            {/* Contenido según categoría */}
            <div className="space-y-3 text-xs">
              {selectedDocument.category === 'RECETA' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-ink">Prescripción de Fármacos Extraída:</h4>
                  <div className="space-y-2">
                    {selectedDocument.extractedData.medicamentos.length === 0 && (
                      <p className="text-muted">No hay medicamentos extraídos de este documento.</p>
                    )}
                    {selectedDocument.extractedData.medicamentos.map((m, i) => (
                      <div key={i} className="p-3.5 bg-canvas rounded-2xl border border-line space-y-1">
                        <div className="flex justify-between font-bold text-ink text-sm">
                          <span>{m.nombre}</span>
                          <span className="text-teal-700">{m.dosis}</span>
                        </div>
                        <p className="text-body"><strong>Posología:</strong> {m.posologia}</p>
                        <p className="text-muted"><strong>Duración:</strong> {m.duracion} · {m.horario}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-canvas dark:bg-surface-muted/60 rounded-xl border border-line dark:border-line space-y-1">
                    <p className="text-body dark:text-body">
                      <strong>Indicaciones Médicas:</strong> {selectedDocument.extractedData.indicaciones || 'Sin indicaciones adicionales'}
                    </p>
                    {selectedDocument.extractedData.fechaEmision && (
                      <p className="text-muted dark:text-muted text-xs">
                        <strong>Emitida el:</strong> {selectedDocument.extractedData.fechaEmision}
                      </p>
                    )}
                    <p className={`text-xs ${selectedDocument.extractedData.vigenciaHasta ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-muted dark:text-muted'}`}>
                      <strong>Vigencia hasta:</strong> {selectedDocument.extractedData.vigenciaHasta || 'no especificada'}
                    </p>
                  </div>
                </div>
              )}

              {selectedDocument.category === 'EXAMEN' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-ink">Parámetros Bioquímicos Extraídos:</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-line text-muted font-bold uppercase text-xs">
                          <th className="py-2">Parámetro</th>
                          <th className="py-2">Resultado</th>
                          <th className="py-2">Rango Referencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedDocument.extractedData.parametros.length === 0 && (
                          <tr><td colSpan={3} className="py-3 text-muted">No hay resultados extraídos de este documento.</td></tr>
                        )}
                        {selectedDocument.extractedData.parametros.map((p, i) => (
                          <tr key={i}>
                            <td className="py-2.5 font-bold text-ink">{p.nombre}</td>
                            <td className="py-2.5 font-mono text-teal-800 font-bold">{p.valor}</td>
                            <td className="py-2.5 text-muted">{p.rangoRef}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(selectedDocument.category === 'CONSULTA' || selectedDocument.category === 'IMAGEN') && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-canvas rounded-2xl border border-line space-y-2">
                    <h4 className="font-bold text-ink">Información extraída disponible</h4>
                    <p className="text-body"><strong>Resumen:</strong> {selectedDocument.summary}</p>
                    <p className="text-body"><strong>Diagnóstico registrado:</strong> {selectedDocument.extractedData.diagnostico}</p>
                    {selectedDocument.extractedData.indicaciones !== '—' && (
                      <p className="text-body"><strong>Indicaciones registradas:</strong> {selectedDocument.extractedData.indicaciones}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-line flex flex-wrap justify-end items-center gap-2">
              <button type="button" onClick={() => handleOpenOriginal(selectedDocument)} disabled={openingFileId === selectedDocument.id} className="mm-button mm-button--secondary">
                <ExternalLink size={16} /> {openingFileId === selectedDocument.id ? 'Abriendo…' : 'Ver original'}
              </button>
              <button type="button" onClick={() => { setEditingDocument(selectedDocument); setSelectedDocument(null); }} className="mm-button mm-button--secondary">
                Actualizar
              </button>
              <button type="button" onClick={() => handleDeleteDocument(selectedDocument)} className="mm-button mm-button--secondary">
                <Trash2 size={16} /> Eliminar
              </button>
              <button
                aria-label="Cerrar diálogo" onClick={() => setSelectedDocument(null)}
                className="px-5 py-2 bg-action hover:bg-action-hover text-on-action text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </DialogFrame>
      )}

      {editingDocument && uploadModalState === null && (
        <EditDocumentDialog
          key={editingDocument.id}
          document={editingDocument}
          onClose={() => setEditingDocument(null)}
          onSave={handleUpdateDocument}
          onReplace={() => handleReplaceDocument(editingDocument)}
          onDelete={() => handleDeleteDocument(editingDocument)}
          saving={savingDocument}
          error={editDocumentError}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL DE SUBIDA / FOTO CON IA */}
      {/* ========================================================================= */}
      {uploadModalState !== null && (
        <DialogFrame label="Subir y revisar documento" onClose={isSubmittingConfirm || isSubmittingDiscard || uploadModalState === 'analyzing' ? undefined : handleCloseUploadModal} className="mm-upload-backdrop">
          <div className="mm-upload-dialog">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-line shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-2xl">
                  {uploadModalState === 'analyzing' ? (
                    <Sparkles className="w-5 h-5 animate-spin" />
                  ) : uploadModalState === 'confirmed' ? (
                    confirmedStatus === 'CONFIRMADO' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )
                  ) : uploadModalState === 'preview' && (tempDocument?.analysis?.is_medical_document === false || tempDocument?.isUnreadable) ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-ink dark:text-ink">
                    {uploadModalState === 'idle' && 'Subir documento médico'}
                    {uploadModalState === 'analyzing' && 'Analizando con Inteligencia Artificial'}
                    {uploadModalState === 'preview' && (
                      tempDocument?.analysis?.is_medical_document === false
                        ? 'Documento no reconocido como médico'
                        : tempDocument?.isUnreadable
                          ? 'Revisión del Documento'
                          : 'Revisar datos antes de guardar'
                    )}
                    {uploadModalState === 'confirmed' && 'Documento guardado'}
                  </h3>
                  <p className="text-xs text-muted dark:text-muted">
                    {uploadModalState === 'idle' && 'Elige cómo agregarlo a Mi ficha'}
                    {uploadModalState === 'analyzing' && 'Extrayendo información del documento...'}
                    {uploadModalState === 'preview' && (
                      tempDocument?.analysis?.is_medical_document === false
                        ? 'El archivo no parece contener información médica'
                        : tempDocument?.isUnreadable
                          ? 'No pudimos leer con certeza el documento'
                          : 'Tú tienes el control: revisa o corrige los datos'
                    )}
                    {uploadModalState === 'confirmed' && (
                      confirmedStatus === 'CONFIRMADO'
                        ? 'Tu documento ya está disponible en Mi ficha'
                        : 'Tu documento quedó en Mi ficha; la extracción sigue pendiente'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                disabled={isSubmittingConfirm || isSubmittingDiscard || uploadModalState === 'analyzing'}
                aria-label="Cerrar carga de documento"
                className="p-1.5 text-muted hover:text-muted dark:hover:text-slate-200 rounded-xl hover:bg-surface-muted dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadModalState === 'preview' && tempDocument?.analysis?.processing_notice && (
              <p role="status" className="rounded-xl border border-line p-3 text-sm text-body">{tempDocument.analysis.processing_notice}</p>
            )}
            {/* Contenido según Estado */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              
              {/* ESTADO 1: IDLE (Selector de imagen) */}
              {uploadModalState === 'idle' && (
                <div className="mm-upload-source-step">
                  {uploadSource === 'camera' ? (
                    <UploadCamera onCapture={handleStartAnalyze} onBack={() => setUploadSource('choices')} />
                  ) : (
                    <>
                      <p className="mm-upload-source-lead">Selecciona el origen de tu receta, examen o informe.</p>
                      <div className="mm-upload-source-list">
                        <button type="button" className="mm-upload-source mm-upload-source--camera" onClick={() => { setUploadError(null); setUploadSource('camera'); }} autoFocus>
                          <span className="mm-upload-source-icon"><Camera size={22} aria-hidden="true" /></span>
                          <span className="mm-upload-source-copy"><strong>Tomar foto</strong><small>Usa la cámara para un documento en papel.</small></span>
                          <ChevronRight size={19} aria-hidden="true" />
                        </button>
                        <button type="button" className="mm-upload-source" onClick={() => galleryInputRef.current?.click()}>
                          <span className="mm-upload-source-icon"><Images size={22} aria-hidden="true" /></span>
                          <span className="mm-upload-source-copy"><strong>Elegir de galería</strong><small>Selecciona una imagen JPG, PNG o WEBP.</small></span>
                          <ChevronRight size={19} aria-hidden="true" />
                        </button>
                        <button type="button" className="mm-upload-source" onClick={() => pdfInputRef.current?.click()}>
                          <span className="mm-upload-source-icon"><FileText size={22} aria-hidden="true" /></span>
                          <span className="mm-upload-source-copy"><strong>Subir archivo PDF</strong><small>Elige un PDF guardado en tu dispositivo.</small></span>
                          <ChevronRight size={19} aria-hidden="true" />
                        </button>
                      </div>
                      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" tabIndex={-1} onChange={handleUploadInputChange} />
                      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" tabIndex={-1} onChange={handleUploadInputChange} />
                      <p className="mm-upload-source-note">La IA y el OCR ayudan a extraer y organizar los datos. Podrás revisarlos antes de guardarlos. Máximo 10 MB.</p>
                    </>
                  )}
                  {uploadError && (
                    <p className="mm-upload-source-error" role="alert"><AlertCircle size={18} aria-hidden="true" />{uploadError}</p>
                  )}
                </div>
              )}

              {/* ESTADO 2: ANALYZING (Progreso con IA) */}
              {uploadModalState === 'analyzing' && (
                <div className="py-8 px-2 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles className="w-8 h-8 animate-pulse text-teal-500" />
                  </div>

                  <div className="space-y-1">
                    <span className="font-extrabold text-ink dark:text-ink text-sm block">
                      Analizando tu documento con IA...
                    </span>
                    <p className="text-xs text-muted dark:text-muted max-w-xs mx-auto">
                      Extrayendo la información disponible. Puede tardar unos momentos.
                    </p>
                  </div>

                  <div className="space-y-2 max-w-sm mx-auto">
                    <div className="flex items-center justify-between text-xs font-mono text-muted dark:text-muted">
                      <span>Procesando OCR + LLM</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-muted dark:bg-surface-muted rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-blue-900 via-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(uploadProgress, 12)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ESTADO 3: PREVIEW (Revisión editable) */}
              {uploadModalState === 'preview' && (
                <div className="space-y-4">
                  {tempDocument?.analysis?.raw_text && <details className="rounded-xl border border-line p-4">
                    <summary className="cursor-pointer font-semibold">Texto leído con OCR local</summary>
                    <p className="my-2 text-sm text-muted">Compara este texto con el original y revisa los datos propuestos antes de guardarlos.</p>
                    <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm">{tempDocument.analysis.raw_text}</pre>
                  </details>}
                  {/* CASO A0: DOCUMENTO NO MÉDICO */}
                  {tempDocument?.analysis?.is_medical_document === false ? (
                    <div className="space-y-4 py-2">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                            No parece ser un documento médico
                          </h4>
                          <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                            No detectamos recetas, diagnósticos ni exámenes clínicos en esta imagen. Puede ser una captura de pantalla, comprobante o foto no médica.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-bold text-muted dark:text-body block">
                          ¿Qué te gustaría hacer?
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDiscardDocument(true)}
                            disabled={isSubmittingDiscard}
                            className="p-3 bg-surface dark:bg-surface-muted border border-line dark:border-line hover:border-teal-400 dark:hover:border-teal-500 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group"
                          >
                            <RefreshCw className="w-4 h-4 text-teal-600 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-bold text-body dark:text-body text-xs">Reintentar</span>
                            <span className="text-xs text-muted">Subir otra foto</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDiscardDocument(false)}
                            disabled={isSubmittingDiscard}
                            className="p-3 bg-surface dark:bg-surface-muted border border-line dark:border-line hover:border-rose-400 dark:hover:border-rose-500 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4 text-rose-500" />
                            <span className="font-bold text-body dark:text-body text-xs">Cancelar</span>
                            <span className="text-xs text-muted">Descartar archivo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveAnyway({ isNonMedical: true })}
                            disabled={isSubmittingConfirm}
                            className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <FileText className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                            <span className="font-bold text-teal-950 dark:text-teal-200 text-xs">Guardar igual</span>
                            <span className="text-xs text-teal-700 dark:text-teal-400">Sin extraer recetas</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : tempDocument?.isUnreadable ? (
                    <div className="space-y-4 py-2">
                      <button type="button" className="mm-button mm-button--primary" onClick={() => setTempDocument({ ...tempDocument, isUnreadable: false })}>Completar los datos manualmente</button>
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                            No pudimos leer bien esta imagen
                          </h4>
                          <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                            La foto puede estar borrosa, con poca luz o la letra es difícil de reconocer automáticamente.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-bold text-muted dark:text-body block">
                          ¿Qué te gustaría hacer?
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDiscardDocument(true)}
                            disabled={isSubmittingDiscard}
                            className="p-3 bg-surface dark:bg-surface-muted border border-line dark:border-line hover:border-teal-400 dark:hover:border-teal-500 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group"
                          >
                            <RefreshCw className="w-4 h-4 text-teal-600 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-bold text-body dark:text-body text-xs">Reintentar</span>
                            <span className="text-xs text-muted">Tomar otra foto</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDiscardDocument(false)}
                            disabled={isSubmittingDiscard}
                            className="p-3 bg-surface dark:bg-surface-muted border border-line dark:border-line hover:border-rose-400 dark:hover:border-rose-500 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4 text-rose-500" />
                            <span className="font-bold text-body dark:text-body text-xs">Cancelar</span>
                            <span className="text-xs text-muted">Descartar archivo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveAnyway()}
                            disabled={isSubmittingConfirm}
                            className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <FileText className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                            <span className="font-bold text-teal-950 dark:text-teal-200 text-xs">Guardar igual</span>
                            <span className="text-xs text-teal-700 dark:text-teal-400">Revisar después</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CASO B: LECTURA EXITOSA CON CAMPOS EDITABLES */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-xs font-bold text-body">Tipo de documento
                          <select value={editedData.document_type} onChange={(e) => setEditedData({ ...editedData, document_type: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-body">
                            <option value="RECETA">Receta médica</option><option value="EXAMEN_LAB">Examen de laboratorio</option>
                            <option value="INFORME">Informe</option><option value="IMAGEN">Imagen</option><option value="OTRO">Otro</option>
                          </select>
                        </label>
                        <label className="text-xs font-bold text-body">Fecha de emisión, si consta en el documento
                          <input type="date" value={editedData.documentDate || ''} onChange={(e) => setEditedData({ ...editedData, documentDate: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-body" />
                        </label>
                      </div>
                      {editedData.document_type === 'RECETA' && <>
                      {/* Diagnóstico editable */}
                      <div className="p-3.5 bg-canvas dark:bg-surface-muted/50 rounded-2xl border border-line dark:border-line/80 space-y-1.5">
                        <label className="font-bold text-slate-700 dark:text-body text-xs flex items-center justify-between">
                          <span>Diagnóstico médico detectado</span>
                          <span className="text-xs text-teal-700 dark:text-teal-400 font-mono">Editable</span>
                        </label>
                        <input
                          type="text"
                          value={editedData.diagnostico}
                          onChange={(e) => setEditedData({ ...editedData, diagnostico: e.target.value })}
                          placeholder="Ej: Faringoamigdalitis aguda, Control de rutina..."
                          className="w-full px-3 py-2 rounded-xl border border-line dark:border-line bg-surface dark:bg-surface text-body dark:text-ink text-xs focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                        />
                      </div>

                      {/* Lista editable de Medicamentos */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink dark:text-body text-xs flex items-center gap-1.5">
                            <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            Medicamentos extraídos ({editedData.medications.length})
                          </span>
                          <button
                            type="button"
                            onClick={handleAddMedicationRow}
                            className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Agregar fármaco</span>
                          </button>
                        </div>

                        {editedData.medications.length === 0 ? (
                          <div className="p-4 text-center border border-dashed border-line dark:border-line rounded-2xl text-muted dark:text-muted">
                            <span>No hay medicamentos cargados. Presiona "+ Agregar fármaco" para añadir uno.</span>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {editedData.medications.map((med, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-surface dark:bg-surface-muted/80 rounded-2xl border border-line dark:border-line space-y-2 shadow-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={med.name}
                                      onChange={(e) => handleUpdateMedication(idx, 'name', e.target.value)}
                                      placeholder="Nombre del medicamento (ej: Paracetamol)"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-line dark:border-line bg-canvas/50 dark:bg-surface text-body dark:text-ink font-bold text-xs focus:ring-1 focus:ring-teal-400"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedicationRow(idx)}
                                    className="p-1.5 text-muted hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title="Quitar medicamento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5">
                                  <div>
                                    <label className="text-xs text-muted dark:text-muted block mb-0.5">Dosis</label>
                                    <input
                                      type="text"
                                      value={med.dosage}
                                      onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                                      placeholder="ej: 500 mg"
                                      className="w-full px-2 py-1 rounded-md border border-line dark:border-line bg-canvas/50 dark:bg-surface text-slate-700 dark:text-body text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted dark:text-muted block mb-0.5">Frecuencia</label>
                                    <input
                                      type="text"
                                      value={med.frequency}
                                      onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                                      placeholder="ej: c/ 8 hrs"
                                      className="w-full px-2 py-1 rounded-md border border-line dark:border-line bg-canvas/50 dark:bg-surface text-slate-700 dark:text-body text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted dark:text-muted block mb-0.5">Duración</label>
                                    <input
                                      type="text"
                                      value={med.duration}
                                      onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                                      placeholder="ej: 7 días"
                                      className="w-full px-2 py-1 rounded-md border border-line dark:border-line bg-canvas/50 dark:bg-surface text-slate-700 dark:text-body text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      </>}
                      {editedData.document_type === 'EXAMEN_LAB' && (
                        <div className="space-y-3 rounded-2xl border border-line bg-canvas p-3">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-ink">Resultados detectados</h4>
                            <button type="button" onClick={() => setEditedData((current) => ({ ...current, labMetrics: [...current.labMetrics, { name: '', value: '', unit: '', referenceRange: '', isAbnormal: false }] }))} className="mm-text-link inline-flex items-center gap-1 text-xs"><Plus size={14} /> Agregar resultado</button>
                          </div>
                          {editedData.labMetrics.length === 0 && <p className="text-xs text-muted">No hay resultados detectados. Puedes agregarlos desde el documento original.</p>}
                          {editedData.labMetrics.map((metric, index) => (
                            <div key={index} className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface p-3">
                              {[['name', 'Parámetro'], ['value', 'Resultado'], ['unit', 'Unidad'], ['referenceRange', 'Rango']].map(([key, label]) => (
                                <label key={key} className="text-xs text-body">{label}<input value={metric[key]} onChange={(e) => setEditedData((current) => ({ ...current, labMetrics: current.labMetrics.map((row, i) => i === index ? { ...row, [key]: e.target.value } : row) }))} className="mt-1 w-full rounded-lg border border-line bg-canvas px-2 py-1 text-body" /></label>
                              ))}
                              <label className="flex items-center gap-2 text-xs text-body"><input type="checkbox" checked={metric.isAbnormal} onChange={(e) => setEditedData((current) => ({ ...current, labMetrics: current.labMetrics.map((row, i) => i === index ? { ...row, isAbnormal: e.target.checked } : row) }))} /> Alterado en el documento</label>
                              <button type="button" onClick={() => setEditedData((current) => ({ ...current, labMetrics: current.labMetrics.filter((_, i) => i !== index) }))} className="text-xs text-rose-600">Quitar</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
                      {uploadError}
                    </div>
                  )}
                </div>
              )}

              {/* ESTADO 4: CONFIRMED (Éxito y cierre) */}
              {uploadModalState === 'confirmed' && (
                <div className="py-8 text-center space-y-3">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-sm ${
                      confirmedStatus === 'CONFIRMADO'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-extrabold text-ink dark:text-ink">
                    Documento guardado en Mi ficha
                  </h4>
                  <p className="text-xs text-muted dark:text-muted max-w-xs mx-auto">
                    {confirmedStatus === 'CONFIRMADO'
                      ? 'Los datos extraídos quedan disponibles para consultar y compartir con tu médico.'
                      : 'El documento quedó guardado; sus datos extraídos siguen pendientes de completar.'}
                  </p>
                  {replacementWarning && <p role="alert" className="mx-auto max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{replacementWarning}</p>}
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-mono ${
                      confirmedStatus === 'CONFIRMADO'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    Cerrando automáticamente...
                  </span>
                </div>
              )}
            </div>

            {/* Footer con Botones de Acción (solo en preview legible y médico) */}
            {uploadModalState === 'preview' &&
              tempDocument?.analysis?.is_medical_document !== false &&
              !tempDocument?.isUnreadable && (
              <div className="pt-3 border-t border-stone-100 dark:border-line flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDiscardDocument(false)}
                  disabled={isSubmittingConfirm || isSubmittingDiscard}
                  className="px-4 py-2.5 rounded-xl border border-line dark:border-line hover:bg-surface-muted dark:hover:bg-slate-800 text-muted dark:text-body font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingDiscard ? 'Descartando...' : 'Descartar'}
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmDocument()}
                  disabled={isSubmittingConfirm || isSubmittingDiscard}
                  className="px-5 py-2.5 bg-action hover:bg-action-hover active:scale-95 text-on-action font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmittingConfirm ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-300" />
                      <span>Guardar en Mi ficha</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </DialogFrame>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPARTIR FICHA DIRECTAMENTE CON MÉDICO REGISTRADO */}
      {/* ========================================================================= */}
      {showDirectShareModal && (
        <DialogFrame label="Compartir con un médico" onClose={() => setShowDirectShareModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface dark:bg-surface border border-line dark:border-line rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-deep-brand text-teal-300 flex items-center justify-center shadow-xs">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-ink dark:text-ink">Compartir Ficha Médica</h3>
                  <p className="text-xs text-muted dark:text-muted">Autoriza temporalmente a un médico registrado</p>
                </div>
              </div>
              <button type="button" aria-label="Cerrar diálogo" onClick={() => setShowDirectShareModal(false)} className="p-1.5 text-muted hover:text-muted dark:hover:text-slate-200 rounded-xl hover:bg-surface-muted dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {directShareError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{directShareError}</span>
              </div>
            )}

            {directShareSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-extrabold">Acceso autorizado</p>
                  <p className="mt-1 leading-relaxed">{directShareSuccess}</p>
                  <p className="mt-1 text-xs opacity-80">El acceso aparecerá directamente en el portal del médico y podrás revocarlo desde Auditoría y Accesos.</p>
                </div>
              </div>
            )}

            {!directShareSuccess && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-body">1. Selecciona el médico</label>
                  {loadingDoctors ? (
                    <div className="py-8 text-center border border-line dark:border-line rounded-2xl">
                      <RefreshCw className="w-6 h-6 text-accent-ink dark:text-teal-400 animate-spin mx-auto" />
                      <p className="mt-2 text-xs text-muted">Cargando médicos registrados...</p>
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="p-4 bg-canvas dark:bg-surface-muted rounded-2xl border border-line dark:border-line text-xs text-muted dark:text-muted">
                      No hay médicos registrados disponibles para compartir directamente. Puedes utilizar el acceso por QR.
                    </div>
                  ) : (
                    <select aria-label="Duración del permiso"
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-line dark:border-line bg-surface dark:bg-surface-muted text-sm text-body dark:text-ink outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-accent-ink"
                    >
                      <option value="">Seleccionar médico...</option>
                      {doctors.map((doctor) => {
                        const name = `${doctor.first_name || doctor.firstName || doctor.name || 'Médico'} ${doctor.last_name || doctor.lastName || ''}`.trim();
                        const specialty = doctor.specialty || doctor.speciality || doctor.especialidad || '';
                        const rut = doctor.rut || doctor.run || '';
                        return (
                          <option key={doctor.id} value={doctor.id}>
                            {name}{specialty ? ` · ${specialty}` : ''}{rut ? ` · ${rut}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-body">2. Duración del acceso</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { hours: 2, label: '2 Horas', desc: 'Consulta' },
                      { hours: 12, label: '12 Horas', desc: 'Jornada' },
                      { hours: 24, label: '24 Horas', desc: 'Control' }
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setDirectShareDuration(opt.hours)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${directShareDuration === opt.hours
                          ? 'bg-action text-on-action border-accent-ink shadow-md ring-2 ring-teal-400/40'
                          : 'bg-surface dark:bg-surface-muted text-slate-700 dark:text-body border-line dark:border-line hover:border-accent-ink'
                        }`}
                      >
                        <span className="text-xs font-extrabold block">{opt.label}</span>
                        <span className={`text-xs mt-1 block ${directShareDuration === opt.hours ? 'text-on-action/80' : 'text-muted'}`}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-accent-ink/40">
                  <div className="flex gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-ink dark:text-blue-200">Acceso temporal y revocable</p>
                      <p className="text-xs text-muted dark:text-muted mt-1 leading-relaxed">El médico seleccionado podrá consultar tu ficha desde su propio portal durante el tiempo autorizado. El permiso puede revocarse antes de su vencimiento.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShareDirect}
                  disabled={isSharingDirect || loadingDoctors || !selectedDoctorId}
                  className="w-full py-3 bg-action hover:bg-action-hover active:scale-95 text-on-action font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSharingDirect ? <RefreshCw className="w-4 h-4 animate-spin text-teal-300" /> : <Share2 className="w-4 h-4 text-teal-300" />}
                  <span>{isSharingDirect ? 'Compartiendo...' : `Compartir por ${directShareDuration} Horas`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowDirectShareModal(false); openQrModal(); }}
                  className="w-full py-2.5 border border-line dark:border-line text-muted dark:text-body font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-canvas dark:hover:bg-slate-800 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  Usar QR en su lugar
                </button>
              </>
            )}

            <div className="pt-2 border-t border-stone-100 dark:border-line flex justify-end">
              <button type="button" aria-label="Cerrar diálogo" onClick={() => setShowDirectShareModal(false)} className="px-4 py-2 bg-surface-muted hover:bg-surface-muted dark:bg-surface-muted dark:hover:bg-slate-700 text-body dark:text-body font-bold rounded-xl text-xs cursor-pointer transition-colors">Cerrar</button>
            </div>
          </div>
        </DialogFrame>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CÓDIGO QR PARA EL MÉDICO (LEY N° 21.668 & 20.584) */}
      {/* ========================================================================= */}
      {showQrModal && (
        <DialogFrame label="Compartir mediante QR" onClose={closeQrModal} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface dark:bg-surface border border-line dark:border-line rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-deep-brand text-teal-300 flex items-center justify-center font-bold shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-ink dark:text-ink">
                    Pase de acceso temporal
                  </h3>
                  <p className="text-xs text-muted dark:text-muted">
                    Comparte tu ficha durante el tiempo elegido
                  </p>
                </div>
              </div>
              <button
                aria-label="Cerrar diálogo" onClick={closeQrModal}
                className="p-1.5 text-muted hover:text-muted dark:hover:text-slate-200 rounded-xl hover:bg-surface-muted dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner si ocurre */}
            {grantError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{grantError}</span>
              </div>
            )}

            {/* Estado de Carga */}
            {isLoadingGrant ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-accent-ink animate-spin mx-auto" />
                <p className="text-xs text-muted font-medium">Verificando tokens activos...</p>
              </div>
            ) : activeGrant ? (
              /* CASO A: TIENE UN PASE ACTIVO VIGENTE */
              <div className="space-y-4">
                {/* Banner de Vigencia Activa */}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      Pase activo{activeGrant.duration_hours ? ` (${activeGrant.duration_hours} horas)` : ''}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    {remainingTimeText || 'Calculando...'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewQrForm((visible) => !visible)}
                  aria-expanded={showNewQrForm}
                  className="w-full rounded-xl border border-teal-300 bg-teal-50 px-3 py-2.5 text-xs font-bold text-teal-900 transition-colors hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-950/30 dark:text-teal-100 dark:hover:bg-teal-900/40 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {showNewQrForm ? 'Ocultar nuevo pase' : 'Emitir otro pase para otro médico'}
                </button>
                {showNewQrForm && (
                  <div className="space-y-3 rounded-xl border border-line bg-canvas p-3 dark:bg-surface-muted/60">
                    <p className="text-xs text-body">El nuevo pase tendrá su propio código y vigencia. Este pase seguirá activo.</p>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Duración del nuevo pase">
                      {[2, 12, 24].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => setQrDuration(hours)}
                          aria-pressed={qrDuration === hours}
                          className={`rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${qrDuration === hours ? 'border-teal-500 bg-teal-100 text-teal-950 dark:bg-teal-900/60 dark:text-teal-100' : 'border-line bg-surface text-body hover:border-teal-400'}`}
                        >
                          {hours} horas
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateGrant(qrDuration)}
                      disabled={isGeneratingGrant}
                      className="w-full rounded-lg bg-action px-3 py-2.5 text-xs font-bold text-on-action hover:bg-action-hover disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGeneratingGrant ? <RefreshCw className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      Generar nuevo pase
                    </button>
                  </div>
                )}

                {/* Código QR SVG Centrado */}
                <div className="p-5 bg-canvas dark:bg-surface-muted/60 rounded-2xl border border-line dark:border-line flex flex-col items-center justify-center space-y-3">
                  <div className="bg-surface p-3.5 rounded-2xl shadow-md border border-line">
                    {resolvingShareUrl ? (
                      <div className="flex h-[180px] w-[180px] items-center justify-center text-center text-xs text-muted">Preparando QR…</div>
                    ) : (
                      <QRCodeSVG aria-label="Código QR de acceso temporal a tu ficha"
                        id="patient-qr-svg"
                        value={qrAccessUrl || activeGrant.token}
                        size={180}
                        level="H"
                        includeMargin={false}
                      />
                    )}
                  </div>

                  <div className="w-full min-w-0 text-center">
                    <span className="text-xs font-mono uppercase tracking-widest text-muted dark:text-muted block mb-0.5">
                      CÓDIGO DE ACCESO MÉDICO
                    </span>
                    <button type="button" onClick={handleCopyQrToken} aria-label="Copiar código de acceso QR" className="group relative mt-1 flex min-h-14 w-full items-center justify-center overflow-hidden rounded-lg border border-line bg-surface px-3 py-2 text-base font-mono font-black tracking-wider text-ink transition-colors hover:border-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink dark:text-teal-300">
                      <span className={`break-all transition-opacity ${copiedQrToken ? 'opacity-0' : 'group-hover:opacity-0 group-focus-visible:opacity-0'}`}>{activeGrant.token}</span>
                      <span className={`absolute inset-0 flex items-center justify-center gap-2 bg-surface text-sm font-semibold text-accent-ink transition-opacity ${copiedQrToken ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
                        {copiedQrToken ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
                        {copiedQrToken ? 'Código copiado' : 'Copiar código'}
                      </span>
                    </button>
                  </div>
                </div>

                {shareUrlError && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{shareUrlError}</p>}

                {/* Acciones para Compartir y Guardar */}
                <div className="space-y-2">
                    <button
                      onClick={handleDownloadQr}
                      disabled={resolvingShareUrl}
                      type="button"
                      className="w-full py-2.5 px-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 text-teal-900 dark:text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Descargar QR</span>
                    </button>
                </div>

                {/* Resumen Legal y Auditoría */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-accent-ink/40 rounded-xl text-xs text-ink dark:text-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-teal-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Actividad de este acceso</span>
                  </div>
                  <p className="text-xs text-muted dark:text-muted leading-relaxed">
                    Quien use el QR declara su RUT y nombre y solicita tu aprobación. Aprueba la consulta desde tu portal solo si esperas a esa persona. Estos datos no acreditan su identidad profesional.
                  </p>
                </div>

                {/* Botón de Revocación Inmediata */}
                <div className="pt-2 border-t border-stone-100 dark:border-line flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleRevokeGrant}
                    disabled={isRevokingGrant}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRevokingGrant ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Revocar pase</span>
                  </button>
                </div>
              </div>
            ) : (
              /* CASO B: NO TIENE UN PASE ACTIVO -> GENERADOR CON SELECCIÓN DE HORAS */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-body block mb-2">
                    Selecciona la duración del acceso para el médico:
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { hours: 2, label: '2 Horas', desc: 'Consulta Médica' },
                      { hours: 12, label: '12 Horas', desc: 'Jornada Clínica', highlight: true },
                      { hours: 24, label: '24 Horas', desc: 'Estadía / Control' }
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setQrDuration(opt.hours)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${qrDuration === opt.hours
                          ? 'bg-action text-on-action border-accent-ink shadow-md ring-2 ring-teal-400/40'
                          : 'bg-surface dark:bg-surface-muted text-slate-700 dark:text-body border-line dark:border-line hover:border-accent-ink'
                          }`}
                      >
                        <span className="text-xs font-extrabold">{opt.label}</span>
                        <span className={`text-xs mt-1 ${qrDuration === opt.hours ? 'text-on-action/80' : 'text-muted'}`}>
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Explicación de Funcionamiento */}
                <div className="p-3.5 bg-canvas dark:bg-surface-muted/60 rounded-2xl border border-line dark:border-line space-y-2 text-muted dark:text-body">
                  <span className="font-bold text-ink dark:text-ink text-xs block">
                    ¿Cómo funciona este acceso?
                  </span>
                  <ul className="text-xs text-muted dark:text-muted space-y-1 list-disc list-inside">
                    <li>El médico escanea tu QR desde su celular o sube una foto.</li>
                    <li>Declara su nombre, RUT e institución; estos datos no acreditan su identidad profesional.</li>
                    <li>Recibes una solicitud en tu portal y decides si apruebas esa consulta.</li>
                    <li>Tiene acceso de solo lectura únicamente durante las {qrDuration} horas elegidas.</li>
                    <li>Válido para cualquier médico: consultas privadas, CESFAM, clínicas u hospitales.</li>
                    <li>Puedes anular el permiso en cualquier momento con el botón de revocar.</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateGrant(qrDuration)}
                    disabled={isGeneratingGrant}
                    className="w-full py-3 bg-action hover:bg-action-hover active:scale-95 text-on-action font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isGeneratingGrant ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
                    ) : (
                      <QrCode className="w-4 h-4 text-teal-300" />
                    )}
                    <span>Generar Pase QR ({qrDuration} Horas)</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-stone-100 dark:border-line flex justify-end">
              <button
                type="button"
                aria-label="Cerrar diálogo" onClick={closeQrModal}
                className="px-4 py-2 bg-surface-muted hover:bg-surface-muted dark:bg-surface-muted dark:hover:bg-slate-700 text-body dark:text-body font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </DialogFrame>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR / COMPLETAR ANTECEDENTES DE SALUD (ONBOARDING) */}
      {/* ========================================================================= */}
      {showProfileEditModal && (
        <DialogFrame label="Editar perfil de salud" onClose={savingProfile ? undefined : () => setShowProfileEditModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-surface dark:bg-surface border border-line dark:border-line rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-deep-brand text-teal-300 flex items-center justify-center font-bold shadow-xs shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-ink dark:text-ink">
                    Modificar Mi Perfil de Salud
                  </h3>
                  <p className="text-xs text-muted dark:text-muted">
                    Toca las opciones para seleccionarlas. Sin necesidad de escribir.
                  </p>
                </div>
              </div>
              <button
                aria-label="Cerrar diálogo" onClick={() => setShowProfileEditModal(false)}
                className="p-1.5 text-muted hover:text-muted rounded-xl hover:bg-surface-muted dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {profileSaveError && <Notice title="Cambios sin guardar" tone="danger">{profileSaveError}</Notice>}
              {/* 1. Previsión de Salud */}
              <div className="space-y-2 p-3 bg-canvas/70 dark:bg-surface-muted/50 rounded-2xl border border-line/80 dark:border-line/60">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-ink dark:text-body flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-accent-ink dark:text-teal-300" />
                    Previsión de Salud
                  </span>
                  <span className="text-xs text-muted font-mono">Selecciona una</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {PREVISION_OPTIONS.map((opt) => {
                    const isSelected = editFormData.healthInsurance === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setEditFormData({ ...editFormData, healthInsurance: isSelected ? '' : opt })}
                        className={`p-2 rounded-xl text-left text-xs font-semibold transition-all border cursor-pointer flex items-center justify-between gap-1 ${
                          isSelected
                            ? 'bg-action text-on-action border-accent-ink shadow-2xs font-bold'
                            : 'bg-surface dark:bg-surface text-body dark:text-body border-line dark:border-line hover:border-accent-ink'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Grupo Sanguíneo & Factor Rh */}
              <div className="space-y-2 p-3 bg-rose-50/40 dark:bg-rose-950/20 rounded-2xl border border-rose-200/80 dark:border-rose-900/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    Grupo Sanguíneo & Factor Rh
                  </span>
                  <span className="text-xs text-rose-700 dark:text-rose-400 font-mono">Selecciona uno</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {BLOOD_TYPE_OPTIONS.map((bt) => {
                    const isSelected = editFormData.bloodType === bt;
                    return (
                      <button
                        key={bt}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setEditFormData({ ...editFormData, bloodType: isSelected ? '' : bt })}
                        className={`py-2 px-2.5 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-surface dark:bg-surface text-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
                        }`}
                      >
                        <span>{bt}</span>
                        {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Alergias a Medicamentos o Sustancias */}
              <div className="space-y-2 p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Alergias a Medicamentos o Sustancias
                  </span>
                  <span className="text-xs text-amber-800 dark:text-amber-400 font-mono">
                    {editFormData.allergies.length} seleccionadas
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGY_OPTIONS.map((allergy) => {
                    const isSelected = editFormData.allergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleAllergy(allergy)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#825316] text-white border-[#825316] shadow-2xs font-bold'
                            : 'bg-surface dark:bg-surface text-body dark:text-body border-line dark:border-line hover:border-amber-300'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 opacity-40" />}
                        <span>{allergy}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Enfermedades y Patologías Crónicas */}
              <div className="space-y-2 p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-accent-ink/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-ink dark:text-blue-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Patologías Crónicas / Diagnósticos GES
                  </span>
                  <span className="text-xs text-accent-ink dark:text-blue-400 font-mono">
                    {editFormData.chronicConditions.filter(c => !c.startsWith('Medicamento: ') && !c.startsWith('Cirugía: ')).length} seleccionadas
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITION_OPTIONS.map((cond) => {
                    const isSelected = editFormData.chronicConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleCondition(cond)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-action text-on-action border-accent-ink shadow-2xs font-bold'
                            : 'bg-surface dark:bg-surface text-body dark:text-body border-line dark:border-line hover:border-accent-ink'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 text-teal-300" /> : <Plus className="w-3.5 h-3.5 opacity-40" />}
                        <span>{cond}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Medicamentos de Uso Diario o Frecuente */}
              <div className="space-y-2 p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Medicamentos de Uso Diario o Frecuente
                  </span>
                  <span className="text-xs text-emerald-800 dark:text-emerald-400 font-mono">
                    {editFormData.chronicConditions.filter(c => c.startsWith('Medicamento: ')).length} seleccionados
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MEDICATION_OPTIONS.map((med) => {
                    const prefixed = `Medicamento: ${med}`;
                    const isSelected = editFormData.chronicConditions.includes(prefixed);
                    return (
                      <button
                        key={med}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleMedication(med)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-bold'
                            : 'bg-surface dark:bg-surface text-body dark:text-body border-line dark:border-line hover:border-emerald-300'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 opacity-40" />}
                        <span>{med}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Cirugías Previas / Antecedentes Quirúrgicos */}
              <div className="space-y-2 p-3 bg-violet-50/40 dark:bg-violet-950/20 rounded-2xl border border-violet-200/80 dark:border-violet-900/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-violet-950 dark:text-violet-200 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    Cirugías Previas / Intervenciones
                  </span>
                  <span className="text-xs text-violet-800 dark:text-violet-400 font-mono">
                    {editFormData.chronicConditions.filter(c => c.startsWith('Cirugía: ')).length} seleccionadas
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SURGERY_OPTIONS.map((surg) => {
                    const prefixed = `Cirugía: ${surg}`;
                    const isSelected = editFormData.chronicConditions.includes(prefixed);
                    return (
                      <button
                        key={surg}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleSurgery(surg)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-violet-700 text-white border-violet-700 shadow-2xs font-bold'
                            : 'bg-surface dark:bg-surface text-body dark:text-body border-line dark:border-line hover:border-violet-300'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 opacity-40" />}
                        <span>{surg}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notificación de Validación de Completitud en Vivo */}
              {(!editFormData.healthInsurance || !editFormData.bloodType) ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="leading-snug">
                    Para retirar la advertencia de <strong>"Perfil Pendiente"</strong>, debes seleccionar al menos tu <strong>Previsión de Salud</strong> y tu <strong>Grupo Sanguíneo</strong>.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="leading-snug">
                    ¡Campos esenciales completos! Al presionar <strong>Guardar Cambios</strong>, la advertencia se retirará y tu estado cambiará a <strong>"Perfil Completo"</strong>.
                  </span>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-stone-100 dark:border-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  aria-label="Cerrar diálogo" onClick={() => setShowProfileEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-line dark:border-line hover:bg-surface-muted dark:hover:bg-slate-800 text-muted dark:text-body font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-action hover:bg-action-hover active:scale-95 text-on-action font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4 text-teal-300" />
                  <span>{savingProfile ? 'Guardando…' : 'Guardar Cambios en Mi Perfil'}</span>
                </button>
              </div>
            </form>
          </div>
        </DialogFrame>
      )}

      {/* Navegación Móvil Inferior */}
      <BottomNav
        activeTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onUpload={handleOpenUploadModal}
        isUploading={uploadModalState === 'analyzing'}
      />

      <footer className="py-4 text-center text-xs text-muted dark:text-muted border-t border-line dark:border-line bg-surface dark:bg-surface">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
