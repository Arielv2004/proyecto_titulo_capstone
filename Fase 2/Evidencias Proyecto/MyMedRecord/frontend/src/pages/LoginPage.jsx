import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useMetaTags } from '../hooks/useMetaTags';
import { 
  HeartHandshake, 
  Lock, 
  Mail, 
  ShieldCheck, 
  ArrowRight, 
  UserCheck, 
  Stethoscope, 
  Shield, 
  Eye, 
  EyeOff, 
  AlertCircle 
} from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  useMetaTags('Iniciar Sesión', 'Accede de forma segura a tu ficha médica digital unificada en MyMedRecord.');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      if (result.user.role === 'PACIENTE') navigate('/patient');
      else if (result.user.role === 'MEDICO') navigate('/doctor');
      else if (result.user.role === 'ADMIN') navigate('/admin');
    }
  };

  const handleQuickDemo = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    const result = await login(demoEmail, 'password123');
    if (result.success) {
      if (result.user.role === 'PACIENTE') navigate('/patient');
      else if (result.user.role === 'MEDICO') navigate('/doctor');
      else if (result.user.role === 'ADMIN') navigate('/admin');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-slate-800">
      {/* Franja superior institucional bicolor */}
      <div className="h-1.5 w-full chile-banner" />

      {/* Encabezado Superior Accesible */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-900 text-white shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <span className="text-base font-bold text-blue-950 tracking-tight flex items-center gap-1.5">
              MyMedRecord
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200/60">Chile</span>
            </span>
            <p className="text-[11px] text-stone-500 font-medium">Plataforma de Interoperabilidad Clínica</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Ley N° 21.668 & 20.584</span>
        </div>
      </header>

      {/* Contenedor Central */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Título y Bienvenida */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-blue-950 tracking-tight">Iniciar Sesión</h1>
            <p className="text-xs text-stone-500 mt-1">
              Accede de forma segura a tu historial clínico y exámenes unificados.
            </p>
          </div>

          {/* Mensaje de Error Visible con Icono */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulario Principal */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Correo Electrónico o RUT
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@mymedrecord.cl"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50/80 border border-stone-300 rounded-xl text-slate-800 placeholder-stone-400 focus:outline-none focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-stone-50/80 border border-stone-300 rounded-xl text-slate-800 placeholder-stone-400 focus:outline-none focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-stone-400 hover:text-blue-900 rounded-lg hover:bg-stone-100 transition-all cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-blue-900" />
                  ) : (
                    <Eye className="w-4 h-4 text-stone-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Ingresando...' : 'Ingresar a MyMedRecord'}</span>
              <ArrowRight className="w-4 h-4 text-teal-300" />
            </button>
          </form>

          {/* Accesos Rápidos Demo para Móvil y Evaluación */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 text-center mb-3">
              Acceso Rápido por Rol (Demostración)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('paciente@mymedrecord.cl')}
                className="flex flex-col items-center justify-center p-2.5 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 rounded-xl transition-all text-center cursor-pointer active:scale-95"
              >
                <UserCheck className="w-4 h-4 text-teal-700 mb-1" />
                <span className="text-[11px] font-bold text-teal-900">Paciente</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('medico@mymedrecord.cl')}
                className="flex flex-col items-center justify-center p-2.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-all text-center cursor-pointer active:scale-95"
              >
                <Stethoscope className="w-4 h-4 text-blue-800 mb-1" />
                <span className="text-[11px] font-bold text-blue-950">Médico</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin@mymedrecord.cl')}
                className="flex flex-col items-center justify-center p-2.5 bg-stone-100 hover:bg-stone-200/80 border border-stone-300 rounded-xl transition-all text-center cursor-pointer active:scale-95"
              >
                <Shield className="w-4 h-4 text-stone-700 mb-1" />
                <span className="text-[11px] font-bold text-stone-800">Admin</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-stone-600">
            ¿No tienes una cuenta registrada?{' '}
            <Link to="/register" className="text-blue-800 hover:underline font-bold">
              Crear cuenta nueva
            </Link>
          </div>
        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className="py-4 text-center text-[11px] text-stone-400 border-t border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-1">
          <Link to="/privacy" className="hover:text-blue-900 hover:underline">Política de Privacidad</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-blue-900 hover:underline">Términos y Condiciones</Link>
        </div>
        <div>MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable</div>
      </footer>
    </div>
  );
};
