import { DialogFrame } from '../ui/DialogFrame';
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, User, Camera, Upload, X, ChevronRight, ShieldCheck, FileText, Sparkles } from 'lucide-react';

export const BottomNav = ({
  activeTab = 'home',
  onTabChange,
  onUpload,
  onFileSelected,
  isUploading = false,
}) => {
  const navigate = useNavigate();
  const [showActionSheet, setShowActionSheet] = useState(false);

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

  return (
    <>
      {/* Inputs ocultos nativos para activar la Cámara del iPhone/Android y el Selector de Archivos */}
      {!onUpload && <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelected(e, 'Cámara')}
        className="hidden"
      />}
      {!onUpload && <input
        type="file"
        ref={fileInputRef}
        accept="image/*,application/pdf"
        onChange={(e) => handleFileSelected(e, 'Archivos')}
        className="hidden"
      />}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* BARRA DE NAVEGACIÓN INFERIOR FIJA (ESTILO APP NATIVA MÓVIL) */}
      {/* ========================================================================= */}
      <nav className="mm-mobile-nav" aria-label="Secciones del portal móvil">
        {[{id:'home',label:'Inicio',icon:Home},{id:'records',label:'Mi ficha',icon:FileText},{id:'upload',label:'Subir',icon:Plus},{id:'audit',label:'Accesos',icon:ShieldCheck},{id:'profile',label:'Mi perfil',icon:User}].map(({id,label,icon:Icon}) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} className={id === 'upload' ? 'mm-add' : ''} onClick={() => id === 'upload' ? (onUpload ? onUpload() : setShowActionSheet(true)) : onTabChange ? onTabChange(id) : navigate('/patient')}><Icon size={21} aria-hidden="true" /><span>{label}</span></button>)}
      </nav>

      {/* ========================================================================= */}
      {/* ACTION SHEET INFERIOR (DESPLEGABLE AL TOCAR EL BOTÓN +) */}
      {/* ========================================================================= */}
      {!onUpload && showActionSheet && (
        <DialogFrame label="Subir documento" onClose={() => setShowActionSheet(false)}
          onClick={() => setShowActionSheet(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface dark:bg-surface border-t border-transparent dark:border-line rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Manilla superior decorativa */}
            <div className="w-12 h-1.5 bg-stone-300 dark:bg-surface-muted rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-ink dark:text-ink">Acciones Rápidas</h3>
                <p className="text-xs text-muted dark:text-muted">Digitaliza o registra información de salud</p>
              </div>
              <button
                type="button"
                onClick={() => setShowActionSheet(false)}
                aria-label="Cerrar acciones"
                className="p-1.5 text-muted hover:text-muted dark:hover:text-slate-200 rounded-full bg-surface-muted dark:bg-surface-muted cursor-pointer"
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
                <div className="w-11 h-11 rounded-xl bg-deep-brand text-white flex items-center justify-center shadow-xs shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                    Tomar Foto con la Cámara <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  </span>
                  <span className="text-xs text-teal-800/80 dark:text-teal-300/80 block mt-0.5">
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
                className="w-full p-4 bg-blue-50/70 hover:bg-blue-100/70 dark:bg-surface-muted/80 dark:hover:bg-slate-800 border border-blue-200 dark:border-line/80 rounded-2xl flex items-center gap-3.5 transition-all text-left cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-action text-on-action flex items-center justify-center shadow-xs shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-ink dark:text-ink block">
                    Cargar Archivo PDF o Galería
                  </span>
                  <span className="text-xs text-accent-ink/80 dark:text-body/80 block mt-0.5">
                    Selecciona informes médicos digitales en PDF o imágenes de tu dispositivo.
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-accent-ink dark:text-teal-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
          </div>
        </DialogFrame>
      )}

    </>
  );
};
