import React, { useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { RecoveryLayout, RecoveryField } from '../components/auth/RecoveryForm';
import { Button, Notice } from '../components/ui/ClinicalUI';
import api from '../services/api';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage('');
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Debes ingresar tu correo electrónico.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', {
        email: cleanEmail,
      });

      setMessage(
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      );

      setEmail('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No se pudo enviar la solicitud. Inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecoveryLayout title="Recuperar contraseña" description="Ingresa el correo de tu cuenta para solicitar un enlace de recuperación.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <RecoveryField id="recovery-email" label="Correo electrónico" type="email" autoComplete="email"
          placeholder="nombre@correo.cl" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
        {error && <Notice tone="danger" title={error} />}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Enviando solicitud…' : 'Enviar enlace de recuperación'}
          {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
        </Button>
      </form>
      {message && <div className="mt-4"><Notice tone="success" title="Solicitud recibida">{message}</Notice></div>}
    </RecoveryLayout>
  );
};
