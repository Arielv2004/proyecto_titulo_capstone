import { DialogFrame } from '../ui/DialogFrame';
import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { HeartHandshake, User, ShieldCheck, LogOut, ChevronDown, Lock, Mail, Fingerprint, KeyRound, ShieldAlert, CheckCircle2, HelpCircle, X, FileCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const Navbar = ({ roleTitle, onOpenProfile, onOpenHelp }) => {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'security' | 'help' | null
  const menuRef = useRef(null);

  // Cerrar al hacer clic afuera en escritorio
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = e => { if (e.key === 'Escape') { setIsOpen(false); menuRef.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEscape); };
  }, []);

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return (user?.email?.[0] || 'U').toUpperCase();
  };

  return (
    <>
      {/* Barra de Navegación Principal */}
      <a className="mm-skip" href="#main-content">Saltar al contenido</a>
      <header className="mm-header">
        <div className="mm-brand"><span className="mm-brand-icon"><HeartHandshake size={24} aria-hidden="true" /></span><div><strong>MyMedRecord</strong><p>{roleTitle || 'Tu espacio de salud'}</p></div></div>
        <div className="flex items-center gap-2"><ThemeToggle compact />
        {/* Botón de Perfil con Menú Desplegable */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border border-line dark:border-line hover:border-blue-300 dark:hover:border-slate-700 hover:bg-canvas dark:hover:bg-slate-800 transition-all cursor-pointer bg-surface dark:bg-surface"
            aria-expanded={isOpen}
            aria-label="Menú de mi cuenta"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-teal-300 flex items-center justify-center font-bold text-xs shadow-xs">
              {getInitials()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-body dark:text-ink block max-w-[140px] truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.name || 'Mi cuenta')}
              </span>
              <span className="text-xs text-muted dark:text-muted font-mono block leading-none">
                {user?.rut || 'No registrado'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted dark:text-muted transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-900 dark:text-teal-400' : ''}`} />
          </button>

          {/* Menú Desplegable (Dropdown en Web / Hoja Flotante en Móvil) */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-3.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Tarjeta de Usuario en el Desplegable */}
              <div className="p-3.5 bg-gradient-to-b from-stone-50 to-stone-100/70 dark:from-slate-800/95 dark:to-slate-850/95 rounded-2xl border border-line/90 dark:border-line/80 mb-3 shadow-2xs space-y-2.5">
                {/* Cabecera: Avatar, Nombre Completo y Estado de Rol */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-900 text-teal-300 flex items-center justify-center font-black text-sm shadow-xs shrink-0 ring-2 ring-white dark:ring-slate-700">
                    {getInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-ink dark:text-white truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.name || 'Mi cuenta')}
                    </h4>
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>{roleTitle || 'Portal Paciente'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detalles Estructurados con Espaciado Natural (sin huecos vacíos) */}
                <div className="pt-2 border-t border-line/80 dark:border-line/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted dark:text-muted font-bold uppercase tracking-wider text-xs">RUT:</span>
                    <span className="font-mono font-bold text-ink dark:text-teal-300 bg-surface dark:bg-surface/90 px-2 py-0.5 rounded-md border border-line dark:border-line shadow-2xs">
                      {user?.rut || 'No registrado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted dark:text-body bg-surface/80 dark:bg-surface/90 px-2.5 py-1.5 rounded-xl border border-line/70 dark:border-line/80 shadow-2xs">
                    <Mail className="w-3.5 h-3.5 text-muted dark:text-muted shrink-0" />
                    <span className="truncate font-sans font-medium text-body dark:text-body">
                      {user?.email || 'Correo no registrado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Opciones del Menú */}
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenProfile) {
                      onOpenProfile();
                    } else {
                      setActiveModal('profile');
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-body dark:text-body hover:text-ink dark:hover:text-white hover:bg-surface-muted/80 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <User className="w-4 h-4 text-blue-800 dark:text-teal-400" />
                  <span>Mi Perfil</span>
                </button>

                <button
                  onClick={() => { setActiveModal('security'); setIsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-body dark:text-body hover:text-ink dark:hover:text-white hover:bg-surface-muted/80 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>Seguridad & Cifrado</span>
                    <span className="text-xs font-bold px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 border border-transparent dark:border-teal-800 rounded">AES-256</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveModal('help'); setIsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-body dark:text-body hover:text-ink dark:hover:text-white hover:bg-surface-muted/80 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <FileCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Marco Legal (Ley 21.668 & 20.584)</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenHelp) {
                      onOpenHelp();
                    } else {
                      setActiveModal('help');
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-body dark:text-body hover:text-ink dark:hover:text-white hover:bg-surface-muted/80 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <HelpCircle className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                  <span>Centro de Ayuda & FAQ</span>
                </button>
              </div>

              {/* Selector de Tema Visual en el Desplegable */}
              <div className="pt-2 mt-2 border-t border-line dark:border-line">
                <div className="mb-2">
                  <ThemeToggle />
                </div>

                {/* Botón Cerrar Sesión */}
                <button
                  onClick={() => { logout(); setIsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all font-bold cursor-pointer text-left text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión Segura</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MODAL 1: DATOS PERSONALES Y FICHA CLÍNICA */}
      {/* ========================================================================= */}
      {activeModal === 'profile' && (
        <DialogFrame label="Mi cuenta" onClose={() => setActiveModal(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-surface dark:bg-surface border border-line dark:border-line rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-line dark:border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-teal-300 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink dark:text-ink">Mi Perfil</h3>
                  <p className="text-xs text-muted dark:text-muted">Información personal y antecedentes del paciente</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-muted hover:text-muted dark:hover:text-slate-200 rounded-xl hover:bg-surface-muted dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="p-4 bg-canvas dark:bg-surface-muted/70 rounded-2xl border border-line/80 dark:border-line/70 flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-950 to-teal-800 text-teal-300 flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                  {getInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-black text-ink dark:text-ink block truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
                  </span>
                  <span className="text-xs font-mono text-muted dark:text-muted block mt-0.5">
                    RUT: <strong className="text-blue-900 dark:text-teal-300">{user?.rut || 'Sin registrar'}</strong>
                  </span>
                  <span className="text-xs font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-full border border-teal-200/70 dark:border-teal-800 inline-block mt-1">
                    Titular Oficial
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-surface dark:bg-slate-850 rounded-xl border border-line/80 dark:border-line">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted block mb-0.5">Correo Registrado</span>
                  <span className="text-xs font-bold text-ink dark:text-body truncate block">{user?.email}</span>
                </div>
                <div className="p-3 bg-surface dark:bg-slate-850 rounded-xl border border-line/80 dark:border-line">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted block mb-0.5">Perfil de Acceso</span>
                  <span className="text-xs font-bold text-blue-900 dark:text-teal-300 block">{user?.role || 'PACIENTE'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs text-ink dark:text-blue-200 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="leading-relaxed">Identidad protegida conforme a la Ley N° 21.668 de Interoperabilidad Clínica y Ley N° 20.584 de Derechos en Salud.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-line dark:border-line flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </DialogFrame>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SEGURIDAD, CIFRADO Y PRIVACIDAD */}
      {/* ========================================================================= */}
      {activeModal === 'security' && (
        <DialogFrame label="Seguridad" onClose={() => setActiveModal(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-surface dark:bg-surface border border-line dark:border-line rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line dark:border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/60 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink dark:text-ink">Seguridad & Cifrado de Datos</h3>
                  <p className="text-xs text-muted dark:text-muted">Arquitectura de Ciberseguridad de MyMedRecord</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-muted hover:text-muted dark:hover:text-slate-200 rounded-xl hover:bg-surface-muted dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="p-3.5 bg-blue-50/70 dark:bg-surface-muted/80 border border-blue-200/80 dark:border-line/80 rounded-2xl">
                <div className="flex items-center gap-2 text-ink dark:text-blue-300 font-bold mb-1">
                  <Lock className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                  <span>1. Cifrado en Reposo (AES-256-GCM)</span>
                </div>
                <p className="text-muted dark:text-body text-xs leading-relaxed">
                  Tus diagnósticos médicos, notas y datos de exámenes se almacenan encriptados en PostgreSQL mediante el estándar militar <strong>AES-256-GCM</strong>. Ni administradores sin clave pueden leer tus registros clínicos en crudo.
                </p>
              </div>

              <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 rounded-2xl">
                <div className="flex items-center gap-2 text-teal-950 dark:text-teal-300 font-bold mb-1">
                  <KeyRound className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                  <span>2. Autenticación con Cookies HttpOnly & Bcrypt</span>
                </div>
                <p className="text-muted dark:text-body text-xs leading-relaxed">
                  Tu sesión viaja en Cookies <strong>HttpOnly</strong> y <strong>SameSite=Strict</strong>, haciéndola inmune a robos por código malicioso (XSS/CSRF). Las contraseñas están protegidas con hash salino Bcrypt.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 rounded-2xl">
                <div className="flex items-center gap-2 text-purple-950 dark:text-purple-300 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-purple-900 dark:text-purple-400" />
                  <span>3. Trazabilidad Continua (Audit Logs)</span>
                </div>
                <p className="text-muted dark:text-body text-xs leading-relaxed">
                  Cada vez que un médico o usuario visualiza tu ficha médica, el sistema registra una huella digital inmutable: <strong>Identidad del médico, Fecha, Hora, Dirección IP y Acción realizada</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-canvas dark:bg-surface-muted/80 border border-line dark:border-line/80 rounded-2xl">
                <div className="flex items-center gap-2 text-stone-800 dark:text-body font-bold mb-1">
                  <Fingerprint className="w-4 h-4 text-body dark:text-muted" />
                  <span>4. Cero Datos Médicos en Almacenamiento Local</span>
                </div>
                <p className="text-muted dark:text-body text-xs leading-relaxed">
                  Por diseño de seguridad, tu teléfono y navegador no guardan copias de tu historial en memoria persistente (<code className="bg-surface-muted dark:bg-surface px-1 py-0.5 rounded text-stone-800 dark:text-body">localStorage</code>), garantizando privacidad si compartes tu dispositivo.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-line dark:border-line flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </DialogFrame>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MARCO LEGAL CHILENO */}
      {/* ========================================================================= */}
      {activeModal === 'help' && (
        <DialogFrame label="Ayuda" onClose={() => setActiveModal(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-surface dark:bg-surface border border-line dark:border-line rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line dark:border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/60 rounded-xl">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink dark:text-ink">Marco Legal y Normativa de Salud</h3>
                  <p className="text-xs text-muted dark:text-muted">República de Chile · Leyes N° 21.668 y N° 20.584</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-muted hover:text-muted dark:hover:text-slate-200 rounded-xl hover:bg-surface-muted dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="p-3.5 bg-canvas dark:bg-surface-muted/80 border border-line dark:border-line/80 rounded-2xl">
                <span className="font-bold text-ink dark:text-teal-300 block mb-1">Ley N° 21.668 (Interoperabilidad de Fichas Clínicas)</span>
                <p className="text-muted dark:text-body text-xs leading-relaxed">
                  Establece la obligación legal de que los prestadores de salud (públicos y privados) permitan el acceso y la transferencia estandarizada de la información clínica del paciente para asegurar la continuidad asistencial.
                </p>
              </div>

              <div className="p-3.5 bg-canvas dark:bg-surface-muted/80 border border-line dark:border-line/80 rounded-2xl">
                <span className="font-bold text-ink dark:text-teal-300 block mb-1">Ley N° 20.584 (Derechos y Deberes del Paciente)</span>
                <p className="text-muted dark:text-body text-xs leading-relaxed">
                  Garantiza que el titular de la ficha clínica es el paciente. Nadie puede acceder a tus registros sin tu consentimiento explícito (gestionado en MyMedRecord mediante autorización por RUT o QR temporal).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-line dark:border-line flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </DialogFrame>
      )}
    </>
  );
};
