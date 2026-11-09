import React, { useState } from 'react';
import { AlertTriangle, Lock, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { DialogFrame } from '../ui/DialogFrame';

export function DeleteAccountDialog({ isOpen, onClose, onConfirm, deleting, error }) {
  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = confirmationText.trim() === 'ELIMINAR' && password.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed || deleting) return;
    onConfirm({ confirmation: confirmationText.trim(), password });
  };

  return (
    <DialogFrame
      label="Eliminar cuenta y datos clínicos"
      onClose={deleting ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl border border-rose-200 dark:border-rose-900/80 bg-surface p-6 sm:p-7 shadow-2xl space-y-5 text-body"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-ink dark:text-ink">
                Eliminar cuenta de forma definitiva
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mt-0.5">
                Derecho al Olvido · Ley N° 21.719
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl p-2 text-muted hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning text */}
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 p-4 text-xs leading-relaxed text-rose-900 dark:text-rose-200 space-y-2">
          <p className="font-bold">
            Esta acción es irreversible y no podrá deshacerse bajo ninguna circunstancia.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Se eliminará tu cuenta y el acceso a la plataforma.</li>
            <li>Se borrarán todos tus antecedentes personales y perfil de salud.</li>
            <li>Se destruirán tus recetas médicas, órdenes y exámenes digitalizados.</li>
            <li>Se eliminarán los archivos originales almacenados en la nube.</li>
            <li>Se revocarán todos los accesos compartidos vigentes (médicos y códigos QR).</li>
          </ul>
          <p className="text-[11px] text-rose-700 dark:text-rose-300 pt-1">
            💡 Te recomendamos descargar una copia completa con el botón <strong>«Exportar mis datos»</strong> antes de continuar.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-body dark:text-body mb-1.5">
              Para confirmar, escribe la palabra <span className="font-black text-rose-600 dark:text-rose-400 font-mono">ELIMINAR</span>:
            </label>
            <input
              type="text"
              required
              disabled={deleting}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="ELIMINAR"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl border border-line dark:border-line bg-canvas/80 dark:bg-surface-muted/80 text-sm font-mono text-ink dark:text-ink focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/40 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-body dark:text-body mb-1.5">
              Ingresa tu contraseña para autorizar la supresión:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={deleting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña actual"
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-line dark:border-line bg-canvas/80 dark:bg-surface-muted/80 text-sm text-ink dark:text-ink focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/40 transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-2.5 p-1 text-muted hover:text-accent-ink rounded-lg transition-colors"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-line dark:border-line bg-surface hover:bg-surface-muted text-xs font-bold text-body transition-colors disabled:opacity-50"
          >
            Cancelar y conservar mis datos
          </button>
          <button
            type="submit"
            disabled={!isConfirmed || deleting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all disabled:bg-surface-muted disabled:text-muted disabled:cursor-not-allowed shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Eliminando cuenta...' : 'Eliminar mi cuenta definitivamente'}</span>
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

