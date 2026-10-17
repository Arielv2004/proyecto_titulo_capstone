import React, { useId } from 'react';
import { AlertCircle, Check, Clock, FileText, LoaderCircle } from 'lucide-react';

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button type="button" className={`mm-button mm-button--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mm-page-header">
      <div>
        <p className="mm-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="mm-description">{description}</p>}
      </div>
      {actions && <div className="mm-actions">{actions}</div>}
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
      <StatusBadge tone="success" icon={Check}>
        Confirmado al guardar
      </StatusBadge>
    );
  if (['PENDIENTE', 'PENDIENTE_REVISION'].includes(status))
    return (
      <StatusBadge tone="warning" icon={Clock}>
        Pendiente de revisión
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
  return <StatusBadge>Revisión no informada</StatusBadge>;
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
