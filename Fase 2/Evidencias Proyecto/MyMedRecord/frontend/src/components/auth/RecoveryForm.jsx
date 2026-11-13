import { ArrowLeft, Mail, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useMetaTags } from '../../hooks/useMetaTags';

export function RecoveryLayout({ title, description, children, back = true }) {
  useMetaTags(title, description);
  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <span className="mm-icon mx-auto mb-3"><LockKeyhole size={22} aria-hidden="true" /></span>
        <h1 className="text-2xl font-black tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {children}
      {back && (
        <div className="mt-5 border-t border-line pt-3 text-center">
          <Link to="/login" className="mm-text-link hover:underline">
            <ArrowLeft size={16} aria-hidden="true" /> Volver al inicio de sesión
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}

export function RecoveryField({ id, label, ...inputProps }) {
  const Icon = inputProps.type === 'email' ? Mail : LockKeyhole;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-body">{label}</label>
      <div className="relative">
        <Icon size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input {...inputProps} id={id} required
          className="w-full rounded-xl border border-line bg-canvas py-2.5 pl-10 pr-4 text-base text-ink placeholder:text-muted focus:border-action focus:outline-2 focus:outline-action dark:bg-surface-muted sm:text-sm" />
      </div>
    </div>
  );
}
