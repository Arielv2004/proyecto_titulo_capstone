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
  MapPin
} from 'lucide-react';

export const BottomNav = ({ onOpenVitalsModal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showUploadPreview, setShowUploadPreview] = useState(null);
  
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelected = (e, source) => {
    const file = e.target.files?.[0];
    if (file) {
      setShowUploadPreview({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type.includes('pdf') ? 'PDF' : 'IMAGEN',
        source,
      });
      setShowActionSheet(false);
    }
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
      {/* BARRA DE NAVEGACIÓN INFERIOR FIJA (ESTILO APP NATIVA MÓVIL) */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200/90 px-3 py-2 sm:hidden shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around relative">
          {/* Tab 1: Inicio */}
          <button
            onClick={() => navigate('/patient')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition-all cursor-pointer ${
              location.pathname === '/patient' ? 'text-blue-900 font-bold' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Inicio</span>
          </button>

          {/* Tab 2: Historial / Timeline */}
          <button
            onClick={() => navigate('/patient')}
            className="flex flex-col items-center gap-1 py-1 px-2.5 text-stone-400 hover:text-stone-600 transition-all cursor-pointer"
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px]">Historial</span>
          </button>

          {/* Botón Central Elevado (+) */}
          <div className="relative -top-5">
            <button
              onClick={() => setShowActionSheet(true)}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-900 via-blue-950 to-teal-800 text-teal-300 flex items-center justify-center shadow-lg shadow-blue-900/30 active:scale-95 transition-all border-4 border-stone-50 cursor-pointer"
              aria-label="Acción Rápida"
            >
              <Plus className="w-7 h-7 text-teal-300 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab 4: Ayuda / FAQ */}
          <button
            onClick={() => setShowFaqModal(true)}
            className="flex flex-col items-center gap-1 py-1 px-2.5 text-stone-400 hover:text-stone-600 transition-all cursor-pointer"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-[10px]">Ayuda</span>
          </button>

          {/* Tab 5: Mi Ficha */}
          <button
            onClick={() => navigate('/patient')}
            className="flex flex-col items-center gap-1 py-1 px-2.5 text-stone-400 hover:text-stone-600 transition-all cursor-pointer"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Mi Ficha</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* ACTION SHEET INFERIOR (DESPLEGABLE AL TOCAR EL BOTÓN +) */}
      {/* ========================================================================= */}
      {showActionSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Manilla superior decorativa */}
            <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-blue-950">Acciones Rápidas</h3>
                <p className="text-xs text-stone-500">Digitaliza o registra información de salud</p>
              </div>
              <button
                onClick={() => setShowActionSheet(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Opción 1: Abrir Cámara para foto de Receta */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full p-4 bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200 rounded-2xl flex items-center gap-3.5 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-teal-950 block flex items-center gap-1.5">
                    Tomar Foto con la Cámara <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  </span>
                  <span className="text-[11px] text-teal-800/80 block">
                    Ideal para recetas médicas impresas o resultados en papel.
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Opción 2: Subir PDF o de Galería */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-2xl flex items-center gap-3.5 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-blue-950 block">
                    Cargar Archivo PDF o Galería
                  </span>
                  <span className="text-[11px] text-blue-800/80 block">
                    Sube informes médicos digitales o fotos guardadas.
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-900 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Opción 3: Registrar Signos Vitales */}
              <button
                onClick={() => {
                  setShowActionSheet(false);
                  if (onOpenVitalsModal) onOpenVitalsModal();
                }}
                className="w-full p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl flex items-center gap-3.5 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-800 text-white flex items-center justify-center shadow-xs">
                  <HeartPulse className="w-5 h-5 text-teal-300" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-800 block">
                    Registrar Signos Vitales
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Presión arterial, glucosa, frecuencia cardíaca o SpO2.
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PREGUNTAS FRECUENTES Y AYUDA */}
      {/* ========================================================================= */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Centro de Ayuda & FAQ</h3>
                  <p className="text-xs text-stone-500">Preguntas frecuentes y soporte MyMedRecord</p>
                </div>
              </div>
              <button
                onClick={() => setShowFaqModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              {FAQS.map((faq, idx) => (
                <div 
                  key={idx}
                  className="border border-stone-200/90 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                    className="w-full p-3.5 bg-stone-50/80 text-left font-bold text-blue-950 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${openFaqIndex === idx ? 'rotate-90 text-blue-900' : ''}`} />
                  </button>
                  {openFaqIndex === idx && (
                    <div className="p-3.5 bg-white text-stone-600 text-[11px] leading-relaxed border-t border-stone-200/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setShowFaqModal(false)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cerrar Ayuda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN DE ARCHIVO CAPTURADO */}
      {/* ========================================================================= */}
      {showUploadPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-blue-950">Documento Capturado</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4 font-mono truncate px-4">
              {showUploadPreview.name} ({showUploadPreview.size})
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs mb-4">
              <div className="flex justify-between text-stone-600 mb-1">
                <span>Origen:</span>
                <span className="font-bold text-blue-950">{showUploadPreview.source}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Formato:</span>
                <span className="font-bold text-teal-800">{showUploadPreview.type}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowUploadPreview(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert('¡Documento enviado con éxito al servicio de IA para OCR y extracción!');
                  setShowUploadPreview(null);
                }}
                className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>Procesar IA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
