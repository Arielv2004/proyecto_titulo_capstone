import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Clock,
  Plus,
  HelpCircle,
  User,
  Camera,
  Upload,
  HeartPulse,
  X,
  ChevronRight,
  ShieldCheck,
  FileText,
  Sparkles,
  Info,
  MapPin,
  QrCode
} from 'lucide-react';

export const BottomNav = ({
  activeTab = 'home',
  onTabChange,
  onOpenUploadModal,
  onOpenQrModal,
  onFileSelected,
  isUploading = false,
  hasActiveGrants = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onFileSelected) {
      onFileSelected(file);
    }
    setShowActionSheet(false);
    e.target.value = '';
  };

  const FAQS = [
    {
      q: '¿Cómo funciona la extracción de recetas con IA y OCR?',
      a: 'Al tomar una foto o subir un PDF, el motor de MyMedRecord lee el texto de la receta o examen mediante OCR y utiliza Inteligencia Artificial para identificar medicamentos, dosis, frecuencias y diagnósticos automáticamente.'
    },
    {
      q: '¿Qué es la Ley N° 21.668 de Interoperabilidad Clínica?',
      a: 'Es la normativa chilena que garantiza que tu historial médico te pertenece a ti y puede ser consultado de forma segura y estandarizada en cualquier centro de salud público (FONASA) o privado (ISAPRE).'
    },
    {
      q: '¿Cómo le doy acceso a mi médico durante una consulta?',
      a: 'Puedes mostrarle tu código QR temporal o pedirle que busque tu ficha por RUT. El médico solo tendrá acceso temporal y cada consulta quedará registrada en tus logs de auditoría.'
    },
    {
      q: '¿Mis exámenes y diagnósticos están protegidos?',
      a: 'Sí. Todos tus datos clínicos se almacenan con cifrado militar AES-256-GCM en la base de datos y tus sesiones están protegidas con cookies seguras HttpOnly.'
    }
  ];

  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  return (
    <>
      {/* Inputs ocultos nativos para activar la Cámara del iPhone/Android y el Selector de Archivos */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelected(e, 'Cámara')}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,application/pdf"
        onChange={(e) => handleFileSelected(e, 'Archivos')}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* BARRA DE NAVEGACIÓN INFERIOR FIJA (ESTILO APP NATIVA MÓVIL) */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-stone-200/90 dark:border-slate-800 px-3 py-2 sm:hidden shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around relative">
          {/* Tab 1: Inicio */}
          <button
            onClick={() => onTabChange ? onTabChange('home') : navigate('/patient')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition-all cursor-pointer ${activeTab === 'home' ? 'text-blue-900 dark:text-teal-400 font-extrabold' : 'text-stone-400 dark:text-slate-400 hover:text-stone-600 dark:hover:text-slate-200'
              }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Inicio</span>
          </button>

          {/* Tab 2: Historial / Documentos */}
          <button
            onClick={() => onTabChange ? onTabChange('records') : navigate('/patient')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition-all cursor-pointer ${activeTab === 'records' ? 'text-blue-900 dark:text-teal-400 font-extrabold' : 'text-stone-400 dark:text-slate-400 hover:text-stone-600 dark:hover:text-slate-200'
              }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px]">Historial</span>
          </button>

          {/* Botón Central Elevado (+) */}
          <div className="relative -top-5 z-20">
            <button
              type="button"
              onClick={() => setShowActionSheet(true)}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-900 via-blue-950 to-teal-800 text-teal-300 flex items-center justify-center shadow-lg shadow-blue-900/30 active:scale-95 transition-all border-4 border-stone-50 dark:border-slate-900 cursor-pointer"
              aria-label="Acción Rápida"
            >
              <Plus className="w-7 h-7 text-teal-300 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab 4: Accesos & Auditoría (Ley N° 21.668) */}
          <button
            onClick={() => onTabChange ? onTabChange('audit') : navigate('/patient')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition-all cursor-pointer relative ${
              activeTab === 'audit' ? 'text-teal-700 dark:text-teal-300 font-extrabold' : 'text-stone-400 dark:text-slate-400 hover:text-stone-600 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <ShieldCheck className="w-5 h-5" />
              {hasActiveGrants && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </div>
            <span className="text-[10px]">Accesos</span>
          </button>

          {/* Tab 5: Mi Perfil */}
          <button
            onClick={() => onTabChange ? onTabChange('profile') : navigate('/patient')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition-all cursor-pointer ${activeTab === 'profile' ? 'text-blue-900 dark:text-teal-400 font-extrabold' : 'text-stone-400 dark:text-slate-400 hover:text-stone-600 dark:hover:text-slate-200'
              }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Mi Perfil</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* ACTION SHEET INFERIOR (DESPLEGABLE AL TOCAR EL BOTÓN +) */}
      {/* ========================================================================= */}
      {showActionSheet && (
        <div
          onClick={() => setShowActionSheet(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 border-t border-transparent dark:border-slate-800 rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Manilla superior decorativa */}
            <div className="w-12 h-1.5 bg-stone-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-blue-950 dark:text-slate-100">Acciones Rápidas</h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">Digitaliza o registra información de salud</p>
              </div>
              <button
                type="button"
                onClick={() => setShowActionSheet(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-full bg-stone-100 dark:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Opción 1: Abrir Cámara para foto de Receta o Examen */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
                className="w-full p-4 bg-teal-50/70 hover:bg-teal-100/70 dark:bg-teal-950/40 dark:hover:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 rounded-2xl flex items-center gap-3.5 transition-all text-left cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                    Tomar Foto con la Cámara <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  </span>
                  <span className="text-[11px] text-teal-800/80 dark:text-teal-300/80 block mt-0.5">
                    Fotografía recetas o exámenes en papel para digitalizarlos con IA.
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              {/* Opción 2: Subir PDF o Foto desde Galería */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full p-4 bg-blue-50/70 hover:bg-blue-100/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-blue-200 dark:border-slate-700/80 rounded-2xl flex items-center gap-3.5 transition-all text-left cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-blue-950 dark:text-slate-100 block">
                    Cargar Archivo PDF o Galería
                  </span>
                  <span className="text-[11px] text-blue-800/80 dark:text-slate-300/80 block mt-0.5">
                    Selecciona informes médicos digitales en PDF o imágenes de tu dispositivo.
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-900 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PREGUNTAS FRECUENTES Y AYUDA */}
      {/* ========================================================================= */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-teal-300 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950 dark:text-slate-100">Centro de Ayuda & FAQ</h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">Preguntas frecuentes y soporte MyMedRecord</p>
                </div>
              </div>
              <button
                onClick={() => setShowFaqModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="border border-stone-200/90 dark:border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                    className="w-full p-3.5 bg-stone-50/80 dark:bg-slate-850 text-left font-bold text-blue-950 dark:text-slate-200 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={`w-4 h-4 text-stone-400 dark:text-slate-400 transition-transform ${openFaqIndex === idx ? 'rotate-90 text-blue-900 dark:text-teal-400' : ''}`} />
                  </button>
                  {openFaqIndex === idx && (
                    <div className="p-3.5 bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 text-[11px] leading-relaxed border-t border-stone-200/60 dark:border-slate-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowFaqModal(false)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Cerrar Ayuda
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
