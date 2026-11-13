import { Link } from 'react-router-dom';
import { HeartHandshake, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

export function AuthLayout({ children }) {
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
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-surface dark:bg-surface border border-line/90 dark:border-line rounded-3xl p-6 sm:p-8 shadow-sm">
          {children}
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
}
