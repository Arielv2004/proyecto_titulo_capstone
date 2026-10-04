import React, { useState, useMemo, useEffect } from 'react';
import { useMetaTags } from '../hooks/useMetaTags';
import { documentsApi, mapDocumentFromApi } from '../services/documentsApi';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  Home,
  Pill,
  FlaskConical,
  Stethoscope,
  ScanLine,
  Camera,
  QrCode,
  Search,
  FileText,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Building2,
  User,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Share2,
  X,
  Layers,
  Lock,
  Calendar,
  UploadCloud,
  HelpCircle,
  PhoneCall,
  Heart,
  FileCheck2,
  Activity,
  AlertTriangle,
  UserCheck,
  Shield,
  ShieldAlert,
  Droplet,
  Edit3,
  Save,
  Plus,
  Trash2,
  Mail,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Timer
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';

import { Navbar } from '../components/common/Navbar';
import { BottomNav } from '../components/common/BottomNav';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const PatientDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useMetaTags('Portal Paciente', 'Ficha clínica digital unificada, recetas inteligentes y exámenes con IA en MyMedRecord.');

  // Pestaña activa ('home' | 'records' | 'help' | 'profile')
  const [currentTab, setCurrentTab] = useState('home');

  // Perfil Clínico Base del Paciente (persistente en localStorage y editable)
  const [patientProfile, setPatientProfile] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        bloodType: '',
        healthInsurance: '',
        isOrganDonor: true,
        allergies: [],
        chronicConditions: [],
        emergencyContactName: '',
        emergencyContactPhone: '',
        isCompleted: false
      };
    }
    try {
      const saved = localStorage.getItem('mymedrecord_saved_patient_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...parsed,
            isCompleted: Boolean(parsed.isCompleted && parsed.bloodType && parsed.healthInsurance)
          };
        }
      }
    } catch (e) {
      console.error('Error loading patient profile:', e);
    }
    return {
      bloodType: '',
      healthInsurance: '',
      isOrganDonor: true,
      allergies: [],
      chronicConditions: [],
      emergencyContactName: '',
      emergencyContactPhone: '',
      isCompleted: false
    };
  });

  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [dismissIncompleteAlert, setDismissIncompleteAlert] = useState(false);

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
  const [showQrModal, setShowQrModal] = useState(false);
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [remainingTimeText, setRemainingTimeText] = useState('');

  // Estado para Lista de Pases QR y Accesos (Punto 2)
  const [myGrants, setMyGrants] = useState([]);
  const [loadingGrants, setLoadingGrants] = useState(false);

  // Estado para Bitácora de Auditoría (Punto 3 - Ley 21.668)
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // 1. Cargar perfil clínico real desde la base de datos PostgreSQL (Punto 1)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/patient-profile/me');
        if (mounted && res.data?.success && res.data?.data) {
          const d = res.data.data;
          const p = {
            bloodType: d.blood_type || '',
            healthInsurance: d.health_insurance || '',
            isOrganDonor: d.is_organ_donor ?? true,
            allergies: Array.isArray(d.allergies) ? d.allergies : [],
            chronicConditions: Array.isArray(d.chronic_conditions) ? d.chronic_conditions : [],
            emergencyContactName: d.emergency_contact_name || '',
            emergencyContactPhone: d.emergency_contact_phone || '',
            isCompleted: !!(d.blood_type && d.health_insurance)
          };
          setPatientProfile(p);
        }
      } catch (err) {
        console.warn('Error cargando perfil del paciente desde backend:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 2. Cargar lista de pases y accesos del paciente (Punto 2)
  const fetchMyGrants = async () => {
    try {
      setLoadingGrants(true);
      const res = await api.get('/access-grants/my-grants');
      if (res.data?.success) {
        setMyGrants(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error cargando pases de acceso:', err);
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
      const res = await api.get('/audit/my-logs');
      if (res.data?.success) {
        setAuditLogs(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error cargando bitácora de auditoría:', err);
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

  // Cargar documentos del backend al montar el componente
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingDocs(true);
        setDocsError(null);
        const res = await documentsApi.list();
        if (mounted) {
          const mapped = (res.data || []).map(mapDocumentFromApi);
          setDocuments(mapped);
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [tempDocument, setTempDocument] = useState(null);
  const [editedData, setEditedData] = useState({
    document_type: 'RECETA',
    diagnostico: '',
    medications: [],
  });
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);
  const [isSubmittingDiscard, setIsSubmittingDiscard] = useState(false);
  const [confirmedStatus, setConfirmedStatus] = useState('CONFIRMADO');

  const handleOpenUploadModal = () => {
    setUploadError(null);
    setUploadProgress(0);
    setTempDocument(null);
    setEditedData({
      document_type: 'RECETA',
      diagnostico: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
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
        isMedicalDoc && (Boolean(isUnreadable) || (initialMeds.length === 0 && !initialDiag.trim()));

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
        diagnostico: editedData.diagnostico || '',
        medications: editedData.medications
          .filter((m) => m.name && m.name.trim().length > 0)
          .map((m) => ({
            name: m.name.trim(),
            dosage: m.dosage ? m.dosage.trim() : null,
            frequency: m.frequency ? m.frequency.trim() : null,
            duration: m.duration ? m.duration.trim() : null,
          })),
      };

      const res = await documentsApi.confirm(tempDocument.tempId, payload, true);
      const returnedDoc = res.data?.document || { id: tempDocument.tempId, ...payload, status: 'CONFIRMADO' };
      const newDoc = mapDocumentFromApi({
        ...returnedDoc,
        structured: res.data?.structured,
      });

      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDocument(newDoc);
      setConfirmedStatus(returnedDoc.status || 'CONFIRMADO');
      setUploadModalState('confirmed');

      setTimeout(() => {
        if (tempDocument?.filePreviewUrl) {
          URL.revokeObjectURL(tempDocument.filePreviewUrl);
        }
        setTempDocument(null);
        setUploadModalState(null);
      }, 1800);
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

      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDocument(newDoc);
      setConfirmedStatus(returnedDoc.status || 'PENDIENTE_REVISION');
      setUploadModalState('confirmed');

      setTimeout(() => {
        if (tempDocument?.filePreviewUrl) {
          URL.revokeObjectURL(tempDocument.filePreviewUrl);
        }
        setTempDocument(null);
        setUploadModalState(null);
      }, 1800);
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
        console.warn('Error al descartar documento temporal:', err);
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

  // Compatibilidad hacia atrás
  const handleUploadFile = handleStartAnalyze;
  // Manejar la eliminación de un documento con error
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
        icon: Pill,
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
        icon: FlaskConical,
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
        icon: Stethoscope,
        count: consultaCount,
        badgeText: consultaBadge,
        border: 'border-blue-200/80 dark:border-blue-900',
        iconColor: 'text-blue-800 dark:text-blue-400',
        iconBg: 'bg-blue-100/80 dark:bg-blue-950/40',
      },
      {
        id: 'IMAGEN',
        title: 'Informes & Imágenes',
        subtitle: 'Radiografías y ecografías',
        icon: ScanLine,
        count: imagenCount,
        badgeText: imagenBadge,
        border: 'border-indigo-200/80 dark:border-indigo-900',
        iconColor: 'text-indigo-800 dark:text-indigo-400',
        iconBg: 'bg-indigo-100/80 dark:bg-indigo-950/40',
      },
    ];
  }, [documents]);

  // Tratamientos farmacológicos activos (recetas vigentes a la fecha de hoy)
  const activeTreatments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return documents
      .filter((doc) => {
        const isReceta = doc.category === 'RECETA';
        const isStatusValid =
          doc.status === 'CONFIRMADA' ||
          doc.status === 'CONFIRMADO' ||
          doc.status === 'PENDIENTE' ||
          doc.status === 'PENDIENTE_REVISION';
        const rawDate = doc.extractedData?.validUntilRaw || doc.validUntilRaw;

        if (!isReceta || !isStatusValid || !rawDate) return false;

        const validUntil = new Date(rawDate);
        validUntil.setHours(23, 59, 59, 999);
        return validUntil >= today;
      })
      .flatMap((doc) =>
        (doc.extractedData?.medicamentos || []).map((med) => ({
          ...med,
          documentId: doc.id,
          validUntil: doc.extractedData?.vigenciaHasta || doc.validUntil,
          validUntilRaw: doc.extractedData?.validUntilRaw || doc.validUntilRaw,
        }))
      );
  }, [documents]);

  // Texto de vigencia más próxima para el badge de tratamientos activos
  const closestExpiryText = useMemo(() => {
    if (!activeTreatments.length) return null;
    const sorted = [...activeTreatments].sort(
      (a, b) => new Date(a.validUntilRaw) - new Date(b.validUntilRaw)
    );
    return sorted[0].validUntil ? `Vigente hasta ${sorted[0].validUntil}` : 'Tratamiento vigente';
  }, [activeTreatments]);

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
    setSelectedCategory(categoryId);
    setCurrentTab('records');
  };

  const handleOpenEditProfile = () => {
    setEditFormData({
      bloodType: patientProfile.bloodType || '',
      healthInsurance: patientProfile.healthInsurance || '',
      isOrganDonor: true,
      allergies: [...(patientProfile.allergies || [])],
      chronicConditions: [...(patientProfile.chronicConditions || [])],
      emergencyContactName: '',
      emergencyContactPhone: ''
    });
    setShowProfileEditModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const isCompleted = Boolean(editFormData.bloodType && editFormData.healthInsurance);
    const updated = {
      ...editFormData,
      isCompleted
    };
    setPatientProfile(updated);
    try {
      await api.put('/patient-profile/me', updated);
      localStorage.setItem('mymedrecord_saved_patient_profile', JSON.stringify(updated));
      if (user?.email) {
        localStorage.setItem(`mymedrecord_saved_patient_profile_${user.email}`, JSON.stringify(updated));
      }
      fetchAuditLogs();
    } catch (err) {
      console.error('Error guardando perfil en backend:', err);
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
      console.error('Error cargando médicos:', err);
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
      console.error('Error compartiendo ficha directamente:', err);
      setDirectShareError(
        err.response?.data?.message || err.message || 'No fue posible compartir la ficha con el médico.'
      );
    } finally {
      setIsSharingDirect(false);
    }
  };

  // Cargar token QR activo al abrir el modal
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
            duration_hours: g.duration_hours || g.durationHours || 12,
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
      console.error('Error fetching active grant:', err);
      setActiveGrant(null);
    } finally {
      setIsLoadingGrant(false);
    }
  };

  useEffect(() => {
    if (showQrModal) {
      fetchActiveGrant();
    }
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
        await fetchMyGrants();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Error generating grant:', err);
      setGrantError(err.response?.data?.message || 'Error al generar código QR de acceso');
    } finally {
      setIsGeneratingGrant(false);
    }
  };

  // Revocar acceso inmediato del grant activo del modal
  const handleRevokeGrant = async () => {
    if (!activeGrant?.id) return;
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas revocar el acceso médico de inmediato? Si el profesional está viendo tu ficha, perderá el acceso de inmediato.'
    );
    if (!confirmed) return;

    try {
      setIsRevokingGrant(true);
      setGrantError(null);
      await api.patch(`/access-grants/${activeGrant.id}/revoke`, {
        reason: 'Revocado manualmente por el paciente desde su panel de control'
      });
      setActiveGrant(null);
      await fetchMyGrants();
      fetchAuditLogs();
    } catch (err) {
      console.error('Error revoking grant:', err);
      setGrantError(err.response?.data?.message || 'Error al revocar el acceso');
    } finally {
      setIsRevokingGrant(false);
    }
  };

  // Revocar un pase específico de la lista (Punto 2)
  const handleRevokeSpecificGrant = async (grantId) => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas revocar este pase de acceso médico inmediatamente? Cualquier profesional que intente usarlo perderá el acceso.'
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
      console.error('Error revoking grant:', err);
      alert(err.response?.data?.message || 'Error al revocar el acceso');
    }
  };

  // Copiar link de acceso médico directo al portapapeles
  const handleCopyLink = () => {
    if (!activeGrant?.token) return;
    const directUrl = `${window.location.origin}/doctor/qr-access?token=${encodeURIComponent(activeGrant.token)}`;
    navigator.clipboard.writeText(directUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      // Fallback
    });
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
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

        // Cabecera institucional azul
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(12, 12, canvas.width - 24, 110);

        // Franja bicolor
        ctx.fillStyle = '#0033a0';
        ctx.fillRect(12, 122, (canvas.width - 24) / 2, 6);
        ctx.fillStyle = '#d52b1e';
        ctx.fillRect(12 + (canvas.width - 24) / 2, 122, (canvas.width - 24) / 2, 6);

        // Textos del encabezado
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MyMedRecord', canvas.width / 2, 62);

        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#99f6e4';
        ctx.fillText('PASE DE ACCESO MÉDICO TEMPORAL • LEY N° 21.668', canvas.width / 2, 95);

        // Marco y renderizado del Código QR
        const qrSize = 460;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 160;

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // Indicador del código de acceso
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillText('CÓDIGO DE ACCESO / TOKEN:', canvas.width / 2, 675);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(activeGrant?.token || '---', canvas.width / 2, 715);

        // Indicador de vigencia
        ctx.fillStyle = '#047857';
        ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Vigencia Autorizada: ${activeGrant?.duration_hours || 12} Horas`, canvas.width / 2, 765);

        // Información al médico y paciente
        ctx.fillStyle = '#64748b';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText('El profesional médico debe ingresar su RUT y nombre para validar la consulta.', canvas.width / 2, 805);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 12px system-ui, -apple-system, sans-serif';
        ctx.fillText('Acceso seguro, encriptado y trazable auditado por MyMedRecord.', canvas.width / 2, 830);

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
      console.error('Error descargando QR:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-800">
      <Navbar
        roleTitle="Portal Paciente"
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenHelp={() => setCurrentTab('help')}
      />

      {/* Barra de Navegación por Pestañas Superior (Solo Escritorio / Tablet) */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border-b border-stone-200/80 dark:border-slate-800 sticky top-14 z-20 overflow-x-auto scrollbar-none shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center gap-1.5 sm:gap-2 py-2 min-w-max">
          <button
            onClick={() => setCurrentTab('home')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'home' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
          >
            <Home className="w-4 h-4" />
            <span>Inicio</span>
          </button>

          <button
            onClick={() => setCurrentTab('records')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'records' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historial y Documentos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-300">
              {documents.length}
            </span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('audit');
              fetchAuditLogs();
              fetchMyGrants();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'audit' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
          >
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Auditoría & Accesos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800/60 font-bold">
              Ley 21.668
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('help')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'help' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ayuda & FAQ</span>
          </button>

          <button
            onClick={() => setCurrentTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'profile' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
          >
            <User className="w-4 h-4" />
            <span>Mi Perfil</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28 sm:pb-12">
        {/* ========================================================================= */}
        {/* PESTAÑA 1: INICIO (HOME PRINCIPAL) */}
        {/* ========================================================================= */}
        {currentTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Alerta de Recordatorio: Solo si NO está completada y el usuario no la ha cerrado */}
            {!patientProfile.isCompleted && !dismissIncompleteAlert && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-500/40 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-start gap-3.5 pr-6 md:pr-0">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-blue-950 dark:text-amber-100">
                        ¡Aún no completas tu Perfil de Salud!
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300/50">
                        Acción Recomendada
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 max-w-2xl leading-relaxed">
                      Para que los profesionales de salud cuenten con tus antecedentes vitales ante una atención o urgencia (<strong>grupo sanguíneo, alergias y contacto de emergencia</strong>), te sugerimos completar tu perfil.
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0 flex items-center gap-2">
                  <button
                    onClick={handleOpenEditProfile}
                    className="w-full md:w-auto px-5 py-2.5 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-teal-300" />
                    <span>Completar Perfil Ahora</span>
                  </button>

                  <button
                    onClick={() => setDismissIncompleteAlert(true)}
                    className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-all cursor-pointer"
                    title="Cerrar recordatorio"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Notificación temporal de éxito cuando completa los datos */}
            {showSuccessAlert && (
              <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-300 dark:border-emerald-600 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                        ¡Perfil de Salud Completado con Éxito!
                      </h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300/60">
                        Datos Registrados
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                      Tus antecedentes de urgencia, grupo sanguíneo y contacto han sido resguardados en tu perfil de forma segura.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuccessAlert(false)}
                  className="p-1.5 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-white rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer ml-3 shrink-0"
                  title="Cerrar aviso"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-md border border-slate-800">
              <div className="absolute -right-12 -top-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1.5 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-300" /> Ficha Única Interoperable (Ley N° 21.668)
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-300 bg-white/10 border border-white/10">
                      RUT: 12.345.678-9
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Hola, {user?.first_name || 'Ignacio'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                    Tus recetas, exámenes y atenciones médicas centralizados con Inteligencia Artificial. Fotografía cualquier papel y accede a tu ficha médica oficial.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 shrink-0">
                  <button
                    onClick={handleOpenUploadModal}
                    className="px-5 py-3.5 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 active:scale-95 text-blue-950 font-black rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-blue-950" />
                    <span>Digitalizar con IA</span>
                  </button>

                  <button
                    onClick={handleOpenDirectShare}
                    className="px-4 py-3.5 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xs"
                  >
                    <Share2 className="w-4 h-4 text-teal-300" />
                    <span>Compartir Ficha</span>
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="px-4 py-3.5 bg-white/5 hover:bg-white/15 active:scale-95 border border-white/15 text-white font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xs"
                    title="Acceso alternativo mediante QR"
                  >
                    <QrCode className="w-4 h-4 text-teal-300" />
                    <span>QR</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Pilares Clínicos Separados */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-blue-950 dark:text-slate-100 tracking-tight">
                    Categorías de tu Ficha Clínica
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Toca cualquier sección para ir directamente a sus documentos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {clinicalPillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.id}
                      onClick={() => handlePillarClick(pillar.id)}
                      className="group p-5 bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/90 dark:border-slate-800 hover:border-blue-900 dark:hover:border-teal-500 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-12 h-12 rounded-2xl ${pillar.iconBg} flex items-center justify-center ${pillar.iconColor}`}>
                            <Icon className="w-6 h-6 stroke-[2]" />
                          </div>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${pillar.iconBg} ${pillar.iconColor} ${pillar.border}`}>
                            {pillar.badgeText}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-blue-950 dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-teal-400 transition-colors">
                          {pillar.title}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                          {pillar.subtitle}
                        </p>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-700 dark:text-slate-300">
                          {pillar.count} {pillar.count === 1 ? 'registro' : 'registros'}
                        </span>
                        <span className={`flex items-center gap-1 font-bold text-[11px] group-hover:translate-x-1 transition-transform ${pillar.iconColor}`}>
                          <span>Explorar</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Tratamiento Activo de Hoy */}
            <section className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-blue-950 dark:text-slate-100">
                      Tratamiento Farmacológico Activo
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Medicamentos vigentes según tus recetas digitalizadas
                    </p>
                  </div>
                </div>

                {activeTreatments.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 rounded-full w-fit">
                    <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {closestExpiryText}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 px-2.5 py-1 rounded-full w-fit">
                    <Clock className="w-3 h-3 text-stone-400 dark:text-slate-500" /> Sin recetas vigentes
                  </span>
                )}
              </div>

              {activeTreatments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {activeTreatments.map((med, idx) => {
                    const medName = med.nombre || med.name || 'Medicamento';
                    const medDosage =
                      med.dosis && med.dosis !== '—' && med.dosis !== '-'
                        ? ` ${med.dosis}`
                        : med.dosage && med.dosage !== '—' && med.dosage !== '-'
                          ? ` ${med.dosage}`
                          : '';
                    const title = `${medName}${medDosage}`;
                    const badge =
                      med.posologia && med.posologia !== '—'
                        ? med.posologia
                        : med.frequency && med.frequency !== '—'
                          ? med.frequency
                          : 'Según indicación';
                    const instruction =
                      med.horario && med.horario !== '—'
                        ? med.horario
                        : med.instructions && med.instructions !== '—'
                          ? med.instructions
                          : med.indicaciones && med.indicaciones !== '—'
                            ? med.indicaciones
                            : 'Tomar según prescripción médica.';
                    const duration =
                      med.duracion && med.duracion !== '—'
                        ? `Duración: ${med.duracion}`
                        : med.duration && med.duration !== '—'
                          ? `Duración: ${med.duration}`
                          : null;

                    return (
                      <div
                        key={`${med.documentId || 'med'}-${idx}`}
                        className="p-4 rounded-2xl bg-stone-50/80 dark:bg-slate-800/50 border border-stone-200/80 dark:border-slate-700 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-blue-950 dark:text-slate-100 text-sm truncate">
                            {title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold shrink-0">
                            {badge}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-slate-300">
                          {instruction}
                        </p>
                        {duration && (
                          <p className="text-[11px] text-stone-400 dark:text-slate-500">
                            {duration}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
                    <Pill className="w-12 h-12 text-stone-300 dark:text-slate-600" />
                  </div>
                  <div className="max-w-sm space-y-1">
                    <h4 className="text-sm font-bold text-blue-950 dark:text-slate-200">
                      Sin tratamientos activos
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      Cuando tu médico te recete medicamentos vigentes, aparecerán acá.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('RECETA');
                      setCurrentTab('records');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-blue-950 dark:text-slate-200 transition-colors cursor-pointer mt-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400" />
                    <span>Ver historial de recetas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </section>

            {/* Gestión Rápida de Pases QR Activos (Punto 2) */}
            <section className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-blue-950 dark:text-slate-100">
                        Pases de Acceso Médico (Ley N° 21.668)
                      </h3>
                      {myGrants.some(g => g.status === 'ACTIVO') && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"></span>
                          Vigente
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Controla quién puede consultar tu ficha en tiempo real o revoca accesos de inmediato
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-teal-300" />
                    <span>Generar Nuevo QR</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab('audit');
                      fetchAuditLogs();
                      fetchMyGrants();
                    }}
                    className="px-3 py-2 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Ver Trazabilidad</span>
                  </button>
                </div>
              </div>

              {/* Lista de Pases Activos Recientes */}
              {myGrants.length === 0 ? (
                <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-200/80 dark:border-slate-700 text-center text-xs text-stone-500 dark:text-slate-400">
                  No tienes pases QR generados. Puedes crear uno para que tu médico escanee tu ficha en la consulta.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myGrants.slice(0, 4).map((grant) => (
                    <div
                      key={grant.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${grant.status === 'ACTIVO'
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 shadow-xs'
                        : grant.status === 'REVOCADO'
                          ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900 opacity-80'
                          : 'bg-stone-50/70 dark:bg-slate-800/50 border-stone-200/80 dark:border-slate-700 opacity-70'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-950 dark:text-slate-100">
                              {grant.token}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${grant.status === 'ACTIVO'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900'
                                : grant.status === 'REVOCADO'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-900'
                                  : 'bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-300'
                                }`}
                            >
                              {grant.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 dark:text-slate-400">
                            {grant.doctorName ? (
                              <span className="text-teal-900 dark:text-teal-300 font-semibold flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5" />
                                Escaneado por: {grant.doctorName} ({grant.doctorInstitution || 'Centro Médico'})
                              </span>
                            ) : (
                              <span>Sin escanear todavía (esperando médico)</span>
                            )}
                          </p>
                        </div>

                        {grant.status === 'ACTIVO' && (
                          <span className="text-[11px] font-mono font-bold text-emerald-800 flex items-center gap-1 shrink-0 bg-white px-2 py-1 rounded-lg border border-emerald-200">
                            <Timer className="w-3.5 h-3.5" />
                            {grant.minutesRemaining} min
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">
                          {grant.createdAt ? new Date(grant.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>

                        {grant.status === 'ACTIVO' && (
                          <button
                            onClick={() => handleRevokeSpecificGrant(grant.id)}
                            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Revocar Acceso</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Accesos Rápidos a Documentos */}
            <div className="p-5 bg-gradient-to-r from-blue-900 to-teal-900 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm">¿Deseas ver tus exámenes o recetas anteriores?</h4>
                <p className="text-xs text-blue-100/80">Revisa el repositorio completo de documentos en la pestaña Historial.</p>
              </div>
              <button
                onClick={() => setCurrentTab('records')}
                className="px-5 py-2.5 bg-white text-blue-950 font-bold text-xs rounded-xl shadow-xs hover:bg-stone-100 transition-all shrink-0 cursor-pointer"
              >
                Abrir Historial de Documentos →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* PESTAÑA 2: HISTORIAL Y DOCUMENTOS (OPTIMIZADO MÓVIL Y DESKTOP) */}
        {/* ========================================================================= */}
        {currentTab === 'records' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            {/* Encabezado del Historial */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-black text-blue-950 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>Historial de Documentos</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-slate-400">
                  Recetas, exámenes de laboratorio y atenciones digitalizadas con extracción IA.
                </p>
              </div>

              <button
                onClick={handleOpenUploadModal}
                className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Camera className="w-4 h-4 text-teal-300" />
                <span>+ Subir Nuevo Papel</span>
              </button>
            </div>

            {/* Barra de Filtros y Buscador */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                {/* Buscador */}
                <div className="relative w-full md:w-72 order-1 md:order-2">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar fármaco, doctor o clínica..."
                    className="w-full pl-10 pr-8 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs font-bold flex items-center justify-center cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Chips de Categorías */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none order-2 md:order-1">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${selectedCategory === 'ALL'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300'
                      }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Todos</span>
                    <span className="text-[10px] opacity-80">({documents.length})</span>
                  </button>

                  {clinicalPillars.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedCategory(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${selectedCategory === p.id
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300'
                        }`}
                    >
                      <span>{p.title}</span>
                      <span className="text-[10px] opacity-80">({p.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Listado de Documentos */}
              <div className="space-y-2.5 pt-1">
                {loadingDocs ? (
                  <div className="text-center py-10 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-stone-300 dark:border-slate-700">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 dark:border-teal-500 mx-auto mb-2.5" />
                    <p className="text-xs font-bold text-stone-700 dark:text-slate-200">Cargando tus documentos...</p>
                  </div>
                ) : docsError ? (
                  <div className="text-center py-10 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-rose-900 dark:text-rose-200">{docsError}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-2 text-xs font-bold text-rose-700 underline cursor-pointer"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-10 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-stone-300 dark:border-slate-700">
                    <FileText className="w-8 h-8 text-stone-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-stone-700 dark:text-slate-200">No se encontraron documentos en esta categoría</p>
                    <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-0.5">Prueba con otro filtro o toma una foto para digitalizar.</p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isReceta = doc.category === 'RECETA';
                    const isExamen = doc.category === 'EXAMEN';
                    const isConsulta = doc.category === 'CONSULTA';
                    const isImagen = doc.category === 'IMAGEN';

                    return (
                      <div
                        key={doc.id}
                        className="p-3 sm:p-4 bg-white dark:bg-slate-900/80 hover:bg-stone-50/80 dark:hover:bg-slate-800/80 border border-stone-200/90 dark:border-slate-800 rounded-2xl transition-all space-y-2 group shadow-2xs"
                      >
                        {/* Fila Principal: Icono + Detalles + Estado */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                            {/* Icono de Categoría Adaptativo */}
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${
                              isReceta
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : isExamen
                                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800'
                                  : isConsulta
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            }`}>
                              {isReceta && <Pill className="w-4 h-4" />}
                              {isExamen && <FlaskConical className="w-4 h-4" />}
                              {isConsulta && <Stethoscope className="w-4 h-4" />}
                              {isImagen && <ScanLine className="w-4 h-4" />}
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300">
                                  {doc.category === 'RECETA' && 'Receta'}
                                  {doc.category === 'EXAMEN' && 'Laboratorio'}
                                  {doc.category === 'CONSULTA' && 'Atención'}
                                  {doc.category === 'IMAGEN' && 'Imagen'}
                                </span>
                                <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
                                  {doc.date}
                                </span>
                              </div>

                              <h3 className="text-xs sm:text-sm font-extrabold text-blue-950 dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-teal-300 transition-colors line-clamp-1 sm:line-clamp-none">
                                {doc.title}
                              </h3>

                              <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px] text-stone-500 dark:text-slate-400 truncate">
                                {doc.institution && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                                    <span className="truncate">{doc.institution}</span>
                                  </span>
                                )}
                                {doc.doctor && (
                                  <span className="flex items-center gap-1 truncate">
                                    <User className="w-3 h-3 text-stone-400 shrink-0" />
                                    <span className="truncate">{doc.doctor}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Insignias de Estado y Vigencia */}
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span
                              className={`text-[8px] sm:text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border uppercase tracking-wider ${doc.status === 'ERROR'
                                ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                                : doc.status === 'CONFIRMADO' || doc.status === 'CONFIRMADA'
                                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                                  : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
                                }`}
                            >
                              {doc.status}
                            </span>
                            {isReceta && doc.extractedData?.validUntilRaw && (
                              (() => {
                                const isExpired = new Date(String(doc.extractedData.validUntilRaw).slice(0, 10) + 'T23:59:59') < new Date();
                                return (
                                  <span
                                    className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                      !isExpired
                                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                                        : 'text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 border-stone-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {!isExpired ? 'Activa' : 'Vencida'}
                                  </span>
                                );
                              })()
                            )}
                          </div>
                        </div>

                        {/* Resumen IA Compacto */}
                        {doc.summary && (
                          <div className="text-[10px] sm:text-[11px] text-stone-600 dark:text-slate-300 bg-stone-50/80 dark:bg-slate-800/40 p-2 rounded-xl border border-stone-200/60 dark:border-slate-700/60 flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                            <p className="leading-snug line-clamp-2">
                              <span className="font-bold text-teal-800 dark:text-teal-300">Extracción IA: </span>
                              {doc.summary}
                            </p>
                          </div>
                        )}

                        {/* Botones de Acción Ergonómicos */}
                        <div className="pt-1 flex items-center justify-between gap-2 border-t border-stone-100 dark:border-slate-800">
                          {doc.status !== 'ERROR' ? (
                            <>
                              <button
                                onClick={() => setSelectedDocument(doc)}
                                className="flex-1 py-1.5 sm:py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-teal-300" />
                                <span>Ver Ficha Detallada</span>
                              </button>

                              <button
                                onClick={() => alert(`Exportando copia legal con timbre digital Ley 21.668...`)}
                                className="p-1.5 sm:p-2 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
                                title="Descargar copia legal"
                              >
                                <Download className="w-3.5 h-3.5 text-stone-600 dark:text-slate-400" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                              title="Eliminar del historial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar Documento con Error</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: MI PERFIL */}
        {/* ========================================================================= */}
        {currentTab === 'profile' && (() => {
          const activeConditions = (patientProfile.chronicConditions || []).filter(
            c => !c.startsWith('Medicamento: ') && !c.startsWith('Cirugía: ')
          );
          const activeMedications = (patientProfile.chronicConditions || [])
            .filter(c => c.startsWith('Medicamento: '))
            .map(c => c.replace('Medicamento: ', ''));
          const activeSurgeries = (patientProfile.chronicConditions || [])
            .filter(c => c.startsWith('Cirugía: '))
            .map(c => c.replace('Cirugía: ', ''));

          return (
            <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-200">
              {/* Alerta de confirmación al guardar datos */}
              {showSuccessAlert && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-950 dark:text-emerald-200 font-semibold">
                      Tus antecedentes de salud han sido actualizados con éxito.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSuccessAlert(false)}
                    className="p-1 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* TARJETA PRINCIPAL: Identidad y Contacto (Ultra compacta para móvil y escritorio) */}
              <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-900 text-teal-300 flex items-center justify-center font-black text-base shadow-2xs shrink-0 mt-0.5 sm:mt-0">
                      {user?.first_name?.[0] || 'I'}{user?.last_name?.[0] || 'P'}
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-sm sm:text-base font-black text-blue-950 dark:text-slate-100">
                        {user?.first_name ? `${user.first_name} ${user.last_name}` : 'Ignacio Pérez González'}
                      </h1>
                      <div className="flex flex-col gap-0.5 mt-1 text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono text-stone-600 dark:text-slate-400">
                          <span className="text-stone-400 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider font-sans">RUT:</span>
                          <strong className="text-blue-900 dark:text-teal-300 font-bold">{user?.rut || '12.345.678-9'}</strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-stone-500 dark:text-slate-400">
                          <Mail className="w-3 h-3 text-stone-400 dark:text-slate-400 shrink-0" />
                          <span className="text-stone-600 dark:text-slate-300 truncate max-w-[220px] sm:max-w-xs">{user?.email || 'contacto@paciente.cl'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones y Estado: Centralizado a la derecha, más grande y con mejor peso visual */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-slate-800/80 w-full sm:w-auto">
                    {patientProfile.isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Perfil Completo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Perfil Pendiente</span>
                      </span>
                    )}

                    <button
                      onClick={handleOpenEditProfile}
                      className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-teal-300" />
                      <span>Modificar Perfil</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* FILA COMPACTA: Grupo Sanguíneo & Previsión */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Droplet className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      Grupo Sanguíneo
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-400 block">
                      {patientProfile.bloodType || 'Sin registrar'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                    Rh
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      Previsión
                    </span>
                    <span className="text-xs sm:text-sm font-black text-blue-950 dark:text-slate-200 block truncate">
                      {patientProfile.healthInsurance || 'Sin registrar'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900 shrink-0">
                    Salud
                  </span>
                </div>
              </div>

              {/* CAJAS CLÍNICAS CORTAS Y COMPACTAS (Cuadrícula 2x2 en escritorio, tarjetas cortas en móvil) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* 1. Alergias a Medicamentos */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-xs font-bold text-blue-950 dark:text-slate-100">
                      Alergias a Medicamentos
                    </h3>
                  </div>
                  {patientProfile.allergies && patientProfile.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {patientProfile.allergies.map((allergy, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-[11px] font-bold border border-rose-200 dark:border-rose-900"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-400 dark:text-slate-500 italic">
                      Sin alergias declaradas.
                    </p>
                  )}
                </div>

                {/* 2. Patologías Crónicas */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold text-blue-950 dark:text-slate-100">
                      Patologías Crónicas & GES
                    </h3>
                  </div>
                  {activeConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {activeConditions.map((cond, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-[11px] font-bold border border-blue-200 dark:border-blue-900"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {cond}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-400 dark:text-slate-500 italic">
                      Sin patologías registradas.
                    </p>
                  )}
                </div>

                {/* 3. Medicamentos de Uso Diario / Frecuente */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold text-blue-950 dark:text-slate-100">
                      Medicamentos Habituales
                    </h3>
                  </div>
                  {activeMedications.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {activeMedications.map((med, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold border border-emerald-200 dark:border-emerald-900"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {med}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-400 dark:text-slate-500 italic">
                      Sin medicamentos de uso diario registrados.
                    </p>
                  )}
                </div>

                {/* 4. Cirugías Previas o Antecedentes */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <h3 className="text-xs font-bold text-blue-950 dark:text-slate-100">
                      Cirugías Previas / Intervenciones
                    </h3>
                  </div>
                  {activeSurgeries.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {activeSurgeries.map((surg, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200 text-[11px] font-bold border border-violet-200 dark:border-violet-900"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          {surg}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-400 dark:text-slate-500 italic">
                      Sin cirugías previas registradas.
                    </p>
                  )}
                </div>
              </div>

              {/* ÚNICO RESPALDO LEGAL: Discreto al pie del perfil */}
              <div className="pt-2 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-stone-400 dark:text-slate-500 border-t border-stone-200/60 dark:border-slate-800">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  Información y antecedentes protegidos conforme a la Ley N° 20.584 y N° 21.668
                </span>
                <span>República de Chile</span>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* PESTAÑA 4: AYUDA Y GUÍA CLÍNICA */}
        {/* ========================================================================= */}
        {currentTab === 'help' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-xl font-extrabold text-blue-950">Centro de Ayuda y Preguntas Frecuentes</h1>
              <p className="text-xs text-stone-500">
                Aprende cómo funciona el escaneo con IA, tus derechos y los números de salud en Chile.
              </p>
            </div>

            {/* Números de Emergencia Oficiales en Chile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-base">
                  131
                </div>
                <div>
                  <span className="font-extrabold text-rose-950 text-xs block">SAMU Urgencias</span>
                  <span className="text-[11px] text-rose-800/80">Ambulancias y riesgo vital</span>
                </div>
              </div>

              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-teal-950 text-xs block">Salud Responde</span>
                  <span className="text-[11px] text-teal-800/80">600 360 77 77 (Minsal)</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <span className="font-extrabold text-blue-950 text-xs block">Superintendencia</span>
                  <span className="text-[11px] text-blue-800/80">Derechos de Salud</span>
                </div>
              </div>
            </div>

            {/* Preguntas Frecuentes */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-blue-950">Preguntas Frecuentes sobre MyMedRecord</h2>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                  <h3 className="font-bold text-blue-950">¿Qué tipo de papeles médicos puedo fotografiar?</h3>
                  <p className="text-stone-600 leading-relaxed">
                    Puedes fotografiar cualquier documento físico: recetas médicas manuscritas o impresas, resultados de exámenes de laboratorio (sangre, orina), informes de radiología o epicrisis de alta. El motor OCR lo clasificará de forma automática.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                  <h3 className="font-bold text-blue-950">¿Qué respalda la Ley N° 21.668 en Chile?</h3>
                  <p className="text-stone-600 leading-relaxed">
                    La Ley 21.668 establece que la información médica es propiedad del paciente. Obliga a los centros de salud (hospitales públicos, clínicas privadas y laboratorios) a permitir la interoperabilidad y portabilidad de los antecedentes de salud.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                  <h3 className="font-bold text-blue-950">¿Cómo comparto mi ficha con un médico en la consulta?</h3>
                  <p className="text-stone-600 leading-relaxed">
                    Toca el botón <strong>"QR para Médico"</strong> y muestra la pantalla de tu celular al profesional de la salud. El médico escaneará el código para tener acceso de lectura temporal por 24 horas.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                  <h3 className="font-bold text-blue-950">¿Mis datos están seguros ante robos o hackeos?</h3>
                  <p className="text-stone-600 leading-relaxed">
                    Sí. La plataforma utiliza cifrado militar <strong>AES-256-GCM</strong> para los registros clínicos en la base de datos, sesiones protegidas con cookies <strong>HttpOnly</strong> y jamás almacena antecedentes médicos en el almacenamiento local del teléfono.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 5: SEGURIDAD, AUDITORÍA Y TRAZABILIDAD (LEY N° 21.668 Y 20.584) */}
        {/* ========================================================================= */}
        {currentTab === 'audit' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            {/* Encabezado Principal y Sello Normativo con Margen Óptimo */}
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-teal-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-60 h-60 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-extrabold text-[9px] tracking-wider uppercase border border-teal-400/30">
                      Cumplimiento Normativo
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[9px] border border-white/20">
                      Ley N° 21.668 & 20.584
                    </span>
                  </div>

                  <h1 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-300 shrink-0" />
                    <span>Accesos y Auditoría Médica</span>
                  </h1>

                  <p className="text-[11px] sm:text-xs text-blue-100/90 leading-relaxed max-w-2xl">
                    Control inmutable de consultas a tu ficha clínica, pases QR emitidos y vigencia de accesos médicos.
                  </p>
                </div>

                <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/15">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] text-teal-200 uppercase tracking-wider block font-bold">Total Registros</span>
                    <span className="text-base sm:text-xl font-black font-mono text-white leading-tight">{auditLogs.length}</span>
                  </div>
                  <button
                    onClick={() => {
                      fetchAuditLogs();
                      fetchMyGrants();
                    }}
                    disabled={loadingAudit}
                    title="Actualizar registros"
                    className="px-3 py-1.5 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs border border-white/20 ml-auto sm:ml-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: GESTIÓN DE PASES Y AUTORIZACIONES */}
            <section className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-bold shrink-0">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-extrabold text-blue-950 dark:text-slate-100 truncate">
                      Pases Médicos Emitidos
                    </h2>
                    <p className="text-[9px] sm:text-[11px] text-stone-400 dark:text-slate-400 truncate">
                      Pases temporales QR y directos
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-300" />
                  <span>Emitir QR</span>
                </button>
              </div>

              {myGrants.length === 0 ? (
                <div className="py-4 text-center text-xs text-stone-500 dark:text-slate-400 space-y-0.5">
                  <p className="font-bold text-stone-700 dark:text-slate-200 text-xs">No hay pases médicos registrados.</p>
                  <p className="text-[11px]">Cuando generes un código QR para un médico, aparecerá aquí con su estado de vigencia.</p>
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
                            : 'bg-stone-50/70 border-stone-200 dark:bg-slate-800/50 dark:border-slate-700'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-black text-xs text-blue-950 dark:text-slate-100">
                              {grant.token}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${grant.status === 'ACTIVO'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : grant.status === 'REVOCADO'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/60 dark:text-rose-300'
                                  : 'bg-stone-200 text-stone-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                            >
                              {grant.status}
                            </span>
                            <span className="text-[9px] text-stone-400 font-mono">
                              ({grant.grantType === 'QR_TEMPORAL' ? 'QR' : 'Directo'})
                            </span>
                          </div>

                          {grant.status === 'ACTIVO' ? (
                            <span className="text-[10px] font-mono font-bold text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                              <Timer className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              {grant.minutesRemaining} min
                            </span>
                          ) : (
                            <span className="text-[9px] text-stone-400 font-mono">
                              {grant.createdAt ? new Date(grant.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'}
                            </span>
                          )}
                        </div>

                        {/* Detalle Médico Compacto */}
                        <div className="text-[10px] sm:text-[11px] text-stone-600 dark:text-slate-300 flex items-center justify-between">
                          <span className="font-medium truncate">
                            {grant.doctorName ? (
                              <span className="text-blue-950 dark:text-slate-200 font-bold">{grant.doctorName} {grant.doctorInstitution ? `· ${grant.doctorInstitution}` : ''}</span>
                            ) : (
                              <span className="text-stone-400 italic text-[10px]">Pendiente de escaneo por médico</span>
                            )}
                          </span>
                        </div>

                        {grant.status === 'ACTIVO' && (
                          <div className="pt-0.5 flex items-center gap-1.5">
                            <button
                              onClick={() => setShowQrModal(true)}
                              className="flex-1 py-1 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                              <QrCode className="w-3 h-3 text-teal-300" />
                              <span>Ver QR</span>
                            </button>
                            <button
                              onClick={() => handleRevokeSpecificGrant(grant.id)}
                              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
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
                        <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Código / Token</th>
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
                          <tr key={grant.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-950">
                              {grant.token}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold text-[10px]">
                                {grant.grantType === 'QR_TEMPORAL' ? 'QR Temporal' : 'Directo'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-stone-500 whitespace-nowrap">
                              {grant.createdAt ? new Date(grant.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-stone-700 whitespace-nowrap">
                              {grant.status === 'ACTIVO' ? (
                                <span className="font-bold text-emerald-700 flex items-center gap-1">
                                  <Timer className="w-3.5 h-3.5" />
                                  {grant.minutesRemaining} min
                                </span>
                              ) : (
                                <span className="text-stone-400">Vencido</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {grant.doctorName ? (
                                <div>
                                  <span className="font-bold text-blue-950 block">{grant.doctorName}</span>
                                  <span className="text-[10px] text-stone-500">{grant.doctorInstitution || 'Centro de Salud'}</span>
                                </div>
                              ) : (
                                <span className="text-stone-400 italic">Pendiente de escaneo</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-block ${grant.status === 'ACTIVO'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : grant.status === 'REVOCADO'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-stone-200 text-stone-700'
                                  }`}
                              >
                                {grant.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {grant.status === 'ACTIVO' ? (
                                <button
                                  onClick={() => handleRevokeSpecificGrant(grant.id)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 ml-auto"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Revocar</span>
                                </button>
                              ) : (
                                <span className="text-stone-400 text-[11px]">—</span>
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
            <section className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-teal-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-extrabold text-blue-950 dark:text-slate-100 truncate">
                      Bitácora de Accesos y Eventos
                    </h2>
                    <p className="text-[9px] sm:text-[11px] text-stone-400 dark:text-slate-400 truncate">
                      Trazabilidad legal inmutable (Ley N° 21.668)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {auditLogs.length} registros
                  </span>
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <Lock className="w-3 h-3" />
                    <span>Inmutable</span>
                  </div>
                </div>
              </div>

              {loadingAudit ? (
                <div className="py-6 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 text-blue-900 animate-spin mx-auto" />
                  <p className="text-xs text-stone-500">Consultando bitácora legal...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-5 text-center text-xs text-stone-500 dark:text-slate-400 space-y-0.5">
                  <p className="font-bold text-stone-700 dark:text-slate-200 text-xs">Sin registros de auditoría por ahora.</p>
                  <p className="text-[11px]">Toda interacción quedará firmada aquí automáticamente.</p>
                </div>
              ) : (
                <div className="max-h-[340px] sm:max-h-[460px] overflow-y-auto pr-1">
                  <div className="relative pl-3.5 sm:pl-4 space-y-2 before:content-[''] before:absolute before:left-1 sm:before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-slate-700">
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
                                  : 'bg-blue-900'
                              }`}
                          />

                          {/* Ficha compacta y limpia del evento */}
                          <div className="p-2 sm:p-2.5 bg-stone-50/70 hover:bg-stone-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl border border-stone-200/70 dark:border-slate-700/60 transition-all space-y-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="font-bold text-blue-950 dark:text-slate-100 text-[11px] sm:text-xs truncate">
                                  {log.title}
                                </h3>
                                <span
                                  className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider shrink-0 ${isMedicalAccess
                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300'
                                    : isRevoke
                                      ? 'bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-300'
                                      : isConsent
                                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300'
                                        : 'bg-stone-200 text-stone-700 dark:bg-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                  {log.category.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <span className="text-[9px] sm:text-[10px] font-mono text-stone-400 dark:text-slate-400 shrink-0">
                                {log.createdAt ? new Date(log.createdAt).toLocaleDateString('es-CL', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '—'}
                              </span>
                            </div>

                            <p className="text-[10px] sm:text-[11px] text-stone-600 dark:text-slate-300 leading-snug line-clamp-2">
                              {log.description}
                            </p>

                            <div className="flex items-center justify-between text-[9px] text-stone-400 dark:text-slate-400 font-mono pt-0.5">
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
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Ficha Extraída con IA ({selectedDocument.confidence} precisión OCR)
                </span>
                <h3 className="text-lg font-extrabold text-blue-950 mt-1">{selectedDocument.title}</h3>
                <p className="text-xs text-stone-500">{selectedDocument.institution} · {selectedDocument.date}</p>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badge de Seguridad y Marco Regulatorio */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-950">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-teal-700" /> Cifrado en Reposo: {selectedDocument.encryption}
              </span>
              <span className="text-[11px] text-teal-700 font-mono">Ley N° 21.668 & N° 20.584</span>
            </div>

            {/* Contenido según categoría */}
            <div className="space-y-3 text-xs">
              {selectedDocument.category === 'RECETA' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-blue-950">Prescripción de Fármacos Extraída:</h4>
                  <div className="space-y-2">
                    {selectedDocument.extractedData.medicamentos.map((m, i) => (
                      <div key={i} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                        <div className="flex justify-between font-bold text-blue-950 text-sm">
                          <span>{m.nombre}</span>
                          <span className="text-teal-700">{m.dosis}</span>
                        </div>
                        <p className="text-stone-700"><strong>Posología:</strong> {m.posologia}</p>
                        <p className="text-stone-500"><strong>Duración:</strong> {m.duracion} · {m.horario}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded-xl border border-stone-200 dark:border-slate-700 space-y-1">
                    <p className="text-stone-700 dark:text-slate-300">
                      <strong>Indicaciones Médicas:</strong> {selectedDocument.extractedData.indicaciones || 'Sin indicaciones adicionales'}
                    </p>
                    {selectedDocument.extractedData.fechaEmision && (
                      <p className="text-stone-500 dark:text-slate-400 text-xs">
                        <strong>Emitida el:</strong> {selectedDocument.extractedData.fechaEmision}
                      </p>
                    )}
                    <p className={`text-xs ${selectedDocument.extractedData.vigenciaHasta ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-stone-400 dark:text-slate-500'}`}>
                      <strong>Vigencia hasta:</strong> {selectedDocument.extractedData.vigenciaHasta || 'no especificada'}
                    </p>
                  </div>
                </div>
              )}

              {selectedDocument.category === 'EXAMEN' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-blue-950">Parámetros Bioquímicos Extraídos:</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase text-[10px]">
                          <th className="py-2">Parámetro</th>
                          <th className="py-2">Resultado</th>
                          <th className="py-2">Rango Referencia</th>
                          <th className="py-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedDocument.extractedData.parametros.map((p, i) => (
                          <tr key={i}>
                            <td className="py-2.5 font-bold text-blue-950">{p.nombre}</td>
                            <td className="py-2.5 font-mono text-teal-800 font-bold">{p.valor}</td>
                            <td className="py-2.5 text-stone-500">{p.rangoRef}</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {p.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedDocument.category === 'CONSULTA' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <h4 className="font-bold text-blue-950">Detalle de la Consulta Médica:</h4>
                    <p className="text-stone-700">{selectedDocument.extractedData.anamnesis}</p>
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <span className="font-bold text-blue-950 block">Diagnóstico Principal:</span>
                      <span className="text-blue-900">{selectedDocument.extractedData.diagnostico}</span>
                    </div>
                    <p className="text-stone-700"><strong>Plan Terapéutico:</strong> {selectedDocument.extractedData.plan}</p>
                    <p className="text-stone-500 text-[11px] pt-2 border-t border-stone-200">
                      Signos vitales registrados en box: {selectedDocument.extractedData.signosVitalesEnConsulta}
                    </p>
                  </div>
                </div>
              )}

              {selectedDocument.category === 'IMAGEN' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <h4 className="font-bold text-blue-950">Conclusiones del Radiólogo:</h4>
                    <p className="text-stone-700"><strong>Técnica:</strong> {selectedDocument.extractedData.tecnica}</p>
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                      <span className="font-bold text-indigo-950 block">Diagnóstico Imagenológico:</span>
                      <span className="text-indigo-900">{selectedDocument.extractedData.diagnostico}</span>
                    </div>
                    <p className="text-stone-700">{selectedDocument.extractedData.conclusiones}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Descargando copia legal certificada en PDF con timbre institucional...')}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
                {selectedDocument.filePath && (selectedDocument.filePath.startsWith('http://') || selectedDocument.filePath.startsWith('https://')) && (
                  <a
                    href={selectedDocument.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-teal-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Original</span>
                  </a>
                )}
              </div>

              <button
                onClick={() => setSelectedDocument(null)}
                className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE SUBIDA / FOTO CON IA */}
      {/* ========================================================================= */}
      {uploadModalState !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
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
                    <Camera className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-blue-950 dark:text-slate-100">
                    {uploadModalState === 'idle' && 'Digitalizar Documento Médico'}
                    {uploadModalState === 'analyzing' && 'Analizando con Inteligencia Artificial'}
                    {uploadModalState === 'preview' && (
                      tempDocument?.analysis?.is_medical_document === false
                        ? 'Documento no reconocido como médico'
                        : tempDocument?.isUnreadable
                          ? 'Revisión del Documento'
                          : 'Revisar y Confirmar'
                    )}
                    {uploadModalState === 'confirmed' && (
                      confirmedStatus === 'CONFIRMADO' ? '¡Guardado Exitoso!' : '¡Guardado para Revisión!'
                    )}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    {uploadModalState === 'idle' && 'La IA leerá tu receta antes de guardarla en tu historial'}
                    {uploadModalState === 'analyzing' && 'Extrayendo medicamentos, dosis y diagnóstico...'}
                    {uploadModalState === 'preview' && (
                      tempDocument?.analysis?.is_medical_document === false
                        ? 'La imagen no contiene datos clínicos ni recetas médicas'
                        : tempDocument?.isUnreadable
                          ? 'No pudimos leer con certeza la imagen'
                          : 'Tú tienes el control: revisa o corrige los datos'
                    )}
                    {uploadModalState === 'confirmed' && (
                      confirmedStatus === 'CONFIRMADO'
                        ? 'Tu receta ya forma parte de tu ficha clínica activa'
                        : 'El documento quedó en tu historial pendiente de revisión'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                disabled={isSubmittingConfirm || isSubmittingDiscard || uploadModalState === 'analyzing'}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido según Estado */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              
              {/* ESTADO 1: IDLE (Selector de imagen) */}
              {uploadModalState === 'idle' && (
                <div className="space-y-4">
                  <label className="block p-7 border-2 border-dashed border-teal-400/80 dark:border-teal-500/50 bg-teal-50/40 dark:bg-slate-800/40 hover:bg-teal-50/80 dark:hover:bg-slate-800/80 rounded-3xl text-center cursor-pointer transition-all">
                    <UploadCloud className="w-11 h-11 text-teal-600 dark:text-teal-400 mx-auto mb-2.5 animate-bounce" />
                    <span className="font-extrabold text-blue-950 dark:text-slate-100 text-sm block">
                      Toma una foto o selecciona tu receta
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 block mt-1">
                      Soporta fotos claras (JPG, PNG, WEBP) o documentos PDF
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleStartAnalyze(file);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <div className="p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200 dark:border-slate-700/80 space-y-2">
                    <span className="font-bold text-blue-950 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      ¿Cómo funciona la confirmación previa?
                    </span>
                    <p className="text-[11px] text-stone-600 dark:text-slate-300 leading-relaxed">
                      1. <strong>Lectura Inteligente:</strong> Nuestro motor OCR lee el texto del médico.<br />
                      2. <strong>Tu Validación:</strong> Podrás ver y corregir los medicamentos antes de guardarlos.<br />
                      3. <strong>Seguridad Ley 21.668:</strong> Si cancelas, el archivo temporal se borra de inmediato.
                    </p>
                  </div>

                  {uploadError && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-800 dark:text-rose-300">{uploadError}</p>
                    </div>
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
                    <span className="font-extrabold text-blue-950 dark:text-slate-100 text-sm block">
                      Analizando tu receta con IA...
                    </span>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400 max-w-xs mx-auto">
                      Identificando medicamentos, dosis y diagnóstico. Tomará solo unos segundos.
                    </p>
                  </div>

                  <div className="space-y-2 max-w-sm mx-auto">
                    <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 dark:text-slate-400">
                      <span>Procesando OCR + LLM</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
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
                  {/* CASO A0: DOCUMENTO NO MÉDICO */}
                  {tempDocument?.analysis?.is_medical_document === false ? (
                    <div className="space-y-4 py-2">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                            No parece ser un documento médico
                          </h4>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                            No detectamos recetas, diagnósticos ni exámenes clínicos en esta imagen. Puede ser una captura de pantalla, comprobante o foto no médica.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-stone-600 dark:text-slate-300 block">
                          ¿Qué te gustaría hacer?
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDiscardDocument(true)}
                            disabled={isSubmittingDiscard}
                            className="p-3 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group"
                          >
                            <RefreshCw className="w-4 h-4 text-teal-600 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Reintentar</span>
                            <span className="text-[10px] text-stone-400">Subir otra foto</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDiscardDocument(false)}
                            disabled={isSubmittingDiscard}
                            className="p-3 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4 text-rose-500" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Cancelar</span>
                            <span className="text-[10px] text-stone-400">Descartar archivo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveAnyway({ isNonMedical: true })}
                            disabled={isSubmittingConfirm}
                            className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <FileText className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                            <span className="font-bold text-teal-950 dark:text-teal-200 text-xs">Guardar igual</span>
                            <span className="text-[10px] text-teal-700 dark:text-teal-400">Sin extraer recetas</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : tempDocument?.isUnreadable ? (
                    <div className="space-y-4 py-2">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                            No pudimos leer bien esta imagen
                          </h4>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                            La foto puede estar borrosa, con poca luz o la letra es difícil de reconocer automáticamente.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-stone-600 dark:text-slate-300 block">
                          ¿Qué te gustaría hacer?
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDiscardDocument(true)}
                            disabled={isSubmittingDiscard}
                            className="p-3 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group"
                          >
                            <RefreshCw className="w-4 h-4 text-teal-600 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Reintentar</span>
                            <span className="text-[10px] text-stone-400">Tomar otra foto</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDiscardDocument(false)}
                            disabled={isSubmittingDiscard}
                            className="p-3 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4 text-rose-500" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Cancelar</span>
                            <span className="text-[10px] text-stone-400">Descartar archivo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveAnyway()}
                            disabled={isSubmittingConfirm}
                            className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <FileText className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                            <span className="font-bold text-teal-950 dark:text-teal-200 text-xs">Guardar igual</span>
                            <span className="text-[10px] text-teal-700 dark:text-teal-400">Revisar después</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CASO B: LECTURA EXITOSA CON CAMPOS EDITABLES */
                    <div className="space-y-4">
                      {/* Diagnóstico editable */}
                      <div className="p-3.5 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-200 dark:border-slate-700/80 space-y-1.5">
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                          <span>Diagnóstico médico detectado</span>
                          <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">Editable</span>
                        </label>
                        <input
                          type="text"
                          value={editedData.diagnostico}
                          onChange={(e) => setEditedData({ ...editedData, diagnostico: e.target.value })}
                          placeholder="Ej: Faringoamigdalitis aguda, Control de rutina..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                        />
                      </div>

                      {/* Lista editable de Medicamentos */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-950 dark:text-slate-200 text-xs flex items-center gap-1.5">
                            <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            Medicamentos extraídos ({editedData.medications.length})
                          </span>
                          <button
                            type="button"
                            onClick={handleAddMedicationRow}
                            className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Agregar fármaco</span>
                          </button>
                        </div>

                        {editedData.medications.length === 0 ? (
                          <div className="p-4 text-center border border-dashed border-stone-200 dark:border-slate-700 rounded-2xl text-stone-400 dark:text-slate-500">
                            <span>No hay medicamentos cargados. Presiona "+ Agregar fármaco" para añadir uno.</span>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {editedData.medications.map((med, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-2 shadow-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={med.name}
                                      onChange={(e) => handleUpdateMedication(idx, 'name', e.target.value)}
                                      placeholder="Nombre del medicamento (ej: Paracetamol)"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-xs focus:ring-1 focus:ring-teal-400"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedicationRow(idx)}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title="Quitar medicamento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5">
                                  <div>
                                    <label className="text-[10px] text-stone-500 dark:text-slate-400 block mb-0.5">Dosis</label>
                                    <input
                                      type="text"
                                      value={med.dosage}
                                      onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                                      placeholder="ej: 500 mg"
                                      className="w-full px-2 py-1 rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-stone-500 dark:text-slate-400 block mb-0.5">Frecuencia</label>
                                    <input
                                      type="text"
                                      value={med.frequency}
                                      onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                                      placeholder="ej: c/ 8 hrs"
                                      className="w-full px-2 py-1 rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-stone-500 dark:text-slate-400 block mb-0.5">Duración</label>
                                    <input
                                      type="text"
                                      value={med.duration}
                                      onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                                      placeholder="ej: 7 días"
                                      className="w-full px-2 py-1 rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px]"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
                  <h4 className="text-base font-extrabold text-blue-950 dark:text-slate-100">
                    {confirmedStatus === 'CONFIRMADO'
                      ? '¡Receta confirmada con éxito!'
                      : '¡Documento guardado para revisión!'}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-slate-400 max-w-xs mx-auto">
                    {confirmedStatus === 'CONFIRMADO'
                      ? 'El documento y tus medicamentos ya están registrados y validados en tu ficha clínica.'
                      : 'El documento quedó guardado en tu historial como pendiente para que puedas revisarlo más adelante.'}
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-[10px] font-mono ${
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
              <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDiscardDocument(false)}
                  disabled={isSubmittingConfirm || isSubmittingDiscard}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingDiscard ? 'Descartando...' : 'Descartar'}
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmDocument()}
                  disabled={isSubmittingConfirm || isSubmittingDiscard}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-900 to-teal-700 hover:from-blue-950 hover:to-teal-800 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmittingConfirm ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-300" />
                      <span>Confirmar y Guardar</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPARTIR FICHA DIRECTAMENTE CON MÉDICO REGISTRADO */}
      {/* ========================================================================= */}
      {showDirectShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-900 text-teal-300 flex items-center justify-center shadow-xs">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-blue-950 dark:text-slate-100">Compartir Ficha Médica</h3>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">Autoriza temporalmente a un médico registrado</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowDirectShareModal(false)} className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
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
                  <p className="mt-1 text-[10px] opacity-80">El acceso aparecerá directamente en el portal del médico y podrás revocarlo desde Auditoría y Accesos.</p>
                </div>
              </div>
            )}

            {!directShareSuccess && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">1. Selecciona el médico</label>
                  {loadingDoctors ? (
                    <div className="py-8 text-center border border-stone-200 dark:border-slate-700 rounded-2xl">
                      <RefreshCw className="w-6 h-6 text-blue-900 dark:text-teal-400 animate-spin mx-auto" />
                      <p className="mt-2 text-xs text-stone-500">Cargando médicos registrados...</p>
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="p-4 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs text-stone-500 dark:text-slate-400">
                      No hay médicos registrados disponibles para compartir directamente. Puedes utilizar el acceso por QR.
                    </div>
                  ) : (
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-blue-900"
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">2. Duración del acceso</label>
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
                          ? 'bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-teal-400/40'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-blue-300'
                        }`}
                      >
                        <span className="text-xs font-extrabold block">{opt.label}</span>
                        <span className={`text-[10px] mt-1 block ${directShareDuration === opt.hours ? 'text-teal-200' : 'text-stone-400'}`}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                  <div className="flex gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-950 dark:text-blue-200">Acceso temporal y revocable</p>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1 leading-relaxed">El médico seleccionado podrá consultar tu ficha desde su propio portal durante el tiempo autorizado. El permiso puede revocarse antes de su vencimiento.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShareDirect}
                  disabled={isSharingDirect || loadingDoctors || !selectedDoctorId}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSharingDirect ? <RefreshCw className="w-4 h-4 animate-spin text-teal-300" /> : <Share2 className="w-4 h-4 text-teal-300" />}
                  <span>{isSharingDirect ? 'Compartiendo...' : `Compartir por ${directShareDuration} Horas`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowDirectShareModal(false); setShowQrModal(true); }}
                  className="w-full py-2.5 border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  Usar QR en su lugar
                </button>
              </>
            )}

            <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex justify-end">
              <button type="button" onClick={() => setShowDirectShareModal(false)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CÓDIGO QR PARA EL MÉDICO (LEY N° 21.668 & 20.584) */}
      {/* ========================================================================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-900 text-teal-300 flex items-center justify-center font-bold shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-blue-950 dark:text-slate-100">
                    Pase de Acceso Médico Seguro
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Consentimiento digital según Ley N° 21.668
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                <RefreshCw className="w-8 h-8 text-blue-900 animate-spin mx-auto" />
                <p className="text-xs text-stone-500 font-medium">Verificando tokens activos...</p>
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
                      Pase Activo ({activeGrant.duration_hours || 12} Horas)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    {remainingTimeText || 'Calculando...'}
                  </span>
                </div>

                {/* Código QR SVG Centrado */}
                <div className="p-5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200 dark:border-slate-700 flex flex-col items-center justify-center space-y-3">
                  <div className="bg-white p-3.5 rounded-2xl shadow-md border border-stone-200">
                    <QRCodeSVG
                      id="patient-qr-svg"
                      value={`${window.location.origin}/doctor/qr-access?token=${encodeURIComponent(activeGrant.token)}`}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 dark:text-slate-400 block mb-0.5">
                      CÓDIGO DE ACCESO MÉDICO
                    </span>
                    <span className="text-base font-mono font-black text-blue-950 dark:text-teal-300 tracking-wider bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-stone-200 dark:border-slate-700 inline-block">
                      {activeGrant.token}
                    </span>
                  </div>
                </div>

                {/* Acciones para Compartir y Guardar */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyLink}
                      type="button"
                      className="py-2.5 px-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 dark:text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-stone-500" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadQr}
                      type="button"
                      className="py-2.5 px-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 text-teal-900 dark:text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Guardar / Descargar QR</span>
                    </button>
                  </div>

                  <a
                    href={`/doctor/qr-access?token=${encodeURIComponent(activeGrant.token)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                    <span>Abrir Visor de Consulta Directa</span>
                  </a>
                </div>

                {/* Resumen Legal y Auditoría */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-950 dark:text-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Auditoría de Acceso en Tiempo Real</span>
                  </div>
                  <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-relaxed">
                    El médico no requiere cuenta previa, pero debe validar su RUT y Nombre Profesional para ingresar. La consulta se estampará en tu registro inmutable.
                  </p>
                </div>

                {/* Botón de Revocación Inmediata */}
                <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between gap-2">
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
                    <span>Revocar Acceso Inmediato</span>
                  </button>
                </div>
              </div>
            ) : (
              /* CASO B: NO TIENE UN PASE ACTIVO -> GENERADOR CON SELECCIÓN DE HORAS */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
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
                          ? 'bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-teal-400/40'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-blue-300'
                          }`}
                      >
                        <span className="text-xs font-extrabold">{opt.label}</span>
                        <span className={`text-[10px] mt-1 ${qrDuration === opt.hours ? 'text-teal-200' : 'text-stone-400'}`}>
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Explicación de Funcionamiento */}
                <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-2 text-stone-600 dark:text-slate-300">
                  <span className="font-bold text-blue-950 dark:text-slate-100 text-xs block">
                    ¿Cómo funciona este acceso?
                  </span>
                  <ul className="text-[11px] text-stone-500 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li>El médico escanea tu QR desde su celular o sube una foto.</li>
                    <li>Ingresa su RUT y Centro de Salud / Consulta para identificarse legalmente.</li>
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
                    className="w-full py-3 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
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

            <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR / COMPLETAR ANTECEDENTES DE SALUD (ONBOARDING) */}
      {/* ========================================================================= */}
      {showProfileEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-teal-300 flex items-center justify-center font-bold shadow-xs shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-blue-950 dark:text-slate-100">
                    Modificar Mi Perfil de Salud
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Toca las opciones para seleccionarlas. Sin necesidad de escribir.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileEditModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* 1. Previsión de Salud */}
              <div className="space-y-2 p-3 bg-stone-50/70 dark:bg-slate-800/50 rounded-2xl border border-stone-200/80 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-950 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-800 dark:text-teal-300" />
                    Previsión de Salud
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">Selecciona una</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {PREVISION_OPTIONS.map((opt) => {
                    const isSelected = editFormData.healthInsurance === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, healthInsurance: isSelected ? '' : opt })}
                        className={`p-2 rounded-xl text-left text-[11px] font-semibold transition-all border cursor-pointer flex items-center justify-between gap-1 ${
                          isSelected
                            ? 'bg-blue-900 text-white border-blue-900 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-blue-300'
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
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-mono">Selecciona uno</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {BLOOD_TYPE_OPTIONS.map((bt) => {
                    const isSelected = editFormData.bloodType === bt;
                    return (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, bloodType: isSelected ? '' : bt })}
                        className={`py-2 px-2.5 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
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
                  <span className="text-[10px] text-amber-800 dark:text-amber-400 font-mono">
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
                        onClick={() => handleToggleAllergy(allergy)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-amber-300'
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
              <div className="space-y-2 p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-900/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Patologías Crónicas / Diagnósticos GES
                  </span>
                  <span className="text-[10px] text-blue-800 dark:text-blue-400 font-mono">
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
                        onClick={() => handleToggleCondition(cond)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-900 text-white border-blue-900 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-blue-300'
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
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-mono">
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
                        onClick={() => handleToggleMedication(med)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-emerald-300'
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
                  <span className="text-[10px] text-violet-800 dark:text-violet-400 font-mono">
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
                        onClick={() => handleToggleSurgery(surg)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-violet-700 text-white border-violet-700 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-violet-300'
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
              <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowProfileEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4 text-teal-300" />
                  <span>Guardar Cambios en Mi Perfil</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navegación Móvil Inferior */}
      <BottomNav
        activeTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenUploadModal={handleOpenUploadModal}
        onOpenQrModal={() => setShowQrModal(true)}
        onFileSelected={handleUploadFile}
        isUploading={uploadModalState === 'analyzing'}
        hasActiveGrants={myGrants.some(g => g.status === 'ACTIVO')}
      />

      <footer className="py-4 text-center text-[11px] text-stone-400 dark:text-slate-500 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
