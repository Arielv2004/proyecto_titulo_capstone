import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  HeartHandshake, 
  User, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  Lock, 
  Mail, 
  Fingerprint, 
  KeyRound, 
  ShieldAlert, 
  Eye, 
  CheckCircle2, 
  HelpCircle,
  X,
  FileCheck
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const Navbar = ({ roleTitle, roleBadgeColor = 'teal', onOpenProfile, onOpenHelp }) => {
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return (user?.email?.[0] || 'U').toUpperCase();
  };

  const getRoleDisplay = () => {
    return { label: 'Paciente Titular', color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
  };

  const roleInfo = getRoleDisplay();

  return (
    <>
      {/* Barra de Navegación Principal */}
      <header className="border-b border-stone-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-900 text-white shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-blue-950 dark:text-white tracking-tight">MyMedRecord</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium hidden sm:block">
              Interoperabilidad Clínica & Seguridad (Ley N° 21.668)
            </p>
          </div>
        </div>

        {/* Botón de Perfil con Menú Desplegable */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border border-stone-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 transition-all cursor-pointer bg-white dark:bg-slate-900"
            aria-expanded={isOpen}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-teal-300 flex items-center justify-center font-bold text-xs shadow-xs">
              {getInitials()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block max-w-[140px] truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.name || 'Ignacio Pérez González')}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-slate-400 font-mono block leading-none">
                {user?.rut || '12.345.678-9'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-stone-400 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-900 dark:text-teal-400' : ''}`} />
          </button>

          {/* Menú Desplegable (Dropdown en Web / Hoja Flotante en Móvil) */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-3xl p-3.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Tarjeta de Usuario en el Desplegable */}
              <div className="p-3.5 bg-gradient-to-b from-stone-50 to-stone-100/70 dark:from-slate-800/95 dark:to-slate-850/95 rounded-2xl border border-stone-200/90 dark:border-slate-700/80 mb-3 shadow-2xs space-y-2.5">
                {/* Cabecera: Avatar, Nombre Completo y Estado de Rol */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-900 text-teal-300 flex items-center justify-center font-black text-sm shadow-xs shrink-0 ring-2 ring-white dark:ring-slate-700">
                    {getInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-blue-950 dark:text-white truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.name || 'Ignacio Pérez González')}
                    </h4>
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>{roleTitle || 'Portal Paciente'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detalles Estructurados con Espaciado Natural (sin huecos vacíos) */}
                <div className="pt-2 border-t border-stone-200/80 dark:border-slate-700/80 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">RUT:</span>
                    <span className="font-mono font-bold text-blue-950 dark:text-teal-300 bg-white dark:bg-slate-900/90 px-2 py-0.5 rounded-md border border-stone-200 dark:border-slate-700 shadow-2xs">
                      {user?.rut || '12.345.678-9'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-stone-200/70 dark:border-slate-700/80 shadow-2xs">
                    <Mail className="w-3.5 h-3.5 text-stone-400 dark:text-slate-400 shrink-0" />
                    <span className="truncate font-sans font-medium text-stone-700 dark:text-slate-200">
                      {user?.email || 'contacto@paciente.cl'}
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
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-stone-700 dark:text-slate-200 hover:text-blue-950 dark:hover:text-white hover:bg-stone-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <User className="w-4 h-4 text-blue-800 dark:text-teal-400" />
                  <span>Mi Perfil</span>
                </button>

                <button
                  onClick={() => { setActiveModal('security'); setIsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-stone-700 dark:text-slate-200 hover:text-blue-950 dark:hover:text-white hover:bg-stone-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>Seguridad & Cifrado</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 border border-transparent dark:border-teal-800 rounded">AES-256</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveModal('help'); setIsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-stone-700 dark:text-slate-200 hover:text-blue-950 dark:hover:text-white hover:bg-stone-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-stone-700 dark:text-slate-200 hover:text-blue-950 dark:hover:text-white hover:bg-stone-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <HelpCircle className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                  <span>Centro de Ayuda & FAQ</span>
                </button>
              </div>

              {/* Selector de Tema Visual en el Desplegable */}
              <div className="pt-2 mt-2 border-t border-stone-200 dark:border-slate-800">
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
      </header>

      {/* ========================================================================= */}
      {/* MODAL 1: DATOS PERSONALES Y FICHA CLÍNICA */}
      {/* ========================================================================= */}
      {activeModal === 'profile' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-teal-300 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950 dark:text-slate-100">Mi Perfil</h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">Información personal y antecedentes del paciente</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="p-4 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-200/80 dark:border-slate-700/70 flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-950 to-teal-800 text-teal-300 flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                  {getInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-black text-blue-950 dark:text-slate-100 block truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
                  </span>
                  <span className="text-xs font-mono text-stone-500 dark:text-slate-400 block mt-0.5">
                    RUT: <strong className="text-blue-900 dark:text-teal-300">{user?.rut || 'Sin registrar'}</strong>
                  </span>
                  <span className="text-[10px] font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-full border border-teal-200/70 dark:border-teal-800 inline-block mt-1">
                    Titular Oficial
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-stone-200/80 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500 block mb-0.5">Correo Registrado</span>
                  <span className="text-xs font-bold text-blue-950 dark:text-slate-200 truncate block">{user?.email}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-stone-200/80 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500 block mb-0.5">Perfil de Acceso</span>
                  <span className="text-xs font-bold text-blue-900 dark:text-teal-300 block">{user?.role || 'PACIENTE'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-950 dark:text-blue-200 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="leading-relaxed">Identidad protegida conforme a la Ley N° 21.668 de Interoperabilidad Clínica y Ley N° 20.584 de Derechos en Salud.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SEGURIDAD, CIFRADO Y PRIVACIDAD */}
      {/* ========================================================================= */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/60 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950 dark:text-slate-100">Seguridad & Cifrado de Datos</h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">Arquitectura de Ciberseguridad de MyMedRecord</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="p-3.5 bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200/80 dark:border-slate-700/80 rounded-2xl">
                <div className="flex items-center gap-2 text-blue-950 dark:text-blue-300 font-bold mb-1">
                  <Lock className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                  <span>1. Cifrado en Reposo (AES-256-GCM)</span>
                </div>
                <p className="text-stone-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Tus diagnósticos médicos, notas y datos de exámenes se almacenan encriptados en PostgreSQL mediante el estándar militar <strong>AES-256-GCM</strong>. Ni administradores sin clave pueden leer tus registros clínicos en crudo.
                </p>
              </div>

              <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 rounded-2xl">
                <div className="flex items-center gap-2 text-teal-950 dark:text-teal-300 font-bold mb-1">
                  <KeyRound className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                  <span>2. Autenticación con Cookies HttpOnly & Bcrypt</span>
                </div>
                <p className="text-stone-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Tu sesión viaja en Cookies <strong>HttpOnly</strong> y <strong>SameSite=Strict</strong>, haciéndola inmune a robos por código malicioso (XSS/CSRF). Las contraseñas están protegidas con hash salino Bcrypt.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 rounded-2xl">
                <div className="flex items-center gap-2 text-purple-950 dark:text-purple-300 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-purple-900 dark:text-purple-400" />
                  <span>3. Trazabilidad Continua (Audit Logs)</span>
                </div>
                <p className="text-stone-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Cada vez que un médico o usuario visualiza tu ficha médica, el sistema registra una huella digital inmutable: <strong>Identidad del médico, Fecha, Hora, Dirección IP y Acción realizada</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700/80 rounded-2xl">
                <div className="flex items-center gap-2 text-stone-800 dark:text-slate-200 font-bold mb-1">
                  <Fingerprint className="w-4 h-4 text-stone-700 dark:text-slate-400" />
                  <span>4. Cero Datos Médicos en Almacenamiento Local</span>
                </div>
                <p className="text-stone-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Por diseño de seguridad, tu teléfono y navegador no guardan copias de tu historial en memoria persistente (<code className="bg-stone-200 dark:bg-slate-900 px-1 py-0.5 rounded text-stone-800 dark:text-slate-200">localStorage</code>), garantizando privacidad si compartes tu dispositivo.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MARCO LEGAL CHILENO */}
      {/* ========================================================================= */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/60 rounded-xl">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950 dark:text-slate-100">Marco Legal y Normativa de Salud</h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">República de Chile · Leyes N° 21.668 y N° 20.584</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="p-3.5 bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700/80 rounded-2xl">
                <span className="font-bold text-blue-950 dark:text-teal-300 block mb-1">Ley N° 21.668 (Interoperabilidad de Fichas Clínicas)</span>
                <p className="text-stone-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Establece la obligación legal de que los prestadores de salud (públicos y privados) permitan el acceso y la transferencia estandarizada de la información clínica del paciente para asegurar la continuidad asistencial.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700/80 rounded-2xl">
                <span className="font-bold text-blue-950 dark:text-teal-300 block mb-1">Ley N° 20.584 (Derechos y Deberes del Paciente)</span>
                <p className="text-stone-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Garantiza que el titular de la ficha clínica es el paciente. Nadie puede acceder a tus registros sin tu consentimiento explícito (gestionado en MyMedRecord mediante autorización por RUT o QR temporal).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
