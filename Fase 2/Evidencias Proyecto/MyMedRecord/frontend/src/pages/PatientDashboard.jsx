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
        if (parsed && typeof parsed === 'object') return parsed;
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

  const [editFormData, setEditFormData] = useState({
    bloodType: '',
    healthInsurance: '',
    isOrganDonor: true,
    allergies: [],
    chronicConditions: [],
    emergencyContactName: '',
    emergencyContactPhone: ''
  });
  const [customAllergy, setCustomAllergy] = useState('');
  const [customCondition, setCustomCondition] = useState('');

  // Filtros y búsqueda en pestaña de Documentos
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

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

  // Manejar la subida de un archivo
  const handleUploadFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const res = await documentsApi.upload(file, (pct) => setUploadProgress(pct));
      const newDoc = mapDocumentFromApi({
        ...res.data.document,
        structured: res.data.structured,
      });
      setDocuments((prev) => [newDoc, ...prev]);
      setShowUploadModal(false);
      setSelectedDocument(newDoc);
    } catch (err) {
      setUploadError(
        err.response?.data?.message || 'Error al procesar el documento'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
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
  // Pilares clínicos (categorías del dashboard)
  const clinicalPillars = [
    {
      id: 'RECETA',
      title: 'Recetas Médicas',
      subtitle: 'Tratamientos y medicamentos',
      icon: Pill,
      count: documents.filter(d => d.category === 'RECETA').length,
      badgeText: 'Vigentes',
      border: 'border-emerald-200/80',
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-100/80'
    },
    {
      id: 'EXAMEN',
      title: 'Exámenes de Lab',
      subtitle: 'Sangre, orina y perfiles',
      icon: FlaskConical,
      count: documents.filter(d => d.category === 'EXAMEN').length,
      badgeText: 'Resultados',
      border: 'border-teal-200/80',
      iconColor: 'text-teal-700',
      iconBg: 'bg-teal-100/80'
    },
    {
      id: 'CONSULTA',
      title: 'Consultas Médicas',
      subtitle: 'Atenciones y diagnósticos',
      icon: Stethoscope,
      count: documents.filter(d => d.category === 'CONSULTA').length,
      badgeText: 'Historial',
      border: 'border-blue-200/80',
      iconColor: 'text-blue-800',
      iconBg: 'bg-blue-100/80'
    },
    {
      id: 'IMAGEN',
      title: 'Informes & Imágenes',
      subtitle: 'Radiografías y ecografías',
      icon: ScanLine,
      count: documents.filter(d => d.category === 'IMAGEN').length,
      badgeText: 'Estudios',
      border: 'border-indigo-200/80',
      iconColor: 'text-indigo-800',
      iconBg: 'bg-indigo-100/80'
    }
  ];

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
    const updated = {
      ...editFormData,
      isCompleted: true
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
      const exists = prev.allergies.includes(allergy);
      return {
        ...prev,
        allergies: exists ? prev.allergies.filter(a => a !== allergy) : [...prev.allergies, allergy]
      };
    });
  };

  const handleAddCustomAllergy = () => {
    const val = customAllergy.trim();
    if (!val) return;
    if (!editFormData.allergies.includes(val)) {
      setEditFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies.filter(a => a !== 'Ninguna conocida'), val]
      }));
    }
    setCustomAllergy('');
  };

  const handleToggleCondition = (cond) => {
    setEditFormData(prev => {
      const exists = prev.chronicConditions.includes(cond);
      return {
        ...prev,
        chronicConditions: exists ? prev.chronicConditions.filter(c => c !== cond) : [...prev.chronicConditions, cond]
      };
    });
  };

  const handleAddCustomCondition = () => {
    const val = customCondition.trim();
    if (!val) return;
    if (!editFormData.chronicConditions.includes(val)) {
      setEditFormData(prev => ({
        ...prev,
        chronicConditions: [...prev.chronicConditions.filter(c => c !== 'Ninguna'), val]
      }));
    }
    setCustomCondition('');
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
      <div className="hidden sm:block bg-white border-b border-stone-200/80 sticky top-14 z-20 overflow-x-auto scrollbar-none shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center gap-1.5 sm:gap-2 py-2 min-w-max">
          <button
            onClick={() => setCurrentTab('home')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'home' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            <Home className="w-4 h-4" />
            <span>Inicio</span>
          </button>

          <button
            onClick={() => setCurrentTab('records')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'records' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historial y Documentos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700">
              {documents.length}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'profile' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            <User className="w-4 h-4" />
            <span>Mi Ficha y Datos</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('audit');
              fetchAuditLogs();
              fetchMyGrants();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'audit' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Auditoría & Accesos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Ley 21.668
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('help')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${currentTab === 'help' ? 'bg-blue-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ayuda & FAQ</span>
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
                        ¡Aún no completas tu Ficha Médica Única!
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300/50">
                        Acción Recomendada
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 max-w-2xl leading-relaxed">
                      Para que tu médico cuente con todos tus antecedentes de salud ante una consulta o emergencia (<strong>grupo sanguíneo, alergias y contacto de urgencia</strong>), te sugerimos completar tu registro clínico.
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0 flex items-center gap-2">
                  <button
                    onClick={handleOpenEditProfile}
                    className="w-full md:w-auto px-5 py-2.5 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-teal-300" />
                    <span>Completar Ficha Ahora</span>
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
                        ¡Ficha Médica Completada con Éxito!
                      </h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300/60">
                        Datos Registrados
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                      Tus antecedentes de urgencia, grupo sanguíneo y contacto han sido resguardados y ya no verás avisos pendientes.
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
                    onClick={() => setShowUploadModal(true)}
                    className="px-5 py-3.5 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 active:scale-95 text-blue-950 font-black rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-blue-950" />
                    <span>Digitalizar con IA</span>
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="px-4 py-3.5 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xs"
                  >
                    <QrCode className="w-4 h-4 text-teal-300" />
                    <span>QR para Médico</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Pilares Clínicos Separados */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-blue-950 tracking-tight">
                    Categorías de tu Ficha Clínica
                  </h2>
                  <p className="text-[11px] text-stone-500">
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
                      className="group p-5 bg-white rounded-3xl border border-stone-200/90 hover:border-blue-900 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
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

                        <h3 className="text-base font-bold text-blue-950 group-hover:text-blue-900 transition-colors">
                          {pillar.title}
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {pillar.subtitle}
                        </p>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-700">
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
            <section className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-blue-950">
                      Tratamiento Farmacológico Activo
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Medicamentos vigentes según tu última receta digitalizada
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full w-fit">
                  <Clock className="w-3 h-3 text-emerald-600" /> Vigente hasta 09 Septiembre
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-950 text-sm">Amoxicilina 500 mg</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">Cada 8 hrs</span>
                  </div>
                  <p className="text-xs text-stone-600">1 comprimido cada 8 horas por 7 días.</p>
                  <p className="text-[11px] text-stone-400">Horarios: 08:00 · 16:00 · 00:00</p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-950 text-sm">Paracetamol 500 mg</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 font-bold">Condicional</span>
                  </div>
                  <p className="text-xs text-stone-600">1 comprimido cada 8 horas en caso de fiebre o dolor.</p>
                  <p className="text-[11px] text-stone-400">Duración: 3 días (SOS)</p>
                </div>
              </div>
            </section>

            {/* Gestión Rápida de Pases QR Activos (Punto 2) */}
            <section className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-blue-950">
                        Pases de Acceso Médico (Ley N° 21.668)
                      </h3>
                      {myGrants.some(g => g.status === 'ACTIVO') && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          Vigente
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500">
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
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>Ver Trazabilidad</span>
                  </button>
                </div>
              </div>

              {/* Lista de Pases Activos Recientes */}
              {myGrants.length === 0 ? (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-center text-xs text-stone-500">
                  No tienes pases QR generados. Puedes crear uno para que tu médico escanee tu ficha en la consulta.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myGrants.slice(0, 4).map((grant) => (
                    <div
                      key={grant.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        grant.status === 'ACTIVO'
                          ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                          : grant.status === 'REVOCADO'
                          ? 'bg-rose-50/30 border-rose-200/60 opacity-80'
                          : 'bg-stone-50/70 border-stone-200/80 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-950">
                              {grant.token}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                grant.status === 'ACTIVO'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : grant.status === 'REVOCADO'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {grant.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500">
                            {grant.doctorName ? (
                              <span className="text-teal-900 font-semibold flex items-center gap-1">
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
        {/* PESTAÑA 2: HISTORIAL Y DOCUMENTOS (SEPARADO) */}
        {/* ========================================================================= */}
        {currentTab === 'records' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-blue-950">Historial de Documentos Digitalizados</h1>
                <p className="text-xs text-stone-500">
                  Repositorio completo de recetas, exámenes de sangre, informes y certificados con IA
                </p>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer w-fit"
              >
                <Camera className="w-4 h-4 text-teal-300" />
                <span>+ Subir Nuevo Papel</span>
              </button>
            </div>

            {/* Barra de Filtros y Buscador */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Chips de Categorías */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${selectedCategory === 'ALL'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
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
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${selectedCategory === p.id
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                        }`}
                    >
                      <span>{p.title}</span>
                      <span className="text-[10px] opacity-80">({p.count})</span>
                    </button>
                  ))}
                </div>

                {/* Buscador */}
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar fármaco, doctor o clínica..."
                    className="w-full pl-10 pr-8 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-700 focus:bg-white transition-all"
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
              </div>

              {/* Listado de Documentos */}
              <div className="space-y-3 pt-2">
                {loadingDocs ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900 mx-auto mb-3" />
                    <p className="text-sm font-bold text-stone-700">Cargando tus documentos...</p>
                  </div>
                ) : docsError ? (
                  <div className="text-center py-12 bg-rose-50 rounded-2xl border border-rose-200">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-rose-900">{docsError}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-3 text-xs font-bold text-rose-700 underline"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                    <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-stone-700">No se encontraron documentos en esta categoría</p>
                    <p className="text-xs text-stone-400 mt-1">Prueba con otro filtro o toma una foto para digitalizar.</p>
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
                        className="p-4 sm:p-5 bg-stone-50/70 hover:bg-stone-100/70 border border-stone-200/80 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-2xs">
                            {isReceta && <Pill className="w-6 h-6 text-emerald-700" />}
                            {isExamen && <FlaskConical className="w-6 h-6 text-teal-700" />}
                            {isConsulta && <Stethoscope className="w-6 h-6 text-blue-800" />}
                            {isImagen && <ScanLine className="w-6 h-6 text-indigo-800" />}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-700">
                                {doc.category === 'RECETA' && 'Receta Médica'}
                                {doc.category === 'EXAMEN' && 'Laboratorio'}
                                {doc.category === 'CONSULTA' && 'Atención Clínica'}
                                {doc.category === 'IMAGEN' && 'Imagenología'}
                              </span>
                              <span className="text-[11px] text-stone-400 font-medium">
                                {doc.date}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border ${doc.status === 'ERROR'
                                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                                  : doc.status === 'CONFIRMADO' || doc.status === 'CONFIRMADA'
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    : 'text-amber-700 bg-amber-50 border-amber-200'
                                  }`}
                              >
                                {doc.status}
                              </span>
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-blue-950 group-hover:text-blue-900 transition-colors">
                              {doc.title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-stone-400" />
                                {doc.institution}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-stone-400" />
                                {doc.doctor}
                              </span>
                            </div>

                            <div className="pt-1.5 text-xs">
                              <p className="text-[11px] text-stone-600 font-medium bg-white/80 p-2 rounded-xl border border-stone-200/60 inline-block">
                                <span className="text-teal-700 font-bold">Extracción IA: </span>
                                {doc.summary}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-stone-200">
                          {doc.status !== 'ERROR' && (
                            <>
                              <button
                                onClick={() => setSelectedDocument(doc)}
                                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-teal-300" />
                                <span>Ver Ficha Detallada</span>
                              </button>

                              <button
                                onClick={() => alert(`Exportando copia legal con timbre digital Ley 21.668...`)}
                                className="p-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                                title="Descargar archivo"
                              >
                                <Download className="w-4 h-4 text-stone-600" />
                              </button>
                            </>
                          )}

                          {doc.status === 'ERROR' && (
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                              title="Eliminar del historial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
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
        {/* PESTAÑA 3: MI FICHA Y DATOS PERSONALES */}
        {/* ========================================================================= */}
        {currentTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Cabecera Principal y Acciones Rápidas */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-blue-950 dark:text-slate-100 tracking-tight">
                    Mi Ficha y Datos Personales
                  </h1>
                  {patientProfile.isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Ficha Verificada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Datos Pendientes
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                  Expediente clínico interoperable regido por la Ley N° 21.668 y Ley N° 20.584 (República de Chile).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleOpenEditProfile}
                  className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-teal-300" />
                  <span>Modificar Antecedentes</span>
                </button>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                  <span>Generar QR Médico</span>
                </button>
              </div>
            </div>

            {/* Alerta de confirmación al guardar datos */}
            {showSuccessAlert && (
              <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-300 dark:border-emerald-600 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                        ¡Ficha Médica Actualizada con Éxito!
                      </h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300/60">
                        Guardado
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                      Tus antecedentes de salud han sido actualizados y respaldados de forma segura conforme a la Ley N° 21.668.
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

            {/* SECCIÓN 1: Identificación y Datos Civiles del Titular */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 dark:border-slate-800 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-950 to-teal-800 text-teal-300 flex items-center justify-center font-black text-2xl shadow-sm ring-4 ring-blue-50 dark:ring-blue-950/50 shrink-0">
                    {user?.first_name?.[0] || 'I'}{user?.last_name?.[0] || 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-blue-950 dark:text-slate-100">
                        {user?.first_name ? `${user.first_name} ${user.last_name}` : 'Ignacio Pérez González'}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        Titular de Ficha
                      </span>
                    </div>
                    <p className="text-xs font-mono text-stone-500 dark:text-slate-400 mt-0.5">
                      RUT: <strong className="text-blue-900 dark:text-teal-300">{user?.rut || '12.345.678-9'}</strong> · Validado Registro Civil
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-wider block">Previsión Declarada</span>
                  <span className="text-sm font-extrabold text-blue-950 dark:text-slate-200">
                    {patientProfile.healthInsurance || 'Sin previsión declarada'}
                  </span>
                </div>
              </div>

              {/* Rejilla de Datos Personales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Correo Electrónico
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                    {user?.email || 'contacto@paciente.cl'}
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium block mt-0.5">
                    Canal seguro para notificaciones
                  </span>
                </div>

                <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Cobertura en Salud
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                    {patientProfile.healthInsurance || 'Pendiente de registrar'}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-slate-400 font-medium block mt-0.5">
                    FONASA / ISAPRE interoperable
                  </span>
                </div>

                <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Respaldo Legal
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Ley N° 20.584 y Ley N° 21.668
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-slate-400 font-medium block mt-0.5">
                    Protección y portabilidad garantizada
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Antecedentes Clínicos Críticos de Urgencia (Cuadrícula 2x2) */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h2 className="text-base font-extrabold text-blue-950 dark:text-slate-100">
                    Antecedentes Médicos de Urgencia
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Información basal que los profesionales de salud consultan en caso de atención o riesgo vital.
                  </p>
                </div>
                <button
                  onClick={handleOpenEditProfile}
                  className="text-xs text-blue-900 dark:text-teal-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Grupo Sanguíneo */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
                          <Droplet className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <span className="text-xs font-extrabold text-blue-950 dark:text-slate-100">
                          Grupo Sanguíneo & Rh
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                        Transfusión
                      </span>
                    </div>

                    <div className="py-2">
                      <span className="text-2xl font-black text-rose-700 dark:text-rose-400 block tracking-tight">
                        {patientProfile.bloodType || 'Sin registrar'}
                      </span>
                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Determinación serológica esencial para procedimientos quirúrgicos y banco de sangre.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Alergias a Medicamentos */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs font-extrabold text-blue-950 dark:text-slate-100">
                          Alergias a Medicamentos
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        Alerta Médica
                      </span>
                    </div>

                    <div className="py-2">
                      {patientProfile.allergies && patientProfile.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {patientProfile.allergies.map((allergy, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs font-bold border border-rose-200 dark:border-rose-900"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              {allergy}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold py-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Ninguna alergia a fármacos declarada</span>
                        </div>
                      )}
                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-2 leading-relaxed">
                        El médico recibe una alerta automática antes de prescribir medicamentos incompatibles.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Enfermedades Crónicas & GES */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold">
                          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-extrabold text-blue-950 dark:text-slate-100">
                          Patologías Crónicas & GES
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        Tratamiento Activo
                      </span>
                    </div>

                    <div className="py-2">
                      {patientProfile.chronicConditions && patientProfile.chronicConditions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {patientProfile.chronicConditions.map((cond, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-xs font-bold border border-blue-200 dark:border-blue-900"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {cond}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold py-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Sin patologías crónicas registradas</span>
                        </div>
                      )}
                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-2 leading-relaxed">
                        Permite a los especialistas adecuar posologías y monitorear enfermedades de base.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Donante de Órganos */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                          <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs font-extrabold text-blue-950 dark:text-slate-100">
                          Donación de Órganos
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        Ley N° 20.413
                      </span>
                    </div>

                    <div className="py-2">
                      <span className="text-base font-extrabold text-emerald-800 dark:text-emerald-300 block">
                        {patientProfile.isOrganDonor ? 'Sí, Donante Universal' : 'No Donante'}
                      </span>
                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 leading-relaxed">
                        En Chile toda persona es legalmente donante salvo constancia expresa de renuncia en el Registro Civil.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Contacto de Emergencia Designado */}
            <div className="bg-gradient-to-r from-blue-900/5 via-teal-900/5 to-transparent dark:from-blue-950/30 dark:to-transparent border border-blue-200/80 dark:border-blue-900/50 rounded-3xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-900 text-teal-300 flex items-center justify-center shrink-0 shadow-xs">
                    <PhoneCall className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-blue-950 dark:text-slate-100">
                        Contacto de Emergencia Oficial
                      </h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200">
                        Protocolo SAMU 131
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                      Familiar o persona designada para aviso inmediato en situaciones de riesgo vital o inconsciencia médica.
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                      {patientProfile.emergencyContactName ? (
                        <>
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <User className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                            <span>{patientProfile.emergencyContactName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-teal-800 dark:text-teal-300">
                            <PhoneCall className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <a href={`tel:${patientProfile.emergencyContactPhone}`} className="hover:underline">
                              {patientProfile.emergencyContactPhone || 'Sin número registrado'}
                            </a>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold italic">
                          Aún no has registrado un contacto para emergencias médicas.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleOpenEditProfile}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 border border-stone-200 dark:border-slate-700 text-blue-950 dark:text-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  {patientProfile.emergencyContactName ? 'Modificar Contacto' : '+ Registrar Contacto'}
                </button>
              </div>
            </div>

            {/* SECCIÓN 4: Bitácora de Trazabilidad y Auditoría Legal (Ley N° 21.668) */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-blue-950 dark:text-slate-100">
                      Bitácora de Trazabilidad e Interoperabilidad
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                      Ley N° 21.668
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                    Registro obligatorio de todas las instituciones y profesionales que han consultado tus antecedentes clínicos.
                  </p>
                </div>

                <button
                  onClick={() => alert('Generando documento PDF oficial de la Ficha Clínica bajo Ley 20.584 y Ley 21.668 con firma digital avanzada...')}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-teal-300" />
                  <span>Descargar Ficha en PDF</span>
                </button>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {/* Evento 1 */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0 font-bold">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-blue-950 dark:text-slate-200 block">
                        Dr. Ariel González · Consulta Médica y Prescripción
                      </span>
                      <span className="text-stone-500 dark:text-slate-400 text-[11px]">
                        Hospital de Puerto Montt · Acceso autorizado por código QR dinámico
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-stone-400 dark:text-slate-500 text-[11px] font-mono block">
                      02 Septiembre 2026 · 14:30
                    </span>
                    <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      Acceso Cifrado Autorizado
                    </span>
                  </div>
                </div>

                {/* Evento 2 */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0 font-bold">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-blue-950 dark:text-slate-200 block">
                        Dra. Marcela Lagos · Carga de Resultados de Laboratorio
                      </span>
                      <span className="text-stone-500 dark:text-slate-400 text-[11px]">
                        Laboratorio Bionet · Perfil Bioquímico & Lipídico interoperable
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-stone-400 dark:text-slate-500 text-[11px] font-mono block">
                      28 Agosto 2026 · 10:15
                    </span>
                    <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      Firma Electrónica Avanzada
                    </span>
                  </div>
                </div>

                {/* Evento 3 */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 flex items-center justify-center shrink-0 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-blue-950 dark:text-slate-200 block">
                        Sincronización Nacional MINSAL / FONASA
                      </span>
                      <span className="text-stone-500 dark:text-slate-400 text-[11px]">
                        Repositorio Nacional de Salud Digital · Interoperabilidad HL7 FHIR
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-stone-400 dark:text-slate-500 text-[11px] font-mono block">
                      25 Agosto 2026 · 09:00
                    </span>
                    <span className="inline-block text-[10px] font-bold text-blue-700 dark:text-blue-400">
                      Registro Sincronizado
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: Preferencias, Apariencia y Portabilidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Apariencia */}
              <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                <div>
                  <h3 className="text-xs font-extrabold text-blue-950 dark:text-slate-100 uppercase tracking-wider">
                    Apariencia y Visualización
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                    Cambia entre modo claro y modo oscuro para mayor confort visual durante la noche o turnos.
                  </p>
                </div>
                <div className="pt-1">
                  <ThemeToggle />
                </div>
              </div>

              {/* Portabilidad y Ley 21.668 */}
              <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-blue-950 dark:text-slate-100 uppercase tracking-wider">
                    Portabilidad de Datos (HL7 FHIR)
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                    Descarga tu historial clínico completo en formato estructurado JSON conforme a la Ley N° 21.668.
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => {
                      const exportData = {
                        paciente: {
                          nombre: user?.first_name ? `${user.first_name} ${user.last_name}` : 'Ignacio Pérez González',
                          rut: user?.rut || '12.345.678-9',
                          email: user?.email,
                          prevision: patientProfile.healthInsurance,
                          grupoSanguineo: patientProfile.bloodType,
                          donanteOrganos: patientProfile.isOrganDonor,
                          alergias: patientProfile.allergies,
                          enfermedadesCronicas: patientProfile.chronicConditions,
                          contactoEmergencia: {
                            nombre: patientProfile.emergencyContactName,
                            telefono: patientProfile.emergencyContactPhone
                          }
                        },
                        normativa: 'Ley N° 21.668 y Ley N° 20.584 - República de Chile',
                        fechaExportacion: new Date().toISOString()
                      };
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `FichaClinica_${user?.rut || 'Paciente'}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer w-fit"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-900 dark:text-teal-300" />
                    <span>Exportar Datos en JSON (HL7 FHIR)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Encabezado Principal y Sello Normativo */}
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-teal-900 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-extrabold text-[10px] tracking-wider uppercase border border-teal-400/30">
                      Cumplimiento Normativo
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px] border border-white/20">
                      Ley N° 21.668 & Ley N° 20.584
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-teal-300 shrink-0" />
                    <span>Bitácora de Auditoría y Trazabilidad Médica</span>
                  </h1>

                  <p className="text-xs text-blue-100/90 max-w-2xl leading-relaxed">
                    Por ley, tu expediente clínico te pertenece. Cada vez que un profesional de la salud consulta tu ficha, se genera un código QR o se actualizan tus antecedentes, queda registrado de forma inmutable con fecha, hora, identidad y dirección IP.
                  </p>
                </div>

                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 sm:border-l border-white/15 pt-3 sm:pt-0 sm:pl-6">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-teal-200 uppercase tracking-wider block font-bold">Total Registros</span>
                    <span className="text-2xl font-black font-mono text-white">{auditLogs.length}</span>
                  </div>
                  <button
                    onClick={() => {
                      fetchAuditLogs();
                      fetchMyGrants();
                    }}
                    disabled={loadingAudit}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs border border-white/20"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: GESTIÓN DE PASES Y AUTORIZACIONES (PUNTO 2) */}
            <section className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-blue-950">
                      Pases de Acceso Médico Emitidos
                    </h2>
                    <p className="text-xs text-stone-500">
                      Historial completo de autorizaciones temporales (QR y directas)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 text-teal-300" />
                  <span>Emitir Nuevo Pase QR</span>
                </button>
              </div>

              {myGrants.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-500 space-y-1">
                  <p className="font-bold text-stone-700">No hay pases médicos registrados.</p>
                  <p>Cuando generes un código QR para un médico, aparecerá aquí con su estado de vigencia.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Vista Móvil: Tarjetas responsivas (sm:hidden) */}
                  <div className="sm:hidden space-y-3">
                    {myGrants.map((grant) => (
                      <div
                        key={grant.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          grant.status === 'ACTIVO'
                            ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                            : grant.status === 'REVOCADO'
                            ? 'bg-rose-50/40 border-rose-200/80'
                            : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-blue-950">
                                {grant.token}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  grant.status === 'ACTIVO'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : grant.status === 'REVOCADO'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {grant.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">
                              {grant.grantType === 'QR_TEMPORAL' ? 'QR Temporal' : 'Acceso Directo'} · {grant.createdAt ? new Date(grant.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                          </div>

                          {grant.status === 'ACTIVO' && (
                            <span className="text-[11px] font-mono font-bold text-emerald-900 bg-white px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0">
                              <Timer className="w-3.5 h-3.5 text-emerald-600" />
                              {grant.minutesRemaining} min
                            </span>
                          )}
                        </div>

                        {/* Detalle Médico */}
                        <div className="text-xs text-stone-600 bg-white/70 p-2.5 rounded-xl border border-stone-200/60">
                          {grant.doctorName ? (
                            <div>
                              <span className="font-bold text-blue-950 block">{grant.doctorName}</span>
                              <span className="text-[11px] text-stone-500">{grant.doctorInstitution || 'Centro de Salud'} (RUT: {grant.doctorRut || 'N/A'})</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">Pendiente de escaneo por tu médico</span>
                          )}
                        </div>

                        {grant.status === 'ACTIVO' && (
                          <div className="pt-1 flex items-center justify-between gap-2">
                            <button
                              onClick={() => setShowQrModal(true)}
                              className="flex-1 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            >
                              <QrCode className="w-3.5 h-3.5 text-teal-300" />
                              <span>Ver QR</span>
                            </button>
                            <button
                              onClick={() => handleRevokeSpecificGrant(grant.id)}
                              className="py-2 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                          <th className="py-3 px-3">Código / Token</th>
                          <th className="py-3 px-3">Modalidad</th>
                          <th className="py-3 px-3">Fecha Emisión</th>
                          <th className="py-3 px-3">Vigencia / Restante</th>
                          <th className="py-3 px-3">Médico / Centro</th>
                          <th className="py-3 px-3">Estado</th>
                          <th className="py-3 px-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {myGrants.map((grant) => (
                          <tr key={grant.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-blue-950">
                              {grant.token}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold text-[10px]">
                                {grant.grantType === 'QR_TEMPORAL' ? 'QR Temporal' : 'Directo'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-stone-500 whitespace-nowrap">
                              {grant.createdAt ? new Date(grant.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="py-3 px-3 font-mono text-stone-700 whitespace-nowrap">
                              {grant.status === 'ACTIVO' ? (
                                <span className="font-bold text-emerald-700 flex items-center gap-1">
                                  <Timer className="w-3.5 h-3.5" />
                                  {grant.minutesRemaining} min restantes
                                </span>
                              ) : (
                                <span className="text-stone-400">Vencido</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {grant.doctorName ? (
                                <div>
                                  <span className="font-bold text-blue-950 block">{grant.doctorName}</span>
                                  <span className="text-[10px] text-stone-500">{grant.doctorInstitution || 'Centro de Salud'} (RUT: {grant.doctorRut || 'N/A'})</span>
                                </div>
                              ) : (
                                <span className="text-stone-400 italic">Pendiente de escaneo</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-block ${
                                  grant.status === 'ACTIVO'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : grant.status === 'REVOCADO'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {grant.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {grant.status === 'ACTIVO' ? (
                                <button
                                  onClick={() => handleRevokeSpecificGrant(grant.id)}
                                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 ml-auto"
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

            {/* SECCIÓN 2: LÍNEA DE TIEMPO DE AUDITORÍA (PUNTO 3 - LEY 21.668) */}
            <section className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-blue-950">
                      Registro Inmutable de Accesos y Eventos
                    </h2>
                    <p className="text-xs text-stone-500">
                      Trazabilidad legal de cada acción realizada sobre tu información médica
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 bg-stone-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Bitácora protegida contra manipulación</span>
                </div>
              </div>

              {loadingAudit ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-blue-900 animate-spin mx-auto" />
                  <p className="text-xs text-stone-500">Consultando registros legales...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-500 space-y-1">
                  <p className="font-bold text-stone-700">Sin registros de auditoría por ahora.</p>
                  <p>Toda interacción quedará firmada aquí automáticamente.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {auditLogs.map((log) => {
                    const isMedicalAccess = log.category === 'ACCESO_MEDICO';
                    const isRevoke = log.category === 'SEGURIDAD';
                    const isConsent = log.category === 'CONSENTIMIENTO';

                    return (
                      <div key={log.id} className="relative group">
                        {/* Nodo en la línea */}
                        <div
                          className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                            isMedicalAccess
                              ? 'bg-emerald-600 text-white'
                              : isRevoke
                              ? 'bg-rose-600 text-white'
                              : isConsent
                              ? 'bg-amber-500 text-white'
                              : 'bg-blue-900 text-white'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>

                        {/* Tarjeta del evento */}
                        <div className="p-4 bg-stone-50/70 hover:bg-stone-50 rounded-2xl border border-stone-200/80 transition-all space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-blue-950 text-xs sm:text-sm">
                                {log.title}
                              </h3>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  isMedicalAccess
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : isRevoke
                                    ? 'bg-rose-100 text-rose-900'
                                    : isConsent
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {log.category.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 text-stone-400" />
                              {log.createdAt ? new Date(log.createdAt).toLocaleDateString('es-CL', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              }) : '—'}
                            </span>
                          </div>

                          <p className="text-xs text-stone-600 leading-relaxed">
                            {log.description}
                          </p>

                          <div className="pt-2 border-t border-stone-200/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-400 font-mono">
                            <span>IP: {log.ipAddress || '127.0.0.1'}</span>
                            <span className="truncate max-w-xs">{log.userAgent || 'Navegador Web'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-stone-700"><strong>Indicaciones Médicas:</strong> {selectedDocument.extractedData.indicaciones}</p>
                    <p className="text-emerald-700 font-bold mt-1">Vigencia hasta: {selectedDocument.extractedData.vigenciaHasta}</p>
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
              <button
                onClick={() => alert('Descargando copia legal certificada en PDF con timbre institucional...')}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>

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
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Digitalizar con IA</h3>
                  <p className="text-xs text-stone-500">Escaneo de recetas, exámenes y consultas</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block p-6 border-2 border-dashed border-teal-400/80 bg-teal-50/40 hover:bg-teal-50/80 rounded-2xl text-center cursor-pointer transition-all">
                <UploadCloud className="w-10 h-10 text-teal-600 mx-auto mb-2" />
                <span className="font-bold text-blue-950 block">Toma una foto a tu papel médico</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">Soporta recetas manuscritas, exámenes de laboratorio y PDF</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file);
                    e.target.value = '';
                  }}
                />
              </label>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5 text-stone-600">
                <span className="font-bold text-blue-950 block">¿Cómo lo procesa la plataforma?</span>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  1. <strong>OCR Multimodal:</strong> Lee texto impreso o manuscrito del médico.<br />
                  2. <strong>Clasificación automática:</strong> Identifica si es Receta, Examen de sangre o Informe.<br />
                  3. <strong>Cifrado y archivo:</strong> Almacena con AES-256 en tu ficha personal.
                </p>
              </div>
            </div>
            {isUploading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
                    Analizando con IA...
                  </span>
                  <span className="font-mono text-blue-900">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-900 to-teal-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-600">
                  OCR + clasificación con Gemini. Esto puede tardar hasta 30 segundos.
                </p>
              </div>
            )}

            {uploadError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-rose-950 block">Error al procesar</span>
                  <p className="text-[11px] text-rose-800 mt-0.5">{uploadError}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cerrar
              </button>
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
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                          qrDuration === opt.hours
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-teal-300 flex items-center justify-center font-bold shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-blue-950 dark:text-slate-100">
                    Completar Ficha Médica Única
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Información vital para médicos tratantes en consultas o urgencias.
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
              {/* Grupo Sanguíneo y Previsión */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 dark:text-slate-300 block">
                    Grupo Sanguíneo & Factor Rh
                  </label>
                  <select
                    value={editFormData.bloodType}
                    onChange={(e) => setEditFormData({ ...editFormData, bloodType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="">Seleccionar grupo sanguíneo...</option>
                    <option value="O Rh (+) Positivo">O Rh (+) Positivo (Donante universal eritrocitos)</option>
                    <option value="A Rh (+) Positivo">A Rh (+) Positivo</option>
                    <option value="B Rh (+) Positivo">B Rh (+) Positivo</option>
                    <option value="AB Rh (+) Positivo">AB Rh (+) Positivo (Receptor universal)</option>
                    <option value="O Rh (-) Negativo">O Rh (-) Negativo</option>
                    <option value="A Rh (-) Negativo">A Rh (-) Negativo</option>
                    <option value="B Rh (-) Negativo">B Rh (-) Negativo</option>
                    <option value="AB Rh (-) Negativo">AB Rh (-) Negativo</option>
                    <option value="No lo sé">No lo sé con certeza</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 dark:text-slate-300 block">
                    Previsión de Salud en Chile
                  </label>
                  <select
                    value={editFormData.healthInsurance}
                    onChange={(e) => setEditFormData({ ...editFormData, healthInsurance: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="">Seleccionar previsión...</option>
                    <option value="FONASA Tramo A">FONASA Tramo A (Gratuidad total)</option>
                    <option value="FONASA Tramo B">FONASA Tramo B</option>
                    <option value="FONASA Tramo C">FONASA Tramo C</option>
                    <option value="FONASA Tramo D">FONASA Tramo D</option>
                    <option value="ISAPRE Banmédica">ISAPRE Banmédica</option>
                    <option value="ISAPRE Colmena">ISAPRE Colmena</option>
                    <option value="ISAPRE Consalud">ISAPRE Consalud</option>
                    <option value="ISAPRE CruzBlanca">ISAPRE CruzBlanca</option>
                    <option value="ISAPRE Nueva Masvida">ISAPRE Nueva Masvida</option>
                    <option value="ISAPRE Vida Tres">ISAPRE Vida Tres</option>
                    <option value="Particular / Fuerzas Armadas">Particular / CAPREDENA / DIPRECA</option>
                  </select>
                </div>
              </div>

              {/* Alergias Médicas (Con sugerencias rápidas) */}
              <div className="space-y-2 p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950 dark:text-rose-200">
                    Alergias a Medicamentos o Sustancias
                  </span>
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-mono">Crítico para recetas</span>
                </div>

                {/* Tags seleccionados */}
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {editFormData.allergies.length === 0 ? (
                    <span className="text-[11px] text-stone-400 italic">Ninguna alergia seleccionada.</span>
                  ) : (
                    editFormData.allergies.map((allergy, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-bold"
                      >
                        {allergy}
                        <button
                          type="button"
                          onClick={() => handleToggleAllergy(allergy)}
                          className="hover:text-rose-950 cursor-pointer font-black"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Sugerencias Rápidas */}
                <div className="pt-1.5">
                  <span className="text-[10px] text-stone-500 dark:text-slate-400 font-bold block mb-1">
                    Selección rápida (toca para agregar/quitar):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Penicilina', 'Ibuprofeno/AINEs', 'Sulfas', 'Aspirina', 'Látex', 'Ninguna conocida'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleAllergy(item)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${editFormData.allergies.includes(item)
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-rose-300'
                          }`}
                      >
                        {editFormData.allergies.includes(item) ? item : `+ ${item}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opción personalizada: Otra alergia escrita por el paciente */}
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/30">
                  <span className="text-[10px] text-rose-900 dark:text-rose-300 font-bold block mb-1">
                    ¿Tienes otra alergia no listada? Escríbela aquí:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ej: Cefalexina, Yodo, Maní, Dipirona..."
                      value={customAllergy}
                      onChange={(e) => setCustomAllergy(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomAllergy();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAllergy}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Enfermedades Crónicas */}
              <div className="space-y-2 p-3.5 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 dark:text-blue-200">
                    Enfermedades Crónicas / Patologías GES
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 font-mono">Tratamientos continuos</span>
                </div>

                {/* Tags de crónicas */}
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {editFormData.chronicConditions.length === 0 ? (
                    <span className="text-[11px] text-stone-400 italic">Ninguna enfermedad crónica seleccionada.</span>
                  ) : (
                    editFormData.chronicConditions.map((cond, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 text-xs font-bold"
                      >
                        {cond}
                        <button
                          type="button"
                          onClick={() => handleToggleCondition(cond)}
                          className="hover:text-blue-950 cursor-pointer font-black"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Sugerencias Rápidas */}
                <div className="pt-1.5">
                  <span className="text-[10px] text-stone-500 dark:text-slate-400 font-bold block mb-1">
                    Selección rápida:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Hipertensión Arterial', 'Diabetes Tipo 2', 'Asma Bronquial', 'Hipotiroidismo', 'Dislipidemia', 'Ninguna'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleCondition(item)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${editFormData.chronicConditions.includes(item)
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border-stone-200 dark:border-slate-700 hover:border-blue-300'
                          }`}
                      >
                        {editFormData.chronicConditions.includes(item) ? item : `+ ${item}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opción personalizada: Otra enfermedad o diagnóstico */}
                <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/30">
                  <span className="text-[10px] text-blue-900 dark:text-blue-300 font-bold block mb-1">
                    ¿Tienes otra patología o diagnóstico? Escríbela aquí:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ej: Celiaquía, Epilepsia, Resistencia a la insulina..."
                      value={customCondition}
                      onChange={(e) => setCustomCondition(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomCondition();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCondition}
                      className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Donante de Órganos & Contacto de Emergencia */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-slate-800/60 rounded-xl border border-stone-200 dark:border-slate-700">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">¿Calidad de Donante de Órganos?</span>
                    <span className="text-[10px] text-stone-500 dark:text-slate-400">Por ley en Chile toda persona es donante salvo manifestación expresa.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, isOrganDonor: !editFormData.isOrganDonor })}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all ${editFormData.isOrganDonor
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                  >
                    {editFormData.isOrganDonor ? 'Sí, Soy Donante' : 'No Donante'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 dark:text-slate-300 block">
                      Nombre Contacto de Urgencia
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: María González (Madre)"
                      value={editFormData.emergencyContactName}
                      onChange={(e) => setEditFormData({ ...editFormData, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 dark:text-slate-300 block">
                      Teléfono Contacto de Urgencia
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: +56 9 8765 4321"
                      value={editFormData.emergencyContactPhone}
                      onChange={(e) => setEditFormData({ ...editFormData, emergencyContactPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>
                </div>
              </div>

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
                  <span>Guardar y Completar Ficha</span>
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
        onOpenUploadModal={() => setShowUploadModal(true)}
        onOpenQrModal={() => setShowQrModal(true)}
        onFileSelected={handleUploadFile}
        isUploading={isUploading}
        hasActiveGrants={myGrants.some(g => g.status === 'ACTIVO')}
      />

      <footer className="py-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
