import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { RecoveryLayout, RecoveryField } from '../components/auth/RecoveryForm';
import { Button, Notice } from '../components/ui/ClinicalUI';
import api from '../services/api';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      setError('El enlace de recuperación no es válido.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setError('La contraseña no debe superar los 72 bytes.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        password,
      });

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      // Quitar el token de la URL después de utilizarlo.
      window.history.replaceState(
        window.history.state,
        '',
        '/reset-password'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No se pudo restablecer la contraseña. El enlace podría haber vencido.'
      );
    } finally {
      setLoading(false);
    }
  };

  const validToken = /^[a-f0-9]{64}$/i.test(token || '');
  return (
    <RecoveryLayout title="Restablecer contraseña" back={!success}
      description={validToken && !success ? 'Ingresa tu nueva contraseña y confírmala para recuperar el acceso a tu cuenta.' : undefined}>
      {success ? (
        <div className="space-y-4">
          <Notice tone="success" title="Contraseña actualizada">Ya puedes iniciar sesión con tu nueva contraseña.</Notice>
          <Link to="/login" className="mm-button mm-button--primary w-full">Ir al inicio de sesión</Link>
        </div>
      ) : !validToken ? (
        <div className="space-y-4">
          <Notice tone="danger" title="El enlace de recuperación no es válido." />
          <Link to="/forgot-password" className="mm-button mm-button--primary w-full">Solicitar otro enlace</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <RecoveryField id="new-password" label="Nueva contraseña" type={showPassword ? 'text' : 'password'}
            value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
            autoComplete="new-password" minLength={8} disabled={loading} />
          <RecoveryField id="confirm-password" label="Confirmar contraseña" type={showPassword ? 'text' : 'password'}
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite tu nueva contraseña"
            autoComplete="new-password" disabled={loading} />
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} className="accent-action" />
            Mostrar contraseñas
          </label>
          {error && <Notice tone="danger" title={error} />}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
            {loading ? 'Actualizando contraseña…' : 'Restablecer contraseña'}
          </Button>
        </form>
      )}
    </RecoveryLayout>
  );
};
