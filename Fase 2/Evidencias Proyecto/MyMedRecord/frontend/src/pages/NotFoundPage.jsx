import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useMetaTags } from '../hooks/useMetaTags';
import { HeartHandshake, ArrowLeft, Home, FileQuestion, ShieldAlert } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useMetaTags('Página no encontrada (404)', 'La ruta solicitada no existe en el sistema de salud digital MyMedRecord.');

  const getHomeRoute = () => {
    if (!user) return '/login';
    if (user.role === 'PACIENTE') return '/patient';
    return '/doctor';
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-body">

      {/* Header simple */}
      <header className="border-b border-line/80 bg-surface px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-action text-on-action shadow-xs">
            <HeartHandshake className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <span className="text-base font-bold text-ink tracking-tight">MyMedRecord</span>
            <p className="text-xs text-muted font-medium">Red de Salud Digital de Chile</p>
          </div>
        </div>
      </header>

      {/* Contenido 404 */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-surface border border-line/90 rounded-3xl p-8 shadow-sm text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200/80 text-rose-700 flex items-center justify-center mx-auto shadow-xs">
            <FileQuestion className="w-10 h-10 stroke-[1.5]" />
          </div>

          <div>
            <span className="text-xs font-black text-rose-700 uppercase tracking-widest bg-rose-100/70 px-3 py-1 rounded-full">
              Código de Error 404
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-3">
              Ficha o Registro no Encontrado
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              La dirección web a la que intentas acceder no existe, fue reubicada o requiere permisos de acceso según la Ley N° 20.584.
            </p>
          </div>

          <div className="p-4 bg-canvas rounded-2xl border border-line text-left text-xs space-y-1.5 text-muted">
            <div className="flex items-center gap-2 font-bold text-ink">
              <ShieldAlert className="w-4 h-4 text-accent-ink" />
              <span>¿Qué puedes hacer?</span>
            </div>
            <p className="text-xs text-muted pl-6">
              Verifica el enlace o regresa a tu panel principal para continuar gestionando tus recetas y consultas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 px-4 bg-surface-muted hover:bg-surface-muted active:scale-[0.99] text-body font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Página Anterior</span>
            </button>

            <Link
              to={getHomeRoute()}
              className="flex-1 py-3 px-4 bg-action hover:bg-action-hover active:scale-[0.99] text-on-action font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <Home className="w-4 h-4 text-teal-300" />
              <span>Ir al Panel Principal</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted border-t border-line bg-surface">
        MyMedRecord · República de Chile · Plataforma de Salud Digital Interoperable
      </footer>
    </div>
  );
};
