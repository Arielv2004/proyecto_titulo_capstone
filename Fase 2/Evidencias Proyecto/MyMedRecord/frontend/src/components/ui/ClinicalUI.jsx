import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Clock, FileText, Info, LoaderCircle, X } from 'lucide-react';

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button type="button" className={`mm-button mm-button--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({ eyebrow, title, description, actions, info, eyebrowBelow = false, hideTitle = false }) {
  const infoAfterActions = Boolean(info && actions);
  return (
    <div className={`mm-page-header${eyebrowBelow ? ' mm-page-header--eyebrow-below' : ''}${hideTitle ? ' mm-page-header--title-hidden' : ''}`}>
      <div>
        {!eyebrowBelow && <div className="mm-page-header-label"><p className="mm-eyebrow">{eyebrow}</p>{!infoAfterActions && info}</div>}
        <h1 className={hideTitle ? 'sr-only' : undefined}>{title}</h1>
        {eyebrowBelow && <div className="mm-page-header-label"><p className="mm-eyebrow">{eyebrow}</p>{!infoAfterActions && info}</div>}
        {description && <p className="mm-description">{description}</p>}
      </div>
      {actions && <div className="mm-actions">{actions}{infoAfterActions && info}</div>}
    </div>
  );
}

export function InfoPopover({ children, label = 'Cómo funciona', className = '' }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const isPositioned = position !== null;
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const placePanel = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const anchor = trigger.getBoundingClientRect();
      if (anchor.bottom < 0 || anchor.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const padding = 12;
      const left = Math.max(padding, Math.min(anchor.right - width, window.innerWidth - width - padding));
      const below = anchor.bottom + 8 + height <= window.innerHeight - padding;
      const top = below ? anchor.bottom + 8 : Math.max(padding, anchor.top - height - 8);
      setPosition({ left, top });
    };

    placePanel();
    window.addEventListener('resize', placePanel);
    window.addEventListener('scroll', placePanel, true);
    return () => {
      window.removeEventListener('resize', placePanel);
      window.removeEventListener('scroll', placePanel, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !isPositioned) return;
    panelRef.current?.focus();
  }, [open, isPositioned]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className={`mm-info-popover-anchor ${className}`}>
      <button
        type="button"
        ref={triggerRef}
        className="mm-info-popover-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setPosition(null);
          setOpen((value) => !value);
        }}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div
          id={id}
          ref={panelRef}
          className="mm-info-popover-panel"
          role="dialog"
          aria-labelledby={`${id}-title`}
          tabIndex={-1}
          style={position ? { left: position.left, top: position.top } : { visibility: 'hidden' }}
        >
          <div className="mm-info-popover-heading">
            <h2 id={`${id}-title`}>{label}</h2>
            <button type="button" aria-label="Cerrar información" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="mm-info-popover-content">{children}</div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function Card({ title, description, action, children, className = '', ...props }) {
  const id = useId();
  return (
    <section className={`mm-card ${className}`} aria-labelledby={title ? id : undefined} {...props}>
      {title && (
        <div className="mm-card-heading">
          <div>
            <h2 id={id}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ tone = 'neutral', children, icon: Icon }) {
  return (
    <span className={`mm-badge mm-badge--${tone}`}>
      {Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function DocumentStatus({ status }) {
  if (['CONFIRMADO', 'CONFIRMADA'].includes(status))
    return (
      <StatusBadge icon={FileText}>
        Documento guardado
      </StatusBadge>
    );
  if (['PENDIENTE', 'PENDIENTE_REVISION'].includes(status))
    return (
      <StatusBadge tone="warning" icon={Clock}>
        Extracción pendiente
      </StatusBadge>
    );
  if (status === 'PROCESANDO')
    return <StatusBadge icon={LoaderCircle}>En procesamiento</StatusBadge>;
  if (status === 'ERROR')
    return (
      <StatusBadge tone="danger" icon={AlertCircle}>
        No se pudo procesar
      </StatusBadge>
    );
  return <StatusBadge>Estado de carga no informado</StatusBadge>;
}

export function EmptyState({ icon: Icon = FileText, title, description, action }) {
  return (
    <div className="mm-empty">
      <span className="mm-icon">
        <Icon size={25} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Cargando información' }) {
  return (
    <div className="mm-loading" role="status">
      <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
      {label}
    </div>
  );
}

export function Notice({ title, children, action, tone = 'info' }) {
  return (
    <div className={`mm-notice mm-notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionNav({ items, value, onChange, className = '' }) {
  return (
    <nav className={`mm-section-nav ${className}`} aria-label="Secciones del portal">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          type="button"
          key={id}
          aria-current={id === value ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          {Icon && <Icon size={18} aria-hidden="true" />}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
