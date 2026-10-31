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
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  UserPlus,
  QrCode,
} from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  useMetaTags(
    'Iniciar Sesión',
    'Accede de forma segura a tu ficha médica digital unificada en MyMedRecord.'
  );

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    const result = await login(email, password);

    if (result.success) {
      const role = result.user?.role;

      if (role === 'MEDICO') {
        navigate('/doctor');
        return;
      }

      if (role === 'PACIENTE') {
        navigate('/patient');
        return;
      }

      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas dark:bg-canvas text-body dark:text-ink transition-colors">

      {/* Encabezado Superior */}
      <header className="border-b border-line/80 dark:border-line bg-surface/90 dark:bg-surface/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-action text-on-action shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>

          <div>
            <span className="text-base font-extrabold text-ink dark:text-ink tracking-tight">MyMedRecord</span>

            <p className="text-xs text-muted dark:text-muted font-medium">
              Plataforma de Salud Digital Interoperable (Ley N° 21.668)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted dark:text-body bg-surface-muted dark:bg-surface-muted px-3 py-1 rounded-full border border-line dark:border-line">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />

            <span>Ley N° 21.668 & N° 20.584</span>
          </div>

          <ThemeToggle compact />
        </div>
      </header>

      {/* Contenedor Central */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Selector de Pestañas */}
          <div className="flex p-1 mb-6 bg-surface-muted dark:bg-surface-muted/80 rounded-2xl border border-line dark:border-line/80">
            <div className="flex-1 py-2 text-center text-xs font-bold bg-action text-on-action rounded-xl shadow-xs flex items-center justify-center gap-1.5">
              <LogIn className="w-3.5 h-3.5 text-teal-300" />

              <span>Iniciar Sesión</span>
            </div>

            <Link
              to="/register"
              className="flex-1 py-2 text-center text-xs font-bold text-muted dark:text-muted hover:text-ink dark:hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />

              <span>Registrar Cuenta</span>
            </Link>
          </div>

          {/* Título y Bienvenida */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-ink dark:text-ink tracking-tight">
              Bienvenido
            </h1>

            <p className="text-xs text-muted dark:text-muted mt-1">
              Ingresa con tu <strong>RUT</strong> o{' '}
              <strong>Correo Electrónico</strong>.
            </p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />

              <span>{error}</span>
            </div>
          )}

          {/* Formulario Principal */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-body dark:text-body mb-1.5">
                Correo Electrónico o RUT Chileno
              </label>

              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted dark:text-muted" />

                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej: 12.345.678-9 o correo@salud.cl"
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas/80 dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:bg-surface dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-body dark:text-body mb-1.5">
                Contraseña
              </label>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted dark:text-muted" />

                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-canvas/80 dark:bg-surface-muted/80 border border-line dark:border-line rounded-xl text-body dark:text-ink placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-teal-400 focus:bg-surface dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-teal-950/40 transition-all text-sm font-sans"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-muted hover:text-accent-ink dark:hover:text-teal-300 rounded-lg transition-all cursor-pointer"
                  title={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Ver contraseña'
                  }
                  aria-label={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Ver contraseña'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-accent-ink dark:text-teal-300" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted" />
                  )}
                </button>
              </div>
            </div>
            {/* Recuperación de contraseña */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-accent-ink dark:text-teal-300 hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-action hover:bg-action-hover active:scale-[0.99] text-on-action font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm cursor-pointer disabled:bg-surface-muted disabled:text-muted disabled:cursor-not-allowed"
            >
              <span>
                {isLoading
                  ? 'Ingresando...'
                  : 'Ingresar a MyMedRecord'}
              </span>

              <ArrowRight className="w-4 h-4 text-teal-300" />
            </button>
          </form>

          {/* Acceso Médico mediante QR */}
          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-line">
            <Link
              to="/doctor/qr-access"
              className="w-full py-3 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100/80 dark:hover:bg-teal-900/50 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-200 font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-teal-700 dark:text-teal-400" />

              <span>
                ¿Eres Médico? Escanear QR de Paciente
              </span>
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-muted dark:text-muted">
            ¿No tienes una cuenta registrada?{' '}

            <Link
              to="/register"
              className="text-accent-ink dark:text-teal-300 hover:underline font-bold"
            >
              Crear cuenta nueva
            </Link>
          </div>
        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className="py-4 text-center text-xs text-muted dark:text-muted border-t border-line dark:border-line bg-surface dark:bg-surface transition-colors">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-1">
          <Link
            to="/privacy"
            className="hover:text-accent-ink dark:hover:text-teal-300 hover:underline"
          >
            Política de Privacidad
          </Link>

          <span>·</span>

          <Link
            to="/terms"
            className="hover:text-accent-ink dark:hover:text-teal-300 hover:underline"
          >
            Términos y Condiciones
          </Link>
        </div>

        <div>
          MyMedRecord · República de Chile · Plataforma de Salud Digital
          Interoperable
        </div>

      </footer>
    </div>
  );
};
