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

export const Navbar = ({ roleTitle, roleBadgeColor = 'teal' }) => {
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
    if (user?.role === 'PACIENTE') return { label: 'Paciente Titular', color: 'bg-teal-50 text-teal-800 border-teal-200' };
    if (user?.role === 'MEDICO') return { label: 'Médico Acreditado', color: 'bg-blue-50 text-blue-900 border-blue-200' };
    return { label: 'Administrador', color: 'bg-purple-50 text-purple-900 border-purple-200' };
  };

  const roleInfo = getRoleDisplay();

  return (
    <>
      {/* Franja Institucional Bicolor */}
      <div className="h-1.5 w-full chile-banner" />

      {/* Barra de Navegación Principal */}
      <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-900 text-white shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-blue-950 tracking-tight">MyMedRecord</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                {roleTitle || roleInfo.label}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
              Interoperabilidad Clínica & Seguridad (Ley N° 21.668)
            </p>
          </div>
        </div>

        {/* Botón de Perfil con Menú Desplegable */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border border-stone-200 hover:border-blue-300 hover:bg-stone-50 transition-all cursor-pointer bg-white"
            aria-expanded={isOpen}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-teal-300 flex items-center justify-center font-bold text-xs shadow-xs">
              {getInitials()}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block max-w-[140px] truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
              </span>
              <span className="text-[10px] text-stone-400 font-mono block leading-none">
                {user?.rut || 'RUT no registrado'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-900' : ''}`} />
          </button>

          {/* Menú Desplegable (Dropdown en Web / Hoja Flotante en Móvil) */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-stone-200/90 rounded-3xl p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Tarjeta de Usuario en el Desplegable */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-900 text-teal-300 flex items-center justify-center font-extrabold text-sm shadow-xs">
                    {getInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-blue-950 truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name}` : 'Usuario MyMedRecord'}
                    </h4>
                    <p className="text-[11px] text-stone-500 truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                        {user?.rut || 'Sin RUT'}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Activo
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opciones del Menú */}
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => { setActiveModal('profile'); setIsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-stone-700 hover:text-blue-950 hover:bg-stone-100/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <User className="w-4 h-4 text-blue-800" />
                  <span>Mi Ficha y Datos Personales</span>
                </button>

                <button
                  onClick={() => { setActiveModal('security'); setIsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-stone-700 hover:text-blue-950 hover:bg-stone-100/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>Seguridad & Cifrado</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-teal-100 text-teal-900 rounded">AES-256</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveModal('help'); setIsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-stone-700 hover:text-blue-950 hover:bg-stone-100/80 rounded-xl transition-all font-semibold cursor-pointer text-left"
                >
                  <FileCheck className="w-4 h-4 text-amber-700" />
                  <span>Marco Legal (Ley 21.668 & 20.584)</span>
                </button>
              </div>

              {/* Botón Cerrar Sesión */}
              <div className="pt-2 mt-2 border-t border-stone-200">
                <button
                  onClick={() => { logout(); setIsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-rose-700 hover:bg-rose-50 rounded-xl transition-all font-bold cursor-pointer text-left text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Datos Personales y de Ficha</h3>
                  <p className="text-xs text-stone-500">Identificación oficial en el sistema de salud</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Nombre Completo</span>
                  <span className="text-sm font-bold text-blue-950">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : 'No especificado'}
                  </span>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">RUT Oficial</span>
                  <span className="text-sm font-bold text-blue-950 font-mono">
                    {user?.rut || 'Sin registrar'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Correo Electrónico de Notificaciones</span>
                <span className="text-sm font-bold text-blue-950">{user?.email}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Rol en MyMedRecord</span>
                  <span className="text-xs font-bold text-teal-800">{user?.role}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Previsión de Salud</span>
                  <span className="text-xs font-bold text-blue-950">FONASA (Tramo B)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SEGURIDAD, CIFRADO Y PRIVACIDAD */}
      {/* ========================================================================= */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Seguridad & Cifrado de Datos</h3>
                  <p className="text-xs text-stone-500">Arquitectura de Ciberseguridad de MyMedRecord</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                <div className="flex items-center gap-2 text-blue-950 font-bold mb-1">
                  <Lock className="w-4 h-4 text-blue-900" />
                  <span>1. Cifrado en Reposo (AES-256-GCM)</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Tus diagnósticos médicos, notas y datos de exámenes se almacenan encriptados en PostgreSQL mediante el estándar militar <strong>AES-256-GCM</strong>. Ni administradores sin clave pueden leer tus registros clínicos en crudo.
                </p>
              </div>

              <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl">
                <div className="flex items-center gap-2 text-teal-950 font-bold mb-1">
                  <KeyRound className="w-4 h-4 text-teal-800" />
                  <span>2. Autenticación con Cookies HttpOnly & Bcrypt</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Tu sesión viaja en Cookies <strong>HttpOnly</strong> y <strong>SameSite=Strict</strong>, haciéndola inmune a robos por código malicioso (XSS/CSRF). Las contraseñas están protegidas con hash salino Bcrypt.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl">
                <div className="flex items-center gap-2 text-purple-950 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-purple-900" />
                  <span>3. Trazabilidad Continua (Audit Logs)</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Cada vez que un médico o usuario visualiza tu ficha médica, el sistema registra una huella digital inmutable: <strong>Identidad del médico, Fecha, Hora, Dirección IP y Acción realizada</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <div className="flex items-center gap-2 text-stone-800 font-bold mb-1">
                  <Fingerprint className="w-4 h-4 text-stone-700" />
                  <span>4. Cero Datos Médicos en Almacenamiento Local</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Por diseño de seguridad, tu teléfono y navegador no guardan copias de tu historial en memoria persistente (<code className="bg-stone-200 px-1 py-0.5 rounded">localStorage</code>), garantizando privacidad si compartes tu dispositivo.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-900 rounded-xl">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Marco Legal y Normativa de Salud</h3>
                  <p className="text-xs text-stone-500">República de Chile · Leyes N° 21.668 y N° 20.584</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <span className="font-bold text-blue-950 block mb-1">📜 Ley N° 21.668 (Interoperabilidad de Fichas Clínicas)</span>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Establece la obligación legal de que los prestadores de salud (públicos y privados) permitan el acceso y la transferencia estandarizada de la información clínica del paciente para asegurar la continuidad asistencial.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <span className="font-bold text-blue-950 block mb-1">🛡️ Ley N° 20.584 (Derechos y Deberes del Paciente)</span>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Garantiza que el titular de la ficha clínica es el paciente. Nadie puede acceder a tus registros sin tu consentimiento explícito (gestionado en MyMedRecord mediante autorización por RUT o QR temporal).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
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
