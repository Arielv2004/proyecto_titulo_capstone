import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export const ThemeToggle = ({ compact = false, className = '' }) => {
  const { isDark, toggleTheme } = useThemeStore();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        className={`relative p-2 rounded-xl border border-line dark:border-line bg-surface dark:bg-surface-muted text-muted dark:text-amber-300 hover:text-accent-ink dark:hover:text-amber-200 hover:border-accent-ink dark:hover:border-amber-400/50 shadow-xs transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${className}`}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700 transition-transform duration-300 rotate-0 hover:-rotate-12" />
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-line dark:border-line bg-canvas dark:bg-surface-muted/80 hover:bg-surface-muted dark:hover:bg-slate-700/80 transition-all text-xs font-semibold cursor-pointer ${className}`}
      aria-label="Alternar tema visual"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-surface dark:bg-surface flex items-center justify-center border border-line/80 dark:border-line shadow-xs">
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-accent-ink" />
          )}
        </div>
        <span className="text-body dark:text-body">
          {isDark ? 'Modo Oscuro Activo' : 'Modo Claro Activo'}
        </span>
      </div>

      {/* Switch pill animado */}
      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${isDark ? 'bg-amber-500' : 'bg-stone-300'}`}>
        <div className={`w-4 h-4 rounded-full bg-surface shadow-xs transition-transform duration-200 ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </button>
  );
};
