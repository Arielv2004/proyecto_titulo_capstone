import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy } from 'lucide-react';

export function GrantTokenButton({ token }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(null);
  const resetTimer = useRef(null);
  const buttonRef = useRef(null);
  const tooltipId = useId();
  const reference = token?.slice(-4) || '—';

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);
  useEffect(() => {
    if (!previewPosition) return undefined;
    const hide = () => setPreviewPosition(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [previewPosition]);

  const showPreview = () => {
    if (!token || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(350, window.innerWidth - 24);
    setPreviewPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: rect.bottom + 80 < window.innerHeight ? rect.bottom + 8 : Math.max(12, rect.top - 76),
      width,
    });
  };

  const copyToken = async () => {
    if (!token) return;
    setPreviewPosition(null);
    let field;
    const previousFocus = document.activeElement;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
      } else {
        field = document.createElement('textarea');
        field.value = token;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        if (!document.execCommand('copy')) throw new Error('No se pudo copiar');
      }
      setCopied(true);
      setError(false);
    } catch {
      setError(true);
      setCopied(false);
    } finally {
      field?.remove();
      if (field && previousFocus?.isConnected) previousFocus.focus();
      setPreviewPosition(null);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => { setCopied(false); setError(false); }, 2500);
    }
  };

  return (
    <>
    <button
      type="button"
      ref={buttonRef}
      onClick={copyToken}
      onPointerEnter={showPreview}
      onPointerLeave={() => setPreviewPosition(null)}
      onFocus={showPreview}
      onBlur={() => setPreviewPosition(null)}
      aria-label={`Copiar código de acceso terminado en ${reference}. Pasa el cursor para ver el código completo.`}
      aria-describedby={previewPosition ? tooltipId : undefined}
      disabled={!token}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-body transition-colors hover:border-accent-ink hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink disabled:opacity-50"
    >
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      <span aria-live="polite">{error ? 'No se pudo copiar' : copied ? 'Copiado' : 'Copiar token'}</span>
    </button>
    {previewPosition && createPortal(
      <div id={tooltipId} role="tooltip" className="pointer-events-none fixed z-[100] rounded-xl border border-line bg-surface p-3 text-xs text-body shadow-xl" style={previewPosition}>
        <span className="mb-1 block font-semibold text-ink">Código completo</span>
        <span className="block break-all font-mono">{token}</span>
      </div>,
      document.body,
    )}
    </>
  );
}
