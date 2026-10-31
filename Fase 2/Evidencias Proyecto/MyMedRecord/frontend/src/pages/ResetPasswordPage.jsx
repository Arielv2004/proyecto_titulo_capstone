
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f6fa',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            color: '#163b65',
            textAlign: 'center',
            marginBottom: '10px',
          }}
        >
          MyMedRecord
        </h1>

        <h2
          style={{
            fontSize: '21px',
            color: '#263445',
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          Restablecer contraseña
        </h2>

        {success ? (
          <>
            <div
              role="status"
              style={{
                padding: '16px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                color: '#065f46',
                textAlign: 'center',
                lineHeight: '1.6',
                marginTop: '20px',
              }}
            >
              Tu contraseña se actualizó correctamente.
              Ya puedes iniciar sesión con tu nueva contraseña.
            </div>

            <Link
              to="/login"
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#1769aa',
                color: '#ffffff',
                padding: '14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                marginTop: '24px',
              }}
            >
              Ir al inicio de sesión
            </Link>
          </>
        ) : !token || !/^[a-f0-9]{64}$/i.test(token) ? (
          <>
            <div
              role="alert"
              style={{
                padding: '16px',
                background: '#fef2f2',
                color: '#991b1b',
                borderRadius: '8px',
                marginTop: '20px',
                textAlign: 'center',
              }}
            >
              El enlace de recuperación no es válido.
              Solicita uno nuevo.
            </div>

            <Link
              to="/forgot-password"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: '20px',
                color: '#1769aa',
                fontWeight: '600',
              }}
            >
              Solicitar otro enlace
            </Link>
          </>
        ) : (
          <>
            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                lineHeight: '1.6',
                textAlign: 'center',
                marginBottom: '26px',
              }}
            >
              Ingresa tu nueva contraseña y confírmala
              para recuperar el acceso a tu cuenta.
            </p>

            <form onSubmit={handleSubmit}>
              <label
                htmlFor="new-password"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                Nueva contraseña
              </label>

              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  marginBottom: '18px',
                }}
              />

              <label
                htmlFor="confirm-password"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                Confirmar contraseña
              </label>

              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Repite tu nueva contraseña"
                autoComplete="new-password"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  marginBottom: '12px',
                }}
              />

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#475569',
                  marginBottom: '22px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) =>
                    setShowPassword(e.target.checked)
                  }
                />
                Mostrar contraseñas
              </label>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#94a3b8' : '#1769aa',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? 'Actualizando contraseña...'
                  : 'Restablecer contraseña'}
              </button>
            </form>

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: '20px',
                  padding: '14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                textAlign: 'center',
                marginTop: '24px',
              }}
            >
              <Link
                to="/login"
                style={{
                  color: '#1769aa',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
